"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/src/lib/utils";

interface ParsedOption {
  value: string;
  label: ReactNode;
  disabled: boolean;
}

/** Flatten <option> children (including those inside fragments/arrays) into a plain list. */
function parseOptions(children: ReactNode): ParsedOption[] {
  const out: ParsedOption[] = [];
  const walk = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{
        value?: string | number;
        disabled?: boolean;
        children?: ReactNode;
      }>;
      if (el.type === Fragment) return walk(el.props.children);
      if (el.type === "option") {
        const label = el.props.children;
        out.push({
          value: String(
            el.props.value ?? (typeof label === "string" ? label : ""),
          ),
          label,
          disabled: Boolean(el.props.disabled),
        });
      }
    });
  };
  walk(children);
  return out;
}

type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "value" | "defaultValue"
> & {
  invalid?: boolean;
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};

/**
 * Drop-in replacement for a native <select>: same <option> children, same
 * `value` / `onChange(e.target.value)` contract — but the open list is our own
 * styled, keyboard-accessible listbox (native option lists can't be styled).
 */
export function Select({
  invalid,
  className,
  children,
  value,
  defaultValue,
  placeholder,
  onChange,
  disabled,
  id,
  name,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SelectProps) {
  const options = useMemo(() => parseOptions(children), [children]);
  const [inner, setInner] = useState(
    defaultValue !== undefined ? String(defaultValue) : "",
  );
  const current = value !== undefined ? String(value) : inner;
  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxH: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const flip = below < 200 && above > below;
    setPos(
      flip
        ? {
            bottom: window.innerHeight - r.top + 8,
            left: r.left,
            width: r.width,
            maxH: Math.min(288, above - 8),
          }
        : {
            top: r.bottom + 8,
            left: r.left,
            width: r.width,
            maxH: Math.min(288, below - 8),
          },
    );
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t))
        return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return;
      reposition();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (open && active >= 0) {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active]);

  function openMenu() {
    if (disabled) return;
    setActive(
      selectedIndex >= 0
        ? selectedIndex
        : options.findIndex((o) => !o.disabled),
    );
    setOpen(true);
  }

  function commit(index: number) {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    if (value === undefined) setInner(opt.value);
    const target = { value: opt.value, name: name ?? "", id: id ?? "" };
    onChange?.({
      target,
      currentTarget: target,
    } as unknown as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function move(delta: number) {
    if (!options.length) return;
    let i = active;
    for (let n = 0; n < options.length; n++) {
      i = (i + delta + options.length) % options.length;
      if (!options[i].disabled) break;
    }
    setActive(i);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commit(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const idx = options.findIndex(
        (o) =>
          typeof o.label === "string" &&
          o.label.toLowerCase().startsWith(e.key.toLowerCase()),
      );
      if (idx >= 0) setActive(idx);
    }
  }

  return (
    <div className={cn("relative w-full", className)}>
      {name && <input type="hidden" name={name} value={current} />}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={cn(
          "ui-control flex cursor-pointer items-center justify-between gap-2 pr-3 text-left",
          open &&
            "border-gold bg-white ring-4 ring-gold/20",
          invalid && "is-invalid",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selected && "text-ink-faint",
          )}
        >
          {selected ? selected.label : (placeholder ?? "Select…")}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200",
            open && "rotate-180 text-navy",
          )}
          aria-hidden="true"
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxH,
            }}
            className="ui-menu-in fixed z-[100] overflow-y-auto rounded-2xl border border-crease/70 bg-white p-1.5 shadow-pop"
          >
            {options.map((opt, i) => {
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={`${opt.value}-${i}`}
                  role="option"
                  data-index={i}
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  onMouseEnter={() => !opt.disabled && setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(i)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    isSelected ? "font-semibold text-navy" : "text-ink",
                    i === active &&
                      !opt.disabled &&
                      (isSelected ? "bg-gold-50" : "bg-steam"),
                    isSelected && i !== active && "bg-gold-50/60",
                    opt.disabled && "cursor-not-allowed opacity-45",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check
                      className="h-4 w-4 shrink-0 text-gold-600"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}

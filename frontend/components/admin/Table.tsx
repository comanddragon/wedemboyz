import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode, ThHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Outer scroll container + border/radius shared by every admin table. */
export function TableContainer({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-card border border-crease bg-white", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-crease bg-steam/60">
      <tr>{children}</tr>
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-crease">{children}</tbody>;
}

type SortDirection = "asc" | "desc" | null;

/** Plain (non-sortable) column heading. */
export function Th({
  className,
  align = "left",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-muted",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      {...props}
    />
  );
}

/** Sortable column heading — click toggles asc/desc/off, keyboard-accessible. */
export function SortableTh({
  label,
  active,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
  align?: "left" | "right";
}) {
  const Icon = !active || direction === null ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" className="whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "inline-flex items-center gap-1 rounded transition-colors hover:text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-navy",
          align === "right" && "flex-row-reverse",
          active && "text-ink",
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3", active ? "text-navy" : "text-ink-muted/70")} aria-hidden="true" />
      </button>
    </th>
  );
}

export function Td({
  className,
  align = "left",
  children,
}: {
  className?: string;
  align?: "left" | "right";
  children: ReactNode;
}) {
  return (
    <td className={cn("px-4 py-3 align-middle text-ink", align === "right" && "text-right", className)}>
      {children}
    </td>
  );
}

/** Row wrapper — pass onClick to make the whole row a link-like target. */
export function Tr({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  if (!onClick) {
    return <tr className={className}>{children}</tr>;
  }
  return (
    <tr
      onClick={onClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "cursor-pointer transition-colors hover:bg-steam focus:outline-none focus-visible:bg-steam",
        className,
      )}
    >
      {children}
    </tr>
  );
}

/** Skeleton rows shown while a table's data is loading. */
export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-steam" style={{ width: `${55 + ((r + c) % 4) * 10}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Zero-results state inside a real, working table (e.g. "no orders match"). */
export function TableEmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-ink-muted">
        {children}
      </td>
    </tr>
  );
}

/**
 * Full table "shell" for sections with no backend endpoint yet — renders the
 * real column headers a future table would have, with an honest "not built"
 * body instead of fabricated rows. Never pass sample data here.
 */
export function TableShell({
  columns,
  icon: Icon,
  title,
  description,
}: {
  columns: string[];
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <TableContainer>
      <THead>
        {columns.map((c) => (
          <Th key={c}>{c}</Th>
        ))}
      </THead>
      <tbody>
        <tr>
          <td colSpan={columns.length} className="border-t border-dashed border-crease px-4 py-14">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-steam text-navy">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{title}</p>
                <p className="mt-1 text-sm text-ink-muted">{description}</p>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </TableContainer>
  );
}

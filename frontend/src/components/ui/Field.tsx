import { CalendarDays } from "lucide-react";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/src/lib/utils";

const FIELD_CLASSES = "ui-control";

const FIELD_INVALID_CLASSES = "is-invalid";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className="mb-1.5 block font-display text-[0.8125rem] font-medium tracking-[0.01em] text-ink"
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-status-cancelled-text">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(FIELD_CLASSES, invalid && FIELD_INVALID_CLASSES, className)}
      {...props}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        FIELD_CLASSES,
        "min-h-[96px]",
        invalid && FIELD_INVALID_CLASSES,
        className,
      )}
      {...props}
    />
  );
}

export function DateInput({
  className,
  value,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const empty = !value;
  return (
    <div className="ui-date relative">
      <Input
        type="date"
        value={value}
        className={cn(empty && "is-empty", "pr-10", className)}
        {...props}
      />
      {empty && (
        <span className="ui-date-placeholder pointer-events-none absolute inset-y-0 left-[0.95rem] flex items-center text-sm text-ink-faint">
          Select a date
        </span>
      )}
      <CalendarDays
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
    </div>
  );
}

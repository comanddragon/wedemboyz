import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const FIELD_CLASSES =
  "w-full rounded-md border border-crease bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy disabled:bg-steam disabled:text-ink-muted";

const FIELD_INVALID_CLASSES =
  "border-status-cancelled-text/50 focus:border-status-cancelled-text focus:ring-status-cancelled-text";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="mb-1 block text-sm font-medium text-ink" {...props} />;
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

export function Input({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(FIELD_CLASSES, invalid && FIELD_INVALID_CLASSES, className)} {...props} />;
}

export function Textarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cn(FIELD_CLASSES, "min-h-[80px]", invalid && FIELD_INVALID_CLASSES, className)} {...props} />;
}

export function Select({
  invalid,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select className={cn(FIELD_CLASSES, invalid && FIELD_INVALID_CLASSES, className)} {...props} />;
}

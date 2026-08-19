"use client";

import { useId } from "react";

import { Field, Input } from "@/components/ui";

interface PhoneFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Phone number input with a visual "+237" chip — signals this is the real
 * account-holding number (Cameroon), which matters for trust before someone
 * hands over a password. The submitted value stays the local number only,
 * same as the API has always expected; the prefix is display chrome.
 */
export function PhoneField({ label = "Phone number", hint, error, value, onChange }: PhoneFieldProps) {
  const id = useId();

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="flex">
        <span className="flex select-none items-center rounded-l-md border border-r-0 border-crease bg-steam px-3 text-sm text-ink-muted">
          +237
        </span>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          required
          autoComplete="tel-national"
          value={value}
          invalid={Boolean(error)}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="677123456"
          className="rounded-l-none"
        />
      </div>
    </Field>
  );
}

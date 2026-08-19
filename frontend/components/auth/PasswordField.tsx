"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { Field, Input } from "@/components/ui";

interface PasswordFieldProps {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
}

/** Password input with a show/hide toggle — same Field/Input primitives as every other form on the site, plus the one bit of chrome a password field earns. */
export function PasswordField({
  label,
  hint,
  error,
  value,
  onChange,
  autoComplete,
  placeholder,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete={autoComplete}
          value={value}
          invalid={Boolean(error)}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-muted transition-colors hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-navy"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </Field>
  );
}

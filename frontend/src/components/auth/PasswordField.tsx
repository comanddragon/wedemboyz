"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { Field, Input } from "@/src/components/ui";
import { useI18n } from "@/src/i18n/I18nProvider";

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
  const { t } = useI18n();

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
          className="absolute inset-y-1 right-1 flex w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-steam hover:text-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30"
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </Field>
  );
}

"use client";

import { useId, useState, type FormEvent } from "react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { PhoneField } from "@/src/components/auth/PhoneField";
import { FormErrorBanner } from "@/src/components/auth/FormErrorBanner";
import { Button } from "@/src/components/ui/Button";
import { Field, Input } from "@/src/components/ui/Field";
import { useI18n } from "@/src/i18n/I18nProvider";
import { requestPasswordReset } from "@/src/lib/api/auth";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { BUSINESS } from "@/src/lib/constants";

export function ForgotPasswordCard() {
  const { t } = useI18n();
  const emailId = useId();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset({ phone_number: phone, email });
      setSent(true);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {sent ? (
        <p role="status" className="text-sm leading-relaxed text-ink">
          {t("auth.resetSent")}
        </p>
      ) : (
        <form onSubmit={submit} aria-busy={busy}>
          {error ? <FormErrorBanner message={error} /> : null}
          <PhoneField value={phone} onChange={setPhone} />
          <Field label={t("auth.email")} htmlFor={emailId}>
            <Input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Button
            type="submit"
            variant="gold"
            disabled={busy}
            className="w-full"
          >
            {t(busy ? "auth.resetSending" : "auth.sendResetLink")}
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm leading-relaxed text-ink-muted">
        {t("auth.noEmailHelp")}{" "}
        <a
          href={BUSINESS.telHref}
          className="font-medium text-navy underline underline-offset-2"
        >
          {BUSINESS.phoneDisplay}
        </a>
      </p>
      <p className="mt-6 text-center text-sm text-ink-muted">
        <Link
          href="/login"
          className="font-medium text-navy underline underline-offset-2"
        >
          {t("auth.login")}
        </Link>
      </p>
    </div>
  );
}

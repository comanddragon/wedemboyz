"use client";

import { useState, type FormEvent } from "react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { FormErrorBanner } from "@/src/components/auth/FormErrorBanner";
import { PasswordField } from "@/src/components/auth/PasswordField";
import { Button } from "@/src/components/ui/Button";
import { useI18n } from "@/src/i18n/I18nProvider";
import { confirmPasswordReset } from "@/src/lib/api/auth";
import { getApiErrorMessage } from "@/src/lib/api/errors";

export function ResetPasswordForm({
  uid,
  token,
}: {
  uid: string;
  token: string;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmation) {
      setError(t("auth.resetMismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmPasswordReset({ uid, token, password });
      setDone(true);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!uid || !token)
    return (
      <div>
        <p className="text-sm leading-relaxed text-ink">
          {t("auth.resetInvalid")}
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-block text-sm font-medium text-navy underline underline-offset-2"
        >
          {t("auth.sendResetLink")}
        </Link>
      </div>
    );
  if (done)
    return (
      <div>
        <p role="status" className="text-sm leading-relaxed text-ink">
          {t("auth.resetDone")}
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block text-sm font-medium text-navy underline underline-offset-2"
        >
          {t("auth.login")}
        </Link>
      </div>
    );

  return (
    <form onSubmit={submit} aria-busy={busy}>
      {error ? <FormErrorBanner message={error} /> : null}
      <PasswordField
        label={t("auth.newResetPassword")}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <PasswordField
        label={t("auth.confirmResetPassword")}
        value={confirmation}
        onChange={setConfirmation}
        autoComplete="new-password"
      />
      <Button type="submit" variant="gold" disabled={busy} className="w-full">
        {t(busy ? "auth.resetSaving" : "auth.resetTitle")}
      </Button>
      <Link
        href="/forgot-password"
        className="mt-5 inline-block text-sm font-medium text-navy underline underline-offset-2"
      >
        {t("auth.sendResetLink")}
      </Link>
    </form>
  );
}

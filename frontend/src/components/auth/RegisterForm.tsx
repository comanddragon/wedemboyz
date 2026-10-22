"use client";

import { Check, Loader2 } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { FormErrorBanner } from "@/src/components/auth/FormErrorBanner";
import { PasswordField } from "@/src/components/auth/PasswordField";
import { PhoneField } from "@/src/components/auth/PhoneField";
import { Button, Field, Input } from "@/src/components/ui";
import { useAuth } from "@/src/hooks/useAuth";
import { getApiErrorMessage } from "@/src/lib/api/errors";
import { useI18n } from "@/src/i18n/I18nProvider";

const SUCCESS_PAUSE_MS = 500;

export function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const { register, isRegistering, isGuest } = useAuth();
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [justSucceeded, setJustSucceeded] = useState(false);

  const busy = isRegistering || justSucceeded;

  function updatePassword2(value: string) {
    setPassword2(value);
    if (mismatch) setMismatch(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== password2) {
      setMismatch(true);
      return;
    }

    try {
      await register({
        phone_number: phoneNumber,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: email || undefined,
        password,
        password2,
      });
      setJustSucceeded(true);
      window.setTimeout(() => router.push("/dashboard"), SUCCESS_PAUSE_MS);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorMessage && <FormErrorBanner message={errorMessage} />}
      {isGuest && (
        <p className="mb-4 rounded-xl bg-gold-50 px-3.5 py-2.5 text-sm text-navy">
          {t("auth.guestCreate")}
        </p>
      )}

      <PhoneField
        value={phoneNumber}
        onChange={setPhoneNumber}
        hint={t("auth.phoneHint")}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("auth.firstName")} htmlFor={firstNameId}>
          <Input
            id={firstNameId}
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Field>
        <Field label={t("auth.lastName")} htmlFor={lastNameId}>
          <Input
            id={lastNameId}
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Field>
      </div>

      <Field
        label={t("auth.email")}
        htmlFor={emailId}
        hint={t("auth.emailHint")}
      >
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <PasswordField
        label={t("auth.password")}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        hint={t("auth.passwordHint")}
      />

      <PasswordField
        label={t("auth.confirmPassword")}
        value={password2}
        onChange={updatePassword2}
        autoComplete="new-password"
        error={mismatch ? t("auth.mismatch") : undefined}
      />

      <Button
        type="submit"
        variant="gold"
        disabled={busy}
        className="mt-2 w-full"
      >
        {justSucceeded ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            {t("auth.created")}
          </>
        ) : isRegistering ? (
          <>
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            {t("auth.creating")}
          </>
        ) : (
          t("auth.create")
        )}
      </Button>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("auth.hasAccount")} {" "}
        <Link
          href="/login"
          className="font-medium text-navy underline-offset-2 hover:underline"
        >
          {t("auth.login")}
        </Link>
      </p>
    </form>
  );
}

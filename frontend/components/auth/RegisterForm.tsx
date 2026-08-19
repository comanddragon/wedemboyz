"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { FormErrorBanner } from "@/components/auth/FormErrorBanner";
import { PasswordField } from "@/components/auth/PasswordField";
import { PhoneField } from "@/components/auth/PhoneField";
import { Button, Field, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api/errors";

const SUCCESS_PAUSE_MS = 500;

export function RegisterForm() {
  const router = useRouter();
  const { register, isRegistering } = useAuth();
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

      <PhoneField value={phoneNumber} onChange={setPhoneNumber} hint="We'll text you a code to confirm it's really you." />

      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" htmlFor={firstNameId}>
          <Input id={firstNameId} type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last name" htmlFor={lastNameId}>
          <Input id={lastNameId} type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
      </div>

      <Field label="Email" htmlFor={emailId} hint="Optional — only if you'd like order updates by email too.">
        <Input id={emailId} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>

      <PasswordField
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        hint="At least 8 characters."
      />

      <PasswordField
        label="Confirm password"
        value={password2}
        onChange={updatePassword2}
        autoComplete="new-password"
        error={mismatch ? "Passwords don't match." : undefined}
      />

      <Button type="submit" variant="gold" disabled={busy} className="mt-2 w-full">
        {justSucceeded ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            Account created
          </>
        ) : isRegistering ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Creating account&hellip;
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-navy underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

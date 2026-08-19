"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import React from 'react';
import { FormErrorBanner } from "@/components/auth/FormErrorBanner";
import { PasswordField } from "@/components/auth/PasswordField";
import { PhoneField } from "@/components/auth/PhoneField";
import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api/errors";

export function LoginForm() {
  const router = useRouter();
  const { login, isLoggingIn } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justSucceeded, setJustSucceeded] = useState(false);

  const busy = isLoggingIn || justSucceeded;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMessage(null);
        try {
            const tokens = await login({
                phone_number: phoneNumber,
                password,
            });

            setJustSucceeded(true);

            window.setTimeout(() => {
                if (tokens.user.is_staff) {
                    router.replace("/admin");
                } else {
                    router.replace("/dashboard");
                }
            });

        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        }
    }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errorMessage && <FormErrorBanner message={errorMessage} />}

      <PhoneField value={phoneNumber} onChange={setPhoneNumber} />

      <PasswordField
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />

      <div className="mb-6 text-right">
        <Link href="/forgot-password" className="text-sm text-navy underline-offset-2 hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" variant="gold" disabled={busy} className="w-full">
        {justSucceeded ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            Welcome back
          </>
        ) : isLoggingIn ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Logging in&hellip;
          </>
        ) : (
          "Log in"
        )}
      </Button>

      <p className="mt-6 text-center text-sm text-ink-muted">
        No account?{" "}
        <Link href="/register" className="font-medium text-navy underline-offset-2 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}

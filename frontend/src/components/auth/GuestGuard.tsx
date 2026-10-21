"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import React from "react";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import { AuthState } from "@/src/lib/stores/auth.store";

/** Wrap (auth)/layout.tsx's children in this — sends registered, logged-in users to /dashboard. */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((state: AuthState) => state.accessToken);
  const isHydrated = useAuthStore((state: AuthState) => state.isHydrated);
  // A guest session is "signed in" but must still be able to reach
  // register (to claim their bookings) and login.
  const isGuest = useAuthStore((state: AuthState) => Boolean(state.user?.is_guest));
  const redirect = Boolean(accessToken) && !isGuest;

  useEffect(() => {
    if (isHydrated && redirect) {
      router.replace("/dashboard");
    }
  }, [isHydrated, redirect, router]);

  if (redirect) return null;

  return <>{children}</>;
}

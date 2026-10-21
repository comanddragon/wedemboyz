"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import React from "react";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import { AuthState } from "@/src/lib/stores/auth.store";

/** Wrap (auth)/layout.tsx's children in this — sends logged-in users to /dashboard. */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((state: AuthState) => state.accessToken);
  const isHydrated = useAuthStore((state: AuthState) => state.isHydrated);

  useEffect(() => {
    if (isHydrated && accessToken) {
      router.replace("/dashboard");
    }
  }, [isHydrated, accessToken, router]);

  if (accessToken) return null;

  return <>{children}</>;
}

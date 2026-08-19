"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import React from 'react';
import { useAuthStore } from "@/lib/stores/auth.store";

/**
 * Client-side stand-in for the guide's middleware.ts. Next.js middleware
 * runs on the server/edge and has no access to localStorage, so with our
 * chosen token strategy (localStorage, not an httpOnly cookie) route
 * protection has to happen here instead, after the store has hydrated.
 *
 * Wrap (customer)/layout.tsx's children in this.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    if (isHydrated && !accessToken) {
      router.replace("/login");
    }
  }, [isHydrated, accessToken, router]);

  // Render nothing until hydration finishes, to avoid a flash of protected
  // content for a user who turns out to be logged out.
  if (!isHydrated) return null;
  if (!accessToken) return null;

  return <>{children}</>;
}

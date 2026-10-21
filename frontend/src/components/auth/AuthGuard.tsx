"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import React from "react";
import { GuardLoading } from "@/src/components/auth/GuardLoading";
import { useAuthStore } from "@/src/lib/stores/auth.store";

/**
 * Client-side stand-in for the guide's middleware.ts. Next.js middleware
 * runs on the server/edge and has no access to localStorage, so with our
 * chosen token strategy (localStorage, not an httpOnly cookie) route
 * protection has to happen here instead, after the store has hydrated.
 *
 * Wrap (customer)/layout.tsx's children in this.
 *
 * The booking wizard (/book/...) is open to visitors: they get a guest
 * session the moment they start (see lib/guest-session.ts), so nothing
 * further down needs to special-case "not signed in".
 */
const PUBLIC_PREFIXES = ["/book"];
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    if (isHydrated && !accessToken && !isPublic) {
      router.replace("/login");
    }
  }, [isHydrated, accessToken, isPublic, router]);

  // Render nothing until hydration finishes, to avoid a flash of protected
  // content for a user who turns out to be logged out.
  if (!isHydrated || (!accessToken && !isPublic)) return <GuardLoading />;

  return <>{children}</>;
}

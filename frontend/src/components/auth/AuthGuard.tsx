"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import React from "react";
import { GuardLoading } from "@/src/components/auth/GuardLoading";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import { localizeHref, localeFromPathname, stripLocale } from "@/src/i18n/config";

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
const REGISTERED_ONLY_PREFIXES = [
  "/settings",
  "/loyalty",
  "/payments",
  "/subscription",
  "/ambassadors",
];
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const routePathname = stripLocale(pathname);
  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => routePathname === prefix || routePathname.startsWith(`${prefix}/`),
  );
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isGuest = useAuthStore((state) => Boolean(state.user?.is_guest));
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAmbassadorWithoutPhoto = Boolean(
    user?.is_ambassador && !user.avatar && !isGuest,
  );

  useEffect(() => {
    if (isHydrated && !accessToken && !isPublic) {
      router.replace(localizeHref("/login", localeFromPathname(pathname)));
    }
  }, [isHydrated, accessToken, isPublic, pathname, router]);

  useEffect(() => {
    const registeredOnly = REGISTERED_ONLY_PREFIXES.some(
      (prefix) => routePathname === prefix || routePathname.startsWith(`${prefix}/`),
    );
    if (isHydrated && accessToken && isGuest && registeredOnly) {
      router.replace(localizeHref("/dashboard", localeFromPathname(pathname)));
    }
  }, [accessToken, isGuest, isHydrated, pathname, routePathname, router]);

  useEffect(() => {
    if (
      isHydrated &&
      accessToken &&
      isAmbassadorWithoutPhoto &&
      !routePathname.startsWith("/settings")
    ) {
      router.replace(
        localizeHref(
          "/settings?reason=ambassador_photo_required",
          localeFromPathname(pathname),
        ),
      );
    }
  }, [
    accessToken,
    isAmbassadorWithoutPhoto,
    isHydrated,
    pathname,
    routePathname,
    router,
  ]);

  // Render nothing until hydration finishes, to avoid a flash of protected
  // content for a user who turns out to be logged out.
  const guestOnRegisteredOnly =
    isGuest &&
    REGISTERED_ONLY_PREFIXES.some(
      (prefix) => routePathname === prefix || routePathname.startsWith(`${prefix}/`),
    );
  const ambassadorNeedsPhotoOnBlockedRoute = Boolean(
    accessToken &&
      isAmbassadorWithoutPhoto &&
      !routePathname.startsWith("/settings"),
  );
  if (
    !isHydrated ||
    (!accessToken && !isPublic) ||
    guestOnRegisteredOnly ||
    ambassadorNeedsPhotoOnBlockedRoute
  )
    return <GuardLoading />;

  return <>{children}</>;
}

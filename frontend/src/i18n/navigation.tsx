"use client";

import NextLink, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AnchorHTMLAttributes } from "react";
import { localeFromPathname, localizeHref, stripLocale } from "./config";

import { useAuthStore } from "@/src/lib/stores/auth.store";
import { canAccessAdminPath, isCustomerWorkspacePath } from "@/src/lib/admin-rbac";

type Props = LinkProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

export function LocalizedLink({ href, ...props }: Props) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const target = typeof href === "string" ? href : href.pathname;
  const route = target?.startsWith("/") && !target.startsWith("//")
    ? stripLocale(target.split(/[?#]/)[0]) : undefined;
  // Unavailable links must not render or trigger automatic prefetching.
  if (route && (route === "/admin" || route.startsWith("/admin/"))) {
    if (!isHydrated || !user?.staff_access_active || !canAccessAdminPath(user.staff_permissions, route)) return null;
  }
  if (route && isCustomerWorkspacePath(route) && (!isHydrated || user?.is_staff)) return null;
  const localized = typeof href === "string" ? localizeHref(href, locale) : href;
  return <NextLink href={localized} {...props} />;
}

export function useLocalizedRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  return {
    ...router,
    push: (href: string) => router.push(localizeHref(href, locale)),
    replace: (href: string) => router.replace(localizeHref(href, locale)),
  };
}

export { stripLocale };

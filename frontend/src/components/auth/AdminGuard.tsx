"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldX } from "lucide-react";
import { LocalizedLink as Link } from "@/src/i18n/navigation";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { profileApi } from "@/src/lib/api";
import { LogoutButton } from "@/src/components/auth/LogoutButton";
import { GuardLoading } from "@/src/components/auth/GuardLoading";
import { queryKeys } from "@/src/lib/query-keys";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import { canAccess, requiredPermissionForPath } from "@/src/lib/admin-rbac";
import { localizeHref, localeFromPathname, stripLocale } from "@/src/i18n/config";
import { useI18n } from "@/src/i18n/I18nProvider";

/** Verify staff access against the current profile before rendering admin content. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setUser = useAuthStore((state) => state.setUser);

  const {
    data: profile,
    isFetched,
    isError,
  } = useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: () => profileApi.getProfile(),
    enabled: isHydrated && Boolean(accessToken),
    retry: false,
  });

  const isStaff = profile?.staff_access_active === true;
  const requiredPermission = requiredPermissionForPath(stripLocale(pathname));
  const isAllowed = canAccess(profile?.staff_permissions, requiredPermission);

  // Keep the store's cached user in sync so is_staff-dependent UI elsewhere
  // (e.g. account navigation) doesn't need its own fetch.
  useEffect(() => {
    if (profile)
      setUser({
        is_staff: profile.is_staff,
        is_superuser: profile.is_superuser,
        staff_role: profile.staff_role,
        staff_permissions: profile.staff_permissions,
        staff_access_active: profile.staff_access_active,
        is_ambassador: profile.is_ambassador,
      });
  }, [profile, setUser]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken) {
      router.replace(localizeHref("/login", localeFromPathname(pathname)));
      return;
    }
    if (isFetched && !isError && profile && !profile.is_staff && !isStaff) {
      router.replace(localizeHref("/dashboard", localeFromPathname(pathname)));
    }
  }, [isHydrated, accessToken, isFetched, isError, isStaff, profile?.is_staff, pathname, router]);

  if (!isHydrated || !accessToken) return <GuardLoading />;
  if (!isFetched && !isError) {
    return <GuardLoading label={t("guard.confirming")} />;
  }
  if (!isError && profile && !profile.is_staff && !isStaff) return null;

  if (isError || !isStaff || !isAllowed) {
    return (
      <div className="grid min-h-screen place-items-center bg-mist px-6">
        <div className="max-w-md rounded-xl border border-crease bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gold-50 text-gold-600">
            <ShieldX className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            {t("guard.restricted")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {t("guard.restrictedBody")}
          </p>
          <LogoutButton className="mt-6" />
          {isStaff && <Link
            href="/admin"
            className="mt-6 inline-flex rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
          >
            {t("guard.returnOverview")}
          </Link>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

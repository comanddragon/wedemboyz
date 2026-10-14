"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { profileApi } from "@/src/lib/api";
import { queryKeys } from "@/src/lib/query-keys";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import { canAccess, requiredPermissionForPath } from "@/src/lib/admin-rbac";

/**
 * Wrap (admin)/layout.tsx's children in this. Fails closed.
 *
 * The login/register response doesn't send is_staff (see types/user.ts),
 * so this can't trust the one-time snapshot taken at login — it re-checks
 * GET /users/me/ on every mount instead, and only allows access once that
 * confirms is_staff: true. Until ProfileSerializer actually includes
 * is_staff server-side, that field stays undefined and this always
 * redirects — that's intentional. Don't "fix" this by defaulting
 * is_staff to true, and don't fall back to the stale login-time value
 * once the profile fetch has settled.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
  const requiredPermission = requiredPermissionForPath(pathname);
  const isAllowed = canAccess(profile?.staff_permissions, requiredPermission);

  // Keep the store's cached user in sync so is_staff-dependent UI elsewhere
  // (e.g. "Customer view" link visibility) doesn't need its own fetch.
  useEffect(() => {
    if (profile)
      setUser({
        is_staff: profile.is_staff,
        is_superuser: profile.is_superuser,
        staff_role: profile.staff_role,
        staff_permissions: profile.staff_permissions,
        staff_access_active: profile.staff_access_active,
      });
  }, [profile, setUser]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken) {
      router.replace("/login");
      return;
    }
    if ((isFetched || isError) && !isStaff) {
      router.replace("/dashboard");
    }
  }, [isHydrated, accessToken, isFetched, isError, isStaff, router]);

  if (!isHydrated || !accessToken) return null;
  if (!isFetched && !isError) return null; // still confirming against the live profile
  if (!isStaff) return null;

  if (!isAllowed) {
    return (
      <div className="grid min-h-screen place-items-center bg-mist px-6">
        <div className="max-w-md rounded-xl border border-crease bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gold-50 text-gold-600">
            <ShieldX className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-[1.75rem] font-light leading-tight tracking-[-0.03em] sm:text-[2rem] text-navy">
            Access restricted
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Your staff role does not include permission for this area. Ask the
            account owner if your responsibilities have changed.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
          >
            Return to overview
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

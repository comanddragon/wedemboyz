"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { profileApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/lib/stores/auth.store";

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

  const isStaff = profile?.is_staff === true;

  // Keep the store's cached user in sync so is_staff-dependent UI elsewhere
  // (e.g. "Customer view" link visibility) doesn't need its own fetch.
  useEffect(() => {
    if (profile) setUser({ is_staff: profile.is_staff });
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

  return <>{children}</>;
}

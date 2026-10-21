"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authApi } from "@/src/lib/api";
import { useAuthStore } from "@/src/lib/stores/auth.store";
import type { LoginInput, RegisterInput } from "@/src/types";

/**
 * Thin wrapper around auth.store.ts + lib/api/auth.ts. Components should use
 * this instead of touching the store or the API module directly — keeps the
 * "what happens on login/logout" logic in one place.
 */
export function useAuth() {
  const { accessToken, refreshToken, user, isHydrated, setTokens, clearAuth } =
    useAuthStore();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (tokens) => setTokens(tokens),
  });

  // A guest "registering" upgrades the existing account instead of making a
  // second one, so everything they booked as a guest stays theirs.
  const registerMutation = useMutation({
    mutationFn: (input: RegisterInput) =>
      user?.is_guest && accessToken
        ? authApi.claimGuestAccount(input)
        : authApi.register(input),
    onSuccess: (tokens) => setTokens(tokens),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    },
    onSettled: () => {
      // Always clear local state, even if the blacklist call failed (e.g.
      // network down) — a stuck "logged in" client is worse than a
      // still-valid-until-expiry server-side token.
      clearAuth();
      queryClient.clear();
    },
  });

  return {
    user,
    isAuthenticated: Boolean(accessToken),
    isGuest: Boolean(user?.is_guest),
    isHydrated,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}

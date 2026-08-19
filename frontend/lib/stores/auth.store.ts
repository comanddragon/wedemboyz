import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AuthTokens } from "@/types";

interface AuthUser {
  id: number;
  phone_number: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  setTokens: (tokens: AuthTokens) => void;
  setAccessToken: (token: string) => void;
  setUser: (patch: Partial<AuthUser>) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isHydrated: false,
      setTokens: (tokens:AuthTokens) =>
        set({
          accessToken: tokens.access,
          refreshToken: tokens.refresh,
          user: tokens.user,
        }),
      setAccessToken: (token:string) => set({ accessToken: token }),
      setUser: (patch: Partial<AuthUser>) =>
        set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),
      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "wedemboyz-auth",
      storage: createJSONStorage(() => localStorage),
      // Never rehydrate isHydrated=true from disk; it should only flip once
      // this store has actually finished reading from localStorage on mount.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state: AuthState | undefined) => {
        state?.setHydrated();
      },
    }
  )
);

/** Non-hook accessor for use outside React (e.g. the axios interceptor in lib/api/client.ts). */
export function getAuthState() {
  return useAuthStore.getState();
}

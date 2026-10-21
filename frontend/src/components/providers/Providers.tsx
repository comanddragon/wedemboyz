"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";

import { usePushRegistration } from "@/src/hooks/usePushRegistration";
import { createQueryClient } from "@/src/lib/query-client";
import { useAuthStore } from "@/src/lib/stores/auth.store";

function AuthHydration() {
  useEffect(() => {
    void Promise.resolve(useAuthStore.persist.rehydrate()).finally(() => {
      useAuthStore.getState().setHydrated();
    });
  }, []);

  return null;
}

function PushRegistration() {
  // Registers this browser as a push target once per login — see the hook
  // for why this alone isn't yet enough to receive a real push.
  usePushRegistration();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydration />
      <PushRegistration />
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

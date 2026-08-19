"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

import { usePushRegistration } from "@/hooks/usePushRegistration";
import { createQueryClient } from "@/lib/query-client";

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
      <PushRegistration />
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

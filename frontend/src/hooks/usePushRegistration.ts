"use client";

import { useEffect, useRef } from "react";

import { syncExistingPush } from "@/src/lib/pwa/service-worker";

import { useAuth } from "./useAuth";

/**
 * Keeps this device's push token fresh after login — but ONLY if the user
 * has already granted notification permission. It never prompts: the
 * permission request happens from the push toggle on the notifications page
 * (see enablePush in lib/pwa/service-worker.ts), where a user gesture exists.
 *
 * NOTE on the backend mismatch this does not close: services/push.py sends
 * through FCM's legacy HTTP API with an FCM registration token, while the
 * browser Push API yields a Web Push subscription. Until the backend sends
 * real Web Push (VAPID) — which also needs the subscription's p256dh/auth
 * keys, not just the endpoint — or this switches to Firebase getToken(),
 * registered devices will not receive pushes. Call this out before enabling
 * push for real users.
 */
export function usePushRegistration() {
  const { isAuthenticated, isHydrated } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || attempted.current) return;
    attempted.current = true;
    void syncExistingPush();
  }, [isHydrated, isAuthenticated]);
}

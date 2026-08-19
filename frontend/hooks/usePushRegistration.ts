"use client";

import { useEffect, useRef } from "react";

import { notificationsApi } from "@/lib/api";

import { useAuth } from "./useAuth";

// Provision a VAPID keypair and set this to the public half to enable push.
// Without it, this hook silently no-ops — there's no way to create a valid
// browser push subscription without one.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        output[i] = rawData.charCodeAt(i);
    }
    return output;
}

/**
 * Registers this browser as a push target on login, per
 * POST /api/v1/notifications/device-tokens/ — without a registered token
 * there's nothing to deliver a push to, regardless of the user's
 * push_enabled preference (that flag only gates whether an *already
 * registered* device gets sent to; see functionality audit §2/§5).
 *
 * NOTE on the backend mismatch this stops short of closing: services/push.py
 * sends via FCM's legacy HTTP API, which expects an FCM registration token
 * (normally obtained through the Firebase JS SDK's messaging.getToken()).
 * This hook instead uses the standard, dependency-free browser Push API and
 * registers the subscription's endpoint as the token. That's enough to
 * exercise the full round-trip (permission → subscription → device-tokens/
 * POST) without adding the Firebase SDK, but it won't actually receive a
 * push until either (a) the backend switches to sending real Web Push
 * (VAPID) instead of the FCM legacy API, or (b) this hook is swapped to use
 * Firebase's getToken() once the project is wired up for it. Call this out
 * before enabling push for real users.
 */
export function usePushRegistration() {
    const { isAuthenticated, isHydrated } = useAuth();
    const attempted = useRef(false);

    useEffect(() => {
        if (!isHydrated || !isAuthenticated || attempted.current) return;
        if (!VAPID_PUBLIC_KEY) return;
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

        attempted.current = true;

        async function register() {
            try {
                if (Notification.permission === "denied") return;
                const permission =
                    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
                if (permission !== "granted") return;

                const registration = await navigator.serviceWorker.register("/push-worker.js");
                let subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
                    });
                }

                await notificationsApi.registerDeviceToken({
                    token: subscription.endpoint,
                    platform: "WEB",
                });
            } catch {
                // Best-effort — a failed push registration shouldn't interrupt
                // the rest of the app. The push toggle just won't deliver yet.
            }
        }

        register();
    }, [isHydrated, isAuthenticated]);
}

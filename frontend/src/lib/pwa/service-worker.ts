import { notificationsApi } from "@/src/lib/api";

/**
 * Single owner of the service worker and the browser side of web push.
 * Everything that needs the worker (install support, push opt-in) goes
 * through here so it is registered exactly once.
 */

const WORKER_URL = "/push-worker.js";

// Provision a VAPID keypair and set this to the public half to enable push.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register(WORKER_URL, { updateViaCache: "none" })
      .catch(() => null);
  }
  return registrationPromise;
}

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

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type EnablePushResult =
  | "enabled"
  | "denied"
  | "unsupported"
  | "not-configured"
  | "error";

async function subscribeAndRegister(): Promise<EnablePushResult> {
  const registration = await registerServiceWorker();
  if (!registration) return "unsupported";
  const ready = await navigator.serviceWorker.ready;
  let subscription = await ready.pushManager.getSubscription();
  if (!subscription) {
    subscription = await ready.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
    });
  }
  await notificationsApi.registerDeviceToken({
    token: subscription.endpoint,
    platform: "WEB",
  });
  return "enabled";
}

/**
 * Ask for notification permission and register this device for push.
 * Must be called from a user gesture (e.g. flipping the push toggle):
 * browsers suppress, and iOS ignores, permission prompts that nobody asked for.
 */
export async function enablePush(): Promise<EnablePushResult> {
  if (!isPushSupported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  try {
    if (Notification.permission === "denied") return "denied";
    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
    if (permission !== "granted") return "denied";
    return await subscribeAndRegister();
  } catch {
    return "error";
  }
}

/**
 * Silent re-sync for users who already granted permission: refreshes the
 * device token on login without ever showing a prompt.
 */
export async function syncExistingPush(): Promise<void> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return;
  if (Notification.permission !== "granted") return;
  try {
    await subscribeAndRegister();
  } catch {
    // Best-effort; never interrupt the app.
  }
}

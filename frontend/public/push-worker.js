// Minimal Web Push service worker for WEDEMBOYZ.
//
// Registered once by lib/pwa/service-worker.ts. This only handles the
// browser-side Push API contract (show a notification, focus/open the app
// on click) — it does not know anything about FCM. See that hook's comment
// for what's still needed server-side to deliver a push here.

self.addEventListener("push", (event) => {
    let payload = { title: "WEDEMBOYZ", body: "You have a new update." };
    if (event.data) {
        try {
            payload = { ...payload, ...event.data.json() };
        } catch {
            payload.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            data: { url: payload.url || "/notifications" },
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || "/notifications";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && "focus" in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        }),
    );
});

// Cache only the public offline shell. Orders, API responses and user images
// never enter the service-worker cache, including after logout.
const OFFLINE_CACHE = "wedemboyz-offline-v1";
self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.addAll([
        "/offline.html", "/icons/icon-192.png",
    ])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("wedemboyz-offline-") && key !== OFFLINE_CACHE)
            .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;
    if (event.request.mode === "navigate") {
        event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    } else if (["/offline.html", "/icons/icon-192.png"].includes(url.pathname)) {
        event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    }
});

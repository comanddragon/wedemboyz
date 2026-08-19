// Minimal Web Push service worker for WEDEMBOYZ.
//
// Registered by hooks/usePushRegistration.ts. This only handles the
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
            icon: "/favicon.ico",
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

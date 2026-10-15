// Web-push service worker: shows arrival notifications and routes
// clicks to the alerts page. Deployed statically from /public — no build
// step (vanilla JS on purpose so the simplest changes survive).
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Alert", {
      body: data.detail ?? "",
      icon: "/logo.svg",
      data: { url: data.url ?? "/admin/environment" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data.url));
});

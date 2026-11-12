"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

export type PushStatus =
  | "checking"
  | "ask"
  | "blocked"
  | "unsupported"
  | "subscribed"
  | "unavailable";

// A browser can only subscribe when it has a service worker, the Push API,
// the Notification API and a secure origin. Anything else is unsupported.
export const supportsPush = (): boolean =>
  typeof window !== "undefined" &&
  window.isSecureContext &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// Standard base64url -> bytes (applicationServerKey needs raw bytes).
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = `${base64Url.replaceAll("-", "+").replaceAll("_", "/")}${padding}`;
  const raw = atob(base64);
  return Uint8Array.from(Array.from(raw, (char) => char.charCodeAt(0)));
}

// Reuse the browser's existing subscription when there is one, so a second
// call cannot create a duplicate endpoint for the same device.
async function getOrCreateSubscription(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription> {
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const applicationServerKey = urlBase64ToUint8Array(
    vapidPublicKey,
  ) as BufferSource;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
}

export function usePushNotifications() {
  const vapidPublicKey = useQuery(api.push.vapidPublicKey, {});
  const subscribe = useMutation(api.push.subscribe);
  const [status, setStatus] = useState<PushStatus>("checking");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Store the endpoint against the signed-in user. Re-stamping an existing
  // subscription repairs rows created before recipientKey existed.
  const saveSubscription = useCallback(
    async (subscription: PushSubscription) => {
      const keys = subscription.toJSON().keys;
      await subscribe({
        endpoint: subscription.endpoint,
        p256dh: keys?.p256dh ?? "",
        auth: keys?.auth ?? "",
      });
    },
    [subscribe],
  );

  const recheck = useCallback(async () => {
    if (!supportsPush()) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (!subscription) {
        setStatus("ask");
        return;
      }

      // The browser is subscribed, so delivery works even if re-stamping
      // fails (offline, transient server error).
      await saveSubscription(subscription).catch(() => undefined);
      setStatus("subscribed");
    } catch {
      setStatus("ask");
    }
  }, [saveSubscription]);

  const enable = useCallback(async () => {
    if (!vapidPublicKey) return;

    // Must stay the first call in the click handler: any await before this
    // drops the user gesture and the browser never shows the prompt.
    const permission = await Notification.requestPermission();

    if (permission === "denied") {
      setStatus("blocked");
      return;
    }

    if (permission !== "granted") {
      setError("Notifications were not allowed. Choose Allow and try again.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await getOrCreateSubscription(
        registration,
        vapidPublicKey,
      );

      await saveSubscription(subscription);
      setStatus("subscribed");
    } catch {
      setStatus("ask");
      setError(
        "Could not turn on notifications. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [saveSubscription, vapidPublicKey]);

  // Missing keys are the only fail-open path: no browser could ever satisfy
  // the gate without them.
  useEffect(() => {
    if (vapidPublicKey === undefined) return;

    if (vapidPublicKey === null) {
      console.error(
        "Push gate: VAPID_PUBLIC_KEY is not configured, skipping the gate.",
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unavailable");
      return;
    }

    void recheck();

    // Permission can change outside the app while the tab sits in the
    // background, so re-check whenever the page wakes.
    const onWake = () => void recheck();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [vapidPublicKey, recheck]);

  return {
    status,
    error,
    busy,
    available: typeof vapidPublicKey === "string" && supportsPush(),
    enable,
    recheck,
  };
}

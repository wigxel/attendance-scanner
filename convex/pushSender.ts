"use node";
import { api, components } from "./_generated/api";
import { internalAction } from "./_generated/server";

// — web-push fan-out for roomMetrics anomalies. The subscription storage
// and VAPID config live in push.ts; this sender runs on a root cron every
// 2 min (the roomMetrics component can't schedule app functions), matching
// its smoothing cadence — bucket-to-push latency is ≤ ~4 min.

const PUSH_BATCH = 20;

const ALERT_TITLES: Record<string, string> = {
  temperature_breach: "Temperature anomaly",
};

type AlertRow = {
  _id: string;
  type: string;
  detail: string;
};

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export const deliverTemperatureAlerts = internalAction({
  args: {},
  handler: async (ctx) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.warn("temperature alert push: VAPID keys not set, skipping");
      return;
    }

    const alerts = await ctx.runQuery(
      components.roomMetrics.alerts.unnotifiedAlerts,
      {},
    );
    if (alerts.length === 0) return;

    // dynamic import: test globs run in vitest edge-runtime, which can't
    // load web-push's node builtins at import time. This file is imported
    // there but only executed in real node actions. web-push is CommonJS,
    // so its API may hang off the default export depending on interop.
    const webpushModule = await import("web-push");
    const webpush = (
      "default" in webpushModule ? webpushModule.default : webpushModule
    ) as typeof import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
      publicKey,
      privateKey,
    );

    const subscriptions = await ctx.runQuery(api.push.listSubscriptions, {});
    if (subscriptions.length === 0) return;

    const notification = (alert: AlertRow) => ({
      title: ALERT_TITLES[alert.type] ?? alert.type,
      detail: alert.detail,
      url: "/admin/environment",
    });

    for (const alert of alerts.slice(0, PUSH_BATCH) as AlertRow[]) {
      await Promise.allSettled(
        (subscriptions as SubscriptionRow[]).map((subscription) =>
          webpush
            .sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: { p256dh: subscription.p256dh, auth: subscription.auth },
              },
              JSON.stringify(notification(alert)),
            )
            .catch((error) => {
              // endpoint gone or push service says drop it
              if (error.statusCode === 404 || error.statusCode === 410)
                return ctx.runMutation(api.push.unsubscribe, {
                  endpoint: subscription.endpoint,
                });
              // leave a trace in deployment logs — allSettled below
              // would otherwise swallow this, and notifiedAt is set
              // after every attempt regardless
              console.error(
                `push send failed (${error.statusCode ?? "unknown"}): ${String(error.message).slice(0, 200)}`,
              );
              throw error;
            }),
        ),
      );

      // marked after the attempt: no retry machinery — a transient miss
      // still surfaces in the alerts UI, and dead subs are removed above.
      await ctx.runMutation(components.roomMetrics.alerts.markNotified, {
        alertId: alert._id,
      });
    }
  },
});

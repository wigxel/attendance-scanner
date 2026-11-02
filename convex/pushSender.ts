import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// — temperature alerts are just another notification now. This producer
// converts unnotified roomMetrics alerts into notification queue rows and
// marks them handled; push fan-out, retries and the send log live in the
// notifications service (convex/notifications.ts + notificationSender.ts).
// Runs on a root cron every 2 min, matching roomMetrics' smoothing cadence.

const PUSH_BATCH = 20;

const ALERT_TITLES: Record<string, string> = {
  temperature_breach: "Temperature anomaly",
};

type AlertRow = {
  _id: string;
  type: string;
  detail: string;
};

export const deliverTemperatureAlerts = internalAction({
  args: {},
  handler: async (ctx) => {
    // without VAPID keys there is no push transport at all — leave alerts
    // unnotified so they go out once the keys are set (see deploy task)
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn("temperature alert push: VAPID keys not set, skipping");
      return null;
    }

    const alerts = (await ctx.runQuery(
      components.roomMetrics.alerts.unnotifiedAlerts,
      {},
    )) as AlertRow[];
    if (alerts.length === 0) return null;

    for (const alert of alerts.slice(0, PUSH_BATCH)) {
      await ctx.runMutation(internal.notifications.send, {
        recipientKey: "broadcast:environment-alerts",
        channels: ["push"],
        title: ALERT_TITLES[alert.type] ?? alert.type,
        body: alert.detail,
        url: "/admin/environment",
        // markNotified is the real dedupe; this keeps a re-run from double-queuing
        dedupeKey: `room-alert:${alert._id}`,
      });

      await ctx.runMutation(components.roomMetrics.alerts.markNotified, {
        alertId: alert._id,
      });
    }

    return null;
  },
});

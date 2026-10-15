import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";

type TemperatureAlert = Doc<"alerts">;

// — shape every alert producer passes in
type NewAlert = {
  type: string;
  roomId: string;
  dedupeKey: string;
  value?: number;
  detail: string;
  severity?: string;
};

// — the one write path for all alert kinds. Insert-if-new by dedupeKey;
// returns the new id, or null when an alert with that key already exists.
export const ensureAlert = async (
  ctx: MutationCtx,
  alert: NewAlert,
): Promise<string | null> => {
  const existing = await ctx.db
    .query("alerts")
    .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", alert.dedupeKey))
    .unique();

  if (existing) return null;

  return ctx.db.insert("alerts", {
    type: alert.type,
    roomId: alert.roomId,
    dedupeKey: alert.dedupeKey,
    value: alert.value,
    detail: alert.detail,
    severity: alert.severity,
    acknowledged: false,
  });
};

export const recentAlerts = query({
  args: { type: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<TemperatureAlert[]> => {
    const alertLimit = Math.min(args.limit ?? 20, 50);
    return await ctx.db
      .query("alerts")
      .order("desc")
      .filter((row) =>
        args.type === undefined ? true : row.eq(row.field("type"), args.type),
      )
      .take(alertLimit);
  },
});

export const acknowledge = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.alertId, { acknowledged: true });
  },
});

// — push-delivery support: the app-level sender ("use node", can't be
// scheduled from inside the component) reads open alerts and marks them
// notified after sending.
export const unnotifiedAlerts = query({
  args: {},
  handler: async (ctx): Promise<TemperatureAlert[]> => {
    return await ctx.db
      .query("alerts")
      .order("desc")
      .filter((row) => row.eq(row.field("notifiedAt"), undefined))
      .take(20);
  },
});

export const markNotified = mutation({
  args: { alertId: v.id("alerts") },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.alertId, { notifiedAt: Date.now() });
  },
});

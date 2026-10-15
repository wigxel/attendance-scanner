import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// — push subscription storage (app concern, not part of the roomMetrics
// component). The "use node" sender lives in pushSender.ts; node files
// can only contain actions, so queries/mutations stay here.

type PushSubscriptionDoc = Doc<"pushSubscriptions">;

export const vapidPublicKey = query({
  args: {},
  handler: async (): Promise<string | null> => {
    return process.env.VAPID_PUBLIC_KEY ?? null;
  },
});

export const subscribe = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        p256dh: args.p256dh,
        auth: args.auth,
        createdAt: Date.now(),
      });
      return;
    }

    await ctx.db.insert("pushSubscriptions", {
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      createdAt: Date.now(),
    });
  },
});

// removes by endpoint — used by opt-out and by the send path to drop
// dead subscriptions (404/410) the push service reports.
export const unsubscribe = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) await ctx.db.delete(existing._id);
  },
});

export const listSubscriptions = query({
  args: {},
  handler: async (ctx): Promise<PushSubscriptionDoc[]> => {
    return await ctx.db.query("pushSubscriptions").take(500);
  },
});

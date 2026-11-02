import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { readId } from "./myFunctions";

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

// Stamps the signed-in user on the row so a delivery addressed to
// `user:<id>` reaches only that user's devices. Unauthenticated browsers
// (and rows stored before recipientKey existed) stay unkeyed and only
// receive broadcast deliveries.
export const subscribe = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const userId = await readId(ctx);
    const recipientKey = userId ? `user:${userId}` : undefined;

    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        p256dh: args.p256dh,
        auth: args.auth,
        recipientKey: recipientKey ?? existing.recipientKey,
        createdAt: Date.now(),
      });
      return;
    }

    await ctx.db.insert("pushSubscriptions", {
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      recipientKey,
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

// omit recipientKey for the whole fan-out list (broadcasts)
export const listSubscriptions = query({
  args: { recipientKey: v.optional(v.string()) },
  handler: async (ctx, args): Promise<PushSubscriptionDoc[]> => {
    const key = args.recipientKey;

    if (key !== undefined) {
      return await ctx.db
        .query("pushSubscriptions")
        .withIndex("by_recipient_key", (q) => q.eq("recipientKey", key))
        .take(500);
    }

    return await ctx.db.query("pushSubscriptions").take(500);
  },
});

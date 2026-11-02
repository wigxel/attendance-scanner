import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { readId } from "./myFunctions";

// App-facing notification API. Every feature sends through `send`; delivery
// rows, retries and preferences live in the notifications component
// (convex/components/notifications), transports in notificationSender.ts.

const channel = v.union(v.literal("push"), v.literal("email"));
const status = v.union(
  v.literal("pending"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("failed"),
);

const userKey = (userId: string) => `user:${userId}`;

// Call from mutations — it only queues, so it never blocks on a network call.
// A queued notification is retried by the drain cron if the send fails.
export const send = internalMutation({
  args: {
    recipientKey: v.string(),
    email: v.optional(v.string()),
    channels: v.optional(v.array(channel)),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ queued: string[]; skipped: string[] }> => {
    const { queued, skipped } = await ctx.runMutation(
      components.notifications.index.enqueue,
      {
        recipientKey: args.recipientKey,
        to: args.email,
        channels: args.channels,
        title: args.title,
        body: args.body,
        url: args.url,
        dedupeKey: args.dedupeKey,
      },
    );

    if (queued.length > 0) {
      await ctx.scheduler.runAfter(0, internal.notificationSender.deliver, {});
    }

    return { queued, skipped };
  },
});

export const setPreferences = mutation({
  args: { push: v.optional(v.boolean()), email: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await readId(ctx);
    if (!userId) throw new ConvexError("Authentication required.");

    return await ctx.runMutation(
      components.notifications.index.setPreferences,
      {
        recipientKey: userKey(userId),
        push: args.push,
        email: args.email,
      },
    );
  },
});

export const myPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await readId(ctx);
    if (!userId) return null;

    return await ctx.runQuery(components.notifications.index.getPreferences, {
      recipientKey: userKey(userId),
    });
  },
});

// send log, newest first — failures carry the transport error message
export const recent = internalQuery({
  args: {
    recipientKey: v.optional(v.string()),
    status: v.optional(status),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(
      components.notifications.index.listDeliveries,
      args,
    );
  },
});

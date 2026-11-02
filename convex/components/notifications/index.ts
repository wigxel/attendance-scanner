import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";

// Notification queue. Transports (web-push, email) live in the app, because
// they need VAPID keys, Node builtins and the app's push subscriptions —
// this component owns the durable queue, preferences and the send log.

const channel = v.union(v.literal("push"), v.literal("email"));
const status = v.union(
  v.literal("pending"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("failed"),
);

const MAX_ATTEMPTS = 3;
// a claimed row whose lease expired means the sender died mid-flight
const LEASE_MS = 5 * 60_000;
const RETRY_BASE_MS = 60_000;
const RETRY_CAP_MS = 60 * 60_000;
const RETENTION_MS = 30 * 24 * 60 * 60_000;

const backoff = (attempts: number) =>
  Math.min(RETRY_BASE_MS * 2 ** Math.max(attempts - 1, 0), RETRY_CAP_MS);

const DEFAULT_CHANNELS: readonly ("push" | "email")[] = ["push", "email"];

type Delivery = Doc<"deliveries">;

export const enqueue = mutation({
  args: {
    recipientKey: v.string(),
    to: v.optional(v.string()),
    channels: v.optional(v.array(channel)),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ queued: Id<"deliveries">[]; skipped: string[] }> => {
    if (args.dedupeKey) {
      const existing = await ctx.db
        .query("deliveries")
        .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
        .first();
      if (existing) return { queued: [], skipped: ["duplicate"] };
    }

    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_recipient_key", (q) =>
        q.eq("recipientKey", args.recipientKey),
      )
      .unique();

    const channels = args.channels ?? DEFAULT_CHANNELS;
    const now = Date.now();
    const queued: Id<"deliveries">[] = [];
    const skipped: string[] = [];

    for (const requested of channels) {
      if (prefs && !prefs[requested]) {
        skipped.push(`opted out of ${requested}`);
        continue;
      }
      if (requested === "email" && !args.to) {
        skipped.push("no email address");
        continue;
      }

      queued.push(
        await ctx.db.insert("deliveries", {
          recipientKey: args.recipientKey,
          channel: requested,
          to: args.to,
          title: args.title,
          body: args.body,
          url: args.url,
          status: "pending",
          attempts: 0,
          nextAttemptAt: now,
          dedupeKey: args.dedupeKey,
        }),
      );
    }

    return { queued, skipped };
  },
});

// Atomically flips due rows to "sending" and returns them. Also reclaims rows
// whose lease expired, so a crashed sender does not strand a notification.
export const claim = mutation({
  args: { now: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Delivery[]> => {
    const limit = Math.min(args.limit ?? 20, 50);

    const due = await ctx.db
      .query("deliveries")
      .withIndex("by_status_and_next_attempt", (q) =>
        q.eq("status", "pending").lte("nextAttemptAt", args.now),
      )
      .take(limit);

    const stale = await ctx.db
      .query("deliveries")
      .withIndex("by_status_and_next_attempt", (q) =>
        q.eq("status", "sending").lte("nextAttemptAt", args.now),
      )
      .take(limit);

    const claimed: Delivery[] = [];
    for (const row of [...stale, ...due].slice(0, limit)) {
      // stale rows already counted their attempt when first claimed
      const attempts =
        row.status === "pending" ? row.attempts + 1 : row.attempts;
      const patch = {
        status: "sending" as const,
        attempts,
        nextAttemptAt: args.now + LEASE_MS,
      };
      await ctx.db.patch(row._id, patch);
      claimed.push({ ...row, ...patch });
    }

    return claimed;
  },
});

export const markSent = mutation({
  args: { deliveryId: v.id("deliveries") },
  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    await ctx.db.patch(args.deliveryId, {
      status: "sent",
      sentAt: now,
      // completed rows reuse nextAttemptAt as "finished at", so purge can age
      // them off the status index without a second index
      nextAttemptAt: now,
      error: undefined,
    });
  },
});

export const markFailed = mutation({
  args: {
    deliveryId: v.id("deliveries"),
    error: v.string(),
    retryable: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<void> => {
    const row = await ctx.db.get(args.deliveryId);
    if (!row) return;

    const now = Date.now();
    const retry = args.retryable !== false && row.attempts < MAX_ATTEMPTS;
    await ctx.db.patch(args.deliveryId, {
      status: retry ? "pending" : "failed",
      error: args.error.slice(0, 500),
      nextAttemptAt: retry ? now + backoff(row.attempts) : now,
    });
  },
});

export const setPreferences = mutation({
  args: {
    recipientKey: v.string(),
    push: v.optional(v.boolean()),
    email: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Doc<"preferences">> => {
    const existing = await ctx.db
      .query("preferences")
      .withIndex("by_recipient_key", (q) =>
        q.eq("recipientKey", args.recipientKey),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      const patch = {
        push: args.push ?? existing.push,
        email: args.email ?? existing.email,
        updatedAt: now,
      };
      await ctx.db.patch(existing._id, patch);
      return { ...existing, ...patch };
    }

    const id = await ctx.db.insert("preferences", {
      recipientKey: args.recipientKey,
      push: args.push ?? true,
      email: args.email ?? true,
      updatedAt: now,
    });
    const created = await ctx.db.get(id);
    if (!created) throw new Error("preferences insert vanished");
    return created;
  },
});

export const getPreferences = query({
  args: { recipientKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("preferences")
      .withIndex("by_recipient_key", (q) =>
        q.eq("recipientKey", args.recipientKey),
      )
      .unique();
  },
});

export const listDeliveries = query({
  args: {
    recipientKey: v.optional(v.string()),
    status: v.optional(status),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Delivery[]> => {
    const limit = Math.min(args.limit ?? 50, 100);

    if (args.recipientKey) {
      const recipientKey = args.recipientKey;
      return await ctx.db
        .query("deliveries")
        .withIndex("by_recipient_key", (q) =>
          q.eq("recipientKey", recipientKey),
        )
        .order("desc")
        .take(limit);
    }

    if (args.status) {
      const status = args.status;
      return await ctx.db
        .query("deliveries")
        .withIndex("by_status_and_next_attempt", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
    }

    return await ctx.db.query("deliveries").order("desc").take(limit);
  },
});

// status is on the index prefix; "sent"/"failed" rows are the only ones aged out
export const purgeOld = internalMutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const before = Date.now() - RETENTION_MS;
    let deleted = 0;
    for (const done of ["sent", "failed"] as const) {
      const rows = await ctx.db
        .query("deliveries")
        .withIndex("by_status_and_next_attempt", (q) =>
          q.eq("status", done).lte("nextAttemptAt", before),
        )
        .take(100);
      for (const row of rows) {
        await ctx.db.delete(row._id);
        deleted++;
      }
    }
    return deleted;
  },
});

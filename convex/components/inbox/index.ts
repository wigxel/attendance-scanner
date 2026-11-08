import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// In-app inbox. Rows are the durable record; reading and archiving are
// per-recipient, and every mutating call checks the key before it patches.

const MAX_ROWS = 100;
const DEFAULT_PAGE = 20;

type Notification = Doc<"notifications">;

// "not archived" is a missing field, so it cannot live in an index.
const isOpen = (row: Notification) => row.archivedAt === undefined;

export const enqueue = mutation({
  args: {
    recipientKey: v.string(),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ id: Id<"notifications">; duplicate: boolean }> => {
    if (args.dedupeKey) {
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
        .first();
      if (existing) return { id: existing._id, duplicate: true };
      // ponytail: read-then-insert, so two concurrent sends with the same key
      // can both pass. Producers here are serial; add a lock if that changes.
    }

    const id = await ctx.db.insert("notifications", {
      recipientKey: args.recipientKey,
      title: args.title,
      body: args.body,
      url: args.url,
      dedupeKey: args.dedupeKey,
      createdAt: Date.now(),
    });

    return { id, duplicate: false };
  },
});

export const list = query({
  args: {
    recipientKey: v.string(),
    archived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Notification[]> => {
    const limit = Math.min(args.limit ?? DEFAULT_PAGE, MAX_ROWS);

    return await ctx.db
      .query("notifications")
      .withIndex("by_recipient_key_and_created_at", (q) =>
        q.eq("recipientKey", args.recipientKey),
      )
      .filter((q) =>
        args.archived
          ? q.neq(q.field("archivedAt"), undefined)
          : q.eq(q.field("archivedAt"), undefined),
      )
      .order("desc")
      .take(limit);
  },
});

// unread and not archived
export const unreadCount = query({
  args: { recipientKey: v.string() },
  handler: async (ctx, args): Promise<number> => {
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_key_and_created_at", (q) =>
        q.eq("recipientKey", args.recipientKey),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("readAt"), undefined),
          q.eq(q.field("archivedAt"), undefined),
        ),
      )
      .take(MAX_ROWS);

    return rows.length;
  },
});

export const markRead = mutation({
  args: { recipientKey: v.string(), id: v.id("notifications") },
  handler: async (ctx, args): Promise<void> => {
    const row = await ctx.db.get(args.id);
    if (!row || row.recipientKey !== args.recipientKey) return;
    if (row.readAt !== undefined) return;

    await ctx.db.patch(row._id, { readAt: Date.now() });
  },
});

export const markAllRead = mutation({
  args: { recipientKey: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_key_and_created_at", (q) =>
        q.eq("recipientKey", args.recipientKey),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("readAt"), undefined),
          q.eq(q.field("archivedAt"), undefined),
        ),
      )
      .take(MAX_ROWS);

    const now = Date.now();
    for (const row of rows) await ctx.db.patch(row._id, { readAt: now });
  },
});

export const archive = mutation({
  args: { recipientKey: v.string(), id: v.id("notifications") },
  handler: async (ctx, args): Promise<void> => {
    const row = await ctx.db.get(args.id);
    if (!row || row.recipientKey !== args.recipientKey) return;
    if (!isOpen(row)) return;

    await ctx.db.patch(row._id, { archivedAt: Date.now() });
  },
});

export const unarchive = mutation({
  args: { recipientKey: v.string(), id: v.id("notifications") },
  handler: async (ctx, args): Promise<void> => {
    const row = await ctx.db.get(args.id);
    if (!row || row.recipientKey !== args.recipientKey) return;
    if (isOpen(row)) return;

    await ctx.db.patch(row._id, { archivedAt: undefined });
  },
});

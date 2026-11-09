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

const channel = v.union(
  v.literal("push"),
  v.literal("email"),
  v.literal("inapp"),
);
const status = v.union(
  v.literal("pending"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("failed"),
);

const userKey = (userId: string) => `user:${userId}`;

// The inbox component's row shape. Component return values come back as
// `any`, so this is what gives the app wrappers and the bell a real type.
type InboxNotification = {
  _id: string;
  _creationTime: number;
  recipientKey: string;
  title: string;
  body: string;
  url?: string;
  dedupeKey?: string;
  readAt?: number;
  archivedAt?: number;
  createdAt: number;
};

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
    const channels = args.channels ?? (["push", "email"] as const);
    const transport = channels.filter(
      (c): c is "push" | "email" => c !== "inapp",
    );

    // Only addressed users get an inbox row. A broadcast key would give
    // every admin one shared read state, so it stays out.
    if (channels.includes("inapp") && args.recipientKey.startsWith("user:")) {
      await ctx.runMutation(components.inbox.index.enqueue, {
        recipientKey: args.recipientKey,
        title: args.title,
        body: args.body,
        url: args.url,
        dedupeKey: args.dedupeKey,
      });
    }

    if (transport.length === 0) return { queued: [], skipped: [] };

    const { queued, skipped } = await ctx.runMutation(
      components.notifications.index.enqueue,
      {
        recipientKey: args.recipientKey,
        to: args.email,
        channels: transport,
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

// Dev-only helper behind the bell's test button. The button is gated by
// NODE_ENV in the UI, but Convex always inlines NODE_ENV as "production" in
// the bundle, so a server-side check cannot distinguish deployments. Only the
// caller's own inbox is written, so the blast radius is their own row.
export const sendTest = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await readId(ctx);
    if (!userId) throw new ConvexError("Authentication required.");

    await ctx.runMutation(components.inbox.index.enqueue, {
      recipientKey: userKey(userId),
      title: "Test notification",
      body: "This is a test from the development build.",
      url: "/admin/environment",
    });

    return "success" as const;
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

// Inbox keys for operator alerts. `settings:update` is the privilege that
// lets someone fix the ZeptoMail account, so those are the people who need
// to hear about it.
export const alertRecipientKeys = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const identities = (await ctx.runQuery(
      components.wigxel_acl.identities.listIdentitiesByPrivilege,
      { privilege: "settings:update" },
    )) as Array<{ identity: string }>;

    return identities.map((entry) => userKey(entry.identity));
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

// — in-app inbox (convex/components/inbox). The component is app-agnostic;
// these wrappers supply the Clerk user key.

export const inbox = query({
  args: {
    archived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<InboxNotification[] | null> => {
    const userId = await readId(ctx);
    if (!userId) return null;

    return await ctx.runQuery(components.inbox.index.list, {
      recipientKey: userKey(userId),
      ...args,
    });
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await readId(ctx);
    if (!userId) return 0;

    return await ctx.runQuery(components.inbox.index.unreadCount, {
      recipientKey: userKey(userId),
    });
  },
});

const requireReadId = async (
  ctx: Parameters<typeof readId>[0],
): Promise<string> => {
  const userId = await readId(ctx);
  if (!userId) throw new ConvexError("Authentication required.");
  return userKey(userId);
};

export const markRead = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(components.inbox.index.markRead, {
      recipientKey: await requireReadId(ctx),
      id: args.id,
    });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(components.inbox.index.markAllRead, {
      recipientKey: await requireReadId(ctx),
    });
  },
});

export const archive = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(components.inbox.index.archive, {
      recipientKey: await requireReadId(ctx),
      id: args.id,
    });
  },
});

export const unarchive = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(components.inbox.index.unarchive, {
      recipientKey: await requireReadId(ctx),
      id: args.id,
    });
  },
});

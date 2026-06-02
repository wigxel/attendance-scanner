import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { authGuard } from "./myFunctions";

export const log = internalMutation({
  args: {
    action: v.string(),
    actorId: v.string(),
    targetId: v.optional(v.string()),
    targetType: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const adminProfile = await authGuard(ctx, "admin");
    if (!adminProfile) {
      throw new ConvexError("Not authorized");
    }

    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .take(100);

    const actorIds = [...new Set(logs.map((l) => l.actorId))];
    const actors = await Promise.all(
      actorIds.map((id) =>
        ctx.db
          .query("profile")
          .filter((q) => q.eq(q.field("id"), id))
          .first(),
      ),
    );
    const actorMap = Object.fromEntries(
      actors.filter(Boolean).map((a) => [a!.id, a]),
    );

    const ownerIds = [
      ...new Set(
        logs
          .map((l) => {
            if (!l.metadata) return null;
            try {
              const m = JSON.parse(l.metadata);
              return m.ownerUserId ?? null;
            } catch {
              return null;
            }
          })
          .filter((id): id is string => id !== null),
      ),
    ];

    const owners = await Promise.all(
      ownerIds.map((id) =>
        ctx.db
          .query("profile")
          .filter((q) => q.eq(q.field("id"), id))
          .first(),
      ),
    );
    const ownerMap = Object.fromEntries(
      owners.filter(Boolean).map((a) => [a!.id, a]),
    );

    return logs.map((log) => {
      let owner: (typeof owners)[number] | null = null;
      if (log.metadata) {
        try {
          const m = JSON.parse(log.metadata);
          if (m.ownerUserId && ownerMap[m.ownerUserId]) {
            owner = ownerMap[m.ownerUserId];
          }
        } catch {
          // ignore parse errors
        }
      }

      return {
        ...log,
        actor: log.actorId ? (actorMap[log.actorId] ?? null) : null,
        owner,
      };
    });
  },
});

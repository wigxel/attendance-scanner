import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePrivilege } from "./utils";

export const listIdentities = query({
  handler: async (ctx) => {
    const auth = await requirePrivilege(ctx, "user:assign:role");
    if (!auth.success) return [];

    const identities = await ctx.db.query("identities").collect();
    return Promise.all(
      identities.map(async (identity) => {
        const role = await ctx.db.get(identity.role);
        return { ...identity, role };
      }),
    );
  },
});

export const registerIdentity = mutation({
  args: {
    identity: v.string(),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const auth = await requirePrivilege(ctx, "user:assign:role");
    if (!auth.success) return auth;

    const existing = await ctx.db
      .query("identities")
      .withIndex("by_identity", (q) => q.eq("identity", args.identity))
      .first();

    if (existing) {
      return { success: false, error: "This identity is already registered." };
    }

    const role = await ctx.db.get(args.roleId);
    if (!role) return { success: false, error: "Role not found." };

    const now = new Date().toISOString();
    const identityId = await ctx.db.insert("identities", {
      identity: args.identity,
      role: args.roleId,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, data: { identityId } };
  },
});

export const updateIdentityRole = mutation({
  args: {
    identityId: v.id("identities"),
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const auth = await requirePrivilege(ctx, "user:assign:role");
    if (!auth.success) return auth;

    const identity = await ctx.db.get(args.identityId);
    if (!identity) return { success: false, error: "Identity not found." };

    const role = await ctx.db.get(args.roleId);
    if (!role) return { success: false, error: "Role not found." };

    await ctx.db.patch(args.identityId, {
      role: args.roleId,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, data: { identityId: args.identityId } };
  },
});

export const deleteIdentity = mutation({
  args: { identityId: v.id("identities") },
  handler: async (ctx, args) => {
    const auth = await requirePrivilege(ctx, "user:assign:role");
    if (!auth.success) return auth;

    const identity = await ctx.db.get(args.identityId);
    if (!identity) return { success: false, error: "Identity not found." };

    await ctx.db.delete(args.identityId);
    return { success: true, data: { identityId: args.identityId } };
  },
});

export const hasPrivilege = query({
  args: {
    identity: v.string(),
    privilege: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query("identities")
      .withIndex("by_identity", (q) => q.eq("identity", args.identity))
      .unique();

    if (!identity) return { valid: false };

    const role = await ctx.db.get(identity.role);
    if (!role) return { valid: false };

    return { valid: role.privileges.includes(args.privilege) };
  },
});

export const hasAll = query({
  args: {
    identity: v.string(),
    privileges: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query("identities")
      .withIndex("by_identity", (q) => q.eq("identity", args.identity))
      .unique();

    if (!identity) return { valid: false };

    const role = await ctx.db.get(identity.role);
    if (!role) return { valid: false };

    const hasAll = args.privileges.every((p) => role.privileges.includes(p));
    return { valid: hasAll };
  },
});

export const hasAny = query({
  args: {
    identity: v.string(),
    privileges: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.db
      .query("identities")
      .withIndex("by_identity", (q) => q.eq("identity", args.identity))
      .unique();

    if (!identity) return { valid: false };

    const role = await ctx.db.get(identity.role);
    if (!role) return { valid: false };

    const hasAny = args.privileges.some((p) => role.privileges.includes(p));
    return { valid: hasAny };
  },
});

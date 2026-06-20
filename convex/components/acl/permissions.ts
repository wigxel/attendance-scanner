import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePrivilege } from "./utils";

export const listPermissions = query({
  args: { callerId: v.string() },
  handler: async (ctx, { callerId }) => {
    const auth = await requirePrivilege(ctx, "user:assign:role", callerId);
    if (!auth.success) return [];

    return await ctx.db.query("permissions").collect();
  },
});

export const listPermissionsByCategory = query({
  args: { callerId: v.string() },
  handler: async (ctx, { callerId }) => {
    const auth = await requirePrivilege(ctx, "user:assign:role", callerId);
    if (!auth.success) return {};

    const all = await ctx.db.query("permissions").collect();
    const grouped: Record<string, typeof all> = {};

    for (const perm of all) {
      if (!grouped[perm.category]) grouped[perm.category] = [];
      grouped[perm.category].push(perm);
    }

    return grouped;
  },
});

export const createPermission = mutation({
  args: {
    callerId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requirePrivilege(ctx, "user:assign:role", args.callerId);
    if (!auth.success) return auth;

    const existing = await ctx.db
      .query("permissions")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      return {
        success: false,
        error: "A permission with this name already exists.",
      };
    }

    const permissionId = await ctx.db.insert("permissions", {
      name: args.name,
      description: args.description,
      category: args.category,
    });

    return { success: true, data: { permissionId } };
  },
});

export const updatePermission = mutation({
  args: {
    callerId: v.string(),
    permissionId: v.id("permissions"),
    name: v.string(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requirePrivilege(ctx, "user:assign:role", args.callerId);
    if (!auth.success) return auth;

    const permission = await ctx.db.get(args.permissionId);
    if (!permission) return { success: false, error: "Permission not found." };

    const duplicate = await ctx.db
      .query("permissions")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (duplicate && duplicate._id !== args.permissionId) {
      return {
        success: false,
        error: "A permission with this name already exists.",
      };
    }

    await ctx.db.patch(args.permissionId, {
      name: args.name,
      description: args.description,
      category: args.category,
    });

    return { success: true, data: { permissionId: args.permissionId } };
  },
});

export const deletePermission = mutation({
  args: { callerId: v.string(), permissionId: v.id("permissions") },
  handler: async (ctx, args) => {
    const auth = await requirePrivilege(ctx, "user:assign:role", args.callerId);
    if (!auth.success) return auth;

    const permission = await ctx.db.get(args.permissionId);
    if (!permission) return { success: false, error: "Permission not found." };

    await ctx.db.delete(args.permissionId);
    return { success: true, data: { permissionId: args.permissionId } };
  },
});

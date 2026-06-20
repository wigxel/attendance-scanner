import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePrivilege } from "./utils";

export const getRoles = query({
  handler: async (ctx) => {
    const auth = await requirePrivilege(ctx, "user:assign:role");
    if (!auth.success) return [];

    return await ctx.db.query("roles").collect();
  },
});

export const createRole = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    privileges: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePrivilege(ctx, "user:assign:role");
    if (!auth.success) return auth;

    const existing = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      return { success: false, error: "A role with this name already exists." };
    }

    const roleId = await ctx.db.insert("roles", {
      name: args.name,
      description: args.description,
      privileges: args.privileges,
    });

    return { success: true, data: { roleId } };
  },
});

export const updateRole = mutation({
  args: {
    roleId: v.id("roles"),
    name: v.string(),
    description: v.string(),
    privileges: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requirePrivilege(ctx, "user:assign:role");
    if (!auth.success) return auth;

    const role = await ctx.db.get(args.roleId);
    if (!role) return { success: false, error: "Role not found." };

    const duplicate = await ctx.db
      .query("roles")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (duplicate && duplicate._id !== args.roleId) {
      return { success: false, error: "A role with this name already exists." };
    }

    await ctx.db.patch(args.roleId, {
      name: args.name,
      description: args.description,
      privileges: args.privileges,
    });

    return { success: true, data: { roleId: args.roleId } };
  },
});

export const deleteRole = mutation({
  args: { roleId: v.id("roles") },
  handler: async (ctx, args) => {
    const auth = await requirePrivilege(ctx, "user:assign:role");
    if (!auth.success) return auth;

    const role = await ctx.db.get(args.roleId);
    if (!role) return { success: false, error: "Role not found." };

    const identitiesWithRole = await ctx.db
      .query("identities")
      .withIndex("by_role", (q) => q.eq("role", args.roleId))
      .first();

    if (identitiesWithRole) {
      return {
        success: false,
        error:
          "Cannot delete a role that is assigned to one or more identities.",
      };
    }

    await ctx.db.delete(args.roleId);
    return { success: true, data: { roleId: args.roleId } };
  },
});

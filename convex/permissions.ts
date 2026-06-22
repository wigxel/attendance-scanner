import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./components/acl/_generated/dataModel";
import { readId } from "./myFunctions";

export const listPermissions = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await readId(ctx);
    if (!callerId) return [];
    return await ctx.runQuery(
      components.wigxel_acl.permissions.listPermissions,
      { callerId },
    );
  },
});

export const listPermissionsByCategory = query({
  args: {},
  handler: async (ctx): Promise<Record<string, Doc<"permissions">[]>> => {
    const callerId = await readId(ctx);
    if (!callerId) return {};
    return await ctx.runQuery(
      components.wigxel_acl.permissions.listPermissionsByCategory,
      { callerId },
    );
  },
});

export const createPermission = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };
    return await ctx.runMutation(
      components.wigxel_acl.permissions.createPermission,
      {
        callerId,
        name: args.name,
        description: args.description,
        category: args.category,
      },
    );
  },
});

export const updatePermission = mutation({
  args: {
    permissionId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };
    return await ctx.runMutation(
      components.wigxel_acl.permissions.updatePermission,
      {
        callerId,
        permissionId: args.permissionId as any,
        name: args.name,
        description: args.description,
        category: args.category,
      },
    );
  },
});

export const deletePermission = mutation({
  args: {
    permissionId: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };
    return await ctx.runMutation(
      components.wigxel_acl.permissions.deletePermission,
      {
        callerId,
        permissionId: args.permissionId as any,
      },
    );
  },
});

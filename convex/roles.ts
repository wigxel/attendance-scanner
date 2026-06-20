import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { readId } from "./myFunctions";

type Role = { _id: string; name: string; privileges: string[] };

export const getRoles = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await readId(ctx);

    if (!callerId) return [];

    return (await ctx.runQuery(components.wigxel_acl.roles.getRoles, {
      callerId,
    })) as Role[];
  },
});

export const createRole = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    privileges: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };
    return await ctx.runMutation(components.wigxel_acl.roles.createRole, {
      callerId,
      name: args.name,
      description: args.description,
      privileges: args.privileges,
    });
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
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };
    return await ctx.runMutation(components.wigxel_acl.roles.updateRole, {
      callerId,
      roleId: args.roleId,
      name: args.name,
      description: args.description,
      privileges: args.privileges,
    });
  },
});

export const deleteRole = mutation({
  args: {
    roleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };
    return await ctx.runMutation(components.wigxel_acl.roles.deleteRole, {
      callerId,
      roleId: args.roleId,
    });
  },
});

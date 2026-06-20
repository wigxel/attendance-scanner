import { components } from "./_generated/api";
import { query } from "./_generated/server";
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

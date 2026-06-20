import type { GenericQueryCtx } from "convex/server";
import type { DataModel, Doc } from "./_generated/dataModel";

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export const requireAuthSafe = async (
  ctx: GenericQueryCtx<DataModel>,
  callerId: string,
): Promise<Result<Doc<"identities">>> => {
  const identity = await ctx.db
    .query("identities")
    .withIndex("by_identity", (q) => q.eq("identity", callerId))
    .unique();

  if (!identity) {
    const count = await ctx.db
      .query("identities")
      .collect()
      .then((r) => r.length);

    if (count === 0) {
      return {
        success: false,
        error:
          'No ACL identities exist in the system. Run "seedRoles" to create the admin role, then use "registerIdentity" to register yourself.',
      };
    }

    return {
      success: false,
      error:
        "Your account is not registered as an ACL identity. Contact admin to give create one for you",
    };
  }

  return { success: true, data: identity };
};

export const requirePrivilege = async (
  ctx: GenericQueryCtx<DataModel>,
  privilege: string,
  callerId: string,
): Promise<Result<Doc<"identities">>> => {
  const authResult = await requireAuthSafe(ctx, callerId);
  if (!authResult.success) return authResult;

  const identity = authResult.data;
  const role = await ctx.db.get(identity.role);

  if (!role?.privileges.includes(privilege)) {
    return {
      success: false,
      error: `Access denied. Required privilege: "${privilege}".`,
    };
  }

  return { success: true, data: identity };
};

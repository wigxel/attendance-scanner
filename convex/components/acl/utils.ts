import type { GenericQueryCtx } from "convex/server";
import type { DataModel, Doc } from "./_generated/dataModel";

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Ensures the user is authenticated and returns the user document.
 * Throws an error if not authenticated.
 */
export const requireAuthSafe = async (
  ctx: GenericQueryCtx<DataModel>,
): Promise<Result<Doc<"identities">>> => {
  const identity = await getCurrentIdentity(ctx);

  if (!identity) {
    return {
      success: false,
      error: "Authentication required. Please sign in.",
    };
  }
  return { success: true, data: identity };
};

/**
 * Ensures the authenticated user has a specific privilege.
 * Throws an error if the user lacks the required privilege.
 */
export const requirePrivilege = async (
  ctx: GenericQueryCtx<DataModel>,
  privilege: string,
): Promise<Result<Doc<"identities">>> => {
  const authResult = await requireAuthSafe(ctx);
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

export const getCurrentIdentity = async (
  ctx: GenericQueryCtx<DataModel>,
): Promise<Doc<"identities"> | null> => {
  const auth = await ctx.auth.getUserIdentity();

  if (!auth) return null;

  const identity = await ctx.db
    .query("identities")
    .withIndex("by_identity", (q) => q.eq("identity", auth.subject))
    .unique();

  return identity;
};

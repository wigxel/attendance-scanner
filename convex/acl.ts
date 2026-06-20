import { v } from "convex/values";
import { api, components, internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { action, mutation, query } from "./_generated/server";
import { findUserByEmail, updateMetadata } from "./clerk";
import { readId } from "./myFunctions";

export async function requirePrivilege(
  ctx: QueryCtx | MutationCtx,
  privilege: string,
) {
  const caller = await readId(ctx);
  if (!caller) {
    throw new Error("Authentication required.");
  }

  const { valid } = await ctx.runQuery(
    components.wigxel_acl.identities.hasPrivilege,
    { identity: caller, privilege },
  );

  if (!valid) {
    throw new Error(`Access denied. Required privilege: "${privilege}".`);
  }
}

export async function requireAll(
  ctx: QueryCtx | MutationCtx,
  privileges: string[],
) {
  const caller = await readId(ctx);
  if (!caller) {
    throw new Error("Authentication required.");
  }

  const { valid } = await ctx.runQuery(
    components.wigxel_acl.identities.hasAll,
    { identity: caller, privileges },
  );

  if (!valid) {
    throw new Error(
      `Access denied. Required privileges: ${privileges.join(", ")}.`,
    );
  }
}

export async function requireAny(
  ctx: QueryCtx | MutationCtx,
  privileges: string[],
) {
  const caller = await readId(ctx);
  if (!caller) {
    throw new Error("Authentication required.");
  }

  const { valid } = await ctx.runQuery(
    components.wigxel_acl.identities.hasAny,
    { identity: caller, privileges },
  );

  if (!valid) {
    throw new Error(
      `Access denied. Required one of: ${privileges.join(", ")}.`,
    );
  }
}

export const assignRole = mutation({
  args: {
    profileId: v.string(),
    roleId: v.string(),
  },
  handler: async (ctx, args) => {
    const caller = await readId(ctx);
    if (!caller) {
      throw new Error("Authentication required.");
    }

    const { valid } = await ctx.runQuery(
      components.wigxel_acl.identities.hasPrivilege,
      { identity: caller, privilege: "user:assign:role" },
    );

    if (!valid) {
      throw new Error('Access denied. Required privilege: "user:assign:role".');
    }

    const profile = await ctx.db
      .query("profile")
      .withIndex("by_user_id", (q) => q.eq("id", args.profileId))
      .first();

    if (!profile) {
      throw new Error("User not found.");
    }

    const result = (await ctx.runMutation(
      components.wigxel_acl.identities.registerIdentity,
      { identity: profile.id, roleId: args.roleId, callerId: caller },
    )) as
      | {
          success: true;
          data: { identityId: string; action: "created" | "updated" };
        }
      | { success: false; error: string };

    if (!result.success) {
      throw new Error(result.error);
    }

    return { action: result.data.action, identityId: result.data.identityId };
  },
});

export const listIdentities = query({
  handler: async (ctx) => {
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };

    const identities = await ctx.runQuery(
      components.wigxel_acl.identities.listIdentities,
      { callerId },
    );

    const enriched = await Promise.all(
      identities.map(async (entry: any) => {
        const profile = await ctx.runQuery(api.myFunctions.getUserById, {
          userId: entry.identity,
        });
        return {
          ...entry,
          profile: profile
            ? {
                _id: profile._id,
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
              }
            : null,
        };
      }),
    );

    return { success: true, data: enriched };
  },
});

export const updateIdentityRole = mutation({
  args: {
    identityId: v.string(),
    roleId: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };

    return await ctx.runMutation(
      components.wigxel_acl.identities.updateIdentityRole,
      {
        callerId,
        identityId: args.identityId as any,
        roleId: args.roleId as any,
      },
    );
  },
});

export const deleteIdentity = mutation({
  args: {
    identityId: v.string(),
  },
  handler: async (ctx, args) => {
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };

    return await ctx.runMutation(
      components.wigxel_acl.identities.deleteIdentity,
      {
        callerId,
        identityId: args.identityId as any,
      },
    );
  },
});

export const upgradeToAdmin = action({
  args: {
    userId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required.");

    const caller = identity.profile_id as string | undefined;
    if (!caller) throw new Error("Authentication required.");

    const { valid } = await ctx.runQuery(
      components.wigxel_acl.identities.hasPrivilege,
      { identity: caller, privilege: "user:assign:role" },
    );

    if (!valid) {
      throw new Error('Access denied. Required privilege: "user:assign:role".');
    }

    const profile = await ctx.runQuery(api.myFunctions.getUserById, {
      userId: args.userId,
    });

    if (!profile) {
      throw new Error(`No profile found for user: ${args.userId}`);
    }

    const email = profile.email;
    if (!email) {
      throw new Error("User profile has no email address.");
    }

    const clerkUsers = await findUserByEmail(email);
    const clerkUser = Array.isArray(clerkUsers) ? clerkUsers[0] : null;

    if (!clerkUser?.id) {
      throw new Error(`No Clerk user found with email: ${email}`);
    }

    const clerkUserId = String(clerkUser.id);

    const roles = await ctx.runQuery(api.roles.getRoles);
    const targetRole = roles.find((r) => r.name === args.role);

    if (!targetRole) {
      throw new Error(
        `Role "${args.role}" not found. Create it in Settings > Roles first.`,
      );
    }

    await ctx.runMutation(api.acl.assignRole, {
      profileId: profile.id,
      roleId: targetRole._id,
    });

    await updateMetadata({
      clerkUserId,
      metadata: {
        private_metadata: {
          role: targetRole.name,
          privileges: targetRole.privileges,
        },
      },
    });

    // return { success: true };
  },
});

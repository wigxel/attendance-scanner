import { v } from "convex/values";
import type { Prettify } from "../types";
import { api, components } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { action, mutation, query } from "./_generated/server";
import { findUserByEmail, updateMetadata } from "./clerk";
import type { IdentityWithRole } from "./components/acl/identities";
import type { ACLIdentity, ACLRole } from "./components/acl/interfaces";
import type { Result } from "./components/acl/utils";
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

export const hasPrivilege = query({
  args: { privilege: v.string() },
  handler: async (ctx, { privilege }) => {
    const caller = await readId(ctx);
    if (!caller) return { valid: false };
    return await ctx.runQuery(components.wigxel_acl.identities.hasPrivilege, {
      identity: caller,
      privilege,
    });
  },
});

export const hasAll = query({
  args: { privileges: v.array(v.string()) },
  handler: async (ctx, { privileges }) => {
    const caller = await readId(ctx);
    if (!caller) return { valid: false };
    return await ctx.runQuery(components.wigxel_acl.identities.hasAll, {
      identity: caller,
      privileges,
    });
  },
});

export const hasAny = query({
  args: { privileges: v.array(v.string()) },
  handler: async (ctx, { privileges }) => {
    const caller = await readId(ctx);
    if (!caller) return { valid: false };
    return await ctx.runQuery(components.wigxel_acl.identities.hasAny, {
      identity: caller,
      privileges,
    });
  },
});

export const getRoles = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await readId(ctx);
    if (!callerId) return [];
    return await ctx.runQuery(components.wigxel_acl.roles.getRoles, {
      callerId,
    });
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
    roleId: v.string(),
    name: v.string(),
    description: v.string(),
    privileges: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };

    const result = await ctx.runMutation(
      components.wigxel_acl.roles.updateRole,
      {
        callerId,
        roleId: args.roleId,
        name: args.name,
        description: args.description,
        privileges: args.privileges,
      },
    );

    if (result?.success ?? true) {
      await ctx.scheduler.runAfter(0, api.acl.syncRolePrivileges, {
        roleId: args.roleId,
        callerId,
      });
    }

    return result;
  },
});

export const deleteRole = mutation({
  args: {
    roleId: v.string(),
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

type OriginalId = Prettify<
  ACLIdentity & {
    role: ACLRole | null;
  }
>;

interface IdentityResponse extends OriginalId {
  profile: Pick<
    Doc<"profile">,
    "_id" | "email" | "firstName" | "lastName"
  > | null;
}

export const listIdentities = query({
  handler: async (ctx): Promise<Result<Array<IdentityResponse>>> => {
    const callerId = await readId(ctx);
    if (!callerId) return { success: false, error: "Authentication required." };

    const identities: OriginalId[] = await ctx.runQuery(
      components.wigxel_acl.identities.listIdentities,
      {
        callerId,
      },
    );

    const enriched = await Promise.all(
      identities.map(async (entry) => {
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
        identityId: args.identityId,
        roleId: args.roleId,
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
        identityId: args.identityId,
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

    const roles = await ctx.runQuery(api.acl.getRoles);
    const targetRole = roles.find(
      (r: { name: string }) => r.name === args.role,
    );

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
  },
});

export const downgradeFromAdmin = action({
  args: {
    identityId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; error?: string; data?: unknown }> => {
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

    if (args.email) {
      try {
        const clerkUsers = await findUserByEmail(args.email);
        const clerkUser = Array.isArray(clerkUsers) ? clerkUsers[0] : null;
        if (clerkUser?.id) {
          await updateMetadata({
            clerkUserId: String(clerkUser.id),
            metadata: {
              private_metadata: {
                role: null,
                privileges: [],
              },
            },
          });
        }
      } catch (e) {
        console.warn("Failed to update Clerk metadata:", e);
      }
    }

    return ctx.runMutation(components.wigxel_acl.identities.deleteIdentity, {
      callerId: caller,
      identityId: args.identityId,
    });
  },
});

export const syncRolePrivileges = action({
  args: {
    roleId: v.string(),
    callerId: v.string(),
  },
  handler: async (ctx, args) => {
    const { valid } = await ctx.runQuery(
      components.wigxel_acl.identities.hasPrivilege,
      { identity: args.callerId, privilege: "user:assign:role" },
    );

    if (!valid) {
      throw new Error('Access denied. Required privilege: "user:assign:role".');
    }

    const identities = (await ctx.runQuery(
      components.wigxel_acl.identities.listIdentities,
      { callerId: args.callerId },
    )) as IdentityWithRole[];

    const affected = identities.filter(
      (e) => String(e.role?._id) === args.roleId,
    );

    if (!affected.length) return { synced: 0, failed: 0 };

    const privileges: string[] = affected[0].role?.privileges ?? [];
    let synced = 0;
    let failed = 0;

    for (const entry of affected) {
      try {
        const profile = await ctx.runQuery(api.myFunctions.getUserById, {
          userId: entry.identity,
        });

        if (!profile?.email) {
          failed++;
          continue;
        }

        const clerkUsers = await findUserByEmail(profile.email);
        const clerkUser = Array.isArray(clerkUsers) ? clerkUsers[0] : null;

        if (!clerkUser?.id) {
          failed++;
          continue;
        }

        await updateMetadata({
          clerkUserId: String(clerkUser.id),
          metadata: {
            private_metadata: {
              role: entry.role?.name ?? null,
              privileges,
            },
          },
        });

        synced++;
      } catch (e) {
        console.warn(
          "Failed to sync privileges for identity:",
          entry.identity,
          e,
        );
        failed++;
      }
    }

    return { synced, failed };
  },
});

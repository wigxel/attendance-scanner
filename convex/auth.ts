import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { deleteClerkUser } from "./clerk";

// Helper to get the current authenticated user from Clerk
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("profile")
      .filter((q) => q.eq(q.field("id"), identity.subject))
      .first();

    return user;
  },
});

// Get user profile by ID
export const getUserProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated");
    }

    const user = await ctx.db
      .query("profile")
      .filter((q) => q.eq(q.field("id"), args.userId))
      .first();

    return user;
  },
});

export const getUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.userId))
      .first();

    return user;
  },
});


// Create or update user profile
export const createOrUpdateProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phoneNumber: v.optional(v.string()),
    occupation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User must be authenticated");
    }

    const userId = identity.subject;
    const existingProfile = await ctx.db
      .query("profile")
      .filter((q) => q.eq(q.field("id"), userId))
      .first();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phoneNumber: args.phoneNumber,
        occupation: args.occupation || "None",
      });
      return existingProfile._id;
    }

    // Create new profile
    const profileId = await ctx.db.insert("profile", {
      id: userId as Id<"profile">,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      phoneNumber: args.phoneNumber,
      occupation: args.occupation || "None",
      role: "user",
    });

    return profileId;
  },
});

// Helper to ensure user is authenticated and return user ID
export const requireAuth = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("User must be authenticated");
  }
  return identity.subject;
};

// Helper to ensure user is authenticated and return full identity
export const requireIdentity = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("User must be authenticated");
  }
  return identity;
};


// Create or update user profile
export const destroyUser = internalAction({
  args: {
    userId: v.id("users"),
    dryRun: v.union(v.literal("YES"), v.literal("NO"))
  },
  handler: async (ctx, args) => {
    const { dryRun = 'NO' } = args;

    const user = await ctx.runQuery(internal.auth.getUser, { userId: args.userId });
    const isDryRun = dryRun === 'YES';

    if (isDryRun) {
      console.info("Running in dry-run mode");
    }

    if (!user) {
      console.info("User record not found")
      throw new ConvexError("User doesn't exists");
    }

    console.info("User record found");
    console.info("Finding profile...");
    const profile = await ctx.runQuery(internal.auth.getProfileByEmailOrId, {
      userId: user._id,
      email: user.email,
    })

    profile
      ? console.info("Profile record found")
      : console.info("No profile record found");

    if (profile) {
      if (profile.id.startsWith('user_')) {
        console.info("Deleting clerk user record...");
        if (!isDryRun) {
          await deleteClerkUser({ clerkUserId: profile.id });
        }
        console.info("Clerk user deleted.")
      }

      console.info("Deleting profile record...")
      if (!isDryRun) {
        await ctx.runMutation(internal.auth.deleteProfile, { profileId: profile._id });
      }
    }

    console.info("Deleting user record...");
    if (!isDryRun) {
      await ctx.runMutation(internal.auth.deleteUser, { userId: user._id })
    }

    return "complete"
  },
});

export const getProfileByEmailOrId = internalQuery({
  args: {
    userId: v.optional(v.id("users")),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.query('profile').filter(q => {
      return q.or(
        q.eq(q.field("id"), args.userId),
        q.eq(q.field('email'), args.email)
      );
    }).unique();
  }
})

export const deleteProfile = internalMutation({
  args: {
    profileId: v.id("profile")
  },
  handler: async (ctx, args) => {
    return ctx.db.delete(args.profileId);
  }
})

export const deleteUser = internalMutation({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    return ctx.db.delete(args.userId);
  }
})

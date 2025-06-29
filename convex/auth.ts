import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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

    console.log({ identity });
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
      id: userId as Id<'profile'>,
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

// Auto-create profile from Clerk user data
export const autoCreateProfile = mutation({
  args: {},
  handler: async (ctx) => {
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
      return existingProfile._id;
    }

    // Extract data from Clerk identity
    const email = identity.email || "";
    const firstName = identity.givenName || identity.name?.split(" ")[0] || "";
    const lastName =
      identity.familyName || identity.name?.split(" ").slice(1).join(" ") || "";

    const profileId = await ctx.db.insert("profile", {
      id: userId as Id<"profile">,
      firstName,
      lastName,
      email,
      phoneNumber: identity.phoneNumber,
      occupation: "None",
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

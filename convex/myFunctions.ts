import { v } from "convex/values";
import { formatISO, setHours } from "date-fns";
import type { GenericQueryCtx } from "convex/server";
import { logger } from "../config/logger";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import type { Profile, User } from "@auth/core/types";

export const authUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    return identity;
  },
});

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await readId(ctx);

    if (userId === null) return null;

    return await ctx.db
      .query("profile")
      .filter((q) => q.eq(q.field("id"), userId))
      .unique();
  },
});

export const getUserById = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profile")
      .filter((q) => q.eq(q.field("id"), args.userId))
      .unique();
  },
});

export const getAttendanceByMonth = query({
  args: {
    userId: v.optional(v.string()), // user id
    start: v.string(), // iso timestamp
    end: v.string(), // iso timestamp
  },
  handler: async (ctx, args) => {
    if (!args.userId) return [];

    // Query attendance records in the date range
    return await ctx.db
      .query("daily_register")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("timestamp"), args.start),
          q.lte(q.field("timestamp"), args.end),
        ),
      )
      .collect();
  },
});

export const isRegisteredForToday = query({
  args: {},
  handler: async (ctx) => {
    const userId = await readId(ctx);

    if (userId === null) return false;

    return await _isUserRegistered(ctx, { userId });
  },
});

async function _isUserRegistered(
  ctx: GenericQueryCtx<any>,
  args: { userId: string },
) {
  const today = new Date();
  const start = formatISO(setHours(today, 0));
  const end = formatISO(setHours(today, 23));

  // Query attendance records in the date range
  const first = await ctx.db
    .query("daily_register")
    .filter((q) =>
      q.and(
        q.eq(q.field("userId"), args.userId),
        q.gte(q.field("timestamp"), start),
        q.lte(q.field("timestamp"), end),
      ),
    )
    .first();

  return first !== null;
}

export const isUserRegisteredForToday = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return _isUserRegistered(ctx, { userId: args.userId });
  },
});

export const registerUser = mutation({
  args: {
    customerId: v.string(),
    visitorId: v.string(),
    browser: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await readId(ctx);

    const customer = await ctx.runQuery(api.myFunctions.getUserById, {
      userId: args.customerId,
    });

    if (!userId) {
      logger.warn("User not authenticated");
      return null;
    }

    if (!customer) {
      return null;
    }

    await ctx.db.insert("daily_register", {
      userId: customer.id,
      device: {
        name: "Unknown",
        visitorId: args.visitorId,
        browser: args.browser,
      },
      source: "web",
      admitted_by: userId as Id<"profile">,
      timestamp: new Date().toISOString(),
    });
  },
});

export const getDailyRegister = query({
  args: {
    start: v.string(),
    end: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await readId(ctx);

    if (!userId) {
      logger.warn("User not authenticated");
      return [];
    }

    const registers = await ctx.db
      .query("daily_register")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.start),
          q.lte(q.field("timestamp"), args.end),
        ),
      )
      .order("desc")
      .take(6);

    return registers;
  },
});

async function readId(ctx: any): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  const userId = identity?.profile_id ?? null;

  return String(userId) || null;
}

export const updateUser = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.string(),
    occupation: v.string(),
    // email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await readId(ctx);

    if (!userId) {
      logger.warn("User not authenticated");
      return null;
    }

    const profile = await ctx.runQuery(api.myFunctions.getProfile);
    if (!profile) return;

    await ctx.db.replace(profile._id, {
      id: userId as Id<"profile">,
      firstName: args.firstName,
      lastName: args.lastName,
      phoneNumber: args.phoneNumber,
      role: "user",
      occupation: args.occupation ?? "None",
    });
  },
});

//function to submit a new feature request
export const submitFeatureRequest = mutation({
  args: {
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await readId(ctx);

    if (!userId) {
      logger.warn("User not authenticated");
      return null;
    }

    await ctx.db.insert("featureRequest", {
      userId: userId as Id<"profile">,
      title: args.title,
      description: args.description,
      status: "open",
    });
  },
});

//function to get user stats
export const getUserStats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const customer = await ctx.runQuery(api.myFunctions.getUserById, {
      userId: userId,
    });

    if (!customer) {
      logger.warn("User not authenticated");
      return null;
    }

    const { firstName, lastName } = customer as {
      firstName: string;
      lastName: string;
    };

    const stats = await ctx.db
      .query("stats")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    const attendanceCount = stats.length;
    const freeDayEligible = attendanceCount >= 20;

    return {
      name: `${firstName} ${lastName}` as string,
      attendanceCount,
      freeDayEligible,
    };
  },
});

// function to get all users
export const getAllProfiles = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    const _profiles: Array<{
      user: User;
      profile: Profile | null;
    }> = [];

    for await (const user of users) {
      const profile = await ctx.db
        .query("profile")
        .filter((q) => q.eq(q.field("id"), user._id))
        .unique();

      _profiles.push({
        user: user,
        profile: profile,
      });
    }

    return _profiles;
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    //get all profiles joined with auth users
    const profiles = await ctx.db.query("profile").collect();

    const data = await Promise.all(
      profiles.map(async (profile) => {

        const visitCount: number = await ctx.runQuery(api.myFunctions.registrationCount, {
          userId: profile.id,
        })
        const eligible = visitCount >= 20;

        return {
          id: profile._id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email ?? "N/A",
          occupation: profile.occupation,
          role: profile.role ?? "user",
          phoneNumber: profile.phoneNumber ?? "N/A",
          visitCount,
          eligible,
        };
      }),
    );

    return data;
  },
});

// Query to
export const registrationCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("daily_register")
      .withIndex('user', q => q.eq('userId', args.userId))
      .collect();

    return registrations.length
  },
});

//Query to get all occupations
export const listOccupations = query({
  handler: async (ctx) => {
    const occupations = await ctx.db.query("occupations").collect();
    return occupations.map((occupation) => ({
      id: occupation._id,
      name: occupation.name,
      description: occupation.description ?? "N/A",
    }));
  },
});

//Function for Auth guard
//
export const authGuard = async (
  ctx: GenericQueryCtx<any>,
  requiredRole?: string,
) => {
  const identity = await ctx.auth.getUserIdentity();
  const userId = identity?.profile_id ?? null;

  if (!userId) {
    logger.warn("User not authenticated");
    return null;
  }

  const profile = await ctx.runQuery(api.myFunctions.getProfile);
  if (!profile) return null;

  // Check if the user has the required role
  if (requiredRole && profile.role !== requiredRole) {
    logger.warn(`User does not have the required role: ${requiredRole}`);
    return null;
  }

  return profile;
};

//Mutation to create a new occupation
export const addOccupation = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    //Check if user is Admin
    const profile = await authGuard(ctx, "admin");

    if (!profile) {
      logger.warn("Not authorized to create an occupation");
      throw new Error("Not authorized to create an occupation");
    }

    const occupations = await ctx.db.query("occupations").collect();
    const occupationExists = occupations.some(
      (occupation) => occupation.name === args.name,
    );

    if (occupationExists) {
      throw new Error("Occupation already exists");
    }

    const now = Date.now();
    const occupationId = ctx.db.insert("occupations", {
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    return occupationId;
  },
});

//Mutation to update an occupation
export const updateOccupation = mutation({
  args: {
    id: v.id("occupations"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Admin check
    const profile = await authGuard(ctx, "admin");
    if (!profile) {
      logger.warn("Not authorized to update an occupation");
      throw new Error("Not authorized to update an occupation");
    }

    const occupation = await ctx.db.get(args.id);

    if (!occupation) {
      throw new Error("Occupation not found");
    }

    const now = Date.now();
    await ctx.db.replace(args.id, {
      ...occupation,
      name: args.name,
      description: args.description,
      updatedAt: now,
    });

    return args.id;
  },
});

//Mutation to delete an occupation
export const deleteOccupation = mutation({
  args: {
    id: v.id("occupations"),
  },
  handler: async (ctx, args) => {
    // Check if user is Admin
    const profile = await authGuard(ctx, "admin");
    if (!profile) {
      logger.warn("Not authorized to delete an occupation");
      throw new Error("Not authorized to delete an occupation");
    }

    const occupation = await ctx.db.get(args.id);

    if (!occupation) {
      throw new Error("Occupation not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

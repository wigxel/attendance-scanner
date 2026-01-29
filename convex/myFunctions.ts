import type { Profile, User } from "@auth/core/types";
import { TableAggregate } from "@convex-dev/aggregate";
import type { GenericQueryCtx } from "convex/server";
import { ConvexError, v } from "convex/values";
import { formatISO, setHours } from "date-fns";
import { logger } from "../config/logger";
import { components, internal } from "./_generated/api";
import { api } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { updateClerkUser } from "./clerk";
import { PlanImpl, featureRequestStatus } from "./shared";

export const authUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    return identity;
  },
});

export const createUser = internalMutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // if user exists
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .unique();

    if (user) {
      return user._id;
    }

    const user_id = await ctx.db.insert("users", {
      email: args.email,
      emailVerificationTime: new Date().getTime(),
      phone: args.phone,
      isAnonymous: false,
      name: `${args.firstName} ${args.lastName}`,
    });

    await ctx.db.insert("profile", {
      id: user_id,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      occupation: "None",
      phoneNumber: args.phone,
      role: "user",
    });

    return user_id;
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

export const countAttendance = query({
  args: {
    start: v.string(), // iso timestamp
    end: v.string(), // iso timestamp
  },
  handler: async (ctx, args) => {
    // Query attendance records in the date range
    const count = await ctx.db
      .query("daily_register")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.start),
          q.lte(q.field("timestamp"), args.end),
        ),
      )
      .collect();

    return count.length;
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
    plan: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await readId(ctx);

    if (!userId) {
      logger.warn("User not authenticated");
      return null;
    }

    const plan = await PlanImpl.validatePlan(ctx.db, args.plan);

    const customer = await ctx.runQuery(api.myFunctions.getUserById, {
      userId: args.customerId,
    });

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
      access: PlanImpl.toStruct(plan),
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
      .collect();

    return registers;
  },
});

/**
 * Returns the convex `user` table id. Not to be mistaken for the Clerk user Id
 * @param ctx
 * @returns
 */
async function readId(ctx: any): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();

  const userId = identity?.profile_id ?? null;

  return String(userId) || null;
}

export const updateUser = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.string(),
    occupation: v.string(),
    // email: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      logger.warn("User not authenticated");
      return null;
    }

    await updateClerkUser({
      userId: identity.subject,
      firstName: args.firstName,
      lastName: args.lastName,
    })

    if (!identity.email) {
      throw new ConvexError("Email required to update account");
    }

    await ctx.runMutation(api.auth.createOrUpdateProfile, {
      firstName: args.firstName,
      lastName: args.lastName,
      email: identity.email,
      phoneNumber: args.phoneNumber,
      occupation: args.occupation,
    })
  },
});

export const updateProfile = internalMutation({
  args: {
    _id: v.id('profile'),
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.string(),
    occupation: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args._id);

    if (!record) {
      throw new ConvexError("Profile update failed!");
    }

    return await ctx.db.replace(args._id, {
      ...record,
      firstName: args.firstName,
      lastName: args.lastName,
      phoneNumber: args.phoneNumber,
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
        const visitCount: number = await ctx.runQuery(
          api.myFunctions.registrationCount,
          {
            userId: profile.id,
          },
        );
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
      .withIndex("user", (q) => q.eq("userId", args.userId))
      .collect();

    return registrations.length;
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

export const listSuggestions = query({
  args: {
    status: v.optional(featureRequestStatus),
  },
  handler: async (ctx, args) => {
    const status = args.status;
    const features =
      status !== undefined
        ? ctx.db
          .query("featureRequest")
          .withIndex("by_status", (q) => q.eq("status", status))
        : ctx.db.query("featureRequest");
    const feedbacks = await features.order("desc").take(50);

    return {
      data: (
        await Promise.all(
          feedbacks.map(async (e) => {
            const voteCount = await aggregateBySuggestion.sum(ctx, {
              bounds: {},
              namespace: e._id,
            });

            return {
              ...e,
              voteCount,
            };
          }),
        )
      ).sort((a, b) => b.voteCount - a.voteCount),
    };
  },
});

export const voteFeatureRequest = mutation({
  args: {
    entityId: v.string(), // featureRequest._id
    value: v.number(), // +1 for upvote, -1 for downvote
  },
  handler: async (ctx, args) => {
    const userId = await readId(ctx);

    if (!userId) {
      logger.warn("User not authenticated");
      throw new Error("User not authenticated");
    }

    // Check if user already voted on this entity
    const existingVote = await ctx.db
      .query("featureVotes")
      .filter((q) =>
        q.and(
          q.eq(q.field("entityId"), args.entityId),
          q.eq(q.field("userId"), userId),
        ),
      )
      .unique();

    if (existingVote) {
      // Update existing vote
      const new_vote = {
        ...existingVote,
        value: args.value,
      };
      await ctx.db.replace(existingVote._id, new_vote);
      await aggregateBySuggestion.replace(ctx, existingVote, new_vote);
      return existingVote._id;
    }

    // Insert new vote
    const payload = {
      entityId: args.entityId,
      value: args.value,
      userId,
    };
    const voteId = await ctx.db.insert("featureVotes", payload);
    const entry = await ctx.db.get(voteId);
    if (entry) await aggregateBySuggestion.insert(ctx, entry);

    return voteId;
  },
});

const aggregateBySuggestion = new TableAggregate<{
  Namespace: Id<"featureRequest">;
  Key: number; // [number, string];
  DataModel: DataModel;
  TableName: "featureVotes";
}>(components.aggregate, {
  namespace: (doc) => doc.entityId as Id<"featureRequest">,
  sortKey: (doc) => doc._creationTime, //[doc._creationTime, doc.userId],
  sumValue: (doc) => doc.value,
});

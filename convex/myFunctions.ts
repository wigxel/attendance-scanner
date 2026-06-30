import type { Profile, User } from "@auth/core/types";
import { TableAggregate } from "@convex-dev/aggregate";
import { type GenericQueryCtx, paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { isWithinInterval, parseISO } from "date-fns";
import { isNullable } from "effect/Predicate";
import { z } from "zod";
import { logger } from "../config/logger";
import { safeStr } from "../lib/data.helpers";
import { api, components } from "./_generated/api";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { requirePrivilege } from "./acl";
import { setExternalId, updateClerkUser } from "./clerk";

import {
  insertRegisterAndAggregate,
  isRegisteredToday,
  processReservationCheckIn,
} from "./register_common";
import { featureRequestStatus, PlanImpl } from "./shared";

export const authUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    return identity;
  },
});

export const setAccountExternalId = action({
  args: {
    clerk_user_id: v.string(),
    convex_user_id: v.string(),
  },
  async handler(_ctx, args) {
    await setExternalId({
      clerkUserId: args.clerk_user_id,
      convexUserId: args.convex_user_id,
    });
  },
});

export const createUser = mutation({
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
      emailVerificationTime: Date.now(),
      phone: args.phone,
      isAnonymous: false,
      name: `${args.firstName} ${args.lastName}`,
    });

    const profile = await ctx.db
      .query("profile")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        id: user_id,
      });
    } else {
      await ctx.db.insert("profile", {
        id: user_id,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        occupation: "None",
        phoneNumber: args.phone,
        role: "user",
      });
    }

    return user_id;
  },
});

export const getAccountMeta = query({
  handler: async (ctx) => {
    const ident = await ctx.auth.getUserIdentity();

    if (!ident?.email) return null;

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), ident.email))
      .unique();

    const profile = await ctx.db
      .query("profile")
      .filter((q) => q.eq(q.field("id"), user?._id))
      .unique();

    return { user, profile };
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
      .first();
  },
});

export const getUserById = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("profile")
      .withIndex("by_user_id", (q) => q.eq("id", args.userId))
      .unique();

    if (isNullable(user)) return null;

    const occupationId =
      user.occupation === "None" ? undefined : user.occupation;

    const occupation = occupationId
      ? ((await ctx.db.get(occupationId))?.name ?? "unknown")
      : "None";

    return { ...user, occupation, occupationId };
  },
});

export const countAttendance = query({
  args: {
    start: v.string(), // iso timestamp
    end: v.string(), // iso timestamp
  },
  handler: async (ctx, args) => {
    const count = await ctx.db
      .query("daily_register")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.start).lte("timestamp", args.end),
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
    const userId = args.userId;
    if (!userId) return [];

    return await ctx.db
      .query("daily_register")
      .withIndex("user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
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

    return await isRegisteredToday(ctx, userId);
  },
});

export const isUserRegisteredForToday = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return isRegisteredToday(ctx, args.userId);
  },
});

export const registerUser = mutation({
  args: {
    customerId: v.string(),
    visitorId: v.string(),
    browser: v.string(),
    plan: v.string(), // This is used for walk-in mode
    mode: v.union(v.literal("walk_in"), v.literal("reservation")),
  },
  handler: async (ctx, args) => {
    // Fail-fast 1: Authenticate the user performing the scan
    const scannerId = await readId(ctx);
    if (!scannerId) {
      throw new ConvexError("User not authenticated");
    }

    // Fail-fast 2: Check if the customer profile exists
    const customer = await ctx.runQuery(api.myFunctions.getUserById, {
      userId: args.customerId,
    });
    if (!customer) {
      throw new ConvexError("Customer profile not found.");
    }

    if (await isRegisteredToday(ctx, customer.id)) {
      throw new ConvexError("Customer already registered for today.");
    }

    const device = {
      name: "Unknown",
      visitorId: args.visitorId,
      browser: args.browser,
    };
    const admittedBy = scannerId;

    if (args.mode === "reservation") {
      await processReservationCheckIn(ctx, {
        userId: customer.id,
        device,
        admittedBy,
      });
      return;
    }

    // WALK_IN MODE: Use existing plan-based logic
    if (args.mode === "walk_in") {
      const reservation = await ctx.runQuery(
        api.myFunctions.getUserActiveReservation,
        { userId: customer.id },
      );

      if (reservation) {
        throw new ConvexError(
          "This customer has an active reservation. Please use Reservation mode instead.",
        );
      }

      const plan = await PlanImpl.validatePlan(ctx.db, args.plan);

      await insertRegisterAndAggregate(ctx, {
        userId: customer.id,
        device,
        admittedBy,
        timestamp: new Date().toISOString(),
        access: PlanImpl.toStruct(plan),
        method: "qr",
      });
    }
  },
});

export const getUserActiveReservation = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    for (const booking of bookings) {
      if (
        isWithinInterval(new Date(), {
          start: parseISO(booking.startDate),
          end: parseISO(booking.endDate),
        })
      ) {
        return {
          bookingId: booking._id,
          durationType: booking.durationType,
        };
      }
    }
    return null;
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
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.start).lte("timestamp", args.end),
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
export async function readId(
  ctx: GenericQueryCtx<DataModel>,
): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();

  const userId = identity?.profile_id ?? null;

  if (userId == null) return null;

  return String(userId) as Id<"users">;
}

export const updateUser = action({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.string(),
    occupation: v.union(v.id("occupations"), v.literal("None")),
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
    });

    if (!identity.email) {
      throw new ConvexError("Email required to update account");
    }

    await ctx.runMutation(api.auth.createOrUpdateProfile, {
      firstName: args.firstName,
      lastName: args.lastName,
      email: identity.email,
      phoneNumber: args.phoneNumber,
      occupation: args.occupation,
    });
  },
});

/**
 * @deprecated use ACL utils
 */
export const updateProfileRole = internalMutation({
  args: {
    profileId: v.string(),
    role: v.string(),
  },
  handler: async () => {
    console.warn("Action deprecated");

    return;
  },
});

export const updateProfile = internalMutation({
  args: {
    _id: v.id("profile"),
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.string(),
    occupation: v.union(v.id("occupations"), v.literal("None")),
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

// function to submit a new feature request
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
      userId: userId as Id<"users">,
      title: args.title,
      description: args.description,
      status: "open",
    });
  },
});

// function to get user stats
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

const emailValidator = z.string().email().optional();

export const getAllUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const searchTerm = args.search?.toLowerCase().trim();
    const emailValidation = emailValidator.safeParse(searchTerm);
    const isEmailSearch = emailValidation.success;

    let profiles: Doc<"profile">[];

    if (isEmailSearch && emailValidation.data) {
      profiles = await ctx.db
        .query("profile")
        .withIndex("by_email", (q) => q.eq("email", emailValidation.data))
        .collect();
    } else {
      profiles = await ctx.db.query("profile").order("desc").collect();
    }

    if (searchTerm && !isEmailSearch) {
      profiles = profiles.filter(
        (p) =>
          safeStr(p.firstName).toLowerCase().includes(searchTerm) ||
          safeStr(p.lastName).toLowerCase().includes(searchTerm),
      );
    }

    const startIdx = args.paginationOpts.cursor
      ? Number.parseInt(args.paginationOpts.cursor, 10)
      : 0;
    const paginatedProfiles = profiles.slice(
      startIdx,
      startIdx + args.paginationOpts.numItems,
    );

    const continueCursor =
      startIdx + args.paginationOpts.numItems < profiles.length
        ? String(startIdx + args.paginationOpts.numItems)
        : null;

    if (paginatedProfiles.length === 0) {
      return {
        page: [],
        continueCursor,
        isDone: !continueCursor,
      };
    }

    const userIds = paginatedProfiles.map((p) => p.id);
    const allRegistrations = await ctx.db.query("daily_register").collect();

    const countByUser: Record<string, number> = {};
    for (const reg of allRegistrations) {
      if (userIds.includes(reg.userId)) {
        countByUser[reg.userId] = (countByUser[reg.userId] || 0) + 1;
      }
    }

    const occupationIds = [
      ...new Set(
        paginatedProfiles
          .map((p) => p.occupation)
          .filter((o): o is Id<"occupations"> => o !== "None"),
      ),
    ];
    const occupationRecords = await Promise.all(
      occupationIds.map((id) => ctx.db.get(id)),
    );
    const occupationNameMap = new Map(
      occupationRecords
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r) => [r._id.toString(), r.name]),
    );

    const data = paginatedProfiles.map((profile) => {
      const visitCount = countByUser[profile.id] || 0;
      const eligible = visitCount >= 20;
      const occupation =
        profile.occupation === "None"
          ? "None"
          : (occupationNameMap.get(profile.occupation.toString()) ?? "unknown");
      return {
        id: profile._id,
        userId: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email ?? "N/A",
        occupation,
        role: profile.role ?? "user",
        phoneNumber: profile.phoneNumber ?? "N/A",
        visitCount,
        eligible,
      };
    });

    return {
      page: data,
      continueCursor,
      isDone: !continueCursor,
    };
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

// Function for Auth guard
export const authGuard = async (
  ctx: GenericQueryCtx<DataModel>,
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

// Mutation to create a new occupation
export const addOccupation = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "settings:update");

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

// Mutation to update an occupation
export const updateOccupation = mutation({
  args: {
    id: v.id("occupations"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "settings:update");

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

// Mutation to delete an occupation
export const deleteOccupation = mutation({
  args: {
    id: v.id("occupations"),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "settings:update");

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
        : ctx.db
            .query("featureRequest")
            .filter((q) => q.neq(q.field("status"), "rejected"));

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

export const deleteSuggestion = mutation({
  args: { suggestionId: v.id("featureRequest") },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "feedback:delete");

    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) throw new ConvexError("Suggestion not found");

    const votes = await ctx.db
      .query("featureVotes")
      .withIndex("request", (q) => q.eq("entityId", args.suggestionId))
      .collect();

    for (const vote of votes) {
      await aggregateBySuggestion.delete(ctx, vote);
      await ctx.db.delete(vote._id);
    }

    await ctx.db.delete(args.suggestionId);
  },
});

export const approveSuggestion = mutation({
  args: { suggestionId: v.id("featureRequest"), comment: v.string() },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "feedback:update");

    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) throw new ConvexError("Suggestion not found");
    if (suggestion.status !== "open")
      throw new ConvexError("Suggestion is not open");

    await ctx.db.patch(args.suggestionId, {
      status: "approved",
      comment: args.comment,
    });
  },
});

export const completeSuggestion = mutation({
  args: { suggestionId: v.id("featureRequest") },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "feedback:update");

    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) throw new ConvexError("Suggestion not found");
    if (suggestion.status !== "approved")
      throw new ConvexError("Suggestion must be approved first");

    await ctx.db.patch(args.suggestionId, { status: "completed" });
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

export const getAttendanceForBooking = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    if (tickets.length === 0) {
      return [];
    }

    const ticketIds = tickets.map((ticket) => ticket._id);

    const attendancePromises = ticketIds.map((ticketId) => {
      return ctx.db
        .query("daily_register")
        .withIndex("by_ticket", (q) => q.eq("ticketId", ticketId))
        .collect();
    });

    const attendanceArrays = await Promise.all(attendancePromises);
    const attendance = attendanceArrays.flat();

    // Now, enrich the attendance data with user and admitter details
    const enrichedAttendance = await Promise.all(
      attendance.map(async (record) => {
        const user = await ctx.db
          .query("profile")
          .filter((q) => q.eq(q.field("id"), record.userId))
          .first();

        const admitter = await ctx.db.get(record.admitted_by as Id<"users">);

        return {
          ...record,
          userName: user ? `${user.firstName} ${user.lastName}` : "Unknown",
          admitterName: admitter ? admitter.name : "Unknown",
        };
      }),
    );

    return enrichedAttendance;
  },
});

/**
 * List all access pricing plans
 */
export const listAccessPlans = query({
  handler: async (ctx) => {
    return ctx.db.query("accessPlans").collect();
  },
});

/**
 * Add a new access pricing plan
 */
export const addAccessPlan = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    price: v.number(),
    no_of_days: v.number(),
    description: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("accessPlans")
      .withIndex("plan_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      throw new Error(`Plan with key "${args.key}" already exists`);
    }

    const planId = ctx.db.insert("accessPlans", {
      key: args.key,
      name: args.name,
      price: args.price,
      no_of_days: args.no_of_days,
      description: args.description ?? "",
      features: args.features ?? [],
    });

    return planId;
  },
});

/**
 * Update an existing access pricing plan (key is not updatable)
 */
export const updateAccessPlan = mutation({
  args: {
    id: v.id("accessPlans"),
    name: v.string(),
    price: v.number(),
    no_of_days: v.number(),
    description: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);

    if (!existing) {
      throw new Error("Plan not found");
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      price: args.price,
      no_of_days: args.no_of_days,
      description: args.description ?? "",
      features: args.features ?? [],
    });

    return args.id;
  },
});

/**
 * Delete an access pricing plan
 */
export const deleteAccessPlan = mutation({
  args: {
    id: v.id("accessPlans"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);

    if (!existing) {
      throw new Error("Plan not found");
    }

    await ctx.db.delete(args.id);

    return args.id;
  },
});

/**
 * Seed default access plans if none exist
 */
export const seedAccessPlans = internalMutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("accessPlans").collect();

    if (existing.length > 0) {
      return { seeded: 0 };
    }

    ctx.db.insert("accessPlans", {
      key: "daily",
      name: "Daily",
      price: 1500,
      no_of_days: 1,
      description: "Daily access pass",
      features: [],
    });

    ctx.db.insert("accessPlans", {
      key: "weekly",
      name: "Weekly",
      price: 6000,
      no_of_days: 7,
      description: "7-day access pass",
      features: ["priority-check-in"],
    });

    ctx.db.insert("accessPlans", {
      key: "monthly",
      name: "Monthly",
      price: 24000,
      no_of_days: 24,
      description: "24-working-day access pass",
      features: ["priority-check-in", "booking"],
    });

    ctx.db.insert("accessPlans", {
      key: "daily_night",
      name: "Daily Night",
      price: 1000,
      no_of_days: 1,
      description: "Night session pass (8pm - 8am)",
      features: [],
    });

    ctx.db.insert("accessPlans", {
      key: "weekly_night",
      name: "Weekly Night",
      price: 5000,
      no_of_days: 7,
      description: "7-night session pass (8pm - 8am)",
      features: ["priority-check-in"],
    });

    ctx.db.insert("accessPlans", {
      key: "monthly_night",
      name: "Monthly Night",
      price: 20000,
      no_of_days: 24,
      description: "24-night session pass (8pm - 8am)",
      features: ["priority-check-in", "booking"],
    });

    return { seeded: 6 };
  },
});

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const normalizeProfileNames = internalMutation({
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profile").collect();

    let normalized = 0;

    for (const profile of profiles) {
      const normalizedFirst = toTitleCase(profile.firstName);
      const normalizedLast = toTitleCase(profile.lastName);

      if (
        normalizedFirst !== profile.firstName ||
        normalizedLast !== profile.lastName
      ) {
        await ctx.db.patch(profile._id, {
          firstName: normalizedFirst,
          lastName: normalizedLast,
        });
        normalized++;
      }
    }

    return { normalized };
  },
});

import { v } from "convex/values";
import { formatISO, setHours } from "date-fns";
import type { GenericQueryCtx } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

export const authUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const user = userId === null ? null : await ctx.db.get(userId);

    return user;
  },
});

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (userId === null) return null;

    return await ctx.db
      .query("profile")
      .filter((q) => q.eq(q.field("id"), userId))
      .unique();
  },
});

export const getUserById = query({
  args: {
    userId: v.id("users"),
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
    userId: v.optional(v.id("users")), // user id
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
    const userId = await getAuthUserId(ctx);

    if (userId === null) return false;

    return await _isUserRegistered(ctx, { userId });
  },
});

async function _isUserRegistered(ctx: GenericQueryCtx<any>, args: { userId: string }) {
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
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return _isUserRegistered(ctx, { userId: args.userId })
  },
});

export const registerUser = mutation({
  args: {
    customerId: v.id("users"),
    visitorId: v.string(),
    browser: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const customer = await ctx.runQuery(api.myFunctions.getUserById, {
      userId: args.customerId,
    });

    if (!userId) {
      console.log("User not authenticated");
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
      admitted_by: userId,
      timestamp: new Date().toISOString(),
    });
  },
});

export const updateUser = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.string(),
    // email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      console.log("User not authenticated");
      return null;
    }

    const profile = await ctx.runQuery(api.myFunctions.getProfile);
    if (!profile) return;

    await ctx.db.replace(profile._id, {
      id: userId,
      firstName: args.firstName,
      lastName: args.lastName,
      phoneNumber: args.phoneNumber,
      role: "user",
      occupation: "None",
    });
  },
});

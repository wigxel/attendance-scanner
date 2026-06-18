import { ConvexError, v } from "convex/values";
import { endOfDay, startOfDay } from "date-fns";

import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { readId } from "./myFunctions";
import {
  insertRegisterAndAggregate,
  isRegisteredToday,
  processReservationCheckIn,
} from "./register-common";

export const getTodaysRating = query({
  args: {},
  handler: async (ctx) => {
    const userId = await readId(ctx);
    if (!userId) return null;

    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    return ctx.db
      .query("ratings")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.gte(q.field("createdAt"), start),
          q.lte(q.field("createdAt"), end),
        ),
      )
      .first();
  },
});

export const getTodaysRegistration = query({
  args: {},
  handler: async (ctx) => {
    const userId = await readId(ctx);
    if (!userId) return null;

    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    return ctx.db
      .query("daily_register")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.gte(q.field("timestamp"), start),
          q.lte(q.field("timestamp"), end),
        ),
      )
      .first();
  },
});

export const selfCheckIn = mutation({
  args: {
    visitorId: v.optional(v.string()),
    browser: v.optional(v.string()),
    adminId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await readId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    if (await isRegisteredToday(ctx, userId)) {
      throw new ConvexError("Already registered for today.");
    }

    const device = {
      name: "Unknown",
      visitorId: args.visitorId ?? "unknown",
      browser: args.browser ?? "unknown",
    };

    const reservation = await ctx.runQuery(
      api.myFunctions.getUserActiveReservation,
      { userId },
    );

    if (reservation) {
      await processReservationCheckIn(ctx, {
        userId,
        device,
        admittedBy: userId,
        qrAdminId: args.adminId,
      });
      return;
    }

    // Walk-in — free by default
    await insertRegisterAndAggregate(ctx, {
      userId,
      device,
      admittedBy: userId,
      timestamp: new Date().toISOString(),
      access: { kind: "free" },
      qrAdminId: args.adminId,
    });
  },
});

export const selfCheckOut = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await readId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    const entry = await ctx.db
      .query("daily_register")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.gte(q.field("timestamp"), start),
          q.lte(q.field("timestamp"), end),
        ),
      )
      .first();

    if (!entry) {
      throw new ConvexError("No check-in record found for today.");
    }

    if (entry.checkedout_at) {
      throw new ConvexError("Already checked out for today.");
    }

    await ctx.db.patch(entry._id, {
      checkedout_at: new Date().toISOString(),
    });
  },
});

export const submitRating = mutation({
  args: {
    score: v.number(),
    presets: v.array(v.string()),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await readId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    if (args.score < 1 || args.score > 5) {
      throw new ConvexError("Score must be between 1 and 5");
    }

    await ctx.db.insert("ratings", {
      userId,
      score: args.score,
      presets: args.presets,
      comment: args.comment,
      createdAt: new Date().toISOString(),
    });
  },
});

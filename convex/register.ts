import { v } from "convex/values";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { internalMutation, mutation } from "./_generated/server";
import { PlanImpl } from "./shared";

export const saveCount = internalMutation(async ({ db }) => {
  const now = new Date();
  const nowWAT = new Date(
    now.toLocaleString("en-US", { timeZone: "Africa/Lagos" }),
  );

  const yesterday = subDays(nowWAT, 1);
  const startOfYesterday = startOfDay(yesterday);
  const endOfYesterday = endOfDay(yesterday);

  const count = await db
    .query("daily_register")
    .filter((q) =>
      q.and(
        q.gte(q.field("timestamp"), startOfYesterday.toISOString()),
        q.lte(q.field("timestamp"), endOfYesterday.toISOString()),
      ),
    )
    .collect();

  const uniqueUsers = new Set(count.map((r) => r.userId));
  const totalUsers = uniqueUsers.size;

  const date = format(yesterday, "yyyy-MM-dd");

  // Check if a metric for this date already exists
  const existingMetric = await db
    .query("dailyAttendanceMetrics")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();

  if (existingMetric) {
    // Update the existing metric
    await db.patch(existingMetric._id, { totalUsers });
  } else {
    // Insert a new metric
    await db.insert("dailyAttendanceMetrics", {
      date,
      totalUsers,
    });
  }
});

export const setFreeAccess = internalMutation({
  args: {
    are_you_sure: v.boolean(),
  },
  handler: async (ctx, args) => {
    const proceed = args.are_you_sure ?? false;

    if (!proceed) {
      console.log(
        "Dangerous action. Are you sure you want to do this? Change argument to `true` if you are certain",
      );
      return;
    }

    const registers = await ctx.db.query("daily_register").collect();

    for (const register of registers) {
      await ctx.db.patch(register._id, { access: { kind: "free" } });
    }
  },
});

/**
 * Searches for a user in today's record in the daily_register and updates their access plan.
 *
 * @param userId - The ID of the user to search for.
 * @param plan - The access plan to update to.
 * @returns The updated user's record if found, otherwise null.
 */
export const updateTodaysRegisterAccess = mutation({
  args: {
    userId: v.string(),
    plan: v.string()
  },
  handler: async (ctx, args) => {
    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    const plan = await PlanImpl.validatePlan(ctx.db, args.plan);

    const record = await ctx.db
      .query("daily_register")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("timestamp"), start),
          q.lte(q.field("timestamp"), end)
        )
      )
      .first();

    if (!record) {
      throw new Error(`User ${args.userId} not found in today's register`);
    }

    await ctx.db.patch(record._id, { access: PlanImpl.toStruct(plan) });

    return "success" as const;
  },
});

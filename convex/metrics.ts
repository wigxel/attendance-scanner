import { v } from "convex/values";
import { query } from "./_generated/server";

export const metricsDailyAttendance = query({
  args: {
    start: v.string(), // ISO date string
    end: v.string(), // ISO date string
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("dailyAttendanceMetrics")
      .withIndex("by_date", (q) =>
        q.gte("date", args.start).lte("date", args.end),
      )
      .order("asc")
      .collect();

    return metrics.map((metric) => ({
      date: metric.date,
      users: metric.totalUsers,
    }));
  },
});

export const sumPaidAccess = query({
  args: {
    start: v.string(), // iso timestamp
    end: v.string(), // iso timestamp
  },
  handler: async (ctx, args) => {
    const registers = await ctx.db
      .query("daily_register")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.start).lte("timestamp", args.end),
      )
      .collect();

    const paidRegisters = registers.filter((r) => r.access?.kind === "paid");

    const total = paidRegisters.reduce((acc, r) => {
      if (r.access?.kind === "paid") {
        if ("amountInKobo" in r.access) {
          return acc + r.access.amountInKobo / 100;
        }

        return acc + r.access.amount;
      }

      return acc;
    }, 0);

    return total;
  },
});

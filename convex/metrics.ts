import { v } from "convex/values";
import { query } from "./_generated/server";

export const metricsDailyAttendance = query({
  args: {
    start: v.string(), // ISO date string
    end: v.string(),   // ISO date string
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("dailyAttendanceMetrics")
      .withIndex("by_date", (q) =>
        q.gte("date", args.start).lte("date", args.end)
      )
      .collect();

    return metrics.map((metric) => ({
      date: metric.date,
      users: metric.totalUsers,
    }));
  },
});

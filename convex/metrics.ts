import { v } from "convex/values";
import { query } from "./_generated/server";
import { DEFAULT_LIMIT } from "./constants";
import { PlanImpl, RegisterImpl } from "./shared";

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

export const metricsDailyCashPayments = query({
  args: {
    start: v.string(), // yyyy-MM-dd
    end: v.string(), // yyyy-MM-dd
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("dailyCashPayments")
      .withIndex("by_date", (q) =>
        q.gte("date", args.start).lte("date", args.end),
      )
      .order("asc")
      .collect();

    return rows.map((row) => ({
      date: row.date,
      total: row.total,
      count: row.count,
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

    const paidRegisters = RegisterImpl.filterPaid(registers);
    const total = RegisterImpl.sumAll(paidRegisters) / 100;

    return total;
  },
});

export const sumCashPayments = query({
  args: {
    start: v.string(),
    end: v.string(),
    planId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? DEFAULT_LIMIT;

    const registers = await ctx.db
      .query("daily_register")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.start).lte("timestamp", args.end),
      )
      .take(limit);

    const cashRegisters = registers.filter((register) => {
      return PlanImpl.match(register.access, {
        none: () => false,
        free: () => false,
        paid: (record) => {
          if (PlanImpl.paymentMethod(record) !== "cash") return false;
          if (args.planId && record.planId !== args.planId) return false;

          return true;
        },
      });
    });

    const count = cashRegisters.length;
    const total = RegisterImpl.sumAll(cashRegisters) / 100;

    return { count, total: total };
  },
});

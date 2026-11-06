import { v } from "convex/values";
import { pipe } from "effect";
import { query } from "./_generated/server";
import { dayEndIso, dayStartIso, lagosDay } from "./cash";
import {
  type AccessStruct,
  CurrencyImpl,
  PlanImpl,
  RegisterImpl,
} from "./shared";

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
    const registers = await ctx.db
      .query("daily_register")
      .withIndex("by_timestamp", (q) =>
        q
          .gte("timestamp", dayStartIso(args.start))
          .lte("timestamp", dayEndIso(args.end)),
      )
      .collect();

    const byDay = new Map<string, { total: number; count: number }>();

    for (const register of registers) {
      const access = register.access as AccessStruct;
      if (!PlanImpl.type("paid")(access)) continue;
      if (PlanImpl.paymentMethod(access) !== "cash") continue;

      const date = lagosDay(register.timestamp);
      const day = byDay.get(date) ?? { total: 0, count: 0 };

      day.total += CurrencyImpl.parseFloat(PlanImpl.amount(access)) / 100;
      day.count += 1;
      byDay.set(date, day);
    }

    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { total, count }]) => ({ date, total, count }));
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
    const total = pipe(
      RegisterImpl.sumAll(paidRegisters),
      CurrencyImpl.koboToNaira,
      CurrencyImpl.parseFloat,
    );

    return total;
  },
});

export const sumCashPayments = query({
  args: {
    start: v.string(),
    end: v.string(),
    planId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const registers = await ctx.db
      .query("daily_register")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.start).lte("timestamp", args.end),
      )
      .collect();

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
    const total = pipe(
      RegisterImpl.sumAll(cashRegisters),
      CurrencyImpl.koboToNaira,
      CurrencyImpl.parseFloat,
    );

    return { count, total: total };
  },
});

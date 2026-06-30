import { v } from "convex/values";
import { endOfDay, format, parse, startOfDay } from "date-fns";
import { Match } from "effect";
import { HOURLY_RATE } from "../config/constants";
import { O, pipe } from "../lib/fp.helpers";
import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { type AccessDuration, type AccessStruct, PlanImpl } from "./shared";

const DURATION_TYPE_TO_PLAN_KEY: Record<string, string> = {
  day: "daily",
  week: "weekly",
  month: "monthly",
};

function calcFee(
  access: AccessStruct,
  planKey: string,
  planMap: Map<string, Doc<"accessPlans">>,
): number {
  if (!PlanImpl.type("paid")(access)) return 0;

  return pipe(
    PlanImpl.duration(access),
    O.getOrElse(() => null as AccessDuration | null),
    Match.value,
    Match.when({ type: "hourly" }, (dur) => dur.value * HOURLY_RATE),
    Match.orElse(() => {
      const plan = planMap.get(planKey);
      if (!plan) {
        console.warn(`[reports] No plan found for key: "${planKey}"`);
        return 0;
      }
      return plan.price / plan.no_of_days;
    }),
  );
}

export const getDaily = query({
  args: {
    date: v.optional(v.string()), // format: yyyy/MM/dd
  },
  handler: async (ctx, args) => {
    const targetDate = args.date
      ? parse(args.date, "yyyy/MM/dd", new Date())
      : new Date();

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const registers = await ctx.db
      .query("daily_register")
      .withIndex("by_timestamp", (q) =>
        q
          .gte("timestamp", dayStart.toISOString())
          .lte("timestamp", dayEnd.toISOString()),
      )
      .collect();

    // Load all access plans for fee calculation
    const allPlans = await ctx.db.query("accessPlans").collect();
    const planMap = new Map(allPlans.map((p) => [p.key, p]));

    const uniqueUsers = new Set<string>();
    const uniquePaidUsers = new Set<string>();
    const uniqueFreeUsers = new Set<string>();
    const subscribedUsers = new Set<string>();
    let totalSales = 0;
    let cashSales = 0;
    let transferSales = 0;
    const staffCounts = new Map<string, number>();
    let weeklySubscribers = 0;
    const reservationCache = new Map<
      string,
      { bookingId: string; durationType: string } | null
    >();

    for (const reg of registers) {
      uniqueUsers.add(reg.userId);

      if (PlanImpl.type("paid")(reg.access)) {
        uniquePaidUsers.add(reg.userId);

        if (!reservationCache.has(reg.userId)) {
          const res = await ctx.runQuery(
            api.myFunctions.getUserActiveReservation,
            { userId: reg.userId },
          );
          reservationCache.set(reg.userId, res);
        }
        const reservation = reservationCache.get(reg.userId);

        const planKey = reservation
          ? DURATION_TYPE_TO_PLAN_KEY[reservation.durationType]
          : (DURATION_TYPE_TO_PLAN_KEY[reg.access.planId] ?? reg.access.planId);

        const fee = calcFee(reg.access, planKey, planMap);
        console.log(
          `[reports] user: "${reg.userId}" plan: "${planKey}" fee: ${fee}`,
        );
        totalSales += fee;

        if (PlanImpl.paymentMethod(reg.access) === "cash") {
          cashSales += fee;
        } else {
          transferSales += fee;
        }

        if (reservation && reservation.durationType === "week") {
          weeklySubscribers++;
        }
      }

      if (PlanImpl.type("free")(reg.access)) {
        uniqueFreeUsers.add(reg.userId);
      }

      if (reg.ticketId) {
        subscribedUsers.add(reg.userId);
      }

      if (reg.admitted_by) {
        staffCounts.set(
          reg.admitted_by,
          (staffCounts.get(reg.admitted_by) ?? 0) + 1,
        );
      }
    }

    // Staff on duty: fetch profile names
    const staffOnDuty: Array<{ name: string; admissions_count: number }> = [];
    for (const [staffId, count] of staffCounts) {
      const profile = await ctx.db
        .query("profile")
        .withIndex("by_user_id", (q) => q.eq("id", staffId))
        .first();
      if (profile) {
        staffOnDuty.push({
          name: `${profile.firstName} ${profile.lastName}`,
          admissions_count: count,
        });
      }
    }

    return {
      dailyReport: {
        date: format(targetDate, "yyyy/MM/dd"),
        no_of_customers: uniqueUsers.size,
        no_of_paid_customers: uniquePaidUsers.size,
        no_of_free_customer: uniqueFreeUsers.size,
        subscribed_customers: subscribedUsers.size,
        weekly_subscribers: weeklySubscribers,
        total_sales: totalSales,
        cash_sales: cashSales,
        transfer_sales: transferSales,
        staff_on_duty: staffOnDuty,
      },
    };
  },
});

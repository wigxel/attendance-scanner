import { v } from "convex/values";
import { endOfDay, format, parse, startOfDay } from "date-fns";
import { pipe } from "../lib/fp.helpers";
import type { TaggedBooking } from "../types";
import { api } from "./_generated/api";
import { query } from "./_generated/server";
import { type AccessStruct, CurrencyImpl, PlanImpl } from "./shared";

// Prices from the record's stored total via `PlanImpl.amount` — the same
// function `sumCashPayments` uses — so the report and the metrics can't
// drift. Returns naira. A record that fails to price logs and counts as 0
// so one bad row can't crash the whole report.
function calcFee(access: AccessStruct): number {
  if (!PlanImpl.type("paid")(access)) return 0;

  try {
    return pipe(
      PlanImpl.amount(access),
      CurrencyImpl.koboToNaira,
      CurrencyImpl.parseFloat,
    );
  } catch (err) {
    console.warn("[reports] failed to price access record", err);
    return 0;
  }
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

    const uniqueUsers = new Set<string>();
    const uniquePaidUsers = new Set<string>();
    const uniqueFreeUsers = new Set<string>();
    const subscribedUsers = new Set<string>();
    let totalSales = 0;
    let cashSales = 0;
    let transferSales = 0;
    const staffCounts = new Map<string, number>();
    let weeklySubscribers = 0;
    const reservationCache = new Map<string, TaggedBooking | null>();

    const extractCount = (
      booking: TaggedBooking | undefined,
      reg: (typeof registers)[0],
    ) => {
      const accessRecord = reg.access as AccessStruct;

      let weeklySubscribers = 0,
        transferSales = 0,
        cashSales = 0,
        totalSales = 0;

      const fee = calcFee(accessRecord);

      totalSales += fee;

      if (PlanImpl.paymentMethod(accessRecord) === "cash") {
        cashSales += fee;
      } else {
        transferSales += fee;
      }

      if (booking) {
        if (booking._v === "booking_v1" && booking.durationType === "week") {
          weeklySubscribers++;
        } else if (
          booking._v === "booking_v2" &&
          booking.planKey === "weekly"
        ) {
          weeklySubscribers++;
        }
      }

      return { weeklySubscribers, cashSales, transferSales, totalSales };
    };

    for (const reg of registers) {
      uniqueUsers.add(reg.userId);

      if (PlanImpl.type("paid")(reg.access)) {
        uniquePaidUsers.add(reg.userId);

        if (!reservationCache.has(reg.userId)) {
          const res = await ctx.runQuery(api.bookings.getUserActiveBookings, {
            userId: reg.userId,
          });

          if (res) {
            reservationCache.set(reg.userId, res);
          }
        }
        const reservation = reservationCache.get(reg.userId);

        if (
          reservation?._v === "booking_v1" ||
          reservation?._v === "booking_v2"
        ) {
          const values = extractCount(reservation, reg);

          weeklySubscribers += values.weeklySubscribers;
          totalSales += values.totalSales;
          cashSales += values.cashSales;
          transferSales += values.transferSales;
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

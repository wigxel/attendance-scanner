import { ConvexError, v } from "convex/values";
import { addDays, endOfDay, format, startOfDay, subDays } from "date-fns";
import { Effect, pipe } from "effect";
import { isNullable } from "effect/Predicate";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requirePrivilege } from "./acl";
import { visitsAggregate } from "./customers";
import { findOrCreateUser, readId } from "./myFunctions";
import {
  insertGuestVisit,
  isRegisteredToday,
  requireHostRegisteredToday,
} from "./register_common";
import {
  CurrencyImpl,
  PlanError,
  PlanImpl,
  RegisterImpl,
  assertMinKobo,
} from "./shared";

const Timezone = {
  now: () => {
    const now = new Date();

    return Timezone.get(now);
  },

  get: (day: Date) => {
    const iso = day.toLocaleString("en-US", { timeZone: "Africa/Lagos" });

    return new Date(iso);
  },
};

export const saveCount = internalMutation(async ({ db }) => {
  const nowWAT = Timezone.now();

  const yesterday = subDays(nowWAT, 1);
  const startOfYesterday = startOfDay(yesterday);
  const endOfYesterday = endOfDay(yesterday);

  const count = await db
    .query("daily_register")
    .withIndex("by_timestamp", (q) =>
      q
        .gte("timestamp", startOfYesterday.toISOString())
        .lte("timestamp", endOfYesterday.toISOString()),
    )
    .collect();

  const uniqueUsers = new Set(count.map((r) => r.userId));
  const totalUsers = uniqueUsers.size;

  const date = format(yesterday, "yyyy-MM-dd");
  const timestamp = new Date(date).getTime();

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

  const cash = RegisterImpl.filterCash(count);
  const cashCount = cash.length;
  const cashTotal = pipe(
    RegisterImpl.sumAll(cash),
    CurrencyImpl.koboToNaira,
    CurrencyImpl.parseFloat,
  );

  const existingCash = await db
    .query("dailyCashPayments")
    .withIndex("by_date", (q) => q.eq("date", timestamp))
    .unique();

  if (existingCash) {
    await db.patch(existingCash._id, { count: cashCount, total: cashTotal });
  } else {
    await db.insert("dailyCashPayments", {
      date: timestamp,
      count: cashCount,
      total: cashTotal,
    });
  }
});

export const backfillDailyCashPayments = internalMutation({
  args: { startDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { db } = ctx;
    const nowWAT = Timezone.now();

    let day = startOfDay(new Date(args.startDate ?? "2026-05-01"));
    const end = startOfDay(subDays(nowWAT, 1));

    while (day <= end) {
      const wd = Timezone.get(day);
      const dayStart = startOfDay(wd);
      const dayEnd = endOfDay(wd);
      const date = format(wd, "yyyy-MM-dd");
      const timestamp = new Date(date).getTime();

      const rows = await db
        .query("daily_register")
        .withIndex("by_timestamp", (q) =>
          q
            .gte("timestamp", dayStart.toISOString())
            .lte("timestamp", dayEnd.toISOString()),
        )
        .collect();

      const cash_records = pipe(rows, RegisterImpl.filterCash);

      const total = pipe(
        RegisterImpl.sumAll(cash_records),
        CurrencyImpl.koboToNaira,
        CurrencyImpl.parseFloat,
      );

      const existing = await db
        .query("dailyCashPayments")
        .withIndex("by_date", (q) => q.eq("date", timestamp))
        .unique();

      if (existing) {
        await db.patch(existing._id, { count: cash_records.length, total });
      } else {
        await db.insert("dailyCashPayments", {
          date: timestamp,
          count: cash_records.length,
          total,
        });
      }

      day = addDays(day, 1);
    }

    return { done: true };
  },
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
      // Resetting to free must not wipe a guest visit's host link.
      await ctx.db.patch(register._id, {
        access: {
          kind: "free",
          ...(register.access.visiting
            ? { visiting: register.access.visiting }
            : {}),
        },
      });
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
    plan: v.optional(v.string()),
    paymentType: v.optional(
      v.union(v.literal("cash"), v.literal("bank_transfer")),
    ),
    duration: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    const profile = await ctx.runQuery(api.myFunctions.getProfile);

    if (!profile) {
      throw new ConvexError("User not found.");
    }

    const record = await ctx.db
      .query("daily_register")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.gte(q.field("timestamp"), start),
          q.lte(q.field("timestamp"), end),
        ),
      )
      .first();

    if (!record) {
      const customer = await ctx.db.get(args.userId as Id<"users">);

      throw new ConvexError(
        `${customer?.name ?? "User"} not found in today's register. Update possibly coming late.`,
      );
    }

    // no one can modify a reserved booking
    if (!isNullable(record.ticketId)) {
      throw new ConvexError("Cannot modify a reserved booking.");
    }

    // Compose every arg onto one working copy, then patch once. The old
    // shape read `record` once and patched three times, so a combined
    // plan+duration call clobbered the plan write with a stale snapshot.
    const updated = await Effect.runPromise(
      Effect.gen(function* () {
        let access = yield* PlanImpl.normalize(record.access);

        if (args.plan) {
          const planKey = args.plan;
          const plan = yield* Effect.promise(() =>
            PlanImpl.validatePlan(ctx.db, planKey),
          );
          access = PlanImpl.toStruct(plan);
        }

        if (args.paymentType && access.kind === "paid") {
          access = { ...access, paymentMethod: args.paymentType };
        }

        if (args.duration) {
          const res = yield* Effect.promise(() =>
            PlanImpl.validate("duration", args.duration),
          );

          if (!res.success) {
            return yield* new PlanError("Invalid duration");
          }

          if (access.kind !== "paid") {
            return yield* new PlanError("Duration requires a paid plan");
          }

          if (res.data.type === "hourly" && access.planId !== "hourly") {
            return yield* new PlanError(
              "Hourly duration requires the hourly plan",
            );
          }

          access = { ...access, duration: res.data };

          if (res.data.type === "hourly") {
            // planId is "hourly" here (guarded above): resolve the total
            // from the plan-price snapshot so reads never derive it from
            // duration. Hourly no_of_days is 1, so the snapshot is the
            // per-hour rate and snapshot x hours is exact. A missing
            // snapshot means a pre-snapshot (or hand-written) row — throw
            // and make staff re-select the plan rather than multiply a
            // total by hours. Fractional hours round to whole kobo.
            const base = access.planPriceInKobo;
            if (base == null) {
              return yield* new PlanError(
                "Record predates pricing snapshots. Re-select the plan.",
              );
            }
            const total = Math.round(base * res.data.value);
            assertMinKobo(CurrencyImpl.kobo(total));
            access = { ...access, planPriceInKobo: base, amountInKobo: total };
          }
        }

        // The hourly plan must always end the call with an hourly duration —
        // otherwise `PlanImpl.amount` throws on it downstream.
        if (
          access.kind === "paid" &&
          access.planId === "hourly" &&
          access.duration?.type !== "hourly"
        ) {
          return yield* new PlanError(
            "Hourly plan requires an hourly duration. Send plan and duration together.",
          );
        }

        return access;
      }),
    ).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      throw new ConvexError(message);
    });

    // `toStruct` (plan change) rebuilds from scratch — re-attach the guest
    // link so a staff edit doesn't drop the badge.
    await ctx.db.patch(record._id, {
      access: {
        ...updated,
        ...(record.access.visiting ? { visiting: record.access.visiting } : {}),
      },
    });

    return "success" as const;
  },
});

export const deleteRegisterRecord = internalMutation({
  args: { registerId: v.id("daily_register") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.registerId);
  },
});

export const debugRegisterForToday = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const scannerId = await readId(ctx);
    if (!scannerId) throw new ConvexError("User not authenticated");

    await requirePrivilege(ctx, "attendance:checkin");

    const customer = await ctx.runQuery(api.myFunctions.getUserById, {
      userId: args.userId,
    });
    if (!customer) throw new ConvexError("Customer profile not found.");

    if (await isRegisteredToday(ctx, args.userId)) {
      throw new ConvexError("Customer already registered for today.");
    }

    const id = await ctx.db.insert("daily_register", {
      userId: args.userId,
      device: { name: "Debug", visitorId: "debug", browser: "debug" },
      source: "web" as const,
      admitted_by: scannerId,
      timestamp: new Date().toISOString(),
      access: { kind: "free" },
      method: "qr" as const,
    });

    const entry = await ctx.db.get(id);
    if (entry) await visitsAggregate.insert(ctx, entry);

    await ctx.scheduler.runAfter(
      10 * 60 * 1000,
      internal.register.deleteRegisterRecord,
      {
        registerId: id,
      },
    );

    return {
      success: true,
      message:
        "Registered for today. This record will auto-delete in 10 minutes.",
    };
  },
});

/**
 * Lists the customers currently checked in for today — the people who can host
 * a guest. Guest visits are excluded: a guest cannot themselves host a guest.
 */
export const listTodaysHosts = query({
  args: {},
  handler: async (ctx) => {
    const callerId = await readId(ctx);
    if (!callerId) return [];

    await requirePrivilege(ctx, "attendance:checkin");

    const today = new Date();

    const records = await ctx.db
      .query("daily_register")
      .withIndex("by_timestamp", (q) =>
        q
          .gte("timestamp", startOfDay(today).toISOString())
          .lte("timestamp", endOfDay(today).toISOString()),
      )
      .collect();

    const hostIds = [
      ...new Set(
        records
          .filter((r) => isNullable(r.access.visiting))
          .map((r) => r.userId),
      ),
    ];

    const hosts = await Promise.all(
      hostIds.map(async (userId) => {
        const profile = await ctx.db
          .query("profile")
          .withIndex("by_user_id", (q) => q.eq("id", userId))
          .first();

        if (!profile) return null;

        return {
          userId,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
        };
      }),
    );

    return hosts
      .filter((host): host is NonNullable<typeof host> => host !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Checks a guest in against the customer they are visiting.
 *
 * Guests never sign up: staff capture their details once and they are admitted
 * on the spot. `findOrCreateUser` is idempotent on email, so a returning guest
 * resolves to the profile they already have rather than a duplicate.
 */
export const checkInGuest = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    hostUserId: v.string(),
    visitorId: v.optional(v.string()),
    browser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scannerId = await readId(ctx);
    if (!scannerId) {
      throw new ConvexError("User not authenticated");
    }

    await requirePrivilege(ctx, "attendance:checkin");

    await requireHostRegisteredToday(ctx, args.hostUserId);

    const guestUserId = await findOrCreateUser(ctx, {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
    });

    await insertGuestVisit(ctx, {
      guestUserId,
      hostUserId: args.hostUserId,
      admittedBy: scannerId,
      visitorId: args.visitorId,
      browser: args.browser,
    });

    return { userId: guestUserId };
  },
});

/**
 * Checks an existing customer in as a guest against the customer they are
 * visiting. No profile is created or touched — the person picked in the
 * combobox is used as-is.
 */
export const checkInExistingGuest = mutation({
  args: {
    guestUserId: v.string(),
    hostUserId: v.string(),
    visitorId: v.optional(v.string()),
    browser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scannerId = await readId(ctx);
    if (!scannerId) {
      throw new ConvexError("User not authenticated");
    }

    await requirePrivilege(ctx, "attendance:checkin");

    const guest = await ctx.db.get(args.guestUserId as Id<"users">);
    if (!guest) {
      throw new ConvexError("Guest customer not found.");
    }

    await requireHostRegisteredToday(ctx, args.hostUserId);

    await insertGuestVisit(ctx, {
      guestUserId: args.guestUserId,
      hostUserId: args.hostUserId,
      admittedBy: scannerId,
      visitorId: args.visitorId,
      browser: args.browser,
    });

    return { userId: args.guestUserId };
  },
});

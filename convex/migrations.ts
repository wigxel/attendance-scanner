import { isNullable } from "effect/Predicate";
import { internalMutation } from "./_generated/server";

export const migrateOccupationNamesToIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profile").collect();
    const occupations = await ctx.db.query("occupations").collect();
    const nameToId = new Map(occupations.map((o) => [o.name, o._id]));
    const idSet = new Set(occupations.map((o) => o._id.toString()));

    let updated = 0;

    for (const profile of profiles) {
      const val = profile.occupation;
      if (!val || val === "None") continue;

      if (idSet.has(val)) continue;

      const id = nameToId.get(val);
      if (id) {
        await ctx.db.patch(profile._id, { occupation: id });
      } else {
        await ctx.db.patch(profile._id, { occupation: "None" });
      }
      updated++;
    }

    return { updated };
  },
});

export const backfillNullMethods = internalMutation({
  args: {},
  handler: async (ctx) => {
    const registers = await ctx.db.query("daily_register").collect();

    let updated = 0;
    for (const record of registers) {
      if (isNullable(record.method)) {
        await ctx.db.patch(record._id, { method: "qr" });
        updated++;
      }
    }

    return { updated };
  },
});

/**
 * Backfills bookings left behind by the `durationType` → `planKey` refactor.
 *
 * `calendar_month` used to be a `durationType`. It is now a `planKey`, with the
 * duration itself recorded as `month` (see `convex/bookings.ts` `createBooking`
 * and the expectation in `convex/bookings.test.ts`). Rows written before that
 * change still carry the old shape and fail schema validation.
 *
 * Run this while `durationTypeConvexSchema` still accepts `calendar_month`,
 * then narrow the validator again.
 */
export const backfillCalendarMonthBookings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").collect();

    let updated = 0;
    for (const booking of bookings) {
      // The literal is gone from the validator once this migration has run, so
      // compare as a plain string rather than against the narrowed union.
      if ((booking.durationType as string) !== "calendar_month") continue;

      await ctx.db.patch(booking._id, {
        durationType: "month",
        planKey: booking.planKey ?? "calendar_month",
      });
      updated++;
    }

    return { updated };
  },
});

import { ConvexError, v } from "convex/values";
import { format } from "date-fns";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requirePrivilege } from "./acl";
import { readId } from "./myFunctions";

export type CashChannel = "cash" | "pos" | "transfer";
export type CashDirection = "in" | "out";

export type ChannelTotals = {
  inKobo: number;
  outKobo: number;
  balanceKobo: number;
};

export type DaySummary = {
  date: string;
  cash: ChannelTotals;
  pos: ChannelTotals;
  transfer: ChannelTotals;
};

export type CashMovementInput = {
  occurredAt: string;
  channel: CashChannel;
  direction: CashDirection;
  amountKobo: number;
  sourceRef: string;
  createdBy: string;
};

const PRIVILEGE = "reports:read";
const TIMEZONE = "Africa/Lagos";

const POS_MANUAL_PREFIX = "pos:manual:";

export const sourceRefs = {
  booking: (bookingId: string) => `booking:${bookingId}`,
  register: (registerId: string) => `register:${registerId}`,
  purchase: (purchaseId: string) => `purchase:${purchaseId}`,
  purchaseVoid: (purchaseId: string) => `purchase-void:${purchaseId}`,
  posManual: (date: string) => `${POS_MANUAL_PREFIX}${date}`,
};

export function lagosDay(iso: string): string {
  return format(
    new Date(new Date(iso).toLocaleString("en-US", { timeZone: TIMEZONE })),
    "yyyy-MM-dd",
  );
}

export function dayStartIso(date: string): string {
  return new Date(`${date}T00:00:00+01:00`).toISOString();
}

export function dayEndIso(date: string): string {
  return new Date(`${date}T23:59:59.999+01:00`).toISOString();
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function ensureMovement(input: CashMovementInput) {
  if (!Number.isInteger(input.amountKobo) || input.amountKobo < 0) {
    throw new ConvexError(
      "A cash movement needs a whole kobo amount, 0 or more.",
    );
  }
  if (Number.isNaN(new Date(input.occurredAt).getTime())) {
    throw new ConvexError("A cash movement needs a valid occurredAt.");
  }
}

/**
 * Writes a movement, keyed by its source reference. Re-syncing the same source
 * (a corrected register payment, a re-entered POS total) updates the existing
 * row instead of booking the money twice.
 */
export async function upsertCashMovement(
  ctx: MutationCtx,
  input: CashMovementInput,
) {
  ensureMovement(input);

  const existing = await ctx.db
    .query("cashMovements")
    .withIndex("by_sourceRef", (q) => q.eq("sourceRef", input.sourceRef))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, input);
    return existing._id;
  }

  return await ctx.db.insert("cashMovements", input);
}

export async function clearCashMovement(ctx: MutationCtx, sourceRef: string) {
  const existing = await ctx.db
    .query("cashMovements")
    .withIndex("by_sourceRef", (q) => q.eq("sourceRef", sourceRef))
    .first();

  if (existing) await ctx.db.delete(existing._id);
}

export async function readCashMovements(
  ctx: QueryCtx,
  start: string,
  end: string,
) {
  return await ctx.db
    .query("cashMovements")
    .withIndex("by_occurredAt", (q) =>
      q.gte("occurredAt", dayStartIso(start)).lte("occurredAt", dayEndIso(end)),
    )
    .collect();
}

/**
 * POS terminals report one total for the day, not one receipt at a time, so a
 * whole day arrives as a single movement. The source reference records that
 * this came from a hand-entered total; a future terminal feed writes the same
 * movement shape under its own reference.
 */
export const recordPosTakings = mutation({
  args: {
    date: v.string(),
    totalKobo: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, PRIVILEGE);

    if (!isDateOnly(args.date)) {
      throw new ConvexError("POS takings need a date in yyyy-MM-dd form.");
    }

    const caller = await readId(ctx);
    if (!caller) throw new ConvexError("Authentication required.");

    const occurredAt = `${args.date}T12:00:00.000Z`;
    const sourceRef = sourceRefs.posManual(args.date);

    // Zero clears the entry: the day took no POS money after all.
    if (args.totalKobo === 0) {
      await clearCashMovement(ctx, sourceRef);
      return null;
    }

    return await upsertCashMovement(ctx, {
      occurredAt,
      channel: "pos",
      direction: "in",
      amountKobo: args.totalKobo,
      sourceRef,
      createdBy: caller,
    });
  },
});

function newTotals(): ChannelTotals {
  return { inKobo: 0, outKobo: 0, balanceKobo: 0 };
}

function newDay(date: string): DaySummary {
  return { date, cash: newTotals(), pos: newTotals(), transfer: newTotals() };
}

function addTo(totals: ChannelTotals, direction: CashDirection, kobo: number) {
  if (direction === "in") totals.inKobo += kobo;
  else totals.outKobo += kobo;

  totals.balanceKobo = totals.inKobo - totals.outKobo;
}

function sumCashOnHand(
  movements: Array<{
    channel: CashChannel;
    direction: CashDirection;
    amountKobo: number;
  }>,
) {
  return movements
    .filter((movement) => movement.channel === "cash")
    .reduce(
      (sum, movement) =>
        sum +
        (movement.direction === "in"
          ? movement.amountKobo
          : -movement.amountKobo),
      0,
    );
}

/**
 * Per-day, per-channel in/out/balance for the range, plus the till balance:
 * all cash taken in minus all cash taken out, ever. POS and transfer settle to
 * the bank, so they are reported separately and never folded into cash on hand.
 */
export const dailySummary = query({
  args: {
    start: v.string(),
    end: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, PRIVILEGE);

    if (!isDateOnly(args.start) || !isDateOnly(args.end)) {
      throw new ConvexError("Use dates in yyyy-MM-dd form.");
    }

    const movements = await readCashMovements(ctx, args.start, args.end);

    const totals = {
      cash: newTotals(),
      pos: newTotals(),
      transfer: newTotals(),
    };
    const byDay = new Map<string, DaySummary>();

    for (const movement of movements) {
      const date = lagosDay(movement.occurredAt);
      const day = byDay.get(date) ?? newDay(date);

      addTo(totals[movement.channel], movement.direction, movement.amountKobo);
      addTo(day[movement.channel], movement.direction, movement.amountKobo);
      byDay.set(date, day);
    }

    const days = [...byDay.values()].sort((a, b) =>
      b.date.localeCompare(a.date),
    );

    const upToEnd = await ctx.db
      .query("cashMovements")
      .withIndex("by_occurredAt", (q) =>
        q.lte("occurredAt", dayEndIso(args.end)),
      )
      .collect();

    const cashOnHandKobo = sumCashOnHand(upToEnd);

    return { cashOnHandKobo, totals, days };
  },
});

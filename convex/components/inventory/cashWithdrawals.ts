import {
  type IndexRange,
  type IndexRangeBuilder,
  paginationOptsValidator,
} from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

function ensurePositiveKobo(label: string, value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a whole number of kobo, more than 0.`);
  }
}

function ensureWithdrawnAt(value: string | undefined) {
  if (value === undefined) return new Date().toISOString();
  if (Number.isNaN(Date.parse(value))) {
    throw new Error("withdrawnAt must be a valid date.");
  }
  return value;
}

function day(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

/** A withdrawal is dated today or yesterday — never future, never older. */
function ensureWithdrawnAtInWindow(withdrawnAt: string, now: string) {
  if (day(withdrawnAt) > day(now)) {
    throw new Error("A withdrawal cannot be dated in the future.");
  }

  const yesterday = new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (day(withdrawnAt) < yesterday) {
    throw new Error("A withdrawal can only be dated back one day.");
  }
}

/**
 * Derived cash in-hand: money that came in over the till in cash, minus cash
 * payments reversed, minus withdrawals (plus their reversals). Nothing is
 * stored — it is summed from the two ledgers every time.
 *
 * ponytail: collects every payment and withdrawal row per read, and purchases
 * paid in cash are NOT subtracted (purchases carry no payment-channel field),
 * so the figure can overstate. Add a payment channel to purchases when that
 * starts to matter.
 */
export function cashInHandKobo(
  payments: Doc<"salePayments">[],
  withdrawals: Doc<"cashWithdrawals">[],
): number {
  let cash = 0;

  for (const row of payments) {
    if (row.kind === "payment" && row.channel === "cash") {
      cash += row.amountKobo;
    }
  }
  // A reversal cancels the row it points at, and only that row.
  for (const row of payments) {
    if (row.kind !== "reversal") continue;
    const target = payments.find(
      (candidate) => candidate._id === row.reversesId,
    );
    if (target?.kind === "payment" && target.channel === "cash") {
      cash -= row.amountKobo;
    }
  }

  for (const row of withdrawals) {
    if (row.kind === "withdrawal") cash -= row.amountKobo;
    if (row.kind === "reversal") cash += row.amountKobo;
  }

  return cash;
}

/**
 * One read for the Cash tab: the drawer figure and the range total. Both come
 * from the same ledgers.
 */
export const summary = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const [payments, withdrawals] = await Promise.all([
      ctx.db.query("salePayments").collect(),
      ctx.db.query("cashWithdrawals").collect(),
    ]);

    const inRange = withdrawals.filter(
      (row) => row.withdrawnAt >= start && row.withdrawnAt <= end,
    );

    return {
      cashInHandKobo: cashInHandKobo(payments, withdrawals),
      withdrawnInRangeKobo: inRange.reduce(
        (sum, row) =>
          row.kind === "withdrawal"
            ? sum + row.amountKobo
            : sum - row.amountKobo,
        0,
      ),
    };
  },
});

export const range = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    return await ctx.db
      .query("cashWithdrawals")
      .withIndex("by_withdrawnAt", (q) =>
        q.gte("withdrawnAt", start).lte("withdrawnAt", end),
      )
      .collect();
  },
});

/** One ledger row by id, for the host's notification fan-out. */
export const getById = query({
  args: { id: v.id("cashWithdrawals") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Money handed out of the drawer. Refused when the drawer cannot cover it.
 */
export const recordWithdrawal = mutation({
  args: {
    callerId: v.string(),
    amountKobo: v.number(),
    withdrawnAt: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    ensurePositiveKobo("A withdrawal amount", args.amountKobo);

    const now = new Date().toISOString();
    const withdrawnAt = ensureWithdrawnAt(args.withdrawnAt);
    ensureWithdrawnAtInWindow(withdrawnAt, now);

    const [payments, withdrawals] = await Promise.all([
      ctx.db.query("salePayments").collect(),
      ctx.db.query("cashWithdrawals").collect(),
    ]);
    if (args.amountKobo > cashInHandKobo(payments, withdrawals)) {
      throw new Error("That is more than the cash in hand.");
    }

    return await ctx.db.insert("cashWithdrawals", {
      amountKobo: args.amountKobo,
      withdrawnAt,
      kind: "withdrawal",
      note: args.note?.trim() || undefined,
      createdBy: args.callerId,
      createdAt: now,
    });
  },
});

/**
 * A mistake is undone by a compensating row, never by editing. Reversing a
 * reversal is refused: the ledger stays a straight line of cause and effect.
 */
export const reverseWithdrawal = mutation({
  args: {
    callerId: v.string(),
    withdrawalId: v.id("cashWithdrawals"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.withdrawalId);
    if (!target) throw new Error("Withdrawal not found.");
    if (target.kind === "reversal") {
      throw new Error("A reversal cannot itself be reversed.");
    }
    const rows = await ctx.db.query("cashWithdrawals").collect();
    if (rows.some((row) => row.reversesId === target._id)) {
      throw new Error("This withdrawal is already reversed.");
    }

    const now = new Date().toISOString();
    return await ctx.db.insert("cashWithdrawals", {
      amountKobo: target.amountKobo,
      withdrawnAt: now,
      kind: "reversal",
      reversesId: target._id,
      note: args.note?.trim() || undefined,
      createdBy: args.callerId,
      createdAt: now,
    });
  },
});

/**
 * One page of the history, newest first, date bounds applied server-side.
 * Search scans the bounded range in memory: the note is free text with no
 * index. ponytail: full in-bounds collect per search, like the sales history.
 */
export const listPage = query({
  args: {
    paginationOpts: paginationOptsValidator,
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // The full collect covers both the reversal flags and the note search:
    // no index exists on either. ponytail: fine until the ledger grows.
    const all = await ctx.db.query("cashWithdrawals").collect();
    const reversedIds = all
      .filter((row) => row.reversesId)
      .map((row) => row.reversesId as string);

    const inBounds = (row: Doc<"cashWithdrawals">) =>
      (args.start === undefined || row.withdrawnAt >= args.start) &&
      (args.end === undefined || row.withdrawnAt <= args.end);

    if (args.search?.trim()) {
      const term = args.search.trim().toLowerCase();
      const matches = all
        .filter(
          (row) =>
            inBounds(row) && (row.note ?? "").toLowerCase().includes(term),
        )
        .sort((a, b) => b.withdrawnAt.localeCompare(a.withdrawnAt));

      const from = Number.parseInt(args.paginationOpts.cursor ?? "0", 10) || 0;
      const page = matches.slice(from, from + args.paginationOpts.numItems);
      const next = from + page.length;
      return {
        page,
        reversedIds,
        isDone: next >= matches.length,
        continueCursor: String(next),
      };
    }

    /** Bounds on the by_withdrawnAt index; undefined means unbounded on that side. */
    function bounds(
      q: IndexRangeBuilder<
        Doc<"cashWithdrawals">,
        ["withdrawnAt", "_creationTime"]
      >,
    ): IndexRange {
      if (args.start !== undefined && args.end !== undefined) {
        return q.gte("withdrawnAt", args.start).lte("withdrawnAt", args.end);
      }
      if (args.start !== undefined) return q.gte("withdrawnAt", args.start);
      if (args.end !== undefined) return q.lte("withdrawnAt", args.end);
      return q;
    }

    const page = await ctx.db
      .query("cashWithdrawals")
      .withIndex("by_withdrawnAt", bounds)
      .order("desc")
      .paginate(args.paginationOpts);

    return { ...page, reversedIds };
  },
});

import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation } from "./_generated/server";

export const paymentChannel = v.union(
  v.literal("cash"),
  v.literal("pos"),
  v.literal("transfer"),
);

export type SaleStatus =
  | "paid"
  | "part_paid"
  | "unpaid"
  | "written_off"
  | "voided";

export type SaleBalance = {
  paidKobo: number;
  writtenOffKobo: number;
  outstandingKobo: number;
  status: SaleStatus;
};

type Balancable = Pick<Doc<"sales">, "totalKobo" | "channel" | "voided">;

function statusOf(
  voided: boolean,
  paidKobo: number,
  writtenOffKobo: number,
  outstandingKobo: number,
): SaleStatus {
  if (voided) return "voided";
  if (outstandingKobo > 0) {
    const nothingPaid = paidKobo <= 0 && writtenOffKobo <= 0;
    return nothingPaid ? "unpaid" : "part_paid";
  }
  return writtenOffKobo > 0 ? "written_off" : "paid";
}

/**
 * The single source of the money view of a sale. Every query and mutation
 * reads paid, written-off, outstanding and status through here; nothing is
 * ever stored on the sale itself.
 *
 * Legacy rule: a sale with no ledger rows and a non-credit channel was taken
 * in full at the till, so it reads as fully paid without a backfill.
 */
export function saleBalance(
  sale: Balancable,
  rows: Doc<"salePayments">[],
): SaleBalance {
  let paidKobo = 0;
  let writtenOffKobo = 0;

  for (const row of rows) {
    if (row.kind === "payment") paidKobo += row.amountKobo;
    if (row.kind === "writeOff") writtenOffKobo += row.amountKobo;
  }

  // A reversal cancels the row it points at, and only that row.
  for (const row of rows) {
    if (row.kind !== "reversal") continue;
    const target = rows.find((candidate) => candidate._id === row.reversesId);
    if (target?.kind === "payment") paidKobo -= row.amountKobo;
    if (target?.kind === "writeOff") writtenOffKobo -= row.amountKobo;
  }

  if (rows.length === 0 && sale.channel !== "credit") {
    paidKobo = sale.totalKobo;
  }

  const outstandingKobo = sale.totalKobo - paidKobo - writtenOffKobo;

  return {
    paidKobo,
    writtenOffKobo,
    outstandingKobo,
    status: statusOf(sale.voided, paidKobo, writtenOffKobo, outstandingKobo),
  };
}

export async function ledgerFor(ctx: QueryCtx, saleId: Id<"sales">) {
  return await ctx.db
    .query("salePayments")
    .withIndex("by_sale", (q) => q.eq("saleId", saleId))
    .collect();
}

function ensurePositiveKobo(label: string, value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a whole number of kobo, more than 0.`);
  }
}

function ensurePaidAt(value: string | undefined) {
  if (value === undefined) return new Date().toISOString();
  if (Number.isNaN(Date.parse(value))) {
    throw new Error("paidAt must be a valid date.");
  }
  return value;
}

async function loadSale(
  ctx: MutationCtx,
  saleId: Id<"sales">,
): Promise<{ sale: Doc<"sales">; rows: Doc<"salePayments">[] }> {
  const sale = await ctx.db.get(saleId);
  if (!sale) throw new Error("Sale not found.");
  const rows = await ledgerFor(ctx, saleId);
  return { sale, rows };
}

/** Money taken against a sale. Never edits or allocates across sales. */
export const recordPayment = mutation({
  args: {
    callerId: v.string(),
    saleId: v.id("sales"),
    amountKobo: v.number(),
    paidAt: v.optional(v.string()),
    channel: paymentChannel,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    ensurePositiveKobo("A payment amount", args.amountKobo);

    const { sale, rows } = await loadSale(ctx, args.saleId);
    if (sale.voided) throw new Error("This sale is voided.");

    const { outstandingKobo } = saleBalance(sale, rows);
    if (args.amountKobo > outstandingKobo) {
      throw new Error("A payment cannot be more than what is outstanding.");
    }

    const now = new Date().toISOString();
    return await ctx.db.insert("salePayments", {
      saleId: args.saleId,
      amountKobo: args.amountKobo,
      paidAt: ensurePaidAt(args.paidAt),
      channel: args.channel,
      kind: "payment",
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
export const reversePayment = mutation({
  args: {
    callerId: v.string(),
    paymentId: v.id("salePayments"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.paymentId);
    if (!target) throw new Error("Payment not found.");
    if (target.kind === "reversal") {
      throw new Error("A reversal cannot itself be reversed.");
    }

    const rowsOnSale = await ledgerFor(ctx, target.saleId);
    if (rowsOnSale.some((row) => row.reversesId === target._id)) {
      throw new Error("This payment is already reversed.");
    }

    const now = new Date().toISOString();
    return await ctx.db.insert("salePayments", {
      saleId: target.saleId,
      amountKobo: target.amountKobo,
      paidAt: now,
      kind: "reversal",
      reversesId: target._id,
      note: args.note?.trim() || undefined,
      createdBy: args.callerId,
      createdAt: now,
    });
  },
});

/** Give up on part of a balance: it stops counting as money owed. */
export const writeOff = mutation({
  args: {
    callerId: v.string(),
    saleId: v.id("sales"),
    amountKobo: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    ensurePositiveKobo("A write-off amount", args.amountKobo);

    const { sale, rows } = await loadSale(ctx, args.saleId);
    if (sale.voided) throw new Error("This sale is voided.");

    const { outstandingKobo } = saleBalance(sale, rows);
    if (args.amountKobo > outstandingKobo) {
      throw new Error("A write-off cannot be more than what is outstanding.");
    }

    const now = new Date().toISOString();
    return await ctx.db.insert("salePayments", {
      saleId: args.saleId,
      amountKobo: args.amountKobo,
      paidAt: now,
      kind: "writeOff",
      note: args.note?.trim() || undefined,
      createdBy: args.callerId,
      createdAt: now,
    });
  },
});

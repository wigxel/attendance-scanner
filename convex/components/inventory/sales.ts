import type { IndexRange, IndexRangeBuilder } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { resolveUnit } from "./productUnits";
import { ledgerFor, saleBalance } from "./salePayments";
import { insertMovement } from "./stockMovements";

const channel = v.union(
  v.literal("cash"),
  v.literal("pos"),
  v.literal("transfer"),
  v.literal("credit"),
);

const lineInput = v.object({
  productId: v.id("products"),
  unitId: v.id("units"),
  quantity: v.number(),
  unitPriceKobo: v.number(),
});

type LineInput = {
  productId: Id<"products">;
  unitId: Id<"units">;
  quantity: number;
  unitPriceKobo: number;
};

function ensureKobo(label: string, value: number | undefined) {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a whole number of kobo, 0 or more.`);
  }
}

function ensureLines(lines: LineInput[]) {
  if (lines.length === 0) {
    throw new Error("A sale needs at least one line.");
  }
  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new Error("Every line quantity must be more than zero.");
    }
    ensureKobo("A line price", line.unitPriceKobo);
  }
}

export const create = mutation({
  args: {
    callerId: v.string(),
    channel,
    customerId: v.optional(v.string()),
    /** ISO date the credit is due. */
    dueDate: v.optional(v.string()),
    /** Money taken at the till; defaults to the full total, or 0 for credit. */
    amountPaidKobo: v.optional(v.number()),
    note: v.optional(v.string()),
    lines: v.array(lineInput),
  },
  handler: async (ctx, args) => {
    ensureLines(args.lines);
    ensureKobo("Amount paid", args.amountPaidKobo);

    const customerId = args.customerId?.trim() || undefined;
    if (args.channel === "credit" && !customerId) {
      throw new Error("A credit sale needs a named customer.");
    }

    const now = new Date().toISOString();

    // Resolve and validate every line before writing, so a bad line cannot
    // leave a partial sale behind even though the mutation is atomic.
    const resolved: Array<
      LineInput & {
        unitFactor: number;
        quantityInBase: number;
        lineTotalKobo: number;
      }
    > = [];

    for (const line of args.lines) {
      const product = await ctx.db.get(line.productId);
      if (!product) throw new Error("Product not found.");
      if (!product.active) {
        throw new Error(`"${product.name}" is archived and cannot be sold.`);
      }
      const { unitFactor } = await resolveUnit(ctx, product, line.unitId);
      const quantityInBase = line.quantity * unitFactor;

      resolved.push({
        ...line,
        unitFactor,
        quantityInBase,
        lineTotalKobo: Math.round(line.quantity * line.unitPriceKobo),
      });
    }

    const totalKobo = resolved.reduce(
      (sum, line) => sum + line.lineTotalKobo,
      0,
    );

    // Cash, POS and transfer take the money at the till; credit takes a
    // deposit the seller types in, which may be nothing.
    const amountPaidKobo =
      args.amountPaidKobo ?? (args.channel === "credit" ? 0 : totalKobo);
    if (amountPaidKobo > totalKobo) {
      throw new Error("Amount paid cannot be more than the sale total.");
    }

    const saleId = await ctx.db.insert("sales", {
      occurredAt: now,
      channel: args.channel,
      customerId,
      dueDate: args.dueDate?.trim() || undefined,
      totalKobo,
      note: args.note?.trim() || undefined,
      voided: false,
      createdBy: args.callerId,
      createdAt: now,
    });

    const saleLabel = `Sale ${saleId}`;

    for (const line of resolved) {
      await ctx.db.insert("saleLines", {
        saleId,
        productId: line.productId,
        unitId: line.unitId,
        quantity: line.quantity,
        unitFactor: line.unitFactor,
        quantityInBase: line.quantityInBase,
        unitPriceKobo: line.unitPriceKobo,
        lineTotalKobo: line.lineTotalKobo,
        occurredAt: now,
      });

      // The stock ledger rejects overselling: it refuses to go below zero.
      await insertMovement(ctx, {
        callerId: args.callerId,
        productId: line.productId,
        kind: "usage",
        quantity: line.quantity,
        unitId: line.unitId,
        unitFactor: line.unitFactor,
        occurredAt: now,
        note: saleLabel,
        source: "sale",
      });
    }

    // No row means no money moved: the ledger only records what happened.
    if (amountPaidKobo > 0) {
      await ctx.db.insert("salePayments", {
        saleId,
        amountKobo: amountPaidKobo,
        paidAt: now,
        channel: args.channel === "credit" ? undefined : args.channel,
        kind: "payment",
        createdBy: args.callerId,
        createdAt: now,
      });
    }

    return saleId;
  },
});

export const voidSale = mutation({
  args: {
    callerId: v.string(),
    saleId: v.id("sales"),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) throw new Error("Sale not found.");
    if (sale.voided) throw new Error("This sale is already voided.");

    const rows = await ledgerFor(ctx, args.saleId);
    if (rows.some((row) => row.kind === "payment" || row.kind === "writeOff")) {
      throw new Error("This sale has money against it and cannot be voided.");
    }

    const lines = await ctx.db
      .query("saleLines")
      .withIndex("by_sale", (q) => q.eq("saleId", args.saleId))
      .collect();

    const now = new Date().toISOString();
    const label = `Void sale ${args.saleId}`;

    for (const line of lines) {
      await insertMovement(ctx, {
        callerId: args.callerId,
        productId: line.productId,
        kind: "restock",
        quantity: line.quantity,
        unitId: line.unitId,
        unitFactor: line.unitFactor,
        occurredAt: now,
        note: label,
        reversal: true,
      });
    }

    await ctx.db.patch(args.saleId, {
      voided: true,
      voidedAt: now,
      voidedBy: args.callerId,
    });
  },
});

export const setSaleCustomer = mutation({
  args: {
    saleId: v.id("sales"),
    customerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sale = await ctx.db.get(args.saleId);
    if (!sale) throw new Error("Sale not found.");

    const rows = await ledgerFor(ctx, args.saleId);
    if (rows.some((row) => row.kind === "payment" || row.kind === "writeOff")) {
      throw new Error(
        "This sale has money against it; the customer cannot change.",
      );
    }

    await ctx.db.patch(args.saleId, {
      customerId: args.customerId?.trim() || undefined,
    });
  },
});

async function enrichSales(ctx: QueryCtx, sales: Doc<"sales">[]) {
  const [lineGroups, paymentGroups, products] = await Promise.all([
    Promise.all(
      sales.map((sale) =>
        ctx.db
          .query("saleLines")
          .withIndex("by_sale", (q) => q.eq("saleId", sale._id))
          .collect(),
      ),
    ),
    Promise.all(
      sales.map((sale) =>
        ctx.db
          .query("salePayments")
          .withIndex("by_sale", (q) => q.eq("saleId", sale._id))
          .collect(),
      ),
    ),
    ctx.db.query("products").collect(),
  ]);

  const productNames = new Map(
    products.map((product) => [product._id, product.name]),
  );

  return sales.map((sale, index) => {
    const lines = lineGroups[index];
    return {
      ...sale,
      balance: saleBalance(sale, paymentGroups[index]),
      lineCount: lines.length,
      items: lines.map((line) => ({
        id: line._id,
        name: productNames.get(line.productId) ?? "Unknown product",
        quantity: line.quantity,
      })),
    };
  });
}

/** Bounds on the by_occurredAt index; undefined means unbounded on that side. */
function occurredAtBounds(
  q: IndexRangeBuilder<Doc<"sales">, ["occurredAt", "_creationTime"]>,
  start: string | undefined,
  end: string | undefined,
): IndexRange {
  if (start !== undefined && end !== undefined) {
    return q.gte("occurredAt", start).lte("occurredAt", end);
  }
  if (start !== undefined) return q.gte("occurredAt", start);
  if (end !== undefined) return q.lte("occurredAt", end);
  return q;
}

/** Sales newest first, optionally bounded by occurredAt (inclusive). */
async function salesIn(
  ctx: QueryCtx,
  start: string | undefined,
  end: string | undefined,
) {
  return await ctx.db
    .query("sales")
    .withIndex("by_occurredAt", (q) => occurredAtBounds(q, start, end))
    .order("desc")
    .collect();
}

// The ledger functions live in salePayments.ts and are re-exported so they
// stay on the sales API surface alongside the receipt they belong to.
export { recordPayment, reversePayment, writeOff } from "./salePayments";

export const list = query({
  args: {
    start: v.optional(v.string()),
    end: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await enrichSales(ctx, await salesIn(ctx, args.start, args.end));
  },
});

/** One page of the history, newest first, date bounds applied server-side. */
export const listPage = query({
  args: {
    paginationOpts: paginationOptsValidator,
    start: v.optional(v.string()),
    end: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("sales")
      .withIndex("by_occurredAt", (q) =>
        occurredAtBounds(q, args.start, args.end),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return { ...page, page: await enrichSales(ctx, page.page) };
  },
});

export const get = query({
  args: { saleId: v.id("sales") },
  handler: async (ctx, { saleId }) => {
    const sale = await ctx.db.get(saleId);
    if (!sale) return null;

    const lines = await ctx.db
      .query("saleLines")
      .withIndex("by_sale", (q) => q.eq("saleId", saleId))
      .collect();

    const enriched = await Promise.all(
      lines.map(async (line) => {
        const [product, unit] = await Promise.all([
          ctx.db.get(line.productId),
          ctx.db.get(line.unitId),
        ]);
        return {
          ...line,
          productName: product?.name ?? "Unknown product",
          unitName: unit?.name ?? "unit",
        };
      }),
    );

    const payments = await ledgerFor(ctx, saleId);

    return {
      sale,
      lines: enriched,
      payments,
      balance: saleBalance(sale, payments),
    };
  },
});

export const linesInRange = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const lines = await ctx.db
      .query("saleLines")
      .withIndex("by_occurredAt", (q) =>
        q.gte("occurredAt", start).lte("occurredAt", end),
      )
      .collect();

    const saleIds = [...new Set(lines.map((line) => line.saleId))];
    const sales = await Promise.all(saleIds.map((id) => ctx.db.get(id)));
    const voided = new Set(
      sales.filter((sale) => sale?.voided).map((sale) => sale?._id),
    );

    return lines.filter((line) => !voided.has(line.saleId));
  },
});

export const range = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, { start, end }) => {
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_occurredAt", (q) =>
        q.gte("occurredAt", start).lte("occurredAt", end),
      )
      .collect();

    return sales.filter((sale) => !sale.voided);
  },
});

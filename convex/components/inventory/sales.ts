import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { resolveUnit } from "./productUnits";
import { insertMovement } from "./stockMovements";

const channel = v.union(
  v.literal("cash"),
  v.literal("pos"),
  v.literal("transfer"),
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
    note: v.optional(v.string()),
    lines: v.array(lineInput),
  },
  handler: async (ctx, args) => {
    ensureLines(args.lines);

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

    const saleId = await ctx.db.insert("sales", {
      occurredAt: now,
      channel: args.channel,
      customerId: args.customerId,
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
    await ctx.db.patch(args.saleId, {
      customerId: args.customerId?.trim() || undefined,
    });
  },
});

function groupLinesBySale(lines: Doc<"saleLines">[]) {
  const bySale = new Map<string, Doc<"saleLines">[]>();

  for (const line of lines) {
    const group = bySale.get(line.saleId) ?? [];
    group.push(line);
    bySale.set(line.saleId, group);
  }

  return bySale;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const [sales, lines] = await Promise.all([
      ctx.db.query("sales").collect(),
      ctx.db.query("saleLines").collect(),
    ]);

    const linesBySale = groupLinesBySale(lines);

    const products = await ctx.db.query("products").collect();
    const productNames = new Map(
      products.map((product) => [product._id, product.name]),
    );

    return sales
      .map((sale) => {
        const saleLines = linesBySale.get(sale._id) ?? [];
        return {
          ...sale,
          lineCount: saleLines.length,
          productNames: saleLines.map(
            (line) => productNames.get(line.productId) ?? "Unknown product",
          ),
        };
      })
      .sort(
        (a, b) =>
          b.occurredAt.localeCompare(a.occurredAt) ||
          b.createdAt.localeCompare(a.createdAt),
      );
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

    return { sale, lines: enriched };
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

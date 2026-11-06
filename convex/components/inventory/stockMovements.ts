import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";

export type StockStatus = "out" | "low" | "ok";
type MovementKind = "restock" | "usage" | "adjustment";

export function stockStatus(
  quantity: number,
  reorderLevel: number,
): StockStatus {
  if (quantity <= 0) return "out";
  if (reorderLevel > 0 && quantity <= reorderLevel) return "low";
  return "ok";
}

const movementKind = v.union(
  v.literal("restock"),
  v.literal("usage"),
  v.literal("adjustment"),
);

function signedDelta(kind: MovementKind, quantity: number, current: number) {
  if (kind === "restock") return quantity;
  if (kind === "usage") return -quantity;
  // Adjustment records what is on the shelf; the delta is derived so nobody
  // types a signed number.
  return quantity - current;
}

async function currentQuantity(
  ctx: QueryCtx | MutationCtx,
  productId: Id<"products">,
) {
  const movements = await ctx.db
    .query("stockMovements")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .collect();
  return movements.reduce((sum, movement) => sum + movement.quantityInBase, 0);
}

function ensureNote(kind: MovementKind, note?: string) {
  if (kind === "usage") return note?.trim() || undefined;
  const trimmed = note?.trim();
  if (!trimmed) {
    throw new Error(`A note is required on a ${kind} movement.`);
  }
  return trimmed;
}

function ensureQuantity(kind: MovementKind, quantity: number) {
  if (!Number.isFinite(quantity)) {
    throw new Error("Quantity must be a number.");
  }
  if (kind === "adjustment") {
    if (quantity < 0) {
      throw new Error("The counted quantity cannot be negative.");
    }
    return;
  }
  if (quantity <= 0) {
    throw new Error(`A ${kind} quantity must be more than zero.`);
  }
}

function ensureOccurredAt(value: string | undefined) {
  if (value === undefined) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Occurred at must be a valid date.");
  }
  return date.toISOString();
}

type Entry = {
  callerId: string;
  productId: Id<"products">;
  kind: MovementKind;
  quantity: number;
  occurredAt?: string;
  note?: string;
  source?: "bulk" | "manual";
};

async function insertMovement(ctx: MutationCtx, entry: Entry) {
  const product = await ctx.db.get(entry.productId);
  if (!product) throw new Error("Product not found.");
  if (!product.active) {
    throw new Error(
      `"${product.name}" is archived and cannot take stock movements.`,
    );
  }

  ensureQuantity(entry.kind, entry.quantity);
  const note = ensureNote(entry.kind, entry.note);
  const occurredAt = ensureOccurredAt(entry.occurredAt);

  const unit = await ctx.db.get(product.baseUnitId);
  const unitName = unit?.name ?? "unit";
  const current = await currentQuantity(ctx, entry.productId);
  const quantityInBase = signedDelta(entry.kind, entry.quantity, current);

  if (current + quantityInBase < 0) {
    throw new Error(
      `Cannot take ${entry.quantity} ${unitName} from "${product.name}": only ${current} ${unitName} on hand.`,
    );
  }

  return await ctx.db.insert("stockMovements", {
    productId: entry.productId,
    kind: entry.kind,
    unitId: product.baseUnitId,
    quantity: entry.quantity,
    unitFactor: 1,
    quantityInBase,
    occurredAt,
    createdAt: new Date().toISOString(),
    note,
    source: entry.source ?? "manual",
    createdBy: entry.callerId,
  });
}

export const record = mutation({
  args: {
    callerId: v.string(),
    productId: v.id("products"),
    kind: movementKind,
    quantity: v.number(),
    occurredAt: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => insertMovement(ctx, args),
});

export const recordBulkAdjustment = mutation({
  args: {
    callerId: v.string(),
    rows: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.optional(v.number()),
      }),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { callerId, rows, note }) => {
    const filled = rows.filter((row) => row.quantity !== undefined);
    if (filled.length === 0) throw new Error("Nothing to save.");

    const batchNote = note?.trim() || "Bulk stock adjustment";

    // Sequential on purpose: each adjustment derives its delta from the
    // balance left by the rows before it.
    for (const row of filled) {
      await insertMovement(ctx, {
        callerId,
        productId: row.productId,
        kind: "adjustment",
        quantity: row.quantity as number,
        note: batchNote,
        source: "bulk",
      });
    }

    return filled.length;
  },
});

// Quantity is always derived: never a stored column. A movement can be
// backdated, so "last" follows the date the stock actually moved.
function summariseMovements(movements: Doc<"stockMovements">[]) {
  const totals = new Map<string, { quantity: number; last: string | null }>();

  for (const movement of movements) {
    const total = totals.get(movement.productId) ?? { quantity: 0, last: null };
    total.quantity += movement.quantityInBase;
    if (!total.last || movement.occurredAt > total.last) {
      total.last = movement.occurredAt;
    }
    totals.set(movement.productId, total);
  }

  return totals;
}

export const levels = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, { includeArchived }) => {
    const [products, units, movements] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db.query("units").collect(),
      ctx.db.query("stockMovements").collect(),
    ]);

    const unitNames = new Map(units.map((unit) => [unit._id, unit.name]));
    const unitAbbreviations = new Map(
      units.map((unit) => [unit._id, unit.abbreviation]),
    );
    const totals = summariseMovements(movements);

    return products
      .filter((product) => includeArchived || product.active)
      .map((product) => {
        const total = totals.get(product._id) ?? { quantity: 0, last: null };
        return {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          active: product.active,
          reorderLevel: product.reorderLevel,
          baseUnitId: product.baseUnitId,
          baseUnitName: unitNames.get(product.baseUnitId) ?? "Unknown unit",
          baseUnitAbbreviation: unitAbbreviations.get(product.baseUnitId),
          quantity: total.quantity,
          status: stockStatus(total.quantity, product.reorderLevel),
          lastMovementAt: total.last,
        };
      })
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  },
});

export const history = query({
  args: { productId: v.id("products"), limit: v.optional(v.number()) },
  handler: async (ctx, { productId, limit }) => {
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    return movements
      .sort(
        (a, b) =>
          b.occurredAt.localeCompare(a.occurredAt) ||
          b.createdAt.localeCompare(a.createdAt),
      )
      .slice(0, limit ?? 20);
  },
});

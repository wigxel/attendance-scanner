import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { resolveUnit } from "./productUnits";
import { currentQuantity, insertMovement } from "./stockMovements";

const lineInput = v.object({
  productId: v.id("products"),
  unitId: v.id("units"),
  quantity: v.number(),
  unitCostKobo: v.number(),
});

type LineInput = {
  productId: Id<"products">;
  unitId: Id<"units">;
  quantity: number;
  unitCostKobo: number;
};

function ensureKobo(label: string, value: number | undefined) {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a whole number of kobo, 0 or more.`);
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

function ensureLines(lines: LineInput[]) {
  if (lines.length === 0) {
    throw new Error("A purchase needs at least one line.");
  }
  for (const line of lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new Error("Every line quantity must be more than zero.");
    }
    ensureKobo("A line cost", line.unitCostKobo);
  }
}

async function loadSupplierId(
  ctx: MutationCtx,
  supplierId: Id<"suppliers"> | undefined,
) {
  if (!supplierId) return undefined;
  const supplier = await ctx.db.get(supplierId);
  if (!supplier) throw new Error("Supplier not found.");
  if (!supplier.active) {
    throw new Error(
      `"${supplier.name}" is archived and cannot take purchases.`,
    );
  }
  return supplierId;
}

export const create = mutation({
  args: {
    callerId: v.string(),
    supplierId: v.optional(v.id("suppliers")),
    occurredAt: v.optional(v.string()),
    amountPaidKobo: v.optional(v.number()),
    freightKobo: v.optional(v.number()),
    discountKobo: v.optional(v.number()),
    note: v.optional(v.string()),
    lines: v.array(lineInput),
  },
  handler: async (ctx, args) => {
    ensureLines(args.lines);
    ensureKobo("Amount paid", args.amountPaidKobo);
    ensureKobo("Freight", args.freightKobo);
    ensureKobo("Discount", args.discountKobo);

    const supplierId = await loadSupplierId(ctx, args.supplierId);
    const occurredAt = ensureOccurredAt(args.occurredAt);
    const now = new Date().toISOString();

    // Resolve and validate everything before writing, so a bad line cannot
    // leave half a purchase behind even though the mutation is atomic.
    const resolved: Array<
      LineInput & {
        product: Doc<"products">;
        unitFactor: number;
        quantityInBase: number;
        lineTotalKobo: number;
      }
    > = [];

    for (const line of args.lines) {
      const product = await ctx.db.get(line.productId);
      if (!product) throw new Error("Product not found.");
      if (!product.active) {
        throw new Error(`"${product.name}" is archived and cannot be bought.`);
      }
      const { unitFactor } = await resolveUnit(ctx, product, line.unitId);
      const quantityInBase = line.quantity * unitFactor;

      resolved.push({
        ...line,
        product,
        unitFactor,
        quantityInBase,
        lineTotalKobo: Math.round(line.quantity * line.unitCostKobo),
      });
    }

    const totalKobo = resolved.reduce(
      (sum, line) => sum + line.lineTotalKobo,
      0,
    );
    const amountPaidKobo = args.amountPaidKobo ?? totalKobo;

    const purchaseId = await ctx.db.insert("purchases", {
      supplierId,
      occurredAt,
      totalKobo,
      amountPaidKobo,
      freightKobo: args.freightKobo,
      discountKobo: args.discountKobo,
      note: args.note?.trim() || undefined,
      voided: false,
      createdBy: args.callerId,
      createdAt: now,
    });

    const purchaseLabel = `Purchase ${purchaseId}`;

    for (const line of resolved) {
      const onHand = await currentQuantity(ctx, line.productId);
      const oldCost = line.product.costPriceKobo;
      const unitCostInBase = line.lineTotalKobo / line.quantityInBase;
      const newCost =
        onHand + line.quantityInBase > 0
          ? Math.round(
              (onHand * oldCost + line.quantityInBase * unitCostInBase) /
                (onHand + line.quantityInBase),
            )
          : oldCost;

      await ctx.db.insert("purchaseLines", {
        purchaseId,
        productId: line.productId,
        unitId: line.unitId,
        quantity: line.quantity,
        unitFactor: line.unitFactor,
        quantityInBase: line.quantityInBase,
        unitCostKobo: line.unitCostKobo,
        lineTotalKobo: line.lineTotalKobo,
        previousCostKobo: oldCost,
      });

      await insertMovement(ctx, {
        callerId: args.callerId,
        productId: line.productId,
        kind: "restock",
        quantity: line.quantity,
        unitId: line.unitId,
        unitFactor: line.unitFactor,
        occurredAt,
        note: `${purchaseLabel} from supplier`,
      });

      await ctx.db.patch(line.productId, {
        costPriceKobo: newCost,
        updatedAt: now,
        updatedBy: args.callerId,
      });
    }

    return purchaseId;
  },
});

export const voidPurchase = mutation({
  args: {
    callerId: v.string(),
    purchaseId: v.id("purchases"),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) throw new Error("Purchase not found.");
    if (purchase.voided) throw new Error("This purchase is already voided.");

    const lines = await ctx.db
      .query("purchaseLines")
      .withIndex("by_purchase", (q) => q.eq("purchaseId", args.purchaseId))
      .collect();

    const now = new Date().toISOString();
    const label = `Void purchase ${args.purchaseId}`;

    // Reverse order so a product bought twice in one purchase ends up at the
    // average cost it had before the first line.
    for (const line of [...lines].reverse()) {
      await insertMovement(ctx, {
        callerId: args.callerId,
        productId: line.productId,
        kind: "usage",
        quantity: line.quantity,
        unitId: line.unitId,
        unitFactor: line.unitFactor,
        occurredAt: now,
        note: label,
      });

      await ctx.db.patch(line.productId, {
        costPriceKobo: line.previousCostKobo,
        updatedAt: now,
        updatedBy: args.callerId,
      });
    }

    await ctx.db.patch(args.purchaseId, {
      voided: true,
      voidedAt: now,
      voidedBy: args.callerId,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const [purchases, lines, suppliers] = await Promise.all([
      ctx.db.query("purchases").collect(),
      ctx.db.query("purchaseLines").collect(),
      ctx.db.query("suppliers").collect(),
    ]);

    const supplierNames = new Map(
      suppliers.map((supplier) => [supplier._id, supplier.name]),
    );
    const lineCounts = new Map<string, number>();
    for (const line of lines) {
      lineCounts.set(
        line.purchaseId,
        (lineCounts.get(line.purchaseId) ?? 0) + 1,
      );
    }

    return purchases
      .map((purchase) => ({
        ...purchase,
        supplierName: purchase.supplierId
          ? (supplierNames.get(purchase.supplierId) ?? null)
          : null,
        lineCount: lineCounts.get(purchase._id) ?? 0,
        outstandingKobo: purchase.totalKobo - purchase.amountPaidKobo,
      }))
      .sort(
        (a, b) =>
          b.occurredAt.localeCompare(a.occurredAt) ||
          b.createdAt.localeCompare(a.createdAt),
      );
  },
});

export const get = query({
  args: { purchaseId: v.id("purchases") },
  handler: async (ctx, { purchaseId }) => {
    const purchase = await ctx.db.get(purchaseId);
    if (!purchase) return null;

    const [lines, supplier] = await Promise.all([
      ctx.db
        .query("purchaseLines")
        .withIndex("by_purchase", (q) => q.eq("purchaseId", purchaseId))
        .collect(),
      purchase.supplierId ? ctx.db.get(purchase.supplierId) : undefined,
    ]);

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

    return {
      purchase,
      supplier,
      lines: enriched,
      outstandingKobo: purchase.totalKobo - purchase.amountPaidKobo,
    };
  },
});

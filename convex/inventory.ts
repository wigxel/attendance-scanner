import { v } from "convex/values";
import { components } from "./_generated/api";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { requirePrivilege } from "./acl";
import type { Doc } from "./components/inventory/_generated/dataModel";
import { DEFAULT_UNIT_NAMES } from "./components/inventory/defaultUnits";
import { readId } from "./myFunctions";

const PRIVILEGE = "inventory:manage";

export type StockLevel = {
  productId: string;
  name: string;
  sku?: string;
  active: boolean;
  reorderLevel: number;
  baseUnitId: string;
  baseUnitName: string;
  baseUnitAbbreviation?: string;
  quantity: number;
  status: "out" | "low" | "ok";
  lastMovementAt: string | null;
};

export type ProductMovement = Doc<"stockMovements"> & { recordedBy: string };

export type Supplier = Doc<"suppliers">;

export type PurchaseSummary = Doc<"purchases"> & {
  supplierName: string | null;
  lineCount: number;
  outstandingKobo: number;
};

export type PurchaseLine = Doc<"purchaseLines"> & {
  productName: string;
  unitName: string;
};

export type PurchaseDetail = {
  purchase: Doc<"purchases">;
  supplier: Doc<"suppliers"> | null;
  lines: PurchaseLine[];
  outstandingKobo: number;
};

export type PurchaseFormUnit = {
  unitId: string;
  name: string;
  abbreviation?: string;
  factorToBase: number;
};

export type PurchaseFormProduct = {
  productId: string;
  name: string;
  sku?: string;
  costPriceKobo: number;
  baseUnitId: string;
  units: PurchaseFormUnit[];
};

export type PurchaseFormData = {
  products: PurchaseFormProduct[];
  suppliers: Supplier[];
};

// The component never sees ACL or identity: the host checks the privilege and
// passes the caller down only so rows can carry createdBy/updatedBy.
async function requireCallerId(ctx: QueryCtx | MutationCtx) {
  await requirePrivilege(ctx, PRIVILEGE);
  const id = await readId(ctx);
  if (!id) throw new Error("Authentication required.");
  return id as string;
}

export const listProducts = query({
  args: {
    search: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, PRIVILEGE);
    return (await ctx.runQuery(
      components.inventory.products.list,
      args,
    )) as Doc<"products">[];
  },
});

export const createProduct = mutation({
  args: {
    name: v.string(),
    sku: v.optional(v.string()),
    baseUnitId: v.string(),
    reorderLevel: v.optional(v.number()),
    costPriceKobo: v.optional(v.number()),
    sellPriceKobo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await requireCallerId(ctx);
    return await ctx.runMutation(components.inventory.products.create, {
      ...args,
      callerId: caller,
    });
  },
});

export const updateProduct = mutation({
  args: {
    productId: v.string(),
    name: v.string(),
    sku: v.optional(v.string()),
    baseUnitId: v.string(),
    reorderLevel: v.number(),
    costPriceKobo: v.number(),
    sellPriceKobo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const caller = await requireCallerId(ctx);
    await ctx.runMutation(components.inventory.products.update, {
      ...args,
      callerId: caller,
    });
  },
});

export const archiveProduct = mutation({
  args: { productId: v.string() },
  handler: async (ctx, { productId }) => {
    const caller = await requireCallerId(ctx);
    await ctx.runMutation(components.inventory.products.archive, {
      productId,
      callerId: caller,
    });
  },
});

export const listUnits = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, PRIVILEGE);
    return (await ctx.runQuery(
      components.inventory.units.list,
      args,
    )) as Doc<"units">[];
  },
});

export const createUnit = mutation({
  args: { name: v.string(), abbreviation: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const caller = await requireCallerId(ctx);
    return await ctx.runMutation(components.inventory.units.create, {
      ...args,
      callerId: caller,
    });
  },
});

export const renameUnit = mutation({
  args: {
    unitId: v.string(),
    name: v.string(),
    abbreviation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCallerId(ctx);
    await ctx.runMutation(components.inventory.units.rename, args);
  },
});

export const archiveUnit = mutation({
  args: { unitId: v.string() },
  handler: async (ctx, { unitId }) => {
    await requireCallerId(ctx);
    await ctx.runMutation(components.inventory.units.archive, { unitId });
  },
});

export const seedUnits = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;

    const units = (await ctx.runQuery(components.inventory.units.list, {
      includeArchived: true,
    })) as Doc<"units">[];
    const known = new Set(units.map((unit) => unit.name.trim().toLowerCase()));
    const missing = DEFAULT_UNIT_NAMES.filter((name) => !known.has(name));

    if (dryRun) {
      return { dryRun, added: 0, missing };
    }

    const added = await ctx.runMutation(
      components.inventory.units.seedDefaultUnits,
      {},
    );

    return { dryRun, added, missing };
  },
});

export const stockLevels = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, PRIVILEGE);
    return (await ctx.runQuery(
      components.inventory.stockMovements.levels,
      args,
    )) as StockLevel[];
  },
});

export const recordMovement = mutation({
  args: {
    productId: v.string(),
    kind: v.union(
      v.literal("restock"),
      v.literal("usage"),
      v.literal("adjustment"),
    ),
    quantity: v.number(),
    occurredAt: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await requireCallerId(ctx);
    return await ctx.runMutation(components.inventory.stockMovements.record, {
      ...args,
      callerId: caller,
    });
  },
});

export const recordBulkAdjustment = mutation({
  args: {
    rows: v.array(
      v.object({
        productId: v.string(),
        quantity: v.optional(v.number()),
      }),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { rows, note }) => {
    const caller = await requireCallerId(ctx);
    return await ctx.runMutation(
      components.inventory.stockMovements.recordBulkAdjustment,
      { rows, note, callerId: caller },
    );
  },
});

export const productMovements = query({
  args: { productId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, PRIVILEGE);
    const movements = (await ctx.runQuery(
      components.inventory.stockMovements.history,
      args,
    )) as Doc<"stockMovements">[];

    return await Promise.all(
      movements.map(async (movement): Promise<ProductMovement> => {
        const recorder = await ctx.db
          .query("profile")
          .withIndex("by_user_id", (q) => q.eq("id", movement.createdBy))
          .first();

        return {
          ...movement,
          recordedBy: recorder
            ? `${recorder.firstName} ${recorder.lastName}`.trim()
            : movement.createdBy,
        };
      }),
    );
  },
});

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export const listSuppliers = query({
  args: {
    search: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, PRIVILEGE);
    return (await ctx.runQuery(
      components.inventory.suppliers.list,
      args,
    )) as Supplier[];
  },
});

export const createSupplier = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    contactName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await requireCallerId(ctx);
    return await ctx.runMutation(components.inventory.suppliers.create, {
      ...args,
      callerId: caller,
    });
  },
});

export const updateSupplier = mutation({
  args: {
    supplierId: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    contactName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCallerId(ctx);
    await ctx.runMutation(components.inventory.suppliers.update, args);
  },
});

export const archiveSupplier = mutation({
  args: { supplierId: v.string() },
  handler: async (ctx, { supplierId }) => {
    await requireCallerId(ctx);
    await ctx.runMutation(components.inventory.suppliers.archive, {
      supplierId,
    });
  },
});

// ---------------------------------------------------------------------------
// Product units
// ---------------------------------------------------------------------------

export const setProductUnit = mutation({
  args: {
    productId: v.string(),
    unitId: v.string(),
    factorToBase: v.number(),
  },
  handler: async (ctx, args) => {
    await requireCallerId(ctx);
    return await ctx.runMutation(
      components.inventory.productUnits.upsert,
      args,
    );
  },
});

// ---------------------------------------------------------------------------
// Purchases
// ---------------------------------------------------------------------------

export const purchaseFormData = query({
  args: {},
  handler: async (ctx): Promise<PurchaseFormData> => {
    await requirePrivilege(ctx, PRIVILEGE);

    const [products, units, suppliers, alternates] = await Promise.all([
      ctx.runQuery(components.inventory.products.list, {}),
      ctx.runQuery(components.inventory.units.list, {}),
      ctx.runQuery(components.inventory.suppliers.list, {}),
      ctx.runQuery(components.inventory.productUnits.listAll, {}),
    ]);

    const unitById = new Map(
      (units as Doc<"units">[]).map((unit) => [unit._id, unit]),
    );

    const toUnit = (
      unitId: string,
      factorToBase: number,
    ): PurchaseFormUnit | null => {
      const unit = unitById.get(unitId as Doc<"units">["_id"]);
      if (!unit) return null;
      return {
        unitId: unit._id,
        name: unit.name,
        abbreviation: unit.abbreviation,
        factorToBase,
      };
    };

    return {
      products: (products as Doc<"products">[]).map((product) => {
        const base = toUnit(product.baseUnitId, 1);
        const extra = (alternates as Doc<"productUnits">[])
          .filter((row) => row.productId === product._id)
          .map((row) => toUnit(row.unitId, row.factorToBase))
          .filter((unit): unit is PurchaseFormUnit => unit !== null);

        return {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          costPriceKobo: product.costPriceKobo,
          baseUnitId: product.baseUnitId,
          units: base ? [base, ...extra] : extra,
        };
      }),
      suppliers: suppliers as Supplier[],
    };
  },
});

export const createPurchase = mutation({
  args: {
    supplierId: v.optional(v.string()),
    occurredAt: v.optional(v.string()),
    amountPaidKobo: v.optional(v.number()),
    freightKobo: v.optional(v.number()),
    discountKobo: v.optional(v.number()),
    note: v.optional(v.string()),
    lines: v.array(
      v.object({
        productId: v.string(),
        unitId: v.string(),
        quantity: v.number(),
        unitCostKobo: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const caller = await requireCallerId(ctx);
    return await ctx.runMutation(components.inventory.purchases.create, {
      ...args,
      callerId: caller,
    });
  },
});

export const voidPurchase = mutation({
  args: { purchaseId: v.string() },
  handler: async (ctx, { purchaseId }) => {
    const caller = await requireCallerId(ctx);
    await ctx.runMutation(components.inventory.purchases.voidPurchase, {
      purchaseId,
      callerId: caller,
    });
  },
});

export const listPurchases = query({
  args: {},
  handler: async (ctx) => {
    await requirePrivilege(ctx, PRIVILEGE);
    return (await ctx.runQuery(
      components.inventory.purchases.list,
      {},
    )) as PurchaseSummary[];
  },
});

export const purchaseDetail = query({
  args: { purchaseId: v.string() },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, PRIVILEGE);
    return (await ctx.runQuery(
      components.inventory.purchases.get,
      args,
    )) as PurchaseDetail | null;
  },
});

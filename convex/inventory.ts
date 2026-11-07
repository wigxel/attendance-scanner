import { v } from "convex/values";
import { components } from "./_generated/api";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { requireAny, requirePrivilege } from "./acl";
import type { Doc } from "./components/inventory/_generated/dataModel";
import { DEFAULT_UNIT_NAMES } from "./components/inventory/defaultUnits";
import { dayBounds } from "./kpis";
import { readId } from "./myFunctions";
import { paymentChannelValidator } from "./shared";

const PRIVILEGE = "inventory:manage";
const SELL_PRIVILEGE = "inventory:sell";
const SELL_OR_MANAGE = [SELL_PRIVILEGE, PRIVILEGE];

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

/** Channel a sale was taken on. */
export type SaleChannel = "cash" | "pos" | "transfer";

export type RevenueChannelShare = {
  channel: SaleChannel;
  totalKobo: number;
};

export type TopProduct = {
  productId: string;
  name: string;
  unitName: string;
  quantity: number;
  revenueKobo: number;
};

export type SaleSummary = Doc<"sales"> & {
  customerName: string | null;
  lineCount: number;
  productNames: string[];
};

export type SaleLine = Doc<"saleLines"> & {
  productName: string;
  unitName: string;
};

export type SaleDetail = {
  sale: Doc<"sales">;
  customerName: string | null;
  createdByName: string;
  lines: SaleLine[];
};

export type SaleFormProduct = {
  productId: string;
  name: string;
  sku?: string;
  sellPriceKobo?: number;
  baseUnitId: string;
  units: PurchaseFormUnit[];
};

export type SaleFormData = {
  products: SaleFormProduct[];
};

export type InventoryMovementRow = {
  productId: string;
  name: string;
  unitName: string;
  purchased: number;
  used: number;
  /** Used ÷ purchased, or null when nothing was bought in the period. */
  sellThroughPercent: number | null;
};

export type InventoryMetrics = {
  range: { start: string; end: string };
  stock: {
    valueKobo: number;
    productCount: number;
    lowCount: number;
    outCount: number;
  };
  spend: {
    totalKobo: number;
    paidKobo: number;
    outstandingKobo: number;
    purchaseCount: number;
  };
  revenue: {
    totalKobo: number;
    salesCount: number;
    byChannel: RevenueChannelShare[];
  };
  topProducts: TopProduct[];
  margin: {
    cogsKobo: number;
    grossMarginKobo: number;
    grossMarginPercent: number | null;
  };
  movement: InventoryMovementRow[];
};

const SALE_CHANNELS: SaleChannel[] = ["cash", "pos", "transfer"];

function parseDay(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be a date like 2026-11-06.`);
  }
  if (Number.isNaN(dayBounds(value).fromMs)) {
    throw new Error(`${label} is not a real date.`);
  }
  return value;
}

function revenueBreakdown(sales: Doc<"sales">[]) {
  const totals = new Map<SaleChannel, number>(
    SALE_CHANNELS.map((channel) => [channel, 0]),
  );

  for (const sale of sales) {
    totals.set(sale.channel, (totals.get(sale.channel) ?? 0) + sale.totalKobo);
  }

  const byChannel: RevenueChannelShare[] = SALE_CHANNELS.map((channel) => ({
    channel,
    totalKobo: totals.get(channel) ?? 0,
  }));

  return {
    byChannel,
    totalKobo: byChannel.reduce((sum, share) => sum + share.totalKobo, 0),
    salesCount: sales.length,
  };
}

function topProducts(
  lines: Doc<"saleLines">[],
  productById: Map<string, Doc<"products">>,
  unitNameById: Map<string, string>,
  limit = 5,
): TopProduct[] {
  const grouped = new Map<string, { quantity: number; revenueKobo: number }>();

  for (const line of lines) {
    const row = grouped.get(line.productId) ?? {
      quantity: 0,
      revenueKobo: 0,
    };
    row.quantity += line.quantityInBase;
    row.revenueKobo += line.lineTotalKobo;
    grouped.set(line.productId, row);
  }

  return [...grouped.entries()]
    .map(([productId, row]) => {
      const product = productById.get(productId);
      return {
        productId,
        name: product?.name ?? "Unknown product",
        unitName: product
          ? (unitNameById.get(product.baseUnitId) ?? "unit")
          : "unit",
        quantity: row.quantity,
        revenueKobo: row.revenueKobo,
      };
    })
    .sort((a, b) => b.quantity - a.quantity || b.revenueKobo - a.revenueKobo)
    .slice(0, limit);
}

function stockSummary(
  levels: StockLevel[],
  productById: Map<string, Doc<"products">>,
) {
  const valueKobo = levels.reduce((sum, level) => {
    const product = productById.get(level.productId);
    return sum + Math.max(level.quantity, 0) * (product?.costPriceKobo ?? 0);
  }, 0);

  return {
    valueKobo,
    productCount: levels.length,
    lowCount: levels.filter((level) => level.status === "low").length,
    outCount: levels.filter((level) => level.status === "out").length,
  };
}

function spendSummary(
  purchases: PurchaseSummary[],
  startIso: string,
  endIso: string,
) {
  const rows = purchases.filter(
    (purchase) =>
      !purchase.voided &&
      purchase.occurredAt >= startIso &&
      purchase.occurredAt <= endIso,
  );
  const totalKobo = rows.reduce((sum, row) => sum + row.totalKobo, 0);
  const paidKobo = rows.reduce((sum, row) => sum + row.amountPaidKobo, 0);

  return {
    totalKobo,
    paidKobo,
    outstandingKobo: totalKobo - paidKobo,
    purchaseCount: rows.length,
  };
}

function movementSummary(
  purchaseLines: Doc<"purchaseLines">[],
  movements: Doc<"stockMovements">[],
  productById: Map<string, Doc<"products">>,
  unitNameById: Map<string, string>,
  liveSaleNotes: Set<string>,
) {
  const purchasedByProduct = new Map<string, number>();
  for (const line of purchaseLines) {
    purchasedByProduct.set(
      line.productId,
      (purchasedByProduct.get(line.productId) ?? 0) + line.quantityInBase,
    );
  }

  const usedByProduct = new Map<string, number>();
  let cogsKobo = 0;
  for (const movement of movements) {
    // Void reversals are usage rows that undo a restock, not real usage.
    if (movement.kind !== "usage" || movement.reversal) continue;
    // A voided sale keeps its original usage row, so only count the sales
    // that are still live in this period.
    if (movement.source === "sale" && !liveSaleNotes.has(movement.note ?? "")) {
      continue;
    }

    const used = -movement.quantityInBase;
    usedByProduct.set(
      movement.productId,
      (usedByProduct.get(movement.productId) ?? 0) + used,
    );

    // Ceiling: the schema keeps only the current weighted average cost, so
    // usage is costed at today's price, not the price on the movement date.
    const product = productById.get(movement.productId);
    cogsKobo += used * (product?.costPriceKobo ?? 0);
  }

  const productIds = new Set([
    ...purchasedByProduct.keys(),
    ...usedByProduct.keys(),
  ]);
  const rows: InventoryMovementRow[] = [...productIds]
    .map((productId) => {
      const product = productById.get(productId);
      const purchased = purchasedByProduct.get(productId) ?? 0;
      const used = usedByProduct.get(productId) ?? 0;
      return {
        productId,
        name: product?.name ?? "Unknown product",
        unitName: product
          ? (unitNameById.get(product.baseUnitId) ?? "unit")
          : "unit",
        purchased,
        used,
        sellThroughPercent:
          purchased > 0 ? Math.round((used / purchased) * 100) : null,
      };
    })
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  return { rows, cogsKobo };
}

// The component never sees ACL or identity: the host checks the privilege and
// passes the caller down only so rows can carry createdBy/updatedBy.
async function requireCallerId(
  ctx: QueryCtx | MutationCtx,
  privileges: string[] = [PRIVILEGE],
) {
  if (privileges.length === 1) {
    await requirePrivilege(ctx, privileges[0]);
  } else {
    await requireAny(ctx, privileges);
  }
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

function unitMapper(
  units: Doc<"units">[],
  alternates: Doc<"productUnits">[],
): (product: Doc<"products">) => PurchaseFormUnit[] {
  const unitById = new Map(units.map((unit) => [unit._id, unit]));
  const alternatesByProduct = new Map<string, Doc<"productUnits">[]>();
  for (const row of alternates) {
    const group = alternatesByProduct.get(row.productId) ?? [];
    group.push(row);
    alternatesByProduct.set(row.productId, group);
  }

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

  return (product) => {
    const base = toUnit(product.baseUnitId, 1);
    const extra = (alternatesByProduct.get(product._id) ?? [])
      .map((row) => toUnit(row.unitId, row.factorToBase))
      .filter((unit): unit is PurchaseFormUnit => unit !== null);

    return base ? [base, ...extra] : extra;
  };
}

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

    const unitsFor = unitMapper(
      units as Doc<"units">[],
      alternates as Doc<"productUnits">[],
    );

    return {
      products: (products as Doc<"products">[]).map((product) => ({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        costPriceKobo: product.costPriceKobo,
        baseUnitId: product.baseUnitId,
        units: unitsFor(product),
      })),
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

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

async function customerExists(ctx: QueryCtx, customerId: string) {
  const profile = await ctx.db
    .query("profile")
    .withIndex("by_user_id", (q) => q.eq("id", customerId))
    .first();
  return profile !== null;
}

async function profileName(ctx: QueryCtx, profileId: string) {
  const profile = await ctx.db
    .query("profile")
    .withIndex("by_user_id", (q) => q.eq("id", profileId))
    .first();
  return profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : profileId;
}

async function customerName(ctx: QueryCtx, customerId: string | undefined) {
  if (!customerId) return null;
  return await profileName(ctx, customerId);
}

/** One profile lookup per distinct customer, not one per sale. */
async function customerNames(
  ctx: QueryCtx,
  sales: Array<{ customerId?: string }>,
) {
  const ids = [
    ...new Set(
      sales
        .map((sale) => sale.customerId)
        .filter((id): id is string => id !== undefined),
    ),
  ];
  const entries = await Promise.all(
    ids.map(async (id) => [id, await profileName(ctx, id)] as const),
  );
  return new Map(entries);
}

export const saleFormData = query({
  args: {},
  handler: async (ctx): Promise<SaleFormData> => {
    await requireAny(ctx, SELL_OR_MANAGE);

    const [products, units, alternates] = await Promise.all([
      ctx.runQuery(components.inventory.products.list, {}),
      ctx.runQuery(components.inventory.units.list, {}),
      ctx.runQuery(components.inventory.productUnits.listAll, {}),
    ]);

    const unitsFor = unitMapper(
      units as Doc<"units">[],
      alternates as Doc<"productUnits">[],
    );

    return {
      products: (products as Doc<"products">[]).map((product) => ({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        sellPriceKobo: product.sellPriceKobo,
        baseUnitId: product.baseUnitId,
        units: unitsFor(product),
      })),
    };
  },
});

export const recordSale = mutation({
  args: {
    channel: paymentChannelValidator,
    customerId: v.optional(v.string()),
    note: v.optional(v.string()),
    lines: v.array(
      v.object({
        productId: v.string(),
        unitId: v.string(),
        quantity: v.number(),
        unitPriceKobo: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const caller = await requireCallerId(ctx, SELL_OR_MANAGE);

    const customerId = args.customerId?.trim() || undefined;
    if (customerId && !(await customerExists(ctx, customerId))) {
      throw new Error("Customer not found.");
    }

    return await ctx.runMutation(components.inventory.sales.create, {
      ...args,
      customerId,
      callerId: caller,
    });
  },
});

export const voidSale = mutation({
  args: { saleId: v.string() },
  handler: async (ctx, { saleId }) => {
    const caller = await requireCallerId(ctx);
    await ctx.runMutation(components.inventory.sales.voidSale, {
      saleId,
      callerId: caller,
    });
  },
});

export const setSaleCustomer = mutation({
  args: { saleId: v.string(), customerId: v.optional(v.string()) },
  handler: async (ctx, { saleId, customerId }) => {
    await requireCallerId(ctx);

    const trimmed = customerId?.trim() || undefined;
    if (trimmed && !(await customerExists(ctx, trimmed))) {
      throw new Error("Customer not found.");
    }

    await ctx.runMutation(components.inventory.sales.setSaleCustomer, {
      saleId,
      customerId: trimmed,
    });
  },
});

export const listSales = query({
  args: {},
  handler: async (ctx): Promise<SaleSummary[]> => {
    await requireAny(ctx, SELL_OR_MANAGE);

    const sales = (await ctx.runQuery(
      components.inventory.sales.list,
      {},
    )) as Array<Doc<"sales"> & { lineCount: number; productNames: string[] }>;

    const nameById = await customerNames(ctx, sales);

    return sales.map((sale) => ({
      ...sale,
      customerName: sale.customerId
        ? (nameById.get(sale.customerId) ?? null)
        : null,
    }));
  },
});

export const saleDetail = query({
  args: { saleId: v.string() },
  handler: async (ctx, args): Promise<SaleDetail | null> => {
    await requireAny(ctx, SELL_OR_MANAGE);

    const detail = (await ctx.runQuery(
      components.inventory.sales.get,
      args,
    )) as { sale: Doc<"sales">; lines: SaleLine[] } | null;

    if (!detail) return null;

    return {
      ...detail,
      customerName: await customerName(ctx, detail.sale.customerId),
      createdByName: await profileName(ctx, detail.sale.createdBy),
    };
  },
});

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * Picture of the shop for a date range. Revenue comes from recorded sales and
 * cost of goods from the usage movements those sales wrote; there is no other
 * source of money in this module.
 */
export const metrics = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, args): Promise<InventoryMetrics> => {
    await requirePrivilege(ctx, PRIVILEGE);
    const start = parseDay(args.start, "Start");
    const end = parseDay(args.end, "End");
    if (end < start) throw new Error("End must be on or after start.");

    const startIso = new Date(dayBounds(start).fromMs).toISOString();
    const endIso = new Date(dayBounds(end).toMs).toISOString();

    const [
      levels,
      products,
      units,
      purchases,
      purchaseLines,
      movements,
      sales,
      saleLines,
    ] = await Promise.all([
      ctx.runQuery(components.inventory.stockMovements.levels, {}) as Promise<
        StockLevel[]
      >,
      ctx.runQuery(components.inventory.products.list, {
        includeArchived: true,
      }) as Promise<Doc<"products">[]>,
      ctx.runQuery(components.inventory.units.list, {
        includeArchived: true,
      }) as Promise<Doc<"units">[]>,
      ctx.runQuery(components.inventory.purchases.list, {}) as Promise<
        PurchaseSummary[]
      >,
      ctx.runQuery(components.inventory.purchases.linesInRange, {
        start: startIso,
        end: endIso,
      }) as Promise<Doc<"purchaseLines">[]>,
      ctx.runQuery(components.inventory.stockMovements.range, {
        start: startIso,
        end: endIso,
      }) as Promise<Doc<"stockMovements">[]>,
      ctx.runQuery(components.inventory.sales.range, {
        start: startIso,
        end: endIso,
      }) as Promise<Doc<"sales">[]>,
      ctx.runQuery(components.inventory.sales.linesInRange, {
        start: startIso,
        end: endIso,
      }) as Promise<Doc<"saleLines">[]>,
    ]);

    const productById = new Map<string, Doc<"products">>(
      products.map((product) => [product._id, product]),
    );
    const unitNameById = new Map<string, string>(
      units.map((unit) => [unit._id, unit.name]),
    );

    const stock = stockSummary(levels, productById);
    const spend = spendSummary(purchases, startIso, endIso);
    const revenue = revenueBreakdown(sales);
    const movement = movementSummary(
      purchaseLines,
      movements,
      productById,
      unitNameById,
      new Set(sales.map((sale) => `Sale ${sale._id}`)),
    );

    const revenueKobo = revenue.totalKobo;
    const grossMarginKobo = revenueKobo - movement.cogsKobo;

    return {
      range: { start, end },
      stock,
      spend,
      revenue,
      topProducts: topProducts(saleLines, productById, unitNameById),
      margin: {
        cogsKobo: movement.cogsKobo,
        grossMarginKobo,
        grossMarginPercent:
          revenueKobo > 0
            ? Math.round((grossMarginKobo / revenueKobo) * 1000) / 10
            : null,
      },
      movement: movement.rows,
    };
  },
});

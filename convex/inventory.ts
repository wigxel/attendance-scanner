import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Doc as HostDoc } from "./_generated/dataModel";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { requirePrivilege } from "./acl";
import type { Doc } from "./components/inventory/_generated/dataModel";
import { DEFAULT_UNIT_NAMES } from "./components/inventory/defaultUnits";
import { dayBounds } from "./kpis";
import { readId } from "./myFunctions";
import { paymentChannelValidator } from "./shared";

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

/** Revenue the app could not derive itself: shop sales rung up on the POS. */
export type RevenueChannel = "cash" | "pos" | "transfer" | "unrecorded";

export type RevenueChannelShare = {
  channel: RevenueChannel;
  bookingKobo: number;
  shopKobo: number;
  totalKobo: number;
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
    bookingKobo: number;
    shopKobo: number;
    byChannel: RevenueChannelShare[];
  };
  margin: {
    cogsKobo: number;
    grossMarginKobo: number;
    grossMarginPercent: number | null;
  };
  movement: InventoryMovementRow[];
};

const REVENUE_CHANNELS: RevenueChannel[] = [
  "cash",
  "pos",
  "transfer",
  "unrecorded",
];

function parseDay(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be a date like 2026-11-06.`);
  }
  if (Number.isNaN(dayBounds(value).fromMs)) {
    throw new Error(`${label} is not a real date.`);
  }
  return value;
}

type RevenueShare = { bookingKobo: number; shopKobo: number };

function revenueBreakdown(
  bookings: HostDoc<"bookings">[],
  revenueRows: HostDoc<"revenueRecords">[],
) {
  const shares = new Map<RevenueChannel, RevenueShare>(
    REVENUE_CHANNELS.map((channel) => [
      channel,
      { bookingKobo: 0, shopKobo: 0 },
    ]),
  );

  for (const booking of bookings) {
    if (booking.status !== "confirmed" && booking.status !== "used-up") {
      continue;
    }
    const share = shares.get(booking.channel ?? "unrecorded");
    if (share) share.bookingKobo += booking.amount;
  }

  for (const row of revenueRows) {
    const share = shares.get(row.channel);
    if (share) share.shopKobo += row.amountKobo;
  }

  const byChannel: RevenueChannelShare[] = REVENUE_CHANNELS.map((channel) => {
    const share = shares.get(channel) ?? { bookingKobo: 0, shopKobo: 0 };
    return {
      channel,
      bookingKobo: share.bookingKobo,
      shopKobo: share.shopKobo,
      totalKobo: share.bookingKobo + share.shopKobo,
    };
  });

  return {
    byChannel,
    bookingKobo: byChannel.reduce((sum, share) => sum + share.bookingKobo, 0),
    shopKobo: byChannel.reduce((sum, share) => sum + share.shopKobo, 0),
  };
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

// ---------------------------------------------------------------------------
// Shop revenue input
// ---------------------------------------------------------------------------

/**
 * Records one day's takings for one channel. The POS terminal only reports
 * daily totals, so this is the dated row an importer will write to once the
 * ledger feed lands. One row per date + channel; a zero clears the entry.
 */
export const setRevenueTotal = mutation({
  args: {
    date: v.string(),
    channel: paymentChannelValidator,
    amountKobo: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await requireCallerId(ctx);
    const date = parseDay(args.date, "Date");

    if (!Number.isInteger(args.amountKobo) || args.amountKobo < 0) {
      throw new Error("Amount must be a whole number of kobo, 0 or more.");
    }

    const existing = await ctx.db
      .query("revenueRecords")
      .withIndex("by_date_and_channel", (q) =>
        q.eq("date", date).eq("channel", args.channel),
      )
      .first();

    if (args.amountKobo === 0) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }

    const now = new Date().toISOString();
    const note = args.note?.trim() || undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        amountKobo: args.amountKobo,
        note,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("revenueRecords", {
      date,
      channel: args.channel,
      amountKobo: args.amountKobo,
      note,
      createdBy: caller,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * Aggregate-only picture of the shop for a date range. Booking revenue comes
 * from confirmed bookings; shop revenue comes from the daily records above.
 * There is no per-product revenue or margin: the POS reports totals only.
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
      bookingRows,
      revenueRows,
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
      ctx.db
        .query("bookings")
        .withIndex("by_startDate", (q) =>
          q.gte("startDate", start).lte("startDate", end),
        )
        .collect(),
      ctx.db
        .query("revenueRecords")
        .withIndex("by_date", (q) => q.gte("date", start).lte("date", end))
        .collect(),
    ]);

    const productById = new Map<string, Doc<"products">>(
      products.map((product) => [product._id, product]),
    );
    const unitNameById = new Map<string, string>(
      units.map((unit) => [unit._id, unit.name]),
    );

    const stock = stockSummary(levels, productById);
    const spend = spendSummary(purchases, startIso, endIso);
    const revenue = revenueBreakdown(bookingRows, revenueRows);
    const movement = movementSummary(
      purchaseLines,
      movements,
      productById,
      unitNameById,
    );

    const revenueKobo = revenue.bookingKobo + revenue.shopKobo;
    const grossMarginKobo = revenueKobo - movement.cogsKobo;

    return {
      range: { start, end },
      stock,
      spend,
      revenue: {
        totalKobo: revenueKobo,
        bookingKobo: revenue.bookingKobo,
        shopKobo: revenue.shopKobo,
        byChannel: revenue.byChannel,
      },
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

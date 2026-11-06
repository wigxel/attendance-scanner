import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Identity only: no quantity column anywhere. Quantity is derived from the
// movement ledger.
const units = defineTable({
  name: v.string(),
  abbreviation: v.optional(v.string()),
  active: v.boolean(),
  createdAt: v.string(),
}).index("by_active", ["active"]);

const products = defineTable({
  name: v.string(),
  sku: v.optional(v.string()),
  baseUnitId: v.id("units"),
  reorderLevel: v.number(),
  costPriceKobo: v.number(),
  sellPriceKobo: v.optional(v.number()),
  active: v.boolean(),
  createdAt: v.string(),
  updatedAt: v.string(),
  createdBy: v.string(),
  updatedBy: v.string(),
})
  .index("by_active", ["active"])
  .index("by_base_unit", ["baseUnitId"]);

// Append-only audit trail. A row is never edited or deleted; a wrong entry is
// corrected with a compensating adjustment. unitId/unitFactor/quantityInBase
// are snapshots so renaming or re-factoring a unit never rewrites history.
const stockMovements = defineTable({
  productId: v.id("products"),
  kind: v.union(
    v.literal("restock"),
    v.literal("usage"),
    v.literal("adjustment"),
  ),
  unitId: v.id("units"),
  quantity: v.number(),
  unitFactor: v.number(),
  quantityInBase: v.number(),
  occurredAt: v.string(),
  createdAt: v.string(),
  note: v.optional(v.string()),
  source: v.optional(v.union(v.literal("bulk"), v.literal("manual"))),
  createdBy: v.string(),
})
  .index("by_product", ["productId"])
  .index("by_occurredAt", ["occurredAt"]);

// A supplier is optional on a purchase: market runs have none, and forcing one
// would create a catch-all row that swallows every unnamed purchase.
const suppliers = defineTable({
  name: v.string(),
  phone: v.optional(v.string()),
  contactName: v.optional(v.string()),
  notes: v.optional(v.string()),
  active: v.boolean(),
  createdAt: v.string(),
}).index("by_active", ["active"]);

// Purchases are immutable. A mistake is corrected by voiding, never editing or
// deleting. Totals derive from lines; the outstanding balance is derived.
const purchases = defineTable({
  supplierId: v.optional(v.id("suppliers")),
  occurredAt: v.string(),
  totalKobo: v.number(),
  amountPaidKobo: v.number(),
  freightKobo: v.optional(v.number()),
  discountKobo: v.optional(v.number()),
  note: v.optional(v.string()),
  voided: v.boolean(),
  voidedAt: v.optional(v.string()),
  voidedBy: v.optional(v.string()),
  createdBy: v.string(),
  createdAt: v.string(),
})
  .index("by_occurredAt", ["occurredAt"])
  .index("by_supplier", ["supplierId"]);

// previousCostKobo is the product's average cost before this line, kept so a
// void can put the old average back exactly instead of guessing at it.
const purchaseLines = defineTable({
  purchaseId: v.id("purchases"),
  productId: v.id("products"),
  unitId: v.id("units"),
  quantity: v.number(),
  unitFactor: v.number(),
  quantityInBase: v.number(),
  unitCostKobo: v.number(),
  lineTotalKobo: v.number(),
  previousCostKobo: v.number(),
})
  .index("by_purchase", ["purchaseId"])
  .index("by_product", ["productId"]);

// Alternate units are per product: a carton of bottles is not a carton of
// masks. The base unit lives on the product, so only alternates are stored.
const productUnits = defineTable({
  productId: v.id("products"),
  unitId: v.id("units"),
  factorToBase: v.number(),
  isBase: v.boolean(),
}).index("by_product", ["productId"]);

export default defineSchema({
  units,
  products,
  stockMovements,
  suppliers,
  purchases,
  purchaseLines,
  productUnits,
});

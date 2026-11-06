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

export default defineSchema({ units, products, stockMovements });

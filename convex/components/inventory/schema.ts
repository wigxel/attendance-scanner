import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Identity only: no quantity column anywhere. Quantity is derived from the
// movement ledger owned by the stock-tracking task.
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

export default defineSchema({ units, products });

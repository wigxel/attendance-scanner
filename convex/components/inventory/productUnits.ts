import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

export type ResolvedUnit = { unitId: Id<"units">; unitFactor: number };

/**
 * Finds the factor from a product's unit to its base unit. The base unit is
 * implicit on the product, so a product with no alternates falls back to it.
 */
export async function resolveUnit(
  ctx: QueryCtx,
  product: Doc<"products">,
  unitId: Id<"units">,
): Promise<ResolvedUnit> {
  const alternates = await ctx.db
    .query("productUnits")
    .withIndex("by_product", (q) => q.eq("productId", product._id))
    .collect();

  const alternate = alternates.find((row) => row.unitId === unitId);
  if (alternate) {
    return { unitId, unitFactor: alternate.factorToBase };
  }
  if (unitId === product.baseUnitId) {
    return { unitId, unitFactor: 1 };
  }

  throw new Error(`That unit is not set up for "${product.name}".`);
}

export const list = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) =>
    await ctx.db
      .query("productUnits")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect(),
});

export const listAll = query({
  args: {},
  handler: async (ctx) => await ctx.db.query("productUnits").collect(),
});

export const upsert = mutation({
  args: {
    productId: v.id("products"),
    unitId: v.id("units"),
    factorToBase: v.number(),
  },
  handler: async (ctx, { productId, unitId, factorToBase }) => {
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found.");
    if (!(await ctx.db.get(unitId))) throw new Error("Unit not found.");

    if (unitId === product.baseUnitId) {
      throw new Error(
        "The base unit is already on the product; add an alternate unit instead.",
      );
    }
    if (!Number.isFinite(factorToBase) || factorToBase <= 0) {
      throw new Error("The unit factor must be more than zero.");
    }

    const existing = await ctx.db
      .query("productUnits")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    const match = existing.find((row) => row.unitId === unitId);
    if (match) {
      await ctx.db.patch(match._id, { factorToBase, isBase: false });
      return match._id;
    }

    return await ctx.db.insert("productUnits", {
      productId,
      unitId,
      factorToBase,
      isBase: false,
    });
  },
});

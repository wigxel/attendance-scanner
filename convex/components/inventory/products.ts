import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { normalise } from "./units";

function ensureKobo(label: string, value: number | undefined) {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a whole number of kobo, 0 or more.`);
  }
}

function ensureName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Product name is required.");
  return trimmed;
}

type UniqueCheck = {
  name: string;
  sku?: string;
  ignoreId?: Doc<"products">["_id"];
};

async function ensureUnique(ctx: QueryCtx | MutationCtx, args: UniqueCheck) {
  const products = await allProducts(ctx);
  const name = normalise(args.name);
  const sku = args.sku ? normalise(args.sku) : undefined;

  for (const product of products) {
    if (product._id === args.ignoreId) continue;
    if (normalise(product.name) === name) {
      throw new Error(`A product named "${args.name.trim()}" already exists.`);
    }
    if (sku && product.sku && normalise(product.sku) === sku) {
      throw new Error(
        `A product with SKU "${args.sku?.trim()}" already exists.`,
      );
    }
  }
}

const allProducts = async (
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"products">[]> => ctx.db.query("products").collect();

export const list = query({
  args: {
    search: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, { search, includeArchived }) => {
    const term = search?.trim().toLowerCase();
    const products = await allProducts(ctx);

    return products
      .filter((product) => includeArchived || product.active)
      .filter((product) => {
        if (!term) return true;
        return (
          normalise(product.name).includes(term) ||
          normalise(product.sku ?? "").includes(term)
        );
      })
      .sort((a, b) => normalise(a.name).localeCompare(normalise(b.name)));
  },
});

export const create = mutation({
  args: {
    callerId: v.string(),
    name: v.string(),
    sku: v.optional(v.string()),
    baseUnitId: v.id("units"),
    reorderLevel: v.optional(v.number()),
    costPriceKobo: v.optional(v.number()),
    sellPriceKobo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const name = ensureName(args.name);
    const unit = await ctx.db.get(args.baseUnitId);
    if (!unit) throw new Error("Base unit is required.");

    const reorderLevel = args.reorderLevel ?? 4;
    const costPriceKobo = args.costPriceKobo ?? 0;
    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
      throw new Error("Reorder level must be a whole number, 0 or more.");
    }
    ensureKobo("Cost price", costPriceKobo);
    ensureKobo("Sell price", args.sellPriceKobo);

    await ensureUnique(ctx, { name, sku: args.sku });

    const now = new Date().toISOString();
    return await ctx.db.insert("products", {
      name,
      sku: args.sku?.trim() || undefined,
      baseUnitId: args.baseUnitId,
      reorderLevel,
      costPriceKobo,
      sellPriceKobo: args.sellPriceKobo,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: args.callerId,
      updatedBy: args.callerId,
    });
  },
});

export const update = mutation({
  args: {
    callerId: v.string(),
    productId: v.id("products"),
    name: v.string(),
    sku: v.optional(v.string()),
    baseUnitId: v.id("units"),
    reorderLevel: v.number(),
    costPriceKobo: v.number(),
    sellPriceKobo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found.");

    const name = ensureName(args.name);
    const unit = await ctx.db.get(args.baseUnitId);
    if (!unit) throw new Error("Base unit is required.");
    if (!Number.isInteger(args.reorderLevel) || args.reorderLevel < 0) {
      throw new Error("Reorder level must be a whole number, 0 or more.");
    }
    ensureKobo("Cost price", args.costPriceKobo);
    ensureKobo("Sell price", args.sellPriceKobo);

    await ensureUnique(ctx, {
      name,
      sku: args.sku,
      ignoreId: args.productId,
    });

    await ctx.db.patch(args.productId, {
      name,
      sku: args.sku?.trim() || undefined,
      baseUnitId: args.baseUnitId,
      reorderLevel: args.reorderLevel,
      costPriceKobo: args.costPriceKobo,
      sellPriceKobo: args.sellPriceKobo,
      updatedAt: new Date().toISOString(),
      updatedBy: args.callerId,
    });
  },
});

export const archive = mutation({
  args: { callerId: v.string(), productId: v.id("products") },
  handler: async (ctx, { callerId, productId }) => {
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found.");

    await ctx.db.patch(productId, {
      active: false,
      updatedAt: new Date().toISOString(),
      updatedBy: callerId,
    });
  },
});

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

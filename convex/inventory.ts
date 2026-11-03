import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { requirePrivilege } from "./acl";
import { readId } from "./myFunctions";

export const movementKindValidator = v.union(
  v.literal("purchase"),
  v.literal("restock"),
  v.literal("usage"),
  v.literal("adjustment"),
);

export type MovementKind = "purchase" | "restock" | "usage" | "adjustment";

/**
 * Signed change a movement applies to an item's stock count. Purchases and
 * restocks add, usage takes away, adjustments are whatever the caller signed
 * so a drifted count can be corrected up or down.
 */
export function stockDelta(kind: MovementKind, quantity: number): number {
  if (kind === "usage") return -Math.abs(quantity);
  if (kind === "adjustment") return quantity;
  return Math.abs(quantity);
}

async function callerId(ctx: MutationCtx) {
  const caller = await readId(ctx);
  return caller ? String(caller) : "unknown";
}

export const listItems = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("inventoryItems").collect();
    return items.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listMovements = query({
  args: {
    itemId: v.id("inventoryItems"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { itemId, limit }) => {
    const take = Math.min(Math.max(limit ?? 50, 1), 200);
    return ctx.db
      .query("inventoryMovements")
      .withIndex("by_item", (q) => q.eq("itemId", itemId))
      .order("desc")
      .take(take);
  },
});

export const createItem = mutation({
  args: {
    name: v.string(),
    sku: v.optional(v.string()),
    unit: v.string(),
    quantity: v.optional(v.number()),
    reorderLevel: v.optional(v.number()),
    costPrice: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"inventoryItems">> => {
    await requirePrivilege(ctx, "inventory:manage");

    const name = args.name.trim();
    if (!name) throw new ConvexError("Item name is required.");

    const quantity = args.quantity ?? 0;
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new ConvexError("Opening quantity cannot be negative.");
    }

    const existing = await ctx.db
      .query("inventoryItems")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (existing) {
      throw new ConvexError(`"${name}" is already tracked.`);
    }

    const now = Date.now();
    const itemId = await ctx.db.insert("inventoryItems", {
      name,
      sku: args.sku?.trim() || undefined,
      unit: args.unit.trim() || "unit",
      quantity,
      reorderLevel: Math.max(0, args.reorderLevel ?? 0),
      costPrice: Math.max(0, args.costPrice ?? 0),
      createdAt: now,
      updatedAt: now,
    });

    if (quantity > 0) {
      await recordMovementRow(ctx, {
        itemId,
        kind: "restock",
        quantity,
        note: "Opening stock",
        recordedBy: await callerId(ctx),
        createdAt: now,
      });
    }

    return itemId;
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    name: v.optional(v.string()),
    unit: v.optional(v.string()),
    reorderLevel: v.optional(v.number()),
    costPrice: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<null> => {
    await requirePrivilege(ctx, "inventory:manage");

    const item = await ctx.db.get("inventoryItems", args.itemId);
    if (!item) throw new ConvexError("Item not found.");

    const name = args.name?.trim();
    if (name === "") throw new ConvexError("Item name cannot be empty.");
    if (name && name !== item.name) {
      const clash = await ctx.db
        .query("inventoryItems")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();
      if (clash) throw new ConvexError(`"${name}" is already tracked.`);
    }

    await ctx.db.patch("inventoryItems", args.itemId, {
      ...(name ? { name } : {}),
      ...(args.unit !== undefined
        ? { unit: args.unit.trim() || item.unit }
        : {}),
      ...(args.reorderLevel !== undefined
        ? { reorderLevel: Math.max(0, args.reorderLevel) }
        : {}),
      ...(args.costPrice !== undefined
        ? { costPrice: Math.max(0, args.costPrice) }
        : {}),
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const recordMovement = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    kind: movementKindValidator,
    quantity: v.number(),
    unitCost: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ quantity: number }> => {
    await requirePrivilege(ctx, "inventory:manage");

    if (!Number.isFinite(args.quantity) || args.quantity === 0) {
      throw new ConvexError("Quantity must be a non-zero number.");
    }

    const item = await ctx.db.get("inventoryItems", args.itemId);
    if (!item) throw new ConvexError("Item not found.");

    const delta = stockDelta(args.kind, args.quantity);
    const quantity = item.quantity + delta;
    if (quantity < 0) {
      throw new ConvexError(
        `Only ${item.quantity} ${item.unit} of ${item.name} in stock.`,
      );
    }

    const now = Date.now();
    await recordMovementRow(ctx, {
      itemId: args.itemId,
      kind: args.kind,
      quantity: Math.abs(args.quantity),
      unitCost: args.unitCost,
      note: args.note?.trim() || undefined,
      recordedBy: await callerId(ctx),
      createdAt: now,
    });

    const unitCost =
      args.kind === "purchase" && args.unitCost !== undefined
        ? Math.max(0, args.unitCost)
        : undefined;

    await ctx.db.patch("inventoryItems", args.itemId, {
      quantity,
      ...(unitCost !== undefined ? { costPrice: unitCost } : {}),
      updatedAt: now,
    });

    return { quantity };
  },
});

type MovementRow = {
  itemId: Id<"inventoryItems">;
  kind: MovementKind;
  quantity: number;
  unitCost?: number;
  note?: string;
  recordedBy: string;
  createdAt: number;
};

async function recordMovementRow(ctx: MutationCtx, row: MovementRow) {
  const delta = stockDelta(row.kind, row.quantity);
  await ctx.db.insert("inventoryMovements", { ...row, delta });
}

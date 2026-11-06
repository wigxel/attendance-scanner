import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalise } from "./units";

function ensureName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Supplier name is required.");
  return trimmed;
}

function clean(value: string | undefined) {
  return value?.trim() || undefined;
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, { search, includeArchived }) => {
    const term = search?.trim().toLowerCase();
    const suppliers = await ctx.db.query("suppliers").collect();

    return suppliers
      .filter((supplier) => includeArchived || supplier.active)
      .filter(
        (supplier) =>
          !term ||
          normalise(supplier.name).includes(term) ||
          normalise(supplier.phone ?? "").includes(term),
      )
      .sort((a, b) => normalise(a.name).localeCompare(normalise(b.name)));
  },
});

export const create = mutation({
  args: {
    callerId: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    contactName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = ensureName(args.name);
    const suppliers = await ctx.db.query("suppliers").collect();
    if (
      suppliers.some((supplier) => normalise(supplier.name) === normalise(name))
    ) {
      throw new Error(`A supplier named "${name}" already exists.`);
    }

    return await ctx.db.insert("suppliers", {
      name,
      phone: clean(args.phone),
      contactName: clean(args.contactName),
      notes: clean(args.notes),
      active: true,
      createdAt: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    supplierId: v.id("suppliers"),
    name: v.string(),
    phone: v.optional(v.string()),
    contactName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found.");

    const name = ensureName(args.name);
    const suppliers = await ctx.db.query("suppliers").collect();
    const duplicate = suppliers.some(
      (other) =>
        other._id !== args.supplierId &&
        normalise(other.name) === normalise(name),
    );
    if (duplicate) {
      throw new Error(`A supplier named "${name}" already exists.`);
    }

    await ctx.db.patch(args.supplierId, {
      name,
      phone: clean(args.phone),
      contactName: clean(args.contactName),
      notes: clean(args.notes),
    });
  },
});

export const archive = mutation({
  args: { supplierId: v.id("suppliers") },
  handler: async (ctx, { supplierId }) => {
    const supplier = await ctx.db.get(supplierId);
    if (!supplier) throw new Error("Supplier not found.");
    await ctx.db.patch(supplierId, { active: false });
  },
});

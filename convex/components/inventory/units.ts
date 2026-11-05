import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export function normalise(value: string) {
  return value.trim().toLowerCase();
}

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, { includeArchived }) => {
    const units = await ctx.db.query("units").collect();
    return units
      .filter((unit) => includeArchived || unit.active)
      .sort((a, b) => normalise(a.name).localeCompare(normalise(b.name)));
  },
});

export const create = mutation({
  args: {
    callerId: v.string(),
    name: v.string(),
    abbreviation: v.optional(v.string()),
  },
  handler: async (ctx, { name, abbreviation }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Unit name is required.");

    const units = await ctx.db.query("units").collect();
    if (units.some((unit) => normalise(unit.name) === normalise(trimmed))) {
      throw new Error(`A unit named "${trimmed}" already exists.`);
    }

    return await ctx.db.insert("units", {
      name: trimmed,
      abbreviation: abbreviation?.trim() || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    });
  },
});

export const rename = mutation({
  args: {
    unitId: v.id("units"),
    name: v.string(),
    abbreviation: v.optional(v.string()),
  },
  handler: async (ctx, { unitId, name, abbreviation }) => {
    const unit = await ctx.db.get(unitId);
    if (!unit) throw new Error("Unit not found.");

    const trimmed = name.trim();
    if (!trimmed) throw new Error("Unit name is required.");

    const units = await ctx.db.query("units").collect();
    const duplicate = units.some(
      (other) =>
        other._id !== unitId && normalise(other.name) === normalise(trimmed),
    );
    if (duplicate) throw new Error(`A unit named "${trimmed}" already exists.`);

    await ctx.db.patch(unitId, {
      name: trimmed,
      abbreviation: abbreviation?.trim() || undefined,
    });
  },
});

export const archive = mutation({
  args: { unitId: v.id("units") },
  handler: async (ctx, { unitId }) => {
    const unit = await ctx.db.get(unitId);
    if (!unit) throw new Error("Unit not found.");

    const usedByActiveProduct = await ctx.db
      .query("products")
      .withIndex("by_base_unit", (q) => q.eq("baseUnitId", unitId))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    if (usedByActiveProduct) {
      throw new Error(
        `"${unit.name}" is the base unit of an active product and cannot be archived.`,
      );
    }

    await ctx.db.patch(unitId, { active: false });
  },
});

export const seedDefaultUnits = mutation({
  args: {},
  handler: async (ctx) => {
    const defaults = ["pack", "bottle", "carton", "roll", "sachet", "box"];
    const units = await ctx.db.query("units").collect();
    const known = new Set(units.map((unit) => normalise(unit.name)));

    let added = 0;
    for (const name of defaults) {
      if (known.has(name)) continue;
      await ctx.db.insert("units", {
        name,
        active: true,
        createdAt: new Date().toISOString(),
      });
      added++;
    }

    return added;
  },
});

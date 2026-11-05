/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function unitId(t: ReturnType<typeof convexTest>, name = "pack") {
  return await t.mutation(api.units.create, { callerId: "admin", name });
}

describe("units", () => {
  it("rejects a duplicate name regardless of case and spacing", async () => {
    const t = convexTest(schema, modules);
    await unitId(t, "Pack");

    await expect(
      t.mutation(api.units.create, { callerId: "admin", name: "  pack " }),
    ).rejects.toThrow("already exists");
  });

  it("seeds the six default units once", async () => {
    const t = convexTest(schema, modules);

    const added = await t.mutation(api.units.seedDefaultUnits, {});
    const again = await t.mutation(api.units.seedDefaultUnits, {});

    expect(added).toBe(6);
    expect(again).toBe(0);

    const units = await t.query(api.units.list, {});
    expect(units.map((unit) => unit.name)).toEqual([
      "bottle",
      "box",
      "carton",
      "pack",
      "roll",
      "sachet",
    ]);
  });
});

describe("products", () => {
  it("defaults reorder level to 4 and cost price to 0", async () => {
    const t = convexTest(schema, modules);
    const baseUnitId = await unitId(t);

    const productId = await t.mutation(api.products.create, {
      callerId: "admin",
      name: "Peak Milk",
      baseUnitId,
    });

    const [product] = await t.run(async (ctx) =>
      ctx.db.query("products").collect(),
    );
    expect(product._id).toBe(productId);
    expect(product.reorderLevel).toBe(4);
    expect(product.costPriceKobo).toBe(0);
    expect(product.active).toBe(true);
    expect(product.createdBy).toBe("admin");
  });

  it("requires a base unit that exists", async () => {
    const t = convexTest(schema, modules);
    const baseUnitId = await unitId(t);
    await t.run(async (ctx) => {
      await ctx.db.delete(baseUnitId);
    });

    await expect(
      t.mutation(api.products.create, {
        callerId: "admin",
        name: "Peak Milk",
        baseUnitId,
      }),
    ).rejects.toThrow("Base unit is required");
  });

  it("rejects a duplicate name and a duplicate sku", async () => {
    const t = convexTest(schema, modules);
    const baseUnitId = await unitId(t);

    await t.mutation(api.products.create, {
      callerId: "admin",
      name: "Peak Milk",
      sku: "PKM-400",
      baseUnitId,
    });

    await expect(
      t.mutation(api.products.create, {
        callerId: "admin",
        name: " peak milk ",
        baseUnitId,
      }),
    ).rejects.toThrow("already exists");

    await expect(
      t.mutation(api.products.create, {
        callerId: "admin",
        name: "Peak Milk 400g",
        sku: "pkm-400",
        baseUnitId,
      }),
    ).rejects.toThrow('SKU "pkm-400" already exists');
  });

  it("archives a unit only when no active product uses it", async () => {
    const t = convexTest(schema, modules);
    const baseUnitId = await unitId(t);
    const productId = await t.mutation(api.products.create, {
      callerId: "admin",
      name: "Peak Milk",
      baseUnitId,
    });

    await expect(
      t.mutation(api.units.archive, { unitId: baseUnitId }),
    ).rejects.toThrow("cannot be archived");

    await t.mutation(api.products.archive, {
      callerId: "admin",
      productId,
    });

    await t.mutation(api.units.archive, { unitId: baseUnitId });
    const archived = await t.query(api.units.list, {});
    expect(archived).toHaveLength(0);
  });

  it("hides archived products unless asked for them", async () => {
    const t = convexTest(schema, modules);
    const baseUnitId = await unitId(t);
    const productId = await t.mutation(api.products.create, {
      callerId: "admin",
      name: "Peak Milk",
      baseUnitId,
    });
    await t.mutation(api.products.archive, { callerId: "admin", productId });

    expect(await t.query(api.products.list, {})).toHaveLength(0);
    expect(
      await t.query(api.products.list, { includeArchived: true }),
    ).toHaveLength(1);
  });
});

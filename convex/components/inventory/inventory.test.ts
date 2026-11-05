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

describe("stock movements", () => {
  async function seedProduct(
    t: ReturnType<typeof convexTest>,
    options: { name?: string; reorderLevel?: number } = {},
  ) {
    const name = options.name ?? "Peak Milk";
    const [existingUnit] = await t.query(api.units.list, {});
    const unitId =
      existingUnit?._id ??
      (await t.mutation(api.units.create, {
        callerId: "admin",
        name: "pack",
      }));
    const productId = await t.mutation(api.products.create, {
      callerId: "admin",
      name,
      baseUnitId: unitId,
      reorderLevel: options.reorderLevel,
    });
    return { unitId, productId };
  }

  it("keeps the ledger sum equal to the quantity after every kind", async () => {
    const t = convexTest(schema, modules);
    const { productId } = await seedProduct(t);

    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId,
      kind: "restock",
      quantity: 10,
      note: "Delivery",
    });
    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId,
      kind: "usage",
      quantity: 3,
    });
    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId,
      kind: "adjustment",
      quantity: 5,
      note: "Counted",
    });

    const movements = await t.run(async (ctx) =>
      ctx.db.query("stockMovements").collect(),
    );
    expect(movements.reduce((sum, m) => sum + m.quantityInBase, 0)).toBe(5);

    const [level] = await t.query(api.stockMovements.levels, {});
    expect(level.quantity).toBe(5);
  });

  it("rejects a movement that would take stock negative", async () => {
    const t = convexTest(schema, modules);
    const { productId } = await seedProduct(t);
    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId,
      kind: "restock",
      quantity: 2,
      note: "Delivery",
    });

    await expect(
      t.mutation(api.stockMovements.record, {
        callerId: "admin",
        productId,
        kind: "usage",
        quantity: 5,
      }),
    ).rejects.toThrow("only 2 pack on hand");
  });

  it("derives the adjustment delta from the counted quantity", async () => {
    const t = convexTest(schema, modules);
    const { productId } = await seedProduct(t);
    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId,
      kind: "restock",
      quantity: 10,
      note: "Delivery",
    });

    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId,
      kind: "adjustment",
      quantity: 7,
      note: "Counted",
    });

    const adjustment = await t.run(async (ctx) => {
      const rows = await ctx.db.query("stockMovements").collect();
      return rows.find((row) => row.kind === "adjustment");
    });
    expect(adjustment?.quantity).toBe(7);
    expect(adjustment?.quantityInBase).toBe(-3);
  });

  it("keeps the unit snapshot when the unit is renamed", async () => {
    const t = convexTest(schema, modules);
    const { unitId, productId } = await seedProduct(t);
    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId,
      kind: "restock",
      quantity: 4,
      note: "Delivery",
    });

    await t.mutation(api.units.rename, { unitId, name: "bundle" });

    const [movement] = await t.run(async (ctx) =>
      ctx.db.query("stockMovements").collect(),
    );
    expect(movement.unitId).toBe(unitId);
    expect(movement.unitFactor).toBe(1);
    expect(movement.quantityInBase).toBe(4);
  });

  it("exposes no edit or delete mutation", () => {
    expect("edit" in api.stockMovements).toBe(false);
    expect("update" in api.stockMovements).toBe(false);
    expect("remove" in api.stockMovements).toBe(false);
    expect("delete" in api.stockMovements).toBe(false);
  });

  it("derives out and low status, and never warns at reorder level 0", async () => {
    const t = convexTest(schema, modules);
    const watched = await seedProduct(t, {
      name: "Watched",
      reorderLevel: 4,
    });
    const quiet = await seedProduct(t, { name: "Quiet", reorderLevel: 0 });

    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId: watched.productId,
      kind: "restock",
      quantity: 10,
      note: "Delivery",
    });
    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId: quiet.productId,
      kind: "restock",
      quantity: 1,
      note: "Delivery",
    });

    let levels = await t.query(api.stockMovements.levels, {});
    const statusOf = (id: string) =>
      levels.find((level) => level.productId === id)?.status;
    expect(statusOf(watched.productId)).toBe("ok");
    expect(statusOf(quiet.productId)).toBe("ok");

    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId: watched.productId,
      kind: "usage",
      quantity: 6,
    });
    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId: quiet.productId,
      kind: "usage",
      quantity: 1,
    });

    levels = await t.query(api.stockMovements.levels, {});
    expect(statusOf(watched.productId)).toBe("low");
    expect(statusOf(quiet.productId)).toBe("out");
  });

  it("records one adjustment per non-empty opening row and skips blanks", async () => {
    const t = convexTest(schema, modules);
    const milk = await seedProduct(t);
    const sugar = await t.mutation(api.products.create, {
      callerId: "admin",
      name: "Sugar",
      baseUnitId: milk.unitId,
    });

    const written = await t.mutation(api.stockMovements.recordOpeningStock, {
      callerId: "admin",
      rows: [
        { productId: milk.productId, quantity: 12 },
        { productId: sugar, quantity: undefined },
      ],
    });

    expect(written).toBe(1);
    const movements = await t.run(async (ctx) =>
      ctx.db.query("stockMovements").collect(),
    );
    expect(movements).toHaveLength(1);
    expect(movements[0].productId).toBe(milk.productId);
    expect(movements[0].kind).toBe("adjustment");
    expect(movements[0].quantityInBase).toBe(12);
  });

  it("rejects movements against an archived product", async () => {
    const t = convexTest(schema, modules);
    const { productId } = await seedProduct(t);
    await t.mutation(api.products.archive, { callerId: "admin", productId });

    await expect(
      t.mutation(api.stockMovements.record, {
        callerId: "admin",
        productId,
        kind: "restock",
        quantity: 1,
        note: "Delivery",
      }),
    ).rejects.toThrow("archived");
  });

  it("requires a note on restock and adjustment but not usage", async () => {
    const t = convexTest(schema, modules);
    const { productId } = await seedProduct(t);

    await expect(
      t.mutation(api.stockMovements.record, {
        callerId: "admin",
        productId,
        kind: "restock",
        quantity: 1,
      }),
    ).rejects.toThrow("note is required");

    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId,
      kind: "restock",
      quantity: 5,
      note: "Delivery",
    });

    await expect(
      t.mutation(api.stockMovements.record, {
        callerId: "admin",
        productId,
        kind: "adjustment",
        quantity: 5,
      }),
    ).rejects.toThrow("note is required");

    await expect(
      t.mutation(api.stockMovements.record, {
        callerId: "admin",
        productId,
        kind: "usage",
        quantity: 1,
      }),
    ).resolves.toBeDefined();
  });

  it("defaults occurredAt to now and keeps createdAt immutable", async () => {
    const t = convexTest(schema, modules);
    const { productId } = await seedProduct(t);
    const before = Date.now();

    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId,
      kind: "restock",
      quantity: 1,
      note: "Delivery",
      occurredAt: "2020-01-01T00:00:00.000Z",
    });
    await t.mutation(api.stockMovements.record, {
      callerId: "admin",
      productId,
      kind: "usage",
      quantity: 1,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db.query("stockMovements").collect(),
    );
    const backdated = rows.find((row) => row.quantityInBase === 1);
    const current = rows.find((row) => row.quantityInBase === -1);

    expect(backdated?.occurredAt).toBe("2020-01-01T00:00:00.000Z");
    expect(Date.parse(backdated?.createdAt ?? "")).toBeGreaterThanOrEqual(
      before,
    );
    expect(Date.parse(current?.occurredAt ?? "")).toBeGreaterThanOrEqual(
      before,
    );
  });

  it("returns the newest movements first and caps the history", async () => {
    const t = convexTest(schema, modules);
    const { productId } = await seedProduct(t);

    for (let day = 1; day <= 3; day++) {
      await t.mutation(api.stockMovements.record, {
        callerId: "admin",
        productId,
        kind: "restock",
        quantity: day,
        note: "Delivery",
        occurredAt: `2026-01-0${day}T00:00:00.000Z`,
      });
    }

    const history = await t.query(api.stockMovements.history, {
      productId,
      limit: 2,
    });
    expect(history).toHaveLength(2);
    expect(history[0].occurredAt).toBe("2026-01-03T00:00:00.000Z");
    expect(history[1].occurredAt).toBe("2026-01-02T00:00:00.000Z");
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

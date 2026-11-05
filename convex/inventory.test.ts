/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import { DEFAULT_UNIT_NAMES } from "./components/inventory/defaultUnits";
import inventorySchema from "./components/inventory/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");
const inventoryModules = import.meta.glob("./components/inventory/**/*.ts");

type Tester = ReturnType<typeof convexTest>;

async function seedAcl(t: Tester, grantAdmin: boolean) {
  t.registerComponent("wigxel_acl", aclSchema, aclModules);
  t.registerComponent("inventory", inventorySchema, inventoryModules);

  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    if (grantAdmin) {
      await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
        identity: "admin-user",
      });
    }
  });
}

describe("inventory host boundary", () => {
  it("rejects unauthenticated mutations", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);

    await expect(
      t.mutation(api.inventory.createUnit, { name: "pack" }),
    ).rejects.toThrow("Authentication required");
  });

  it("rejects authenticated callers without inventory:manage", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, false);
    const nobody = t.withIdentity({ profile_id: "nobody" });

    await expect(
      nobody.mutation(api.inventory.createUnit, { name: "pack" }),
    ).rejects.toThrow('Access denied. Required privilege: "inventory:manage"');
  });

  it("lets an admin create a unit and a product", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);
    const admin = t.withIdentity({ profile_id: "admin-user" });

    const unitId = await admin.mutation(api.inventory.createUnit, {
      name: "carton",
      abbreviation: "ctn",
    });
    await admin.mutation(api.inventory.createProduct, {
      name: "Peak Milk",
      baseUnitId: unitId,
    });

    const products = await admin.query(api.inventory.listProducts, {});
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("Peak Milk");
  });

  it("records stock through the host and reports levels", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);
    const admin = t.withIdentity({ profile_id: "admin-user" });

    const unitId = await admin.mutation(api.inventory.createUnit, {
      name: "pack",
    });
    const productId = await admin.mutation(api.inventory.createProduct, {
      name: "Peak Milk",
      baseUnitId: unitId,
      reorderLevel: 2,
    });

    await admin.mutation(api.inventory.recordMovement, {
      productId,
      kind: "restock",
      quantity: 6,
      note: "Delivery",
    });
    await admin.mutation(api.inventory.recordMovement, {
      productId,
      kind: "usage",
      quantity: 4,
    });

    const levels = await admin.query(api.inventory.stockLevels, {});
    expect(levels).toHaveLength(1);
    expect(levels[0].quantity).toBe(2);
    expect(levels[0].status).toBe("low");
    expect(levels[0].baseUnitName).toBe("pack");

    const movements = await admin.query(api.inventory.productMovements, {
      productId,
    });
    expect(movements).toHaveLength(2);
    const usage = movements.find((movement) => movement.kind === "usage");
    expect(usage?.quantityInBase).toBe(-4);
    expect(usage?.recordedBy).toBe("admin-user");
  });

  it("rejects stock entry without inventory:manage", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, false);
    const nobody = t.withIdentity({ profile_id: "nobody" });

    await expect(
      nobody.mutation(api.inventory.recordMovement, {
        productId: "product-1",
        kind: "restock",
        quantity: 1,
        note: "Delivery",
      }),
    ).rejects.toThrow('Access denied. Required privilege: "inventory:manage"');
  });
});

describe("seedUnits", () => {
  it("previews by default and seeds without auth", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, false);

    const preview = await t.mutation(api.inventory.seedUnits, {});
    expect(preview.dryRun).toBe(true);
    expect(preview.added).toBe(0);
    expect(preview.missing).toEqual([...DEFAULT_UNIT_NAMES]);

    const seeded = await t.mutation(api.inventory.seedUnits, {
      dryRun: false,
    });
    expect(seeded.dryRun).toBe(false);
    expect(seeded.added).toBe(DEFAULT_UNIT_NAMES.length);

    const again = await t.mutation(api.inventory.seedUnits, { dryRun: false });
    expect(again.added).toBe(0);
    expect(again.missing).toEqual([]);
  });
});

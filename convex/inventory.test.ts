/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api";
import aclSchema from "./components/acl/schema";
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
});

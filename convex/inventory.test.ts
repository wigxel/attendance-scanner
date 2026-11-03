/** biome-ignore-all lint/suspicious/noExplicitAny: ACL ids are opaque in tests */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import { stockDelta } from "./inventory";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

async function setupUser(identity: string, privileges: string[]) {
  const t = convexTest(schema, modules);
  t.registerComponent("wigxel_acl", aclSchema, aclModules);
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "test-admin",
    });
    const role = await ctx.runMutation(components.wigxel_acl.roles.createRole, {
      callerId: "test-admin",
      name: `role-${identity}`,
      description: "",
      privileges,
    });
    if (!role.success) throw new Error(role.error);
    const reg = await ctx.runMutation(
      components.wigxel_acl.identities.registerIdentity,
      {
        callerId: "test-admin",
        identity,
        roleId: role.data.roleId as any,
      },
    );
    if (!reg.success) throw new Error(reg.error);
  });
  return { t, authed: t.withIdentity({ profile_id: identity }) };
}

describe("stockDelta", () => {
  it("adds for purchases and restocks", () => {
    expect(stockDelta("purchase", 12)).toBe(12);
    expect(stockDelta("restock", 12)).toBe(12);
  });

  it("subtracts for usage", () => {
    expect(stockDelta("usage", 3)).toBe(-3);
  });

  it("keeps the sign for adjustments", () => {
    expect(stockDelta("adjustment", -4)).toBe(-4);
    expect(stockDelta("adjustment", 4)).toBe(4);
  });
});

describe("inventory", () => {
  it("rejects creating an item without inventory:manage", async () => {
    const { authed } = await setupUser("staff-1", ["kpis:complete"]);

    await expect(
      authed.mutation(api.inventory.createItem, {
        name: "Coke",
        unit: "bottle",
      }),
    ).rejects.toThrow('Required privilege: "inventory:manage"');
  });

  it("records opening stock as a restock movement", async () => {
    const { t, authed } = await setupUser("mgr-1", ["inventory:manage"]);

    const itemId = await authed.mutation(api.inventory.createItem, {
      name: "Coke",
      unit: "bottle",
      quantity: 24,
      reorderLevel: 6,
    });

    const item = await t.run((ctx) => ctx.db.get("inventoryItems", itemId));
    expect(item?.quantity).toBe(24);

    const movements = await authed.query(api.inventory.listMovements, {
      itemId,
    });
    expect(movements).toHaveLength(1);
    expect(movements[0].kind).toBe("restock");
    expect(movements[0].delta).toBe(24);
    expect(movements[0].note).toBe("Opening stock");
  });

  it("keeps the count in sync across restock, usage and purchase", async () => {
    const { t, authed } = await setupUser("mgr-2", ["inventory:manage"]);
    const itemId = await authed.mutation(api.inventory.createItem, {
      name: "Water",
      unit: "bottle",
      quantity: 10,
      costPrice: 100,
    });

    await authed.mutation(api.inventory.recordMovement, {
      itemId,
      kind: "restock",
      quantity: 5,
    });
    const afterUsage = await authed.mutation(api.inventory.recordMovement, {
      itemId,
      kind: "usage",
      quantity: 3,
    });
    expect(afterUsage.quantity).toBe(12);

    await authed.mutation(api.inventory.recordMovement, {
      itemId,
      kind: "purchase",
      quantity: 8,
      unitCost: 150,
    });

    const item = await t.run((ctx) => ctx.db.get("inventoryItems", itemId));
    expect(item?.quantity).toBe(20);
    expect(item?.costPrice).toBe(150);

    const movements = await authed.query(api.inventory.listMovements, {
      itemId,
    });
    // Newest first: purchase, usage, restock, opening stock.
    const total = movements.reduce((sum, m) => sum + m.delta, 0);
    expect(total).toBe(item?.quantity);
  });

  it("refuses usage that would take stock negative", async () => {
    const { t, authed } = await setupUser("mgr-3", ["inventory:manage"]);
    const itemId = await authed.mutation(api.inventory.createItem, {
      name: "Milk",
      unit: "pack",
      quantity: 2,
    });

    await expect(
      authed.mutation(api.inventory.recordMovement, {
        itemId,
        kind: "usage",
        quantity: 5,
      }),
    ).rejects.toThrow("Only 2 pack of Milk in stock.");

    const item = await t.run((ctx) => ctx.db.get("inventoryItems", itemId));
    expect(item?.quantity).toBe(2);
  });

  it("rejects duplicate item names and zero-quantity movements", async () => {
    const { authed } = await setupUser("mgr-4", ["inventory:manage"]);
    const itemId = await authed.mutation(api.inventory.createItem, {
      name: "Sugar",
      unit: "sachet",
    });

    await expect(
      authed.mutation(api.inventory.createItem, {
        name: " Sugar ",
        unit: "sachet",
      }),
    ).rejects.toThrow('"Sugar" is already tracked.');

    await expect(
      authed.mutation(api.inventory.recordMovement, {
        itemId,
        kind: "restock",
        quantity: 0,
      }),
    ).rejects.toThrow("Quantity must be a non-zero number.");
  });
});

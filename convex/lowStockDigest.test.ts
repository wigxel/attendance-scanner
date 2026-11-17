/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components, internal } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import inboxSchema from "./components/inbox/schema";
import inventorySchema from "./components/inventory/schema";
import notificationsSchema from "./components/notifications/schema";
import { setConfig } from "./config";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");
const inboxModules = import.meta.glob("./components/inbox/**/*.ts");
const inventoryModules = import.meta.glob("./components/inventory/**/*.ts");
const notificationModules = import.meta.glob(
  "./components/notifications/**/*.ts",
);

const setup = () => {
  const t = convexTest(schema, modules);
  t.registerComponent(
    "notifications",
    notificationsSchema,
    notificationModules,
  );
  t.registerComponent("inbox", inboxSchema, inboxModules);
  t.registerComponent("wigxel_acl", aclSchema, aclModules);
  t.registerComponent("inventory", inventorySchema, inventoryModules);
  return t;
};

type Tester = ReturnType<typeof setup>;

// A role per privilege plus one bystander, so the audience union is exercised.
const seedStaff = async (t: Tester) => {
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "admin-1",
    });
  });
  for (const [name, privileges] of [
    ["manager", ["inventory:manage"]],
    ["seller", ["inventory:sell"]],
    ["bystander", ["attendance:checkin"]],
  ] as const) {
    const created = await t.run(async (ctx) =>
      ctx.runMutation(components.wigxel_acl.roles.createRole, {
        callerId: "admin-1",
        name,
        description: name,
        privileges: [...privileges],
      }),
    );
    if (!created.success) throw new Error(created.error);
    await t.run(async (ctx) =>
      ctx.runMutation(components.wigxel_acl.identities.registerIdentity, {
        callerId: "admin-1",
        identity: name,
        roleId: created.data.roleId,
      }),
    );
  }
};

// One product 2 under its reorder level (low), one with no level (skip),
// one well stocked (skip).
const seedStock = async (t: Tester) => {
  const admin = t.withIdentity({ profile_id: "manager" });
  const unitId = await admin.mutation(api.inventory.createUnit, {
    name: "carton",
  });
  const lowId = await admin.mutation(api.inventory.createProduct, {
    name: "Peak Milk",
    baseUnitId: unitId,
    reorderLevel: 5,
  });
  await admin.mutation(api.inventory.createProduct, {
    name: "No Level",
    baseUnitId: unitId,
    reorderLevel: 0,
  });
  const stockedId = await admin.mutation(api.inventory.createProduct, {
    name: "Rice",
    baseUnitId: unitId,
    reorderLevel: 5,
  });
  await admin.mutation(api.inventory.recordMovement, {
    productId: stockedId,
    kind: "restock",
    quantity: 50,
    note: "Delivery",
  });
  await admin.mutation(api.inventory.recordMovement, {
    productId: lowId,
    kind: "restock",
    quantity: 3,
    note: "Delivery",
  });
};

const sweep = (t: Tester) => t.mutation(internal.lowStockDigest.sweep, {});

const inbox = (t: Tester, who: string) =>
  t.run(async (ctx) =>
    ctx.runQuery(components.inbox.index.list, { recipientKey: `user:${who}` }),
  );

describe("lowStockDigest.sweep", () => {
  it("sends one digest per staff member holding either inventory privilege", async () => {
    const t = setup();
    await seedStaff(t);
    await seedStock(t);

    expect(await sweep(t)).toMatchObject({ sent: 3 });

    const manager = await inbox(t, "manager");
    expect(manager).toHaveLength(1);
    expect(manager[0].title).toBe("Low stock: 1 product to reorder");
    expect(manager[0].body).toBe("Peak Milk: 3 left");
    expect(manager[0].url).toBe("/admin/inventory");
    expect(manager[0].dedupeKey).toContain("low-stock-digest:user:manager:");

    // bystander with no inventory privilege gets nothing
    expect(await inbox(t, "bystander")).toHaveLength(0);
  });

  it("dedupes repeats within the same local day", async () => {
    const t = setup();
    await seedStaff(t);
    await seedStock(t);

    await sweep(t);
    await sweep(t);

    expect(await inbox(t, "manager")).toHaveLength(1);
    expect(await inbox(t, "seller")).toHaveLength(1);
  });

  it("sends nothing when nothing is low", async () => {
    const t = setup();
    await seedStaff(t);
    await seedStock(t);

    // restock the low product above its level, then sweep
    const admin = t.withIdentity({ profile_id: "manager" });
    const levels = await admin.query(api.inventory.stockLevels, {});
    const low = levels.find((level) => level.name === "Peak Milk");
    if (!low) throw new Error("product missing");
    await admin.mutation(api.inventory.recordMovement, {
      productId: low.productId,
      kind: "restock",
      quantity: 20,
      note: "Delivery",
    });

    expect(await sweep(t)).toMatchObject({ sent: 0 });
    expect(await inbox(t, "manager")).toHaveLength(0);
  });

  it("uses the configured timezone for the day key", async () => {
    const t = setup();
    await seedStaff(t);
    await seedStock(t);
    await t.run(async (ctx) => setConfig(ctx, "timezone", "UTC"));

    await sweep(t);

    const manager = await inbox(t, "manager");
    const dayKey = new Date().toLocaleDateString("en-CA", {
      timeZone: "UTC",
    });
    expect(manager[0].dedupeKey).toBe(
      `low-stock-digest:user:manager:${dayKey}`,
    );
  });
});

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import inboxSchema from "./components/inbox/schema";
import inventorySchema from "./components/inventory/schema";
import notificationsSchema from "./components/notifications/schema";
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

// One manager plus one seller with only inventory:sell. Profiles are absent,
// so names fall back to ids.
const seedStaff = async (t: Tester) => {
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "manager-1",
    });
  });
  const created = await t.run(async (ctx) =>
    ctx.runMutation(components.wigxel_acl.roles.createRole, {
      callerId: "manager-1",
      name: "seller",
      description: "seller",
      privileges: ["inventory:sell"],
    }),
  );
  if (!created.success) throw new Error(created.error);
  await t.run(async (ctx) =>
    ctx.runMutation(components.wigxel_acl.identities.registerIdentity, {
      callerId: "manager-1",
      identity: "seller-1",
      roleId: created.data.roleId,
    }),
  );
};

const inbox = (t: Tester, who: string) =>
  t.run(async (ctx) =>
    ctx.runQuery(components.inbox.index.list, { recipientKey: `user:${who}` }),
  );

describe("free sale alerts", () => {
  it("tells every inventory:manage holder what left and for whom", async () => {
    const t = setup();
    await seedStaff(t);

    // Only managers may set up the catalogue; the seller just sells.
    const manager = t.withIdentity({ profile_id: "manager-1" });
    const unitId = await manager.mutation(api.inventory.createUnit, {
      name: "pack",
    });
    const productId = await manager.mutation(api.inventory.createProduct, {
      name: "Peak Milk",
      baseUnitId: unitId,
    });
    await manager.mutation(api.inventory.recordMovement, {
      productId,
      kind: "restock",
      quantity: 10,
      note: "Delivery",
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "customer-1",
        firstName: "Ada",
        lastName: "Obi",
        occupation: "None",
      });
    });

    const seller = t.withIdentity({ profile_id: "seller-1" });
    const saleId = await seller.mutation(api.inventory.recordSale, {
      channel: "free",
      customerId: "customer-1",
      note: "Welcome gift",
      lines: [{ productId, unitId, quantity: 2, unitPriceKobo: 100000 }],
    });

    const rows = await inbox(t, "manager-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "Free sale",
      body: "seller-1 gave 2 Peak Milk (worth ₦2,000.00) to Ada Obi.",
      url: "/admin/inventory/sales",
      dedupeKey: `${saleId}:user:manager-1`,
    });
    expect(rows[0].readAt).toBeUndefined();

    // A seller holds no inventory:manage, so they hear nothing.
    expect(await inbox(t, "seller-1")).toHaveLength(0);
  });
});

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

// Two admins plus one seller. Profiles are absent, so names fall back to ids.
const seedStaff = async (t: Tester) => {
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "admin-1",
    });
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "admin-2",
    });
  });
  const created = await t.run(async (ctx) =>
    ctx.runMutation(components.wigxel_acl.roles.createRole, {
      callerId: "admin-1",
      name: "seller",
      description: "seller",
      privileges: ["inventory:sell", "inventory:manage"],
    }),
  );
  if (!created.success) throw new Error(created.error);
  await t.run(async (ctx) =>
    ctx.runMutation(components.wigxel_acl.identities.registerIdentity, {
      callerId: "admin-1",
      identity: "seller-1",
      roleId: created.data.roleId,
    }),
  );
};

/** One cash sale of ₦2,000 puts money over the drawer. */
const seedCashSale = async (t: Tester) => {
  const seller = t.withIdentity({ profile_id: "seller-1" });
  const unitId = await seller.mutation(api.inventory.createUnit, {
    name: "pack",
  });
  const productId = await seller.mutation(api.inventory.createProduct, {
    name: "Peak Milk",
    baseUnitId: unitId,
  });
  await seller.mutation(api.inventory.recordMovement, {
    productId,
    kind: "restock",
    quantity: 10,
    note: "Delivery",
  });
  await seller.mutation(api.inventory.recordSale, {
    channel: "cash",
    lines: [{ productId, unitId, quantity: 2, unitPriceKobo: 100000 }],
  });
};

const inbox = (t: Tester, who: string) =>
  t.run(async (ctx) =>
    ctx.runQuery(components.inbox.index.list, { recipientKey: `user:${who}` }),
  );

describe("cash withdrawal alerts", () => {
  it("notifies every admin but the caller, on the withdrawal's ledger row", async () => {
    const t = setup();
    await seedStaff(t);
    await seedCashSale(t);

    const seller = t.withIdentity({ profile_id: "seller-1" });
    const withdrawalId = await seller.mutation(
      api.inventory.recordCashWithdrawal,
      { amountKobo: 50000, note: "Market run" },
    );

    for (const admin of ["admin-1", "admin-2"]) {
      const rows = await inbox(t, admin);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        title: "Cash withdrawal",
        body: "seller-1 took ₦500.00 from the drawer.",
        url: "/admin/inventory/cash",
        dedupeKey: `${withdrawalId}:user:${admin}`,
      });
      expect(rows[0].readAt).toBeUndefined();
    }

    // The caller performed the act; the inbox must not echo it back.
    expect(await inbox(t, "seller-1")).toHaveLength(0);
  });

  it("alerts admins on a reversal too, skipping the reversing admin", async () => {
    const t = setup();
    await seedStaff(t);
    await seedCashSale(t);

    const seller = t.withIdentity({ profile_id: "seller-1" });
    const withdrawalId = await seller.mutation(
      api.inventory.recordCashWithdrawal,
      { amountKobo: 50000, note: "Market run" },
    );

    const admin = t.withIdentity({ profile_id: "admin-2" });
    await admin.mutation(api.inventory.reverseCashWithdrawal, {
      withdrawalId,
    });

    // admin-2 is not the withdrawal's caller, so they heard about it;
    // their own reversal is skipped for them.
    expect(await inbox(t, "admin-2")).toHaveLength(1);
    const rows = await inbox(t, "admin-1");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      title: "Withdrawal reversed",
      body: "admin-2 put ₦500.00 back in the drawer.",
    });
    expect(rows[1]).toMatchObject({ title: "Cash withdrawal" });
  });
});

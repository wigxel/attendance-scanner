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

describe("metrics", () => {
  const day = "2026-05-10";

  async function seedShop(t: Tester) {
    await seedAcl(t, true);
    const admin = t.withIdentity({ profile_id: "admin-user" });
    const unitId = await admin.mutation(api.inventory.createUnit, {
      name: "pack",
    });
    const productId = await admin.mutation(api.inventory.createProduct, {
      name: "Peak Milk",
      baseUnitId: unitId,
      reorderLevel: 5,
      costPriceKobo: 2000,
    });
    return { admin, unitId, productId };
  }

  it("aggregates stock, spend, revenue and margin for a period", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedShop(t);

    await admin.mutation(api.inventory.createPurchase, {
      occurredAt: `${day}T09:00:00+01:00`,
      amountPaidKobo: 12000,
      lines: [{ productId, unitId, quantity: 10, unitCostKobo: 2000 }],
    });
    await admin.mutation(api.inventory.recordMovement, {
      productId,
      kind: "usage",
      quantity: 4,
      occurredAt: `${day}T12:00:00+01:00`,
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("bookings", {
        userId: "customer-1",
        seatIds: [],
        duration: 30,
        startDate: day,
        endDate: day,
        durationType: "month",
        pricePerSeat: 50000,
        amount: 50000,
        status: "confirmed",
        channel: "cash",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await admin.mutation(api.inventory.setRevenueTotal, {
      date: day,
      channel: "pos",
      amountKobo: 30000,
    });

    const metrics = await admin.query(api.inventory.metrics, {
      start: day,
      end: day,
    });

    expect(metrics.stock).toMatchObject({
      valueKobo: 12000,
      productCount: 1,
      lowCount: 0,
      outCount: 0,
    });
    expect(metrics.spend).toMatchObject({
      totalKobo: 20000,
      paidKobo: 12000,
      outstandingKobo: 8000,
      purchaseCount: 1,
    });
    expect(metrics.revenue).toMatchObject({
      totalKobo: 80000,
      bookingKobo: 50000,
      shopKobo: 30000,
    });
    expect(
      metrics.revenue.byChannel.find((share) => share.channel === "cash")
        ?.bookingKobo,
    ).toBe(50000);
    expect(
      metrics.revenue.byChannel.find((share) => share.channel === "pos")
        ?.shopKobo,
    ).toBe(30000);
    expect(metrics.margin).toMatchObject({
      cogsKobo: 8000,
      grossMarginKobo: 72000,
      grossMarginPercent: 90,
    });
    expect(metrics.movement[0]).toMatchObject({
      name: "Peak Milk",
      unitName: "pack",
      purchased: 10,
      used: 4,
      sellThroughPercent: 40,
    });
  });

  it("leaves voided purchases out of spend and usage", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedShop(t);

    const purchaseId = await admin.mutation(api.inventory.createPurchase, {
      occurredAt: `${day}T09:00:00+01:00`,
      lines: [{ productId, unitId, quantity: 10, unitCostKobo: 2000 }],
    });
    await admin.mutation(api.inventory.voidPurchase, { purchaseId });

    const metrics = await admin.query(api.inventory.metrics, {
      start: day,
      end: day,
    });

    expect(metrics.spend.totalKobo).toBe(0);
    expect(metrics.margin.cogsKobo).toBe(0);
    expect(metrics.movement).toHaveLength(0);
    expect(metrics.stock.valueKobo).toBe(0);
  });

  it("keeps one revenue row per day and channel and clears on zero", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await seedShop(t);

    await admin.mutation(api.inventory.setRevenueTotal, {
      date: day,
      channel: "cash",
      amountKobo: 10000,
    });
    await admin.mutation(api.inventory.setRevenueTotal, {
      date: day,
      channel: "cash",
      amountKobo: 15000,
    });

    const rows = await admin.query(api.inventory.metrics, {
      start: day,
      end: day,
    });
    const cashShare = rows.revenue.byChannel.find(
      (share) => share.channel === "cash",
    );
    expect(cashShare?.shopKobo).toBe(15000);

    await admin.mutation(api.inventory.setRevenueTotal, {
      date: day,
      channel: "cash",
      amountKobo: 0,
    });

    const cleared = await admin.query(api.inventory.metrics, {
      start: day,
      end: day,
    });
    expect(
      cleared.revenue.byChannel.find((share) => share.channel === "cash")
        ?.shopKobo,
    ).toBe(0);
  });
});

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

const historyPage = { numItems: 50, cursor: null as string | null };

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

const day = "2026-05-10";
// Sales are stamped when they are saved, so their window ends today.
const today = new Date().toISOString().slice(0, 10);

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
    sellPriceKobo: 4000,
  });
  return { admin, unitId, productId };
}

async function restock(
  admin: ReturnType<Tester["withIdentity"]>,
  unitId: string,
  productId: string,
  quantity = 10,
) {
  return await admin.mutation(api.inventory.createPurchase, {
    occurredAt: `${day}T09:00:00+01:00`,
    amountPaidKobo: 12000,
    lines: [{ productId, unitId, quantity, unitCostKobo: 2000 }],
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

  it("keeps a large stock count intact on the sale form", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);
    const admin = t.withIdentity({ profile_id: "admin-user" });

    const unitId = await admin.mutation(api.inventory.createUnit, {
      name: "pack",
    });
    const productId = await admin.mutation(api.inventory.createProduct, {
      name: "Rice",
      baseUnitId: unitId,
      sellPriceKobo: 100000,
    });
    await admin.mutation(api.inventory.recordMovement, {
      productId,
      kind: "restock",
      quantity: 100,
      note: "Delivery",
    });
    await admin.mutation(api.inventory.recordSale, {
      channel: "cash",
      lines: [{ productId, unitId, quantity: 5, unitPriceKobo: 100000 }],
    });

    const [product] = (await admin.query(api.inventory.saleFormData, {}))
      .products;
    expect(product.stockQty).toBe(95);

    // Both screens read the same ledger, so the inventory table must agree.
    const [stockLevel] = await admin.query(api.inventory.stockLevels, {});
    expect(stockLevel.quantity).toBe(95);
  });

  it("reports zero stock on the sale form for a product with no movements", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);
    const admin = t.withIdentity({ profile_id: "admin-user" });

    const unitId = await admin.mutation(api.inventory.createUnit, {
      name: "pack",
    });
    await admin.mutation(api.inventory.createProduct, {
      name: "Malt",
      baseUnitId: unitId,
    });

    const [product] = (await admin.query(api.inventory.saleFormData, {}))
      .products;
    expect(product.stockQty).toBe(0);
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
  it("aggregates stock, spend, revenue and margin from sales", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedShop(t);

    await restock(admin, unitId, productId);

    const saleId = await admin.mutation(api.inventory.recordSale, {
      channel: "pos",
      lines: [{ productId, unitId, quantity: 3, unitPriceKobo: 4000 }],
    });

    const metrics = await admin.query(api.inventory.metrics, {
      start: day,
      end: today,
    });

    expect(metrics.stock).toMatchObject({
      valueKobo: 14000,
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
      totalKobo: 12000,
      salesCount: 1,
    });
    expect(
      metrics.revenue.byChannel.find((share) => share.channel === "pos")
        ?.totalKobo,
    ).toBe(12000);
    expect(
      metrics.revenue.byChannel.find((share) => share.channel === "cash")
        ?.totalKobo,
    ).toBe(0);
    expect(metrics.margin).toMatchObject({
      cogsKobo: 6000,
      grossMarginKobo: 6000,
      grossMarginPercent: 50,
    });
    expect(metrics.topProducts).toEqual([
      {
        productId,
        name: "Peak Milk",
        unitName: "pack",
        quantity: 3,
        revenueKobo: 12000,
      },
    ]);

    const detail = await admin.query(api.inventory.saleDetail, { saleId });
    expect(detail?.lines[0].productName).toBe("Peak Milk");
  });

  it("leaves voided purchases out of spend and usage", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedShop(t);

    const purchaseId = await restock(admin, unitId, productId);
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

  it("drops a voided sale from revenue, margin and top products", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedShop(t);
    await restock(admin, unitId, productId);

    // A till sale with nothing paid has no money against it, so it can be
    // voided. The host always takes the money up front, so create it directly.
    const saleId = await t.run(async (ctx) =>
      ctx.runMutation(components.inventory.sales.create, {
        callerId: "admin-user",
        channel: "cash",
        amountPaidKobo: 0,
        lines: [{ productId, unitId, quantity: 2, unitPriceKobo: 4000 }],
      }),
    );
    await admin.mutation(api.inventory.voidSale, { saleId });

    const metrics = await admin.query(api.inventory.metrics, {
      start: day,
      end: today,
    });

    expect(metrics.revenue.totalKobo).toBe(0);
    expect(metrics.revenue.salesCount).toBe(0);
    expect(metrics.margin.cogsKobo).toBe(0);
    expect(metrics.topProducts).toHaveLength(0);
    expect(metrics.stock.valueKobo).toBe(20000);
  });

  it("ranks top products by quantity then revenue, capped at five", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId } = await seedShop(t);

    const names = ["A", "B", "C", "D", "E", "F"];
    const products = [];
    for (const [index, name] of names.entries()) {
      const productId = await admin.mutation(api.inventory.createProduct, {
        name,
        baseUnitId: unitId,
        costPriceKobo: 100,
      });
      await admin.mutation(api.inventory.recordMovement, {
        productId,
        kind: "restock",
        quantity: 100,
        note: "Delivery",
      });
      products.push({ productId, quantity: index + 1 });
    }

    // B and C sell the same quantity; the higher revenue must come first.
    await admin.mutation(api.inventory.recordSale, {
      channel: "cash",
      lines: [
        {
          productId: products[0].productId,
          unitId,
          quantity: 6,
          unitPriceKobo: 100,
        },
        {
          productId: products[1].productId,
          unitId,
          quantity: 2,
          unitPriceKobo: 900,
        },
        {
          productId: products[2].productId,
          unitId,
          quantity: 2,
          unitPriceKobo: 500,
        },
        {
          productId: products[3].productId,
          unitId,
          quantity: 1,
          unitPriceKobo: 100,
        },
        {
          productId: products[4].productId,
          unitId,
          quantity: 1,
          unitPriceKobo: 100,
        },
      ],
    });

    const metrics = await admin.query(api.inventory.metrics, {
      start: day,
      end: today,
    });

    expect(metrics.topProducts.map((row) => row.name)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(metrics.topProducts[1].revenueKobo).toBe(1800);
  });

  it("links a sale to a known customer and leaves walk-ins unlinked", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedShop(t);
    await restock(admin, unitId, productId);
    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "customer-1",
        firstName: "Ada",
        lastName: "Obi",
        occupation: "None",
      });
    });

    const saleId = await admin.mutation(api.inventory.recordSale, {
      channel: "cash",
      customerId: "customer-1",
      lines: [{ productId, unitId, quantity: 1, unitPriceKobo: 4000 }],
    });

    const [sale] = (
      await admin.query(api.inventory.listSales, {
        paginationOpts: historyPage,
      })
    ).page;
    expect(sale.customerName).toBe("Ada Obi");
    expect(sale.items).toMatchObject([{ name: "Peak Milk", quantity: 1 }]);

    await expect(
      admin.mutation(api.inventory.recordSale, {
        channel: "cash",
        customerId: "ghost",
        lines: [{ productId, unitId, quantity: 1, unitPriceKobo: 4000 }],
      }),
    ).rejects.toThrow("Customer not found");

    const cashSaleId = await admin.mutation(api.inventory.recordSale, {
      channel: "cash",
      lines: [{ productId, unitId, quantity: 1, unitPriceKobo: 4000 }],
    });
    const walkIn = await admin.query(api.inventory.saleDetail, {
      saleId: cashSaleId,
    });
    expect(walkIn?.sale.customerId).toBeUndefined();
    expect(walkIn?.customerName).toBeNull();

    // This sale was paid at the till, so its customer link is locked.
    const before = await admin.query(api.inventory.saleDetail, { saleId });
    await expect(
      admin.mutation(api.inventory.setSaleCustomer, { saleId }),
    ).rejects.toThrow("money against it");
    const after = await admin.query(api.inventory.saleDetail, { saleId });
    expect(after?.sale.customerId).toBe("customer-1");
    expect(after?.sale.totalKobo).toBe(before?.sale.totalKobo);
  });
});

describe("inventory:sell", () => {
  async function seedSeller(t: Tester) {
    await seedAcl(t, true);
    const admin = t.withIdentity({ profile_id: "admin-user" });
    const unitId = await admin.mutation(api.inventory.createUnit, {
      name: "pack",
    });
    const productId = await admin.mutation(api.inventory.createProduct, {
      name: "Peak Milk",
      baseUnitId: unitId,
      sellPriceKobo: 4000,
    });
    await admin.mutation(api.inventory.recordMovement, {
      productId,
      kind: "restock",
      quantity: 10,
      note: "Delivery",
    });
    return { admin, unitId, productId };
  }

  it("can record and list sales but not void them or read metrics", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedSeller(t);

    const role = await t.run(async (ctx) =>
      ctx.runMutation(components.wigxel_acl.roles.createRole, {
        callerId: "admin-user",
        name: "seller",
        description: "Till only",
        privileges: ["inventory:sell"],
      }),
    );
    if (!role.success) throw new Error(role.error);

    await t.run(async (ctx) =>
      ctx.runMutation(components.wigxel_acl.identities.registerIdentity, {
        callerId: "admin-user",
        identity: "seller-user",
        roleId: role.data.roleId,
      }),
    );
    const seller = t.withIdentity({ profile_id: "seller-user" });

    const saleId = await seller.mutation(api.inventory.recordSale, {
      channel: "cash",
      lines: [{ productId, unitId, quantity: 1, unitPriceKobo: 4000 }],
    });
    expect(
      (
        await seller.query(api.inventory.listSales, {
          paginationOpts: historyPage,
        })
      ).page,
    ).toHaveLength(1);
    const formData = await seller.query(api.inventory.saleFormData, {});
    expect(formData.products).toHaveLength(1);
    // Seeded with 10 on the shelf, one just sold.
    expect(formData.products[0].stockQty).toBe(9);

    await expect(
      seller.mutation(api.inventory.voidSale, { saleId }),
    ).rejects.toThrow('Access denied. Required privilege: "inventory:manage"');
    await expect(
      seller.mutation(api.inventory.setSaleCustomer, { saleId }),
    ).rejects.toThrow("inventory:manage");
    await expect(
      seller.query(api.inventory.metrics, {
        start: "2026-05-10",
        end: "2026-05-10",
      }),
    ).rejects.toThrow("inventory:manage");

    // The till took the money, so the sale cannot be voided any more.
    await expect(
      admin.mutation(api.inventory.voidSale, { saleId }),
    ).rejects.toThrow("money against it");
  });
});

describe("credit sales", () => {
  const today = new Date().toISOString().slice(0, 10);

  async function seedCreditShop(t: Tester) {
    await seedAcl(t, true);
    const admin = t.withIdentity({ profile_id: "admin-user" });
    const unitId = await admin.mutation(api.inventory.createUnit, {
      name: "pack",
    });
    const productId = await admin.mutation(api.inventory.createProduct, {
      name: "Peak Milk",
      baseUnitId: unitId,
      sellPriceKobo: 4000,
    });
    await admin.mutation(api.inventory.recordMovement, {
      productId,
      kind: "restock",
      quantity: 50,
      note: "Delivery",
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "customer-1",
        firstName: "Ada",
        lastName: "Obi",
        occupation: "None",
      });
      await ctx.db.insert("profile", {
        id: "customer-2",
        firstName: "Bola",
        lastName: "Eze",
        occupation: "None",
      });
    });
    return { admin, unitId, productId };
  }

  function sellOnCredit(
    admin: ReturnType<Tester["withIdentity"]>,
    unitId: string,
    productId: string,
    customerId: string,
    amountPaidKobo?: number,
  ) {
    return admin.mutation(api.inventory.recordSale, {
      channel: "credit",
      customerId,
      dueDate: "2026-12-01",
      amountPaidKobo,
      lines: [{ productId, unitId, quantity: 1, unitPriceKobo: 4000 }],
    });
  }

  it("needs a named customer and records the deposit", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedCreditShop(t);

    await expect(
      admin.mutation(api.inventory.recordSale, {
        channel: "credit",
        lines: [{ productId, unitId, quantity: 1, unitPriceKobo: 4000 }],
      }),
    ).rejects.toThrow("A credit sale needs a named customer");

    const saleId = await sellOnCredit(
      admin,
      unitId,
      productId,
      "customer-1",
      1000,
    );

    const [sale] = (
      await admin.query(api.inventory.listSales, {
        paginationOpts: historyPage,
      })
    ).page;
    expect(sale).toMatchObject({
      customerName: "Ada Obi",
      paidKobo: 1000,
      outstandingKobo: 3000,
      status: "part_paid",
    });

    const detail = await admin.query(api.inventory.saleDetail, { saleId });
    expect(detail).toMatchObject({
      customerName: "Ada Obi",
      createdByName: "admin-user",
      paidKobo: 1000,
      outstandingKobo: 3000,
      status: "part_paid",
    });
    expect(detail?.sale.dueDate).toBe("2026-12-01");
    expect(detail?.payments).toHaveLength(1);
    expect(detail?.payments[0]).toMatchObject({
      amountKobo: 1000,
      kind: "payment",
      recordedByName: "admin-user",
    });
  });

  it("takes payments, rejects overpayment, reverses and writes off", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedCreditShop(t);
    const saleId = await sellOnCredit(admin, unitId, productId, "customer-1");

    await expect(
      admin.mutation(api.inventory.recordSalePayment, {
        saleId,
        amountKobo: 5000,
        channel: "cash",
      }),
    ).rejects.toThrow("more than what is outstanding");

    const paymentId = await admin.mutation(api.inventory.recordSalePayment, {
      saleId,
      amountKobo: 1500,
      channel: "transfer",
    });
    expect(
      await admin.query(api.inventory.customerBalance, {
        customerId: "customer-1",
      }),
    ).toBe(2500);

    await admin.mutation(api.inventory.reverseSalePayment, { paymentId });
    expect(
      await admin.query(api.inventory.customerBalance, {
        customerId: "customer-1",
      }),
    ).toBe(4000);

    await admin.mutation(api.inventory.writeOffSale, {
      saleId,
      amountKobo: 4000,
      note: "Moved away",
    });
    const detail = await admin.query(api.inventory.saleDetail, { saleId });
    expect(detail).toMatchObject({
      outstandingKobo: 0,
      writtenOffKobo: 4000,
      status: "written_off",
    });
  });

  it("lists receivables and one customer's debt", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedCreditShop(t);

    await sellOnCredit(admin, unitId, productId, "customer-1");
    await sellOnCredit(admin, unitId, productId, "customer-2", 500);
    await admin.mutation(api.inventory.recordSale, {
      channel: "cash",
      lines: [{ productId, unitId, quantity: 1, unitPriceKobo: 4000 }],
    });

    const owing = await admin.query(api.inventory.receivables, {});
    expect(owing).toHaveLength(2);
    const owed = new Map(owing.map((row) => [row.customerId, row]));
    expect(owed.get("customer-1")?.totalOwedKobo).toBe(4000);
    expect(owed.get("customer-1")?.customerName).toBe("Ada Obi");
    expect(owed.get("customer-2")?.totalOwedKobo).toBe(3500);

    const debt = await admin.query(api.inventory.customerDebt, {
      customerId: "customer-2",
    });
    expect(debt).toHaveLength(1);
    expect(debt[0]).toMatchObject({
      customerName: "Bola Eze",
      outstandingKobo: 3500,
      status: "part_paid",
    });
  });

  it("splits booked, collected and outstanding in metrics", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedCreditShop(t);

    const saleId = await sellOnCredit(
      admin,
      unitId,
      productId,
      "customer-1",
      1000,
    );

    const opened = await admin.query(api.inventory.metrics, {
      start: today,
      end: today,
    });
    expect(opened.revenue).toMatchObject({
      totalKobo: 4000,
      collectedKobo: 1000,
      outstandingKobo: 3000,
    });
    expect(
      opened.revenue.byChannel.find((share) => share.channel === "credit")
        ?.totalKobo,
    ).toBe(4000);
    // Margin stays on the booked amount, not on the cash taken.
    expect(opened.margin.grossMarginKobo).toBe(4000);

    await admin.mutation(api.inventory.recordSalePayment, {
      saleId,
      amountKobo: 3000,
      channel: "cash",
    });

    const settled = await admin.query(api.inventory.metrics, {
      start: today,
      end: today,
    });
    expect(settled.revenue).toMatchObject({
      collectedKobo: 4000,
      outstandingKobo: 0,
    });
  });

  it("lets a seller take money but not reverse or write off", async () => {
    const t = convexTest(schema, modules);
    const { unitId, productId } = await seedCreditShop(t);

    const role = await t.run(async (ctx) =>
      ctx.runMutation(components.wigxel_acl.roles.createRole, {
        callerId: "admin-user",
        name: "seller",
        description: "Till only",
        privileges: ["inventory:sell"],
      }),
    );
    if (!role.success) throw new Error(role.error);
    await t.run(async (ctx) =>
      ctx.runMutation(components.wigxel_acl.identities.registerIdentity, {
        callerId: "admin-user",
        identity: "seller-user",
        roleId: role.data.roleId,
      }),
    );
    const seller = t.withIdentity({ profile_id: "seller-user" });

    const saleId = await sellOnCredit(seller, unitId, productId, "customer-1");
    const paymentId = await seller.mutation(api.inventory.recordSalePayment, {
      saleId,
      amountKobo: 1000,
      channel: "pos",
    });
    expect(
      await seller.query(api.inventory.customerBalance, {
        customerId: "customer-1",
      }),
    ).toBe(3000);
    expect(await seller.query(api.inventory.receivables, {})).toHaveLength(1);

    await expect(
      seller.mutation(api.inventory.reverseSalePayment, { paymentId }),
    ).rejects.toThrow("inventory:manage");
    await expect(
      seller.mutation(api.inventory.writeOffSale, {
        saleId,
        amountKobo: 1000,
      }),
    ).rejects.toThrow("inventory:manage");
  });

  it("refuses a payment dated before the sale or in the future", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedCreditShop(t);
    // recordSale dates the sale at now, so any earlier year is out of window.
    const saleId = await sellOnCredit(admin, unitId, productId, "customer-1");

    await expect(
      admin.mutation(api.inventory.recordSalePayment, {
        saleId,
        amountKobo: 1000,
        channel: "cash",
        paidAt: "2020-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow("before the sale was recorded");

    await expect(
      admin.mutation(api.inventory.recordSalePayment, {
        saleId,
        amountKobo: 1000,
        channel: "cash",
        paidAt: "2099-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow("in the future");
  });
});

describe("sales history pagination", () => {
  async function seedSales(t: Tester) {
    const { admin, unitId, productId } = await seedShop(t);
    await restock(admin, unitId, productId, 20);
    const saleIds: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      saleIds.push(
        await admin.mutation(api.inventory.recordSale, {
          channel: "cash",
          lines: [{ productId, unitId, quantity: 1, unitPriceKobo: 4000 }],
        }),
      );
    }
    return { admin, unitId, productId, saleIds };
  }

  it("walks every row through the pagination cursor, newest first", async () => {
    const t = convexTest(schema, modules);
    const { admin, saleIds } = await seedSales(t);

    const first = await admin.query(api.inventory.listSales, {
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.page).toHaveLength(2);
    expect(first.isDone).toBe(false);
    expect(first.page[0]._id).toBe(saleIds[2]);

    const second = await admin.query(api.inventory.listSales, {
      paginationOpts: { numItems: 2, cursor: first.continueCursor },
    });
    expect(second.page).toHaveLength(1);
    expect(second.isDone).toBe(true);
    expect(second.page[0]._id).toBe(saleIds[0]);

    const seen = [...first.page, ...second.page].map((sale) => sale._id);
    expect(seen).toEqual([...saleIds].reverse());
  });

  it("keeps sales outside the date range out of every page", async () => {
    const t = convexTest(schema, modules);
    const { admin } = await seedSales(t);

    const past = await admin.query(api.inventory.listSales, {
      paginationOpts: historyPage,
      start: day,
      end: day,
    });
    expect(past.page).toHaveLength(0);
    expect(past.isDone).toBe(true);

    const everything = await admin.query(api.inventory.listSales, {
      paginationOpts: historyPage,
      start: day,
      end: new Date().toISOString().slice(0, 10),
    });
    expect(everything.page).toHaveLength(3);
  });

  it("keeps voided sales visible in the history", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId, saleIds } = await seedSales(t);

    // A till sale with nothing paid has no money against it, so it can be
    // voided. The host always takes the money up front, so create it directly.
    const voidable = await t.run(async (ctx) =>
      ctx.runMutation(components.inventory.sales.create, {
        callerId: "admin-user",
        channel: "cash",
        amountPaidKobo: 0,
        lines: [{ productId, unitId, quantity: 1, unitPriceKobo: 4000 }],
      }),
    );
    await admin.mutation(api.inventory.voidSale, { saleId: voidable });

    const history = await admin.query(api.inventory.listSales, {
      paginationOpts: historyPage,
    });
    expect(history.page).toHaveLength(saleIds.length + 1);
    const voided = history.page.find((sale) => sale._id === voidable);
    expect(voided?.voided).toBe(true);
  });

  it("searches by customer name and item name on the server", async () => {
    const t = convexTest(schema, modules);
    const { admin, unitId, productId } = await seedSales(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "customer-1",
        firstName: "Ada",
        lastName: "Obi",
        occupation: "None",
      });
    });
    await admin.mutation(api.inventory.recordSale, {
      channel: "credit",
      customerId: "customer-1",
      amountPaidKobo: 0,
      lines: [{ productId, unitId, quantity: 1, unitPriceKobo: 4000 }],
    });

    const byItem = await admin.query(api.inventory.listSales, {
      paginationOpts: historyPage,
      search: "peak",
    });
    expect(byItem.page).toHaveLength(4);
    expect(byItem.isDone).toBe(true);

    const byCustomer = await admin.query(api.inventory.listSales, {
      paginationOpts: historyPage,
      search: "Ada",
    });
    expect(byCustomer.page).toHaveLength(1);
    expect(byCustomer.page[0].customerName).toBe("Ada Obi");

    const noMatch = await admin.query(api.inventory.listSales, {
      paginationOpts: historyPage,
      search: "nothing-matches",
    });
    expect(noMatch.page).toHaveLength(0);
    expect(noMatch.isDone).toBe(true);
  });
});

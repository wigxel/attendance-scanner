/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { format, isSameDay, subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function makeDevice(visitorId = "visitor-1") {
  return { browser: "Chrome", name: "Test", visitorId };
}

function watNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }),
  );
}

function yesterdayWATDate() {
  return format(subDays(watNow(), 1), "yyyy-MM-dd");
}

function insertCashRegister(
  ctx: any,
  dateStr: string,
  amountInKobo: number,
  paymentMethod: "cash" | "bank_transfer" = "cash",
  planId: string = "daily",
) {
  return ctx.db.insert("daily_register", {
    userId: "user-1",
    timestamp: `${dateStr}T12:00:00.000Z`,
    source: "web",
    device: makeDevice(),
    access: { kind: "paid", planId, amountInKobo, paymentMethod, _v: "2" },
    admitted_by: "staff-1",
  });
}

function insertFreeRegister(ctx: any, dateStr: string) {
  return ctx.db.insert("daily_register", {
    userId: "user-2",
    timestamp: `${dateStr}T13:00:00.000Z`,
    source: "web",
    device: makeDevice("v2"),
    access: { kind: "free" },
    admitted_by: "staff-1",
  });
}

describe("saveCount cash upsert", () => {
  it("writes a dailyCashPayments row for yesterday with cash-only totals", async () => {
    const t = convexTest(schema, modules);
    const date = yesterdayWATDate();
    await t.run(async (ctx) => {
      await insertCashRegister(ctx, date, 5000); // 50
      await insertCashRegister(ctx, date, 12000, "cash", "weekly"); // 120
      await insertCashRegister(ctx, date, 3000, "bank_transfer"); // excluded
      await insertFreeRegister(ctx, date); // excluded
    });
    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.saveCount, {});
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("dailyCashPayments")
        .withIndex("by_date", (q) => q.eq("date", new Date(date).getTime()))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(2);
    expect(rows[0].total).toBe(170);
  });

  it("upserts (idempotent): running twice patches, not duplicates", async () => {
    const t = convexTest(schema, modules);
    const date = yesterdayWATDate();
    await t.run(async (ctx) => {
      await insertCashRegister(ctx, date, 5000);
    });
    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.saveCount, {});
    });
    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.saveCount, {});
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("dailyCashPayments")
        .withIndex("by_date", (q) => q.eq("date", new Date(date).getTime()))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(1);
    expect(rows[0].total).toBe(50);
  });

  it("writes a zero row on a day with no cash", async () => {
    const t = convexTest(schema, modules);
    const date = yesterdayWATDate();
    await t.run(async (ctx) => {
      await insertCashRegister(ctx, date, 3000, "bank_transfer");
    });
    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.saveCount, {});
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("dailyCashPayments")
        .withIndex("by_date", (q) => q.eq("date", new Date(date).getTime()))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(0);
    expect(rows[0].total).toBe(0);
  });
});

describe("backfillDailyCashPayments", () => {
  it("populates dailyCashPayments for days with cash across the range", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await insertCashRegister(ctx, "2026-05-15", 5000); // 50
      await insertCashRegister(ctx, "2026-06-10", 12000, "cash", "weekly"); // 120
      await insertCashRegister(ctx, "2026-07-05", 3000); // 30
      await insertCashRegister(ctx, "2026-07-05", 7000); // 70, same day
    });
    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.backfillDailyCashPayments, {
        startDate: "2026-05-01",
      });
    });

    const may15 = await t.run(async (ctx) =>
      ctx.db
        .query("dailyCashPayments")
        .withIndex("by_date", (q) => q.eq("date", new Date("2026-05-15").getTime()))
        .unique(),
    );
    const jun10 = await t.run(async (ctx) =>
      ctx.db
        .query("dailyCashPayments")
        .withIndex("by_date", (q) => q.eq("date", new Date("2026-06-10").getTime()))
        .unique(),
    );
    const jul05 = await t.run(async (ctx) =>
      ctx.db
        .query("dailyCashPayments")
        .withIndex("by_date", (q) => q.eq("date", new Date("2026-07-05").getTime()))
        .unique(),
    );
    expect(may15?.count).toBe(1);
    expect(may15?.total).toBe(50);
    expect(jun10?.count).toBe(1);
    expect(jun10?.total).toBe(120);
    expect(jul05?.count).toBe(2);
    expect(jul05?.total).toBe(100);
  });

  it("writes zero rows for days with no cash", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await insertCashRegister(ctx, "2026-05-15", 5000);
      await insertCashRegister(ctx, "2026-05-16", 3000, "bank_transfer"); // not cash
    });
    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.backfillDailyCashPayments, {
        startDate: "2026-05-01",
      });
    });

    const may16 = await t.run(async (ctx) =>
      ctx.db
        .query("dailyCashPayments")
        .withIndex("by_date", (q) => q.eq("date", new Date("2026-05-16").getTime()))
        .unique(),
    );
    expect(may16?.count).toBe(0);
    expect(may16?.total).toBe(0);
  });

  it("is idempotent: running twice does not duplicate rows", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await insertCashRegister(ctx, "2026-05-15", 5000);
    });
    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.backfillDailyCashPayments, {
        startDate: "2026-05-01",
      });
    });
    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.backfillDailyCashPayments, {
        startDate: "2026-05-01",
      });
    });

    const all = await t.run(async (ctx) =>
      ctx.db.query("dailyCashPayments").collect(),
    );
    const may15 = all.filter((r) => isSameDay(r.date, "2026-05-15"));
    expect(may15).toHaveLength(1);
  });

  it("defaults start to May 1 2026 when startDate omitted", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await insertCashRegister(ctx, "2026-04-15", 5000); // before May
    });
    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.backfillDailyCashPayments, {});
    });

    const apr15 = await t.run(async (ctx) =>
      ctx.db
        .query("dailyCashPayments")
        .withIndex("by_date", (q) => q.eq("date", new Date("2026-04-15").getTime()))
        .unique(),
    );
    expect(apr15).toBeNull();
  });
});

describe("deleteRegisterRecord", () => {
  it("deletes a register record by id", async () => {
    const t = convexTest(schema, modules);

    const registerId = await t.run(async (ctx) => {
      return await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice(),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });
    });

    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.deleteRegisterRecord, {
        registerId,
      });
    });

    const result = await t.run(async (ctx) => ctx.db.get(registerId));
    expect(result).toBeNull();
  });
});

describe("setFreeAccess", () => {
  it("does nothing when are_you_sure is false", async () => {
    const t = convexTest(schema, modules);

    const registerId = await t.run(async (ctx) => {
      return await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice(),
        access: { kind: "paid", planId: "daily", amountInKobo: 5000, paymentMethod: "cash", _v: "2" },
        admitted_by: "staff-1",
      });
    });

    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.setFreeAccess, {
        are_you_sure: false,
      });
    });

    const record = await t.run(async (ctx) => ctx.db.get(registerId));
    expect(record?.access).toHaveProperty("kind", "paid");
  });

  it("sets all registers to free when are_you_sure is true", async () => {
    const t = convexTest(schema, modules);

    const registerId = await t.run(async (ctx) => {
      return await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice(),
        access: { kind: "paid", planId: "daily", amountInKobo: 5000, paymentMethod: "cash", _v: "2" },
        admitted_by: "staff-1",
      });
    });

    await t.run(async (ctx) => {
      await ctx.runMutation(internal.register.setFreeAccess, {
        are_you_sure: true,
      });
    });

    const record = await t.run(async (ctx) => ctx.db.get(registerId));
    expect(record?.access).toHaveProperty("kind", "free");
  });
});

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function makeDevice(visitorId = "visitor-1") {
  return { browser: "Chrome", name: "Test", visitorId };
}

describe("reports getDaily", () => {
  it("returns empty report when no registers exist for the day", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.reports.getDaily, {
      date: "2024/01/01",
    });

    expect(result.dailyReport).toEqual({
      date: "2024/01/01",
      no_of_customers: 0,
      no_of_paid_customers: 0,
      no_of_free_customer: 0,
      subscribed_customers: 0,
      weekly_subscribers: 0,
      total_sales: 0,
      cash_sales: 0,
      transfer_sales: 0,
      staff_on_duty: [],
    });
  });

  it("counts unique paid and free customers", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-paid",
        timestamp: "2024-01-01T10:00:00.000Z",
        source: "web",
        device: makeDevice(),
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 5000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
      await ctx.db.insert("daily_register", {
        userId: "user-free",
        timestamp: "2024-01-01T12:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.reports.getDaily, {
      date: "2024/01/01",
    });

    expect(result.dailyReport.no_of_customers).toBe(2);
    expect(result.dailyReport.no_of_paid_customers).toBe(1);
    expect(result.dailyReport.no_of_free_customer).toBe(1);
  });

  it("deduplicates the same user appearing in multiple registers", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: "2024-01-01T10:00:00.000Z",
        source: "web",
        device: makeDevice(),
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 5000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: "2024-01-01T14:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.reports.getDaily, {
      date: "2024/01/01",
    });

    expect(result.dailyReport.no_of_customers).toBe(1);
  });

  it("calculates sales using accessPlans when available", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily Pass",
        price: 10000,
        no_of_days: 30,
        description: "Monthly pass billed daily",
        features: ["access"],
      });
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: "2024-01-01T10:00:00.000Z",
        source: "web",
        device: makeDevice(),
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 10000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.reports.getDaily, {
      date: "2024/01/01",
    });

    expect(result.dailyReport.total_sales).toBeCloseTo(10000 / 30);
    expect(result.dailyReport.cash_sales).toBeCloseTo(10000 / 30);
    expect(result.dailyReport.transfer_sales).toBe(0);
  });

  it("returns 0 sales when no matching accessPlan exists", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: "2024-01-01T10:00:00.000Z",
        source: "web",
        device: makeDevice(),
        access: {
          kind: "paid",
          planId: "nonexistent",
          amountInKobo: 5000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.reports.getDaily, {
      date: "2024/01/01",
    });

    expect(result.dailyReport.total_sales).toBe(0);
    expect(result.dailyReport.cash_sales).toBe(0);
  });

  it("counts subscribed customers (those with ticketId)", async () => {
    const t = convexTest(schema, modules);

    const bookingId = await t.run(async (ctx) => {
      return await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T00:00:00.000Z",
        durationType: "month",
        pricePerSeat: 10000,
        amount: 10000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const ticketId = await t.run(async (ctx) => {
      return await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        status: "reserved",
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: "2024-01-01T10:00:00.000Z",
        source: "web",
        device: makeDevice(),
        access: { kind: "free" },
        ticketId,
        admitted_by: "staff-1",
      });
      await ctx.db.insert("daily_register", {
        userId: "user-2",
        timestamp: "2024-01-01T12:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.reports.getDaily, {
      date: "2024/01/01",
    });

    expect(result.dailyReport.subscribed_customers).toBe(1);
  });

  it("reports staff on duty with profile names and admission counts", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "staff-1",
        firstName: "John",
        lastName: "Doe",
        occupation: "None",
      });
      await ctx.db.insert("profile", {
        id: "staff-2",
        firstName: "Jane",
        lastName: "Smith",
        occupation: "None",
      });
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: "2024-01-01T10:00:00.000Z",
        source: "web",
        device: makeDevice(),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });
      await ctx.db.insert("daily_register", {
        userId: "user-2",
        timestamp: "2024-01-01T12:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });
      await ctx.db.insert("daily_register", {
        userId: "user-3",
        timestamp: "2024-01-01T14:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-3"),
        access: { kind: "free" },
        admitted_by: "staff-2",
      });
    });

    const result = await t.query(api.reports.getDaily, {
      date: "2024/01/01",
    });

    expect(result.dailyReport.staff_on_duty).toHaveLength(2);
    expect(result.dailyReport.staff_on_duty).toContainEqual({
      name: "John Doe",
      admissions_count: 2,
    });
    expect(result.dailyReport.staff_on_duty).toContainEqual({
      name: "Jane Smith",
      admissions_count: 1,
    });
  });

  it("counts weekly subscribers with active reservations", async () => {
    const t = convexTest(schema, modules);

    const now = new Date();
    const past = new Date(now.getTime() - 86400000).toISOString();
    const future = new Date(now.getTime() + 86400000).toISOString();

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-paid",
        seatIds: [],
        duration: 7,
        startDate: past,
        endDate: future,
        durationType: "week",
        pricePerSeat: 5000,
        amount: 5000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("daily_register", {
        userId: "user-paid",
        timestamp: now.toISOString(),
        source: "web",
        device: makeDevice(),
        access: {
          kind: "paid",
          planId: "week",
          amountInKobo: 5000,
          paymentMethod: "bank_transfer",
          _v: "2",
        },
        admitted_by: "staff-1",
      });

      await ctx.db.insert("daily_register", {
        userId: "user-other",
        timestamp: now.toISOString(),
        source: "web",
        device: makeDevice("visitor-2"),
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 3000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;

    const result = await t.query(api.reports.getDaily, {
      date: dateStr,
    });

    expect(result.dailyReport.weekly_subscribers).toBe(1);
  });

  it("returns report for today when no date argument provided", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.reports.getDaily, {});

    expect(result.dailyReport).toHaveProperty("date");
    expect(result.dailyReport.no_of_customers).toBe(0);
    expect(result.dailyReport.staff_on_duty).toEqual([]);
  });
});

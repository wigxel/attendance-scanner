/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function makeDevice(visitorId = "visitor-1") {
  return { browser: "Chrome", name: "Test", visitorId };
}

describe("metricsDailyAttendance", () => {
  it("returns metrics in ascending order within date range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("dailyAttendanceMetrics", {
        date: "2024-01-02",
        totalUsers: 20,
      });
      await ctx.db.insert("dailyAttendanceMetrics", {
        date: "2024-01-01",
        totalUsers: 10,
      });
      await ctx.db.insert("dailyAttendanceMetrics", {
        date: "2024-01-03",
        totalUsers: 30,
      });
    });

    const result = await t.query(api.metrics.metricsDailyAttendance, {
      start: "2024-01-01",
      end: "2024-01-03",
    });

    expect(result).toEqual([
      { date: "2024-01-01", users: 10 },
      { date: "2024-01-02", users: 20 },
      { date: "2024-01-03", users: 30 },
    ]);
  });

  it("returns empty array when no metrics match the range", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.metrics.metricsDailyAttendance, {
      start: "2024-01-01",
      end: "2024-01-02",
    });

    expect(result).toEqual([]);
  });

  it("excludes dates outside the given range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("dailyAttendanceMetrics", {
        date: "2023-12-31",
        totalUsers: 5,
      });
      await ctx.db.insert("dailyAttendanceMetrics", {
        date: "2024-01-15",
        totalUsers: 15,
      });
    });

    const result = await t.query(api.metrics.metricsDailyAttendance, {
      start: "2024-01-01",
      end: "2024-01-10",
    });

    expect(result).toEqual([]);
  });

  it("returns metrics for a one-week range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const days = [
        { date: "2024-03-01", totalUsers: 100 },
        { date: "2024-03-03", totalUsers: 120 },
        { date: "2024-03-05", totalUsers: 90 },
        { date: "2024-03-07", totalUsers: 150 },
      ];
      for (const d of days) await ctx.db.insert("dailyAttendanceMetrics", d);
    });

    const result = await t.query(api.metrics.metricsDailyAttendance, {
      start: "2024-03-01",
      end: "2024-03-07",
    });

    expect(result).toEqual([
      { date: "2024-03-01", users: 100 },
      { date: "2024-03-03", users: 120 },
      { date: "2024-03-05", users: 90 },
      { date: "2024-03-07", users: 150 },
    ]);
  });

  it("returns metrics for a one-month range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const days = [
        { date: "2024-06-01", totalUsers: 200 },
        { date: "2024-06-10", totalUsers: 180 },
        { date: "2024-06-20", totalUsers: 220 },
        { date: "2024-06-30", totalUsers: 190 },
      ];
      for (const d of days) await ctx.db.insert("dailyAttendanceMetrics", d);
    });

    const result = await t.query(api.metrics.metricsDailyAttendance, {
      start: "2024-06-01",
      end: "2024-06-30",
    });

    expect(result).toEqual([
      { date: "2024-06-01", users: 200 },
      { date: "2024-06-10", users: 180 },
      { date: "2024-06-20", users: 220 },
      { date: "2024-06-30", users: 190 },
    ]);
  });

  it("returns metrics for a six-month range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const days = [
        { date: "2024-01-15", totalUsers: 50 },
        { date: "2024-02-15", totalUsers: 75 },
        { date: "2024-03-15", totalUsers: 100 },
        { date: "2024-04-15", totalUsers: 130 },
        { date: "2024-05-15", totalUsers: 160 },
        { date: "2024-06-15", totalUsers: 200 },
      ];
      for (const d of days) await ctx.db.insert("dailyAttendanceMetrics", d);
    });

    const result = await t.query(api.metrics.metricsDailyAttendance, {
      start: "2024-01-01",
      end: "2024-06-30",
    });

    expect(result).toEqual([
      { date: "2024-01-15", users: 50 },
      { date: "2024-02-15", users: 75 },
      { date: "2024-03-15", users: 100 },
      { date: "2024-04-15", users: 130 },
      { date: "2024-05-15", users: 160 },
      { date: "2024-06-15", users: 200 },
    ]);
  });

  it("excludes data outside a six-month range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("dailyAttendanceMetrics", {
        date: "2023-12-15",
        totalUsers: 40,
      });
      await ctx.db.insert("dailyAttendanceMetrics", {
        date: "2024-01-15",
        totalUsers: 50,
      });
      await ctx.db.insert("dailyAttendanceMetrics", {
        date: "2024-06-15",
        totalUsers: 200,
      });
      await ctx.db.insert("dailyAttendanceMetrics", {
        date: "2024-07-15",
        totalUsers: 210,
      });
    });

    const result = await t.query(api.metrics.metricsDailyAttendance, {
      start: "2024-01-01",
      end: "2024-06-30",
    });

    expect(result).toEqual([
      { date: "2024-01-15", users: 50 },
      { date: "2024-06-15", users: 200 },
    ]);
  });
});

describe("sumPaidAccess", () => {
  it("returns 0 when no registers exist", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.metrics.sumPaidAccess, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result).toBe(0);
  });

  it("sums V2 paid registers and excludes free ones", async () => {
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
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 3000,
          paymentMethod: "bank_transfer",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.metrics.sumPaidAccess, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result).toBe(80);
  });

  it("handles V1 access (amount field) without dividing by 100", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: "2024-01-01T10:00:00.000Z",
        source: "web",
        device: makeDevice(),
        access: { kind: "paid", planId: "daily", amount: 2000 },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.metrics.sumPaidAccess, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result).toBe(2000);
  });

  it("sums paid access across a one-week range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const registers = [
        {
          userId: "user-1",
          timestamp: "2024-04-01T10:00:00.000Z",
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
        },
        {
          userId: "user-2",
          timestamp: "2024-04-03T14:00:00.000Z",
          source: "web",
          device: makeDevice("visitor-2"),
          access: {
            kind: "paid",
            planId: "daily",
            amountInKobo: 3000,
            paymentMethod: "bank_transfer",
            _v: "2",
          },
          admitted_by: "staff-1",
        },
        {
          userId: "user-3",
          timestamp: "2024-04-07T09:00:00.000Z",
          source: "web",
          device: makeDevice("visitor-3"),
          access: {
            kind: "paid",
            planId: "daily",
            amountInKobo: 7000,
            paymentMethod: "cash",
            _v: "2",
          },
          admitted_by: "staff-1",
        },
      ];
      for (const r of registers) await ctx.db.insert("daily_register", r);
    });

    const result = await t.query(api.metrics.sumPaidAccess, {
      start: "2024-04-01T00:00:00.000Z",
      end: "2024-04-08T00:00:00.000Z",
    });

    expect(result).toBe(150);
  });

  it("sums paid access across a one-month range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const registers = [
        {
          userId: "user-1",
          timestamp: "2024-05-05T10:00:00.000Z",
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
        },
        {
          userId: "user-2",
          timestamp: "2024-05-15T12:00:00.000Z",
          source: "web",
          device: makeDevice("visitor-2"),
          access: {
            kind: "paid",
            planId: "daily",
            amountInKobo: 5000,
            paymentMethod: "bank_transfer",
            _v: "2",
          },
          admitted_by: "staff-1",
        },
        {
          userId: "user-3",
          timestamp: "2024-05-28T16:00:00.000Z",
          source: "web",
          device: makeDevice("visitor-3"),
          access: {
            kind: "paid",
            planId: "daily",
            amountInKobo: 8000,
            paymentMethod: "cash",
            _v: "2",
          },
          admitted_by: "staff-1",
        },
      ];
      for (const r of registers) await ctx.db.insert("daily_register", r);
    });

    const result = await t.query(api.metrics.sumPaidAccess, {
      start: "2024-05-01T00:00:00.000Z",
      end: "2024-05-31T23:59:59.999Z",
    });

    expect(result).toBe(230);
  });

  it("sums paid access across a six-month range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const registers = [
        {
          userId: "user-1",
          timestamp: "2024-01-15T10:00:00.000Z",
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
        },
        {
          userId: "user-2",
          timestamp: "2024-03-20T12:00:00.000Z",
          source: "web",
          device: makeDevice("visitor-2"),
          access: {
            kind: "paid",
            planId: "daily",
            amountInKobo: 8000,
            paymentMethod: "bank_transfer",
            _v: "2",
          },
          admitted_by: "staff-1",
        },
        {
          userId: "user-3",
          timestamp: "2024-06-10T14:00:00.000Z",
          source: "web",
          device: makeDevice("visitor-3"),
          access: {
            kind: "paid",
            planId: "daily",
            amountInKobo: 12000,
            paymentMethod: "cash",
            _v: "2",
          },
          admitted_by: "staff-1",
        },
      ];
      for (const r of registers) await ctx.db.insert("daily_register", r);
    });

    const result = await t.query(api.metrics.sumPaidAccess, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-06-30T23:59:59.999Z",
    });

    expect(result).toBe(250);
  });

  it("excludes registers outside a six-month range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: "2023-12-15T10:00:00.000Z",
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
        userId: "user-2",
        timestamp: "2024-06-15T12:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 10000,
          paymentMethod: "bank_transfer",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
      await ctx.db.insert("daily_register", {
        userId: "user-3",
        timestamp: "2024-07-15T14:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-3"),
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 8000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.metrics.sumPaidAccess, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-06-30T23:59:59.999Z",
    });

    expect(result).toBe(100);
  });

  it("only counts registers within the timestamp range", async () => {
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
        userId: "user-2",
        timestamp: "2024-01-03T10:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 5000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.metrics.sumPaidAccess, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result).toBe(50);
  });
});

describe("sumCashPayments", () => {
  it("returns { count: 0, total: 0 } when no registers exist", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.metrics.sumCashPayments, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-31T23:59:59.999Z",
    });

    expect(result).toEqual({ count: 0, total: 0 });
  });

  it("counts only cash payments, excludes bank_transfer", async () => {
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
        userId: "user-2",
        timestamp: "2024-01-01T12:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 3000,
          paymentMethod: "bank_transfer",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.metrics.sumCashPayments, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result).toEqual({ count: 1, total: 50 });
  });

  it("counts only cash payments, excludes free access", async () => {
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
        userId: "user-2",
        timestamp: "2024-01-01T12:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.metrics.sumCashPayments, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result).toEqual({ count: 1, total: 50 });
  });

  it("sums amounts correctly (V2: amountInKobo / 100)", async () => {
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
        userId: "user-2",
        timestamp: "2024-01-01T14:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: {
          kind: "paid",
          planId: "weekly",
          amountInKobo: 12000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.metrics.sumCashPayments, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result).toEqual({ count: 2, total: 170 });
  });

  it("filters by date range (excludes outside)", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: "2023-12-31T23:59:59.999Z",
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
        userId: "user-2",
        timestamp: "2024-01-01T10:00:00.000Z",
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
      await ctx.db.insert("daily_register", {
        userId: "user-3",
        timestamp: "2024-01-02T00:00:01.000Z",
        source: "web",
        device: makeDevice("visitor-3"),
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 7000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.metrics.sumCashPayments, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result).toEqual({ count: 1, total: 30 });
  });

  it("filters by planId when provided", async () => {
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
        userId: "user-2",
        timestamp: "2024-01-01T12:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: {
          kind: "paid",
          planId: "weekly",
          amountInKobo: 12000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.metrics.sumCashPayments, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
      planId: "daily",
    });

    expect(result).toEqual({ count: 1, total: 50 });
  });

  it("ignores planId filter when not provided", async () => {
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
        userId: "user-2",
        timestamp: "2024-01-01T12:00:00.000Z",
        source: "web",
        device: makeDevice("visitor-2"),
        access: {
          kind: "paid",
          planId: "weekly",
          amountInKobo: 12000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });
    });

    const result = await t.query(api.metrics.sumCashPayments, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result).toEqual({ count: 2, total: 170 });
  });

  it("counts all records without a cap", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      for (let i = 0; i < 55; i++) {
        await ctx.db.insert("daily_register", {
          userId: `user-${i}`,
          timestamp: `2024-01-01T${String(i).padStart(2, "0")}:00:00.000Z`,
          source: "web",
          device: makeDevice(`visitor-${i}`),
          access: {
            kind: "paid",
            planId: "daily",
            amountInKobo: 1000,
            paymentMethod: "cash",
            _v: "2",
          },
          admitted_by: "staff-1",
        });
      }
    });

    const result = await t.query(api.metrics.sumCashPayments, {
      start: "2024-01-01T00:00:00.000Z",
      end: "2024-01-02T00:00:00.000Z",
    });

    expect(result.count).toBe(55);
    expect(result.total).toBe(550);
  });

  it("returns multiple records with correct aggregation over a week", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const days = [
        { ts: "2024-03-01T10:00:00.000Z", amountInKobo: 5000 },
        { ts: "2024-03-03T10:00:00.000Z", amountInKobo: 3000 },
        { ts: "2024-03-05T10:00:00.000Z", amountInKobo: 8000 },
        { ts: "2024-03-07T10:00:00.000Z", amountInKobo: 4000 },
      ];
      for (let i = 0; i < days.length; i++) {
        await ctx.db.insert("daily_register", {
          userId: `user-${i}`,
          timestamp: days[i].ts,
          source: "web",
          device: makeDevice(`week-v${i}`),
          access: {
            kind: "paid",
            planId: "daily",
            amountInKobo: days[i].amountInKobo,
            paymentMethod: "cash",
            _v: "2",
          },
          admitted_by: "staff-1",
        });
      }
    });

    const result = await t.query(api.metrics.sumCashPayments, {
      start: "2024-03-01T00:00:00.000Z",
      end: "2024-03-07T23:59:59.999Z",
    });

    expect(result).toEqual({ count: 4, total: 200 });
  });
});

describe("metricsDailyCashPayments", () => {
  it("returns per-day points in ascending date order within range", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("dailyCashPayments", {
        date: new Date("2024-01-02").getTime(),
        count: 2,
        total: 100,
      });
      await ctx.db.insert("dailyCashPayments", {
        date: new Date("2024-01-01").getTime(),
        count: 1,
        total: 50,
      });
      await ctx.db.insert("dailyCashPayments", {
        date: new Date("2024-01-03").getTime(),
        count: 3,
        total: 150,
      });
    });

    const result = await t.query(api.metrics.metricsDailyCashPayments, {
      start: "2024-01-01",
      end: "2024-01-31",
    });

    expect(result.map((r) => r.date)).toEqual([
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
    ]);
    expect(result).toEqual([
      { date: "2024-01-01", count: 1, total: 50 },
      { date: "2024-01-02", count: 2, total: 100 },
      { date: "2024-01-03", count: 3, total: 150 },
    ]);
  });

  it("filters by date range (excludes outside)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("dailyCashPayments", {
        date: new Date("2024-01-01").getTime(),
        count: 1,
        total: 50,
      });
      await ctx.db.insert("dailyCashPayments", {
        date: new Date("2024-02-01").getTime(),
        count: 9,
        total: 900,
      });
      await ctx.db.insert("dailyCashPayments", {
        date: new Date("2024-03-01").getTime(),
        count: 3,
        total: 150,
      });
    });

    const result = await t.query(api.metrics.metricsDailyCashPayments, {
      start: "2024-02-01",
      end: "2024-02-29",
    });

    expect(result).toEqual([{ date: "2024-02-01", count: 9, total: 900 }]);
  });

  it("returns empty array when no rows in range", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("dailyCashPayments", {
        date: new Date("2024-01-01").getTime(),
        count: 1,
        total: 50,
      });
    });

    const result = await t.query(api.metrics.metricsDailyCashPayments, {
      start: "2025-01-01",
      end: "2025-01-31",
    });

    expect(result).toEqual([]);
  });
});

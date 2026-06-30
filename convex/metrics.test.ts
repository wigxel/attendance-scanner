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

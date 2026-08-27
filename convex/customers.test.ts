 
/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { format, subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function daysAgoStr(n: number) {
  return format(subDays(new Date(), n), "yyyy-MM-dd");
}

describe("updateProfile", () => {
  it("throws when profile not found", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.customers.updateProfile, {
        userId: "nonexistent",
        firstName: "A",
        lastName: "B",
        occupation: "None",
      }),
    ).rejects.toThrow("Profile not found");
  });

  it("updates profile fields", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "user-update",
        firstName: "Old",
        lastName: "Name",
        email: "old@test.com",
        occupation: "None",
      });
    });

    const profileId = await t.mutation(api.customers.updateProfile, {
      userId: "user-update",
      firstName: "New",
      lastName: "Name",
      email: "new@test.com",
      phoneNumber: "+1234567890",
      occupation: "None",
    });

    const profile = await t.run(async (ctx) => {
      return await ctx.db.get(profileId);
    });

    expect(profile).toMatchObject(
      expect.objectContaining({
        firstName: "New",
        email: "new@test.com",
        phoneNumber: "+1234567890",
      }),
    );
  });
});

describe("getVisitHistory", () => {
  it("returns empty page for user with no visits", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.customers.getVisitHistory, {
      userId: "user-no-visits",
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(result.page).toEqual([]);
    expect(result.isDone).toBe(true);
  });

  it("returns visits with admin name", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-with-visits",
        timestamp: new Date().toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "v1", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const result = await t.query(api.customers.getVisitHistory, {
      userId: "user-with-visits",
      paginationOpts: { numItems: 10, cursor: null },
    });

    expect(result.page).toHaveLength(1);
    expect(result.page[0].userId).toBe("user-with-visits");
  });
});

describe("getCustomerVisitTrend", () => {
  it("returns empty array when no visits", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.customers.getCustomerVisitTrend, {
      userId: "user-no-visits",
    });
    expect(result).toEqual([]);
  });

  it("returns weekly visit counts", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const now = new Date();
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("daily_register", {
          userId: "user-trend",
          timestamp: subDays(now, i).toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `v${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }
    });

    const result = await t.query(api.customers.getCustomerVisitTrend, {
      userId: "user-trend",
    });

    expect(result.length).toBeGreaterThan(0);
    const totalVisits = result.reduce((sum, r) => sum + r.visits, 0);
    expect(totalVisits).toBe(3);
  });
});

describe("getCustomerMetrics", () => {
  it("returns null when no metrics exist", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.customers.getCustomerMetrics, {
      kind: "totalCustomers",
      start: daysAgoStr(30),
      end: todayStr(),
    });
    expect(result).toBeNull();
  });

  it("returns latest metric value", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("app_metrics", {
        date: daysAgoStr(5),
        category: "customer",
        kind: "totalCustomers",
        value: 10,
      });
      await ctx.db.insert("app_metrics", {
        date: todayStr(),
        category: "customer",
        kind: "totalCustomers",
        value: 15,
      });
    });

    const result = await t.query(api.customers.getCustomerMetrics, {
      kind: "totalCustomers",
      start: daysAgoStr(30),
      end: todayStr(),
    });

    expect(result).toBe(15);
  });

  it("returns sum aggregation", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("app_metrics", {
        date: daysAgoStr(5),
        category: "customer",
        kind: "newCustomers",
        value: 3,
      });
      await ctx.db.insert("app_metrics", {
        date: todayStr(),
        category: "customer",
        kind: "newCustomers",
        value: 5,
      });
    });

    const result = await t.query(api.customers.getCustomerMetrics, {
      kind: "newCustomers",
      start: daysAgoStr(30),
      end: todayStr(),
      aggregation: "sum",
    });

    expect(result).toBe(8);
  });

  it("returns avg aggregation", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("app_metrics", {
        date: daysAgoStr(5),
        category: "customer",
        kind: "avgVisitsPerCustomer",
        value: 2,
      });
      await ctx.db.insert("app_metrics", {
        date: todayStr(),
        category: "customer",
        kind: "avgVisitsPerCustomer",
        value: 4,
      });
    });

    const result = await t.query(api.customers.getCustomerMetrics, {
      kind: "avgVisitsPerCustomer",
      start: daysAgoStr(30),
      end: todayStr(),
      aggregation: "avg",
    });

    expect(result).toBe(3);
  });
});

describe("getTopCustomers", () => {
  it("returns empty array when no data", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.customers.getTopCustomers, {
      start: daysAgoStr(30),
      end: todayStr(),
    });
    expect(result).toEqual([]);
  });

  it("returns top customers sorted by visits", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "top-user-1",
        firstName: "Alice",
        lastName: "Smith",
        occupation: "None",
      });
      await ctx.db.insert("profile", {
        id: "top-user-2",
        firstName: "Bob",
        lastName: "Jones",
        occupation: "None",
      });

      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("daily_register", {
          userId: "top-user-1",
          timestamp: subDays(new Date(), i).toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `v1-${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }

      await ctx.db.insert("daily_register", {
        userId: "top-user-2",
        timestamp: new Date().toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "v2-0", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const result = await t.query(api.customers.getTopCustomers, {
      start: daysAgoStr(30),
      end: todayStr(),
    });

    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe("top-user-1");
    expect(result[0].visits).toBe(3);
    expect(result[1].userId).toBe("top-user-2");
    expect(result[1].visits).toBe(1);
  });

  it("respects limit parameter", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("profile", {
          id: `limit-user-${i}`,
          firstName: `User${i}`,
          lastName: "Test",
          occupation: "None",
        });
        await ctx.db.insert("daily_register", {
          userId: `limit-user-${i}`,
          timestamp: new Date().toISOString(),
          admitted_by: "admin-1",
          device: {
            name: "Chrome",
            visitorId: `limit-v${i}`,
            browser: "Chrome",
          },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }
    });

    const result = await t.query(api.customers.getTopCustomers, {
      start: daysAgoStr(30),
      end: todayStr(),
      limit: 2,
    });

    expect(result).toHaveLength(2);
  });
});

describe("getBackfillStatus", () => {
  it("returns default status when no config exists", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.customers.getBackfillStatus, {});
    expect(result.isRunning).toBe(false);
    expect(result.lastProcessedDate).toBeNull();
  });

  it("reflects config state", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("config", {
        key: "processing_backfill",
        value: "true",
      });
      await ctx.db.insert("config", {
        key: "last_processed_backfill",
        value: "2025-01-15",
      });
    });

    const result = await t.query(api.customers.getBackfillStatus, {});
    expect(result.isRunning).toBe(true);
    expect(result.lastProcessedDate).toBe("2025-01-15");
  });
});

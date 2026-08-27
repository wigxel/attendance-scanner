/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import aggregateTest from "@convex-dev/aggregate/test";
import { convexTest } from "convex-test";
import { format, subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function daysAgoStr(n: number) {
  return format(subDays(new Date(), n), "yyyy-MM-dd");
}

function daysAgo(n: number) {
  return subDays(new Date(), n).toISOString();
}

function registerAggregate(t: ReturnType<typeof convexTest>) {
  aggregateTest.register(t, "customerStats");
}

/** Create a profile via the production mutation. */
async function createProfile(
  t: ReturnType<typeof convexTest>,
  userId: string,
  firstName: string,
) {
  const authed = t.withIdentity({ subject: userId, profile_id: userId });
  return authed.runMutation(api.auth.createOrUpdateProfile, {
    firstName,
    lastName: "Test",
    email: `${userId}@test.com`,
    occupation: "None",
  });
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

  it("returns metrics within a one-week range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("app_metrics", {
        date: daysAgoStr(2),
        category: "customer",
        kind: "totalCustomers",
        value: 25,
      });
      await ctx.db.insert("app_metrics", {
        date: daysAgoStr(10),
        category: "customer",
        kind: "totalCustomers",
        value: 20,
      });
    });

    const result = await t.query(api.customers.getCustomerMetrics, {
      kind: "totalCustomers",
      start: daysAgoStr(7),
      end: todayStr(),
    });

    expect(result).toBe(25);
  });

  it("returns metrics within a six-month range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("app_metrics", {
        date: daysAgoStr(30),
        category: "customer",
        kind: "totalCustomers",
        value: 50,
      });
      await ctx.db.insert("app_metrics", {
        date: daysAgoStr(90),
        category: "customer",
        kind: "totalCustomers",
        value: 40,
      });
      await ctx.db.insert("app_metrics", {
        date: daysAgoStr(180),
        category: "customer",
        kind: "totalCustomers",
        value: 30,
      });
    });

    const result = await t.query(api.customers.getCustomerMetrics, {
      kind: "totalCustomers",
      start: daysAgoStr(180),
      end: todayStr(),
    });

    expect(result).toBe(50);
  });

  it("sums metrics across a six-month range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      for (let i = 0; i < 6; i++) {
        await ctx.db.insert("app_metrics", {
          date: daysAgoStr(i * 30),
          category: "customer",
          kind: "newCustomers",
          value: 5,
        });
      }
    });

    const result = await t.query(api.customers.getCustomerMetrics, {
      kind: "newCustomers",
      start: daysAgoStr(180),
      end: todayStr(),
      aggregation: "sum",
    });

    expect(result).toBe(30);
  });

  it("excludes metrics outside a six-month range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("app_metrics", {
        date: daysAgoStr(200),
        category: "customer",
        kind: "totalCustomers",
        value: 10,
      });
      await ctx.db.insert("app_metrics", {
        date: daysAgoStr(30),
        category: "customer",
        kind: "totalCustomers",
        value: 50,
      });
    });

    const result = await t.query(api.customers.getCustomerMetrics, {
      kind: "totalCustomers",
      start: daysAgoStr(180),
      end: todayStr(),
    });

    expect(result).toBe(50);
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

  it("applies default limit when no limit is specified", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      for (let i = 0; i < 55; i++) {
        await ctx.db.insert("profile", {
          id: `bulk-user-${i}`,
          firstName: `User${i}`,
          lastName: "Test",
          occupation: "None",
        });
        await ctx.db.insert("daily_register", {
          userId: `bulk-user-${i}`,
          timestamp: new Date().toISOString(),
          admitted_by: "admin-1",
          device: {
            name: "Chrome",
            visitorId: `bulk-v${i}`,
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
    });

    expect(result).toHaveLength(50);
  });

  it("returns top customers within a one-week range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "week-user",
        firstName: "Week",
        lastName: "User",
        occupation: "None",
      });

      for (let i = 0; i < 4; i++) {
        const d = subDays(new Date(), i);
        await ctx.db.insert("daily_register", {
          userId: "week-user",
          timestamp: d.toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `wv${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }

      // old visit outside range
      await ctx.db.insert("daily_register", {
        userId: "week-user",
        timestamp: subDays(new Date(), 20).toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "wv-old", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const result = await t.query(api.customers.getTopCustomers, {
      start: daysAgoStr(7),
      end: todayStr(),
    });

    expect(result).toHaveLength(1);
    expect(result[0].visits).toBe(4);
  });

  it("returns top customers within a six-month range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "long-user",
        firstName: "Long",
        lastName: "User",
        occupation: "None",
      });

      for (let i = 0; i < 6; i++) {
        const d = subDays(new Date(), i * 30);
        await ctx.db.insert("daily_register", {
          userId: "long-user",
          timestamp: d.toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `sv${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }

      // outside range
      await ctx.db.insert("daily_register", {
        userId: "long-user",
        timestamp: subDays(new Date(), 200).toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "sv-old", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const result = await t.query(api.customers.getTopCustomers, {
      start: daysAgoStr(180),
      end: todayStr(),
    });

    expect(result).toHaveLength(1);
    expect(result[0].visits).toBe(6);
  });

  it("excludes customers with no visits in range", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "active-user",
        firstName: "Active",
        lastName: "User",
        occupation: "None",
      });
      await ctx.db.insert("profile", {
        id: "inactive-user",
        firstName: "Inactive",
        lastName: "User",
        occupation: "None",
      });

      await ctx.db.insert("daily_register", {
        userId: "active-user",
        timestamp: new Date().toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "av", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const result = await t.query(api.customers.getTopCustomers, {
      start: daysAgoStr(7),
      end: todayStr(),
    });

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("active-user");
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

// ---------------------------------------------------------------------------
// computeMetrics — integration tests
// ---------------------------------------------------------------------------

describe("computeMetrics", () => {
  it("produces all 6 metric kinds for a day with visits", async () => {
    const t = convexTest(schema, modules);
    registerAggregate(t);

    const targetDate = daysAgoStr(1);

    // Create 3 profiles via production mutation (maintains aggregate)
    await createProfile(t, "u1", "Alice");
    await createProfile(t, "u2", "Bob");
    await createProfile(t, "u3", "Carol");

    // Seed check-in data: u1 visited twice, u2 once
    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "u1",
        timestamp: daysAgo(1),
        source: "web",
        device: { browser: "Chrome", name: "Test", visitorId: "v1" },
        access: { kind: "free" },
        admitted_by: "admin",
      });
      await ctx.db.insert("daily_register", {
        userId: "u1",
        timestamp: daysAgo(1),
        source: "web",
        device: { browser: "Chrome", name: "Test", visitorId: "v1b" },
        access: { kind: "free" },
        admitted_by: "admin",
      });
      await ctx.db.insert("daily_register", {
        userId: "u2",
        timestamp: daysAgo(1),
        source: "web",
        device: { browser: "Chrome", name: "Test", visitorId: "v2" },
        access: { kind: "free" },
        admitted_by: "admin",
      });

      // Run the aggregation
      await ctx.runMutation(internal.customers.computeMetrics, {
        day: targetDate,
      });
    });

    // Verify app_metrics rows
    const metrics = await t.run(async (ctx) => {
      return await ctx.db
        .query("app_metrics")
        .withIndex("by_date_category_kind", (q) =>
          q.eq("date", targetDate).eq("category", "customer"),
        )
        .collect();
    });

    expect(metrics).toHaveLength(6);

    const byKind = Object.fromEntries(metrics.map((m) => [m.kind, m.value]));

    expect(byKind.totalCustomers).toBe(3);
    expect(byKind.newCustomers).toBe(3); // all created within this month
    expect(byKind.activeCustomers).toBe(3); // all created within 30 days
    expect(byKind.repeatCustomerRate).toBe(50); // 1 of 2 visitors visited >=2 times
    expect(byKind.avgVisitsPerCustomer).toBe(1.5); // 3 visits / 2 unique visitors
    expect(byKind.lapsedCustomers).toBe(0); // 3 total - 3 active = 0
  });

  it("returns all zeros when no profiles or visits exist", async () => {
    const t = convexTest(schema, modules);
    registerAggregate(t);

    const targetDate = daysAgoStr(1);

    await t.run(async (ctx) => {
      await ctx.runMutation(internal.customers.computeMetrics, {
        day: targetDate,
      });
    });

    const metrics = await t.run(async (ctx) => {
      return await ctx.db
        .query("app_metrics")
        .withIndex("by_date_category_kind", (q) =>
          q.eq("date", targetDate).eq("category", "customer"),
        )
        .collect();
    });

    expect(metrics).toHaveLength(6);
    const byKind = Object.fromEntries(metrics.map((m) => [m.kind, m.value]));
    expect(byKind.totalCustomers).toBe(0);
    expect(byKind.repeatCustomerRate).toBe(0);
    expect(byKind.avgVisitsPerCustomer).toBe(0);
    expect(byKind.lapsedCustomers).toBe(0);
  });

  it("computes repeatCustomerRate correctly with mixed visit patterns", async () => {
    const t = convexTest(schema, modules);
    registerAggregate(t);

    const targetDate = daysAgoStr(1);

    // 4 profiles via production mutations
    await createProfile(t, "a", "Alice");
    await createProfile(t, "b", "Bob");
    await createProfile(t, "c", "Carol");
    await createProfile(t, "d", "Dave");

    // a: 3 visits, b: 2 visits, c: 1 visit, d: 0 visits
    await t.run(async (ctx) => {
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("daily_register", {
          userId: "a",
          timestamp: daysAgo(1),
          source: "web",
          device: { browser: "Chrome", name: "Test", visitorId: `a${i}` },
          access: { kind: "free" },
          admitted_by: "admin",
        });
      }
      for (let i = 0; i < 2; i++) {
        await ctx.db.insert("daily_register", {
          userId: "b",
          timestamp: daysAgo(1),
          source: "web",
          device: { browser: "Chrome", name: "Test", visitorId: `b${i}` },
          access: { kind: "free" },
          admitted_by: "admin",
        });
      }
      await ctx.db.insert("daily_register", {
        userId: "c",
        timestamp: daysAgo(1),
        source: "web",
        device: { browser: "Chrome", name: "Test", visitorId: "c0" },
        access: { kind: "free" },
        admitted_by: "admin",
      });

      await ctx.runMutation(internal.customers.computeMetrics, {
        day: targetDate,
      });
    });

    const metrics = await t.run(async (ctx) => {
      return await ctx.db
        .query("app_metrics")
        .withIndex("by_date_category_kind", (q) =>
          q.eq("date", targetDate).eq("category", "customer"),
        )
        .collect();
    });

    const byKind = Object.fromEntries(metrics.map((m) => [m.kind, m.value]));
    // 4 total profiles, 3 visitors (a,b,c), 2 repeat visitors (a,b) => 2/3 = 67%
    expect(byKind.repeatCustomerRate).toBe(67);
    // 6 total visits / 3 visitors = 2.0
    expect(byKind.avgVisitsPerCustomer).toBe(2);
    // All profiles created during test are within 30d, so lapsed = 0
    expect(byKind.lapsedCustomers).toBe(0);
  });

  it("upserts on re-run (no duplicate rows)", async () => {
    const t = convexTest(schema, modules);
    registerAggregate(t);

    const targetDate = daysAgoStr(1);

    await createProfile(t, "only-user", "Only");

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "only-user",
        timestamp: daysAgo(1),
        source: "web",
        device: { browser: "Chrome", name: "Test", visitorId: "only" },
        access: { kind: "free" },
        admitted_by: "admin",
      });
    });

    // Run twice
    for (let run = 0; run < 2; run++) {
      await t.run(async (ctx) => {
        await ctx.runMutation(internal.customers.computeMetrics, {
          day: targetDate,
        });
      });
    }

    const metrics = await t.run(async (ctx) => {
      return await ctx.db
        .query("app_metrics")
        .withIndex("by_date_category_kind", (q) =>
          q.eq("date", targetDate).eq("category", "customer"),
        )
        .collect();
    });

    // Should still be exactly 6 rows (upserted, not duplicated)
    expect(metrics).toHaveLength(6);
    const byKind = Object.fromEntries(metrics.map((m) => [m.kind, m.value]));
    expect(byKind.totalCustomers).toBe(1);
  });
});

 
/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import aggregateTest from "@convex-dev/aggregate/test";
import { convexTest } from "convex-test";
import { format, subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("auth.getCurrentUser", () => {
  it("returns null when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.auth.getCurrentUser, {});
    expect(result).toBeNull();
  });

  it("returns profile when authenticated", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "user-123",
        firstName: "Test",
        lastName: "User",
        email: "test@test.com",
        occupation: "None",
      });
    });

    const authed = t.withIdentity({ subject: "user-123" });
    const result = await authed.runQuery(api.auth.getCurrentUser, {});
    expect(result).not.toBeNull();
    expect(result!.firstName).toBe("Test");
  });
});

describe("auth.createOrUpdateProfile", () => {
  it("creates a new profile", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    const authed = t.withIdentity({
      subject: "new-user",
      profile_id: "new-user",
    });

    const profileId = await authed.runMutation(api.auth.createOrUpdateProfile, {
      firstName: "New",
      lastName: "User",
      email: "new@test.com",
      occupation: "None",
    });

    const profile = await t.run(async (ctx) => {
      return await ctx.db.get(profileId);
    });

    expect(profile).not.toBeNull();
    expect(profile!.firstName).toBe("New");
    expect(profile!.email).toBe("new@test.com");
  });

  it("updates existing profile", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "existing-user",
        firstName: "Old",
        lastName: "Name",
        email: "old@test.com",
        occupation: "None",
      });
    });

    const authed = t.withIdentity({
      subject: "existing-user",
      profile_id: "existing-user",
    });

    const profileId = await authed.runMutation(api.auth.createOrUpdateProfile, {
      firstName: "Updated",
      lastName: "Name",
      email: "updated@test.com",
    });

    const profile = await t.run(async (ctx) => {
      return await ctx.db.get(profileId);
    });

    expect(profile!.firstName).toBe("Updated");
    expect(profile!.email).toBe("updated@test.com");
  });
});

describe("myFunctions.createUser", () => {
  it("creates new user and profile", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    const userId = await t.mutation(api.myFunctions.createUser, {
      email: "brand-new@test.com",
      firstName: "Brand",
      lastName: "New",
    });

    const user = await t.run(async (ctx) => {
      return await ctx.db.get(userId);
    });

    expect(user).not.toBeNull();
    expect(user!.email).toBe("brand-new@test.com");

    const profile = await t.run(async (ctx) => {
      const all = await ctx.db.query("profile").collect();
      return all.find((p) => p.id === userId);
    });

    expect(profile).not.toBeNull();
    expect(profile!.firstName).toBe("Brand");
  });

  it("returns existing user id if email already exists", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    const firstId = await t.mutation(api.myFunctions.createUser, {
      email: "dup@test.com",
      firstName: "First",
      lastName: "User",
    });

    const secondId = await t.mutation(api.myFunctions.createUser, {
      email: "dup@test.com",
      firstName: "Second",
      lastName: "User",
    });

    expect(firstId).toBe(secondId);
  });

  it("links to existing profile with matching email", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "orphan-profile",
        firstName: "Orphan",
        lastName: "Profile",
        email: "link@test.com",
        occupation: "None",
      });
    });

    const userId = await t.mutation(api.myFunctions.createUser, {
      email: "link@test.com",
      firstName: "Linked",
      lastName: "User",
    });

    const profile = await t.run(async (ctx) => {
      const all = await ctx.db.query("profile").collect();
      return all.find((p) => p.email === "link@test.com");
    });

    expect(profile!.id).toBe(userId);
  });
});

describe("myFunctions.getUserById", () => {
  it("returns null for non-existent user", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.myFunctions.getUserById, {
      userId: "nonexistent",
    });
    expect(result).toBeNull();
  });

  it("returns user with occupation name", async () => {
    const t = convexTest(schema, modules);

    const occId = await t.run(async (ctx) => {
      return await ctx.db.insert("occupations", {
        name: "Developer",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "user-with-occ",
        firstName: "Dev",
        lastName: "User",
        email: "dev@test.com",
        occupation: occId,
      });
    });

    const result = await t.query(api.myFunctions.getUserById, {
      userId: "user-with-occ",
    });

    expect(result).not.toBeNull();
    expect(result!.occupation).toBe("Developer");
  });

  it("returns 'None' for user without occupation", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "user-no-occ",
        firstName: "No",
        lastName: "Occ",
        email: "noocc@test.com",
        occupation: "None",
      });
    });

    const result = await t.query(api.myFunctions.getUserById, {
      userId: "user-no-occ",
    });

    expect(result!.occupation).toBe("None");
  });
});

describe("myFunctions.getUserActiveReservation", () => {
  it("returns null when no confirmed booking", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.myFunctions.getUserActiveReservation, {
      userId: "user-no-booking",
    });
    expect(result).toBeNull();
  });

  it("returns booking when confirmed and today is within range", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();
    const start = format(subDays(now, 1), "yyyy-MM-dd");
    const end = format(new Date(now.getTime() + 86400000), "yyyy-MM-dd");

    await t.run(async (ctx) => {
      await ctx.db.insert("bookings", {
        userId: "user-with-booking",
        seatIds: [],
        startDate: start,
        endDate: end,
        duration: 2,
        durationType: "week",
        pricePerSeat: 5000,
        amount: 5000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(api.myFunctions.getUserActiveReservation, {
      userId: "user-with-booking",
    });

    expect(result).not.toBeNull();
    expect(result?.durationType).toBe("week");
  });

  it("returns null for past booking", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("bookings", {
        userId: "user-past-booking",
        seatIds: [],
        startDate: "2020-01-01",
        endDate: "2020-01-01",
        duration: 1,
        durationType: "day",
        pricePerSeat: 5000,
        amount: 5000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(api.myFunctions.getUserActiveReservation, {
      userId: "user-past-booking",
    });

    expect(result).toBeNull();
  });
});

describe("myFunctions.countAttendance", () => {
  it("returns 0 when no registers in range", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.myFunctions.countAttendance, {
      start: new Date(2020, 0, 1).toISOString(),
      end: new Date(2020, 0, 2).toISOString(),
    });
    expect(result).toBe(0);
  });

  it("counts registers in range", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();

    await t.run(async (ctx) => {
      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("daily_register", {
          userId: `user-${i}`,
          timestamp: now.toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `v${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }
    });

    const start = new Date(now.getTime() - 60000).toISOString();
    const end = new Date(now.getTime() + 60000).toISOString();

    const result = await t.query(api.myFunctions.countAttendance, {
      start,
      end,
    });

    expect(result).toBe(3);
  });

  it("counts registers across a one-week range", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();

    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        await ctx.db.insert("daily_register", {
          userId: `user-${i}`,
          timestamp: d.toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `wv${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }
    });

    const start = new Date(now.getTime() - 7 * 86400000).toISOString();
    const result = await t.query(api.myFunctions.countAttendance, {
      start,
      end: now.toISOString(),
    });

    expect(result).toBe(5);
  });

  it("counts registers across a one-month range", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();

    await t.run(async (ctx) => {
      for (let i = 0; i < 10; i++) {
        const d = new Date(now.getTime() - i * 3 * 86400000);
        await ctx.db.insert("daily_register", {
          userId: `user-${i}`,
          timestamp: d.toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `mv${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }
    });

    const start = new Date(now.getTime() - 30 * 86400000).toISOString();
    const result = await t.query(api.myFunctions.countAttendance, {
      start,
      end: now.toISOString(),
    });

    expect(result).toBe(10);
  });

  it("counts registers across a six-month range", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();

    await t.run(async (ctx) => {
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getTime() - i * 30 * 86400000);
        await ctx.db.insert("daily_register", {
          userId: `user-${i}`,
          timestamp: d.toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `sv${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }
    });

    const start = new Date(now.getTime() - 180 * 86400000).toISOString();
    const result = await t.query(api.myFunctions.countAttendance, {
      start,
      end: now.toISOString(),
    });

    expect(result).toBe(6);
  });

  it("excludes registers outside a six-month range", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-old",
        timestamp: new Date(now.getTime() - 200 * 86400000).toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "old", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
      await ctx.db.insert("daily_register", {
        userId: "user-in",
        timestamp: new Date(now.getTime() - 30 * 86400000).toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "in", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const start = new Date(now.getTime() - 180 * 86400000).toISOString();
    const result = await t.query(api.myFunctions.countAttendance, {
      start,
      end: now.toISOString(),
    });

    expect(result).toBe(1);
  });
});

describe("myFunctions.getAttendanceByMonth", () => {
  it("returns empty array when userId is not provided", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.myFunctions.getAttendanceByMonth, {
      start: new Date(2024, 0, 1).toISOString(),
      end: new Date(2024, 0, 31).toISOString(),
    });
    expect(result).toEqual([]);
  });

  it("returns registers for a specific user within a week range", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();

    await t.run(async (ctx) => {
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        await ctx.db.insert("daily_register", {
          userId: "target-user",
          timestamp: d.toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `tv${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }
      // different user
      await ctx.db.insert("daily_register", {
        userId: "other-user",
        timestamp: now.toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "other", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const start = new Date(now.getTime() - 7 * 86400000).toISOString();
    const result = await t.query(api.myFunctions.getAttendanceByMonth, {
      userId: "target-user",
      start,
      end: now.toISOString(),
    });

    expect(result).toHaveLength(3);
    expect(result.every((r) => r.userId === "target-user")).toBe(true);
  });

  it("returns registers for a specific user within a month range", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();

    await t.run(async (ctx) => {
      for (let i = 0; i < 8; i++) {
        const d = new Date(now.getTime() - i * 3 * 86400000);
        await ctx.db.insert("daily_register", {
          userId: "monthly-user",
          timestamp: d.toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `mmv${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }
    });

    const start = new Date(now.getTime() - 30 * 86400000).toISOString();
    const result = await t.query(api.myFunctions.getAttendanceByMonth, {
      userId: "monthly-user",
      start,
      end: now.toISOString(),
    });

    expect(result).toHaveLength(8);
  });

  it("returns registers for a specific user within a six-month range", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();

    await t.run(async (ctx) => {
      for (let i = 0; i < 6; i++) {
        const d = new Date(now.getTime() - i * 30 * 86400000);
        await ctx.db.insert("daily_register", {
          userId: "half-year-user",
          timestamp: d.toISOString(),
          admitted_by: "admin-1",
          device: { name: "Chrome", visitorId: `smv${i}`, browser: "Chrome" },
          access: { kind: "free" },
          method: "one-tap",
          source: "web",
        });
      }
    });

    const start = new Date(now.getTime() - 180 * 86400000).toISOString();
    const result = await t.query(api.myFunctions.getAttendanceByMonth, {
      userId: "half-year-user",
      start,
      end: now.toISOString(),
    });

    expect(result).toHaveLength(6);
  });

  it("excludes registers outside the range for a specific user", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "range-user",
        timestamp: new Date(now.getTime() - 200 * 86400000).toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "old", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
      await ctx.db.insert("daily_register", {
        userId: "range-user",
        timestamp: new Date(now.getTime() - 10 * 86400000).toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "recent", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const start = new Date(now.getTime() - 180 * 86400000).toISOString();
    const result = await t.query(api.myFunctions.getAttendanceByMonth, {
      userId: "range-user",
      start,
      end: now.toISOString(),
    });

    expect(result).toHaveLength(1);
  });
});

describe("myFunctions.isRegisteredForToday", () => {
  it("returns false when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.myFunctions.isRegisteredForToday, {});
    expect(result).toBe(false);
  });

  it("returns false when not registered today", async () => {
    const t = convexTest(schema, modules);
    const authed = t.withIdentity({ profile_id: "user-not-registered" });
    const result = await authed.runQuery(
      api.myFunctions.isRegisteredForToday,
      {},
    );
    expect(result).toBe(false);
  });
});

describe("myFunctions.isRegisteredForToday (with userId)", () => {
  it("returns true when registered today", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-registered-today",
        timestamp: new Date().toISOString(),
        admitted_by: "admin-1",
        device: { name: "Chrome", visitorId: "v-reg", browser: "Chrome" },
        access: { kind: "free" },
        method: "one-tap",
        source: "web",
      });
    });

    const result = await t.query(api.myFunctions.isUserRegisteredForToday, {
      userId: "user-registered-today",
    });
    expect(result).toBe(true);
  });

  it("returns false when not registered today", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.myFunctions.isUserRegisteredForToday, {
      userId: "user-not-registered",
    });
    expect(result).toBe(false);
  });
});

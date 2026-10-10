import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const browsers = ["Chrome", "Firefox", "Safari", "Edge"] as const;
const operatingSystems = [
  "Macintosh",
  "Windows",
  "Linux",
  "iPhone",
  "Android",
] as const;

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTimeOnDay(daysAgo: number): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysAgo);
  return new Date(
    start.getTime() + Math.floor(Math.random() * 24 * 60 * 60 * 1000),
  ).toISOString();
}

function randomDevice() {
  return {
    browser: randomElement(browsers),
    name: randomElement(operatingSystems),
    visitorId: crypto.randomUUID(),
  };
}

function randomAccess() {
  const isFree = Math.random() < 0.7;
  if (isFree) {
    return { kind: "free" as const };
  }
  return { kind: "paid" as const, planId: "daily", amount: 1500 };
}

export const seedScanRecords = internalMutation({
  args: {
    count: v.number(),
    daysBack: v.number(),
  },
  handler: async (ctx, args) => {
    const profiles = await ctx.db.query("profile").collect();

    if (profiles.length === 0) {
      throw new Error(
        "No profiles exist. Please create at least one profile first.",
      );
    }

    const daysBack = args.daysBack ?? 1;

    // Only admins admit: the first profile whose ACL identity holds the
    // admin-only privilege. Identity strings are profile userIds.
    let admittedBy: string | null = null;
    for (const p of profiles) {
      const check = await ctx.runQuery(
        components.wigxel_acl.identities.hasPrivilege,
        { identity: p.id, privilege: "user:assign:role" },
      );
      if (check.valid) {
        admittedBy = p.id;
        break;
      }
    }
    if (!admittedBy) {
      throw new Error(
        "No admin identity exists. Register an admin via the ACL settings first.",
      );
    }

    // Staff don't scan: rows deal round-robin over non-admin profiles, one
    // row per (user, day) — the shape `updateTodaysRegisterAccess` assumes
    // when it looks up a user by (userId, today).
    const eligible = profiles.filter((p) => p.role !== "admin");
    if (eligible.length === 0) {
      throw new Error("No customer profiles to seed. All profiles are admins.");
    }
    const days = Math.max(1, Math.floor(daysBack));
    if (args.count > eligible.length * days) {
      throw new Error(
        `Cannot seed ${args.count} unique (user, day) rows for ${eligible.length} customers over ${days} day(s). Widen daysBack or add profiles.`,
      );
    }

    const records = [];
    for (let i = 0; i < args.count; i++) {
      const userIdx = i % eligible.length;
      const dayOffset = (Math.floor(i / eligible.length) + userIdx) % days;
      const recordId = await ctx.db.insert("daily_register", {
        userId: eligible[userIdx].id,
        timestamp: randomTimeOnDay(dayOffset),
        source: "web",
        device: randomDevice(),
        access: randomAccess(),
        admitted_by: admittedBy,
      });
      records.push(recordId);
    }

    return { seeded: records.length };
  },
});

export const seedCashPayments = internalMutation({
  args: {
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const count = args.count ?? 8;
    const records = [];

    for (let i = 0; i < count; i++) {
      const day = 10 + i;
      const recordId = await ctx.db.insert("daily_register", {
        userId: `test-cash-user-${i}`,
        timestamp: new Date(2026, 7, day, 10 + i, 0, 0).toISOString(),
        source: "web",
        device: {
          browser: "Chrome",
          name: "Macintosh",
          visitorId: `test-cash-vis-${i}`,
        },
        access: {
          kind: "paid",
          planId: i % 3 === 0 ? "weekly" : "daily",
          amountInKobo: i % 3 === 0 ? 12000 : 5000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "test-cash-staff",
      });
      records.push(recordId);
    }

    return { seeded: records.length };
  },
});

export const cleanupTestCashPayments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("daily_register").collect();
    const testRecords = all.filter(
      (r) => typeof r.userId === "string" && r.userId.startsWith("test-cash-"),
    );
    for (const r of testRecords) {
      await ctx.db.delete(r._id);
    }
    return { deleted: testRecords.length };
  },
});

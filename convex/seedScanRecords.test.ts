/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { components, internal } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

const ADMIN_ID = "admin-1";

async function setup(
  t: ReturnType<typeof convexTest>,
  opts: { customers?: number; withAdminIdentity?: boolean } = {},
) {
  const { customers = 3, withAdminIdentity = true } = opts;
  t.registerComponent("wigxel_acl", aclSchema, aclModules);

  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    if (withAdminIdentity) {
      await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
        identity: ADMIN_ID,
      });
    }
    await ctx.db.insert("profile", {
      id: ADMIN_ID,
      firstName: "Ad",
      lastName: "Min",
      occupation: "None",
      role: "admin",
    });
    for (let i = 0; i < customers; i++) {
      await ctx.db.insert("profile", {
        id: `user-${i}`,
        firstName: "U",
        lastName: `${i}`,
        occupation: "None",
        role: "user",
      });
    }
  });
}

async function seededRows(t: ReturnType<typeof convexTest>) {
  return t.run(async (ctx) => ctx.db.query("daily_register").collect());
}

function rowsFor(rows: Awaited<ReturnType<typeof seededRows>>, userId: string) {
  return rows.filter((r) => r.userId === userId);
}

describe("seedScanRecords", () => {
  it("throws when no profiles exist", async () => {
    const t = convexTest(schema, modules);
    t.registerComponent("wigxel_acl", aclSchema, aclModules);
    await t.run(async (ctx) => {
      await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    });

    await expect(
      t.mutation(internal.seedScanRecords.seedScanRecords, {
        count: 2,
        daysBack: 7,
      }),
    ).rejects.toThrow("No profiles exist");
  });

  it("throws when no admin identity holds the privilege", async () => {
    const t = convexTest(schema, modules);
    await setup(t, { withAdminIdentity: false });

    await expect(
      t.mutation(internal.seedScanRecords.seedScanRecords, {
        count: 2,
        daysBack: 7,
      }),
    ).rejects.toThrow("No admin identity exists");
  });

  it("deals rows round-robin across customers", async () => {
    const t = convexTest(schema, modules);
    await setup(t, { customers: 3 });

    const { seeded } = await t.mutation(
      internal.seedScanRecords.seedScanRecords,
      { count: 4, daysBack: 7 },
    );
    expect(seeded).toBe(4);

    const rows = await seededRows(t);
    expect(rowsFor(rows, "user-0")).toHaveLength(2);
    expect(rowsFor(rows, "user-1")).toHaveLength(1);
    expect(rowsFor(rows, "user-2")).toHaveLength(1);
  });

  it("gives zero rows to admin profiles", async () => {
    const t = convexTest(schema, modules);
    await setup(t, { customers: 3 });

    await t.mutation(internal.seedScanRecords.seedScanRecords, {
      count: 6,
      daysBack: 7,
    });

    const rows = await seededRows(t);
    expect(rowsFor(rows, ADMIN_ID)).toHaveLength(0);
    expect(rowsFor(rows, "user-0")).toHaveLength(2);
    expect(rowsFor(rows, "user-1")).toHaveLength(2);
    expect(rowsFor(rows, "user-2")).toHaveLength(2);
  });

  it("stamps every row with the admin as admitted_by", async () => {
    const t = convexTest(schema, modules);
    await setup(t, { customers: 2 });

    await t.mutation(internal.seedScanRecords.seedScanRecords, {
      count: 3,
      daysBack: 7,
    });

    const rows = await seededRows(t);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.admitted_by).toBe(ADMIN_ID);
    }
  });

  it("never repeats a (user, day) pair", async () => {
    const t = convexTest(schema, modules);
    await setup(t, { customers: 3 });

    // Full grid: 3 customers x 5 days = 15 unique pairs.
    await t.mutation(internal.seedScanRecords.seedScanRecords, {
      count: 15,
      daysBack: 5,
    });

    const rows = await seededRows(t);
    const keys = rows.map(
      (r) => `${r.userId}|${new Date(r.timestamp).toDateString()}`,
    );
    expect(new Set(keys).size).toBe(15);
  });

  it("throws when count exceeds customers x daysBack", async () => {
    const t = convexTest(schema, modules);
    await setup(t, { customers: 2 });

    await expect(
      t.mutation(internal.seedScanRecords.seedScanRecords, {
        count: 3,
        daysBack: 1,
      }),
    ).rejects.toThrow("Cannot seed");
  });

  it("lands every row today when daysBack is 1", async () => {
    const t = convexTest(schema, modules);
    await setup(t, { customers: 2 });

    await t.mutation(internal.seedScanRecords.seedScanRecords, {
      count: 2,
      daysBack: 1,
    });

    const rows = await seededRows(t);
    const today = new Date().toDateString();
    for (const row of rows) {
      expect(new Date(row.timestamp).toDateString()).toBe(today);
    }
  });
});

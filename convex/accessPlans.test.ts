/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api, components } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

type Tester = ReturnType<typeof convexTest>;

function withAcl(t: Tester) {
  t.registerComponent("wigxel_acl", aclSchema, aclModules);
  return t;
}

/** Fresh app with the ACL component seeded; `makeSuperAdmin` grants plans:manage. */
async function seedAcl(t: Tester, grantAdmin: boolean) {
  withAcl(t);
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    await ctx.runMutation(components.wigxel_acl.seed.seedPermissions, {});
    if (grantAdmin) {
      await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
        identity: "admin-user",
      });
    }
  });
}

async function seedAdmin(t: Tester) {
  await seedAcl(t, true);
  return t.withIdentity({ profile_id: "admin-user" });
}

/** Run a mutation under fake timers so its scheduled audit write can be drained. */
async function withScheduled<T>(t: Tester, fn: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  try {
    const result = await fn();
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    return result;
  } finally {
    vi.useRealTimers();
  }
}

describe("getByKey", () => {
  it("returns null when plan does not exist", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const result = await ctx.runQuery(api.accessPlans.getByKey, {
        planKey: "nonexistent",
      });
      expect(result).toBeNull();
    });
  });

  it("returns plan when it exists", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "Daily access pass",
        features: [],
      });

      const result = await ctx.runQuery(api.accessPlans.getByKey, {
        planKey: "daily",
      });

      expect(result).not.toBeNull();
      expect(result).toMatchObject(
        expect.objectContaining({
          key: "daily",
          name: "Daily",
          price: 1500,
          no_of_days: 1,
        }),
      );
    });
  });
});

describe("list", () => {
  it("returns empty array when no plans exist", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const result = await ctx.runQuery(api.accessPlans.list);
      expect(result).toEqual([]);
    });
  });

  it("returns all plans", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "Daily pass",
        features: [],
      });
      await ctx.db.insert("accessPlans", {
        key: "weekly",
        name: "Weekly",
        price: 6000,
        no_of_days: 7,
        description: "Weekly pass",
        features: [],
      });

      const result = await ctx.runQuery(api.accessPlans.list);
      expect(result).toHaveLength(2);
    });
  });
});

describe("add", () => {
  it("creates a new plan", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const planId = await authed.mutation(api.accessPlans.add, {
      key: "daily",
      name: "Daily",
      price: 1500,
      no_of_days: 1,
      description: "Daily access pass",
      features: ["priority-check-in"],
    });

    const plan = await t.run(async (ctx) => ctx.db.get(planId));
    expect(plan).not.toBeNull();
    expect(plan?.key).toBe("daily");
    expect(plan?.name).toBe("Daily");
    expect(plan?.price).toBe(1500);
    expect(plan?.no_of_days).toBe(1);
    expect(plan?.features).toEqual(["priority-check-in"]);
  });

  it("throws when duplicate key exists", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "Daily pass",
        features: [],
      });
    });

    await expect(
      authed.mutation(api.accessPlans.add, {
        key: "daily",
        name: "Daily Duplicate",
        price: 2000,
        no_of_days: 1,
      }),
    ).rejects.toThrow('Plan with key "daily" already exists');
  });

  it("uses defaults for optional fields", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const planId = await authed.mutation(api.accessPlans.add, {
      key: "test",
      name: "Test",
      price: 100,
      no_of_days: 1,
    });

    const plan = await t.run(async (ctx) => ctx.db.get(planId));
    expect(plan?.description).toBe("");
    expect(plan?.features).toEqual([]);
  });

  it("rejects anonymous callers", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);

    await expect(
      t.mutation(api.accessPlans.add, {
        key: "free",
        name: "Free",
        price: 0,
        no_of_days: 1,
      }),
    ).rejects.toThrow("Authentication required");
  });

  it("rejects authenticated callers without plans:manage", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, false);
    const nobody = t.withIdentity({ profile_id: "nobody" });

    await expect(
      nobody.mutation(api.accessPlans.add, {
        key: "free",
        name: "Free",
        price: 0,
        no_of_days: 1,
      }),
    ).rejects.toThrow('Access denied. Required privilege: "plans:manage"');

    const plans = await t.run(async (ctx) =>
      ctx.db.query("accessPlans").collect(),
    );
    expect(plans).toHaveLength(0);
  });

  it("rejects negative prices and non-positive durations", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    await expect(
      authed.mutation(api.accessPlans.add, {
        key: "negative",
        name: "Negative",
        price: -1,
        no_of_days: 1,
      }),
    ).rejects.toThrow("Plan price cannot be negative");

    await expect(
      authed.mutation(api.accessPlans.add, {
        key: "zero-days",
        name: "Zero Days",
        price: 100,
        no_of_days: 0,
      }),
    ).rejects.toThrow("Plan duration must be at least 1 day");
  });

  it("writes a plan.created audit row", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const planId = await withScheduled(t, () =>
      authed.mutation(api.accessPlans.add, {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
      }),
    );

    const logs = await t.run(async (ctx) => ctx.db.query("auditLog").collect());
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "plan.created",
      actorId: "admin-user",
      targetId: planId,
      targetType: "accessPlan",
    });
  });
});

describe("update", () => {
  it("updates an existing plan", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const planId = await t.run(async (ctx) =>
      ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "Old description",
        features: [],
      }),
    );

    const updatedId = await authed.mutation(api.accessPlans.update, {
      id: planId,
      name: "Daily Updated",
      price: 2000,
      no_of_days: 2,
      description: "New description",
      features: ["priority-check-in"],
    });

    expect(updatedId).toBe(planId);

    const plan = await t.run(async (ctx) => ctx.db.get(planId));
    expect(plan?.name).toBe("Daily Updated");
    expect(plan?.price).toBe(2000);
    expect(plan?.no_of_days).toBe(2);
    expect(plan?.description).toBe("New description");
    expect(plan?.features).toEqual(["priority-check-in"]);
  });

  it("throws when plan not found", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const fakeId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("accessPlans", {
        key: "temp",
        name: "Temp",
        price: 0,
        no_of_days: 1,
        description: "",
        features: [],
      });
      await ctx.db.delete(id);
      return id;
    });

    await expect(
      authed.mutation(api.accessPlans.update, {
        id: fakeId,
        name: "Updated",
        price: 100,
        no_of_days: 1,
      }),
    ).rejects.toThrow("Plan not found");
  });

  it("rejects anonymous callers", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);

    const planId = await t.run(async (ctx) =>
      ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "",
        features: [],
      }),
    );

    await expect(
      t.mutation(api.accessPlans.update, {
        id: planId,
        name: "Free",
        price: 0,
        no_of_days: 1,
      }),
    ).rejects.toThrow("Authentication required");
  });

  it("leaves the plan untouched for callers without plans:manage", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, false);
    const nobody = t.withIdentity({ profile_id: "nobody" });

    const planId = await t.run(async (ctx) =>
      ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "",
        features: [],
      }),
    );

    await expect(
      nobody.mutation(api.accessPlans.update, {
        id: planId,
        name: "Hijacked",
        price: 0,
        no_of_days: 1,
      }),
    ).rejects.toThrow('Access denied. Required privilege: "plans:manage"');

    const plan = await t.run(async (ctx) => ctx.db.get(planId));
    expect(plan?.name).toBe("Daily");
    expect(plan?.price).toBe(1500);
  });

  it("rejects negative prices for privileged callers", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const planId = await t.run(async (ctx) =>
      ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "",
        features: [],
      }),
    );

    await expect(
      authed.mutation(api.accessPlans.update, {
        id: planId,
        name: "Daily",
        price: -1,
        no_of_days: 1,
      }),
    ).rejects.toThrow("Plan price cannot be negative");
  });

  it("writes one plan.updated audit row that records the previous price", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const planId = await t.run(async (ctx) =>
      ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "",
        features: [],
      }),
    );

    await withScheduled(t, () =>
      authed.mutation(api.accessPlans.update, {
        id: planId,
        name: "Daily",
        price: 2000,
        no_of_days: 1,
      }),
    );

    const logs = await t.run(async (ctx) => ctx.db.query("auditLog").collect());
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "plan.updated",
      actorId: "admin-user",
      targetId: planId,
      targetType: "accessPlan",
    });
    expect(logs[0]?.metadata).toContain('"previousPrice":1500');
  });
});

describe("seedAccessPlans", () => {
  it("seeds 7 default plans when none exist", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const result = await ctx.runMutation(api.accessPlans.seedAccessPlans);
      expect(result.seeded).toBe(7);

      const plans = await ctx.db.query("accessPlans").collect();
      expect(plans).toHaveLength(7);

      const keys = plans.map((p) => p.key).sort();
      expect(keys).toEqual([
        "calendar_month",
        "daily",
        "daily_night",
        "monthly",
        "monthly_night",
        "weekly",
        "weekly_night",
      ]);
    });
  });

  it("skips plans whose key already exists", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily Custom",
        price: 999,
        no_of_days: 1,
        description: "custom",
        features: [],
      });

      const result = await ctx.runMutation(api.accessPlans.seedAccessPlans);
      expect(result.seeded).toBe(6);

      const plans = await ctx.db.query("accessPlans").collect();
      expect(plans).toHaveLength(7);

      const daily = plans.find((p) => p.key === "daily");
      expect(daily?.name).toBe("Daily Custom");
      expect(daily?.price).toBe(999);
    });
  });

  it("seeds all 7 when only non-seed-key plans exist", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("accessPlans", {
        key: "existing",
        name: "Existing",
        price: 100,
        no_of_days: 1,
        description: "",
        features: [],
      });

      const result = await ctx.runMutation(api.accessPlans.seedAccessPlans);
      expect(result.seeded).toBe(7);

      const plans = await ctx.db.query("accessPlans").collect();
      expect(plans).toHaveLength(8);
    });
  });
});

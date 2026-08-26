/* eslint-disable @typescript-eslint/no-explicit-any */
/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

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

    await t.run(async (ctx) => {
      const planId = await ctx.runMutation(api.accessPlans.add, {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "Daily access pass",
        features: ["priority-check-in"],
      });

      const plan = await ctx.db.get(planId);
      expect(plan).not.toBeNull();
      expect(plan?.key).toBe("daily");
      expect(plan?.name).toBe("Daily");
      expect(plan?.price).toBe(1500);
      expect(plan?.no_of_days).toBe(1);
      expect(plan?.features).toEqual(["priority-check-in"]);
    });
  });

  it("throws when duplicate key exists", async () => {
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

      await expect(
        ctx.runMutation(api.accessPlans.add, {
          key: "daily",
          name: "Daily Duplicate",
          price: 2000,
          no_of_days: 1,
        }),
      ).rejects.toThrow('Plan with key "daily" already exists');
    });
  });

  it("uses defaults for optional fields", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const planId = await ctx.runMutation(api.accessPlans.add, {
        key: "test",
        name: "Test",
        price: 100,
        no_of_days: 1,
      });

      const plan = await ctx.db.get(planId);
      expect(plan?.description).toBe("");
      expect(plan?.features).toEqual([]);
    });
  });
});

describe("update", () => {
  it("updates an existing plan", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const planId = await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily",
        price: 1500,
        no_of_days: 1,
        description: "Old description",
        features: [],
      });

      const updatedId = await ctx.runMutation(api.accessPlans.update, {
        id: planId,
        name: "Daily Updated",
        price: 2000,
        no_of_days: 2,
        description: "New description",
        features: ["priority-check-in"],
      });

      expect(updatedId).toBe(planId);

      const plan = await ctx.db.get(planId);
      expect(plan?.name).toBe("Daily Updated");
      expect(plan?.price).toBe(2000);
      expect(plan?.no_of_days).toBe(2);
      expect(plan?.description).toBe("New description");
      expect(plan?.features).toEqual(["priority-check-in"]);
    });
  });

  it("throws when plan not found", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const fakeId = await ctx.db.insert("accessPlans", {
        key: "temp",
        name: "Temp",
        price: 0,
        no_of_days: 1,
        description: "",
        features: [],
      });
      await ctx.db.delete(fakeId);

      await expect(
        ctx.runMutation(api.accessPlans.update, {
          id: fakeId,
          name: "Updated",
          price: 100,
          no_of_days: 1,
        }),
      ).rejects.toThrow("Plan not found");
    });
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

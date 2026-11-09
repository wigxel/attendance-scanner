/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { RESERVABLE_FEATURE } from "../lib/plan-features";
import { api, components, internal } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

type Tester = ReturnType<typeof convexTest>;

async function seedAcl(t: Tester, grantAdmin: boolean) {
  t.registerComponent("wigxel_acl", aclSchema, aclModules);
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

const bookingFeature = {
  name: "booking",
  label: "Reservable on /reserve",
  description: "Customers can book a seat.",
  category: "Booking",
  isActive: true,
};

describe("create", () => {
  it("rejects anonymous callers", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);

    await expect(
      t.mutation(api.planFeatures.create, {
        name: "parking",
        label: "Parking",
        description: "",
        category: "Access",
        isActive: true,
      }),
    ).rejects.toThrow("Authentication required");
  });

  it("rejects callers without plans:manage", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, false);
    const nobody = t.withIdentity({ profile_id: "nobody" });

    await expect(
      nobody.mutation(api.planFeatures.create, {
        name: "parking",
        label: "Parking",
        description: "",
        category: "Access",
        isActive: true,
      }),
    ).rejects.toThrow('Access denied. Required privilege: "plans:manage"');
  });

  it("creates a feature and writes a feature.created audit row", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const id = await withScheduled(t, () =>
      authed.mutation(api.planFeatures.create, {
        name: "parking",
        label: "Parking",
        description: "Free parking",
        category: "Access",
        isActive: true,
      }),
    );

    const feature = await t.run(async (ctx) => ctx.db.get(id));
    expect(feature?.name).toBe("parking");

    const logs = await t.run(async (ctx) => ctx.db.query("auditLog").collect());
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "feature.created",
      targetType: "planFeature",
      targetId: id,
    });
  });

  it("rejects a duplicate name", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    await t.run(async (ctx) => ctx.db.insert("planFeatures", bookingFeature));

    await expect(
      authed.mutation(api.planFeatures.create, {
        name: "booking",
        label: "Another booking",
        description: "",
        category: "Booking",
        isActive: true,
      }),
    ).rejects.toThrow('Feature "booking" already exists');
  });
});

describe("update", () => {
  it("renames a non-protected feature", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const id = await t.run(async (ctx) =>
      ctx.db.insert("planFeatures", {
        ...bookingFeature,
        name: "priority-check-in",
        label: "Priority check-in",
        category: "Access",
      }),
    );

    await withScheduled(t, () =>
      authed.mutation(api.planFeatures.update, {
        id,
        name: "fast-lane",
        label: "Fast lane",
        description: "",
        category: "Access",
        isActive: true,
      }),
    );

    const feature = await t.run(async (ctx) => ctx.db.get(id));
    expect(feature?.name).toBe("fast-lane");
  });

  it("refuses to rename booking", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const id = await t.run(async (ctx) =>
      ctx.db.insert("planFeatures", bookingFeature),
    );

    await expect(
      authed.mutation(api.planFeatures.update, {
        id,
        name: "reservable",
        label: "Reservable",
        description: "",
        category: "Booking",
        isActive: true,
      }),
    ).rejects.toThrow('"booking" is used by the app and cannot be renamed');
  });

  it("refuses to deactivate booking", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const id = await t.run(async (ctx) =>
      ctx.db.insert("planFeatures", bookingFeature),
    );

    await expect(
      authed.mutation(api.planFeatures.update, {
        id,
        name: "booking",
        label: "Reservable",
        description: "",
        category: "Booking",
        isActive: false,
      }),
    ).rejects.toThrow('"booking" is used by the app and cannot be deactivated');
  });
});

describe("remove", () => {
  it("refuses to delete booking", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const id = await t.run(async (ctx) =>
      ctx.db.insert("planFeatures", bookingFeature),
    );

    await expect(
      authed.mutation(api.planFeatures.remove, { id }),
    ).rejects.toThrow('"booking" is used by the app and cannot be deleted');
  });

  it("blocks deletion while plans reference the feature and reports the count", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const { featureId } = await t.run(async (ctx) => {
      const featureId = await ctx.db.insert("planFeatures", {
        ...bookingFeature,
        name: "priority-check-in",
        category: "Access",
      });
      for (const key of ["daily", "weekly"]) {
        await ctx.db.insert("accessPlans", {
          key,
          name: key,
          price: 1000,
          no_of_days: 1,
          description: "",
          features: ["priority-check-in"],
        });
      }
      return { featureId };
    });

    await expect(
      authed.mutation(api.planFeatures.remove, { id: featureId }),
    ).rejects.toThrow("2 plans use this feature — deactivate instead");
  });

  it("deletes an unreferenced feature", async () => {
    const t = convexTest(schema, modules);
    const authed = await seedAdmin(t);

    const id = await t.run(async (ctx) =>
      ctx.db.insert("planFeatures", {
        ...bookingFeature,
        name: "priority-check-in",
        category: "Access",
      }),
    );

    await withScheduled(t, () =>
      authed.mutation(api.planFeatures.remove, { id }),
    );

    const feature = await t.run(async (ctx) => ctx.db.get(id));
    expect(feature).toBeNull();
  });
});

describe("list", () => {
  it("orders by category then name and filters retired features", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("planFeatures", {
        ...bookingFeature,
        name: "zeta",
        category: "Access",
      });
      await ctx.db.insert("planFeatures", {
        ...bookingFeature,
        name: "alpha",
        category: "Access",
      });
      await ctx.db.insert("planFeatures", {
        ...bookingFeature,
        name: "retired",
        category: "Access",
        isActive: false,
      });
      await ctx.db.insert("planFeatures", bookingFeature);
    });

    const all = await t.run(async (ctx) => ctx.runQuery(api.planFeatures.list));
    expect(all.map((feature) => feature.name)).toEqual([
      "alpha",
      "retired",
      "zeta",
      "booking",
    ]);

    const active = await t.run(async (ctx) =>
      ctx.runQuery(api.planFeatures.listActive),
    );
    expect(active.map((feature) => feature.name)).toEqual([
      "alpha",
      "zeta",
      "booking",
    ]);
  });
});

describe("planUsage", () => {
  it("counts the plans carrying each feature name", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Daily",
        price: 1000,
        no_of_days: 1,
        description: "",
        features: ["priority-check-in", "booking"],
      });
      await ctx.db.insert("accessPlans", {
        key: "weekly",
        name: "Weekly",
        price: 5000,
        no_of_days: 7,
        description: "",
        features: ["priority-check-in"],
      });
    });

    const usage = await t.run(async (ctx) =>
      ctx.runQuery(api.planFeatures.planUsage),
    );

    expect(usage).toEqual({ "priority-check-in": 2, booking: 1 });
  });
});

describe("seedPlanFeatures", () => {
  it("seeds the catalogue and backfills the six seat plans idempotently", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      for (const key of [
        "daily",
        "weekly",
        "weekly_night",
        "monthly",
        "monthly_night",
        "calendar_month",
        "hourly",
        "free",
      ]) {
        await ctx.db.insert("accessPlans", {
          key,
          name: key,
          price: 1000,
          no_of_days: 1,
          description: "",
          features: [],
        });
      }
    });

    const first = await t.run(async (ctx) =>
      ctx.runMutation(internal.planFeatures.seedPlanFeatures, {}),
    );
    expect(first).toEqual({ featuresAdded: 2, plansUpdated: 6 });

    const second = await t.run(async (ctx) =>
      ctx.runMutation(internal.planFeatures.seedPlanFeatures, {}),
    );
    expect(second).toEqual({ featuresAdded: 0, plansUpdated: 0 });

    const features = await t.run(async (ctx) =>
      ctx.db.query("planFeatures").collect(),
    );
    expect(features.map((feature) => feature.name).sort()).toEqual([
      "booking",
      "priority-check-in",
    ]);

    const plans = await t.run(async (ctx) =>
      ctx.db.query("accessPlans").collect(),
    );
    const withBooking = plans
      .filter((plan) => plan.features.includes(RESERVABLE_FEATURE))
      .map((plan) => plan.key)
      .sort();
    expect(withBooking).toEqual([
      "calendar_month",
      "daily",
      "monthly",
      "monthly_night",
      "weekly",
      "weekly_night",
    ]);
    expect(plans.find((plan) => plan.key === "hourly")?.features).toEqual([]);
    expect(plans.find((plan) => plan.key === "free")?.features).toEqual([]);
  });
});

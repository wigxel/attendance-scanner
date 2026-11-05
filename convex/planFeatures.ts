/**
 * Access-plan feature catalogue.
 *
 * `name` is the value stored in `accessPlans.features`. Some names are read by
 * code and are protected here: `booking` (see `lib/plan-features.ts`) decides
 * whether a plan can be reserved. Protected names cannot be renamed, retired or
 * deleted. Add a name to `PROTECTED_FEATURES` in the same PR that starts reading
 * it from code.
 */
import { ConvexError, v } from "convex/values";
import { RESERVABLE_FEATURE } from "../lib/plan-features";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { requirePrivilege } from "./acl";
import {
  featureCreatedAudit,
  featureDeletedAudit,
  featureUpdatedAudit,
} from "./audits/entities";
import { readId } from "./myFunctions";

const PROTECTED_FEATURES = new Set<string>([RESERVABLE_FEATURE]);

function byCategoryThenName(
  a: Doc<"planFeatures">,
  b: Doc<"planFeatures">,
): number {
  return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
}

async function requireActor(ctx: QueryCtx | MutationCtx) {
  const actorId = await readId(ctx);
  if (!actorId) throw new ConvexError("Authentication required.");
  return actorId;
}

async function readAll(ctx: QueryCtx): Promise<Doc<"planFeatures">[]> {
  const rows = await ctx.db.query("planFeatures").collect();
  return rows.sort(byCategoryThenName);
}

export const list = query({
  handler: async (ctx): Promise<Doc<"planFeatures">[]> => readAll(ctx),
});

export const listActive = query({
  handler: async (ctx): Promise<Doc<"planFeatures">[]> => {
    const rows = await ctx.db
      .query("planFeatures")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    return rows.sort(byCategoryThenName);
  },
});

export const listByCategory = query({
  handler: async (ctx): Promise<Record<string, Doc<"planFeatures">[]>> => {
    const rows = await readAll(ctx);
    const grouped: Record<string, Doc<"planFeatures">[]> = {};
    for (const row of rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row);
    }
    return grouped;
  },
});

/** How many access plans carry each feature name. */
export const planUsage = query({
  handler: async (ctx): Promise<Record<string, number>> => {
    const plans = await ctx.db.query("accessPlans").collect();
    const counts: Record<string, number> = {};

    for (const plan of plans) {
      for (const name of plan.features) {
        counts[name] = (counts[name] ?? 0) + 1;
      }
    }

    return counts;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    label: v.string(),
    description: v.string(),
    category: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "plans:manage");
    const actorId = await requireActor(ctx);

    const name = args.name.trim();
    if (!name) throw new ConvexError("Feature name is required");

    const existing = await ctx.db
      .query("planFeatures")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (existing) {
      throw new ConvexError(`Feature "${name}" already exists`);
    }

    const featureId = await ctx.db.insert("planFeatures", {
      name,
      label: args.label,
      description: args.description,
      category: args.category,
      isActive: args.isActive,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.audit.log,
      featureCreatedAudit({
        actorId,
        targetId: featureId,
        name,
        label: args.label,
        category: args.category,
      }),
    );

    return featureId;
  },
});

export const update = mutation({
  args: {
    id: v.id("planFeatures"),
    name: v.string(),
    label: v.string(),
    description: v.string(),
    category: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "plans:manage");
    const actorId = await requireActor(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Feature not found");

    const name = args.name.trim();
    if (!name) throw new ConvexError("Feature name is required");

    if (existing.name !== name && PROTECTED_FEATURES.has(existing.name)) {
      throw new ConvexError(
        `"${existing.name}" is used by the app and cannot be renamed`,
      );
    }
    if (existing.name === RESERVABLE_FEATURE && !args.isActive) {
      throw new ConvexError(
        `"${RESERVABLE_FEATURE}" is used by the app and cannot be deactivated`,
      );
    }

    const duplicate = await ctx.db
      .query("planFeatures")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (duplicate && duplicate._id !== args.id) {
      throw new ConvexError(`Feature "${name}" already exists`);
    }

    await ctx.db.patch(args.id, {
      name,
      label: args.label,
      description: args.description,
      category: args.category,
      isActive: args.isActive,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.audit.log,
      featureUpdatedAudit({
        actorId,
        targetId: args.id,
        name,
        label: args.label,
        isActive: args.isActive,
        previousName: existing.name,
        previousLabel: existing.label,
        previousIsActive: existing.isActive,
      }),
    );

    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("planFeatures") },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "plans:manage");
    const actorId = await requireActor(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError("Feature not found");

    if (PROTECTED_FEATURES.has(existing.name)) {
      throw new ConvexError(
        `"${existing.name}" is used by the app and cannot be deleted`,
      );
    }

    // ponytail: full accessPlans scan; fine for ~8 plans, add an index on the
    // array field if plans ever reach the thousands.
    const plans = await ctx.db.query("accessPlans").collect();
    const usedBy = plans.filter((plan) =>
      plan.features.includes(existing.name),
    ).length;
    if (usedBy > 0) {
      throw new ConvexError(
        `${usedBy} plan${usedBy === 1 ? "" : "s"} use this feature — deactivate instead`,
      );
    }

    await ctx.db.delete(args.id);

    await ctx.scheduler.runAfter(
      0,
      internal.audit.log,
      featureDeletedAudit({
        actorId,
        targetId: args.id,
        name: existing.name,
        label: existing.label,
      }),
    );

    return args.id;
  },
});

/** Idempotent seed + backfill for the catalogue and the six seat plans. */
export const seedPlanFeatures = internalMutation({
  handler: async (ctx) => {
    const defaults = [
      {
        name: RESERVABLE_FEATURE,
        label: "Reservable on /reserve",
        description: "Customers can book a seat with this plan.",
        category: "Booking",
      },
      {
        name: "priority-check-in",
        label: "Priority check-in — not enforced yet",
        description: "Reserved for a future fast-lane check-in.",
        category: "Access",
      },
    ];

    let featuresAdded = 0;
    for (const feature of defaults) {
      const existing = await ctx.db
        .query("planFeatures")
        .withIndex("by_name", (q) => q.eq("name", feature.name))
        .first();
      if (!existing) {
        await ctx.db.insert("planFeatures", { ...feature, isActive: true });
        featuresAdded++;
      }
    }

    const reservableKeys = [
      "daily",
      "weekly",
      "weekly_night",
      "monthly",
      "monthly_night",
      "calendar_month",
    ];

    let plansUpdated = 0;
    for (const key of reservableKeys) {
      const plan = await ctx.db
        .query("accessPlans")
        .withIndex("plan_key", (q) => q.eq("key", key))
        .first();
      if (!plan || plan.features.includes(RESERVABLE_FEATURE)) continue;

      await ctx.db.patch(plan._id, {
        features: [...plan.features, RESERVABLE_FEATURE],
      });
      plansUpdated++;
    }

    return { featuresAdded, plansUpdated };
  },
});

import type { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

export const featureRequestStatus = v.union(
  v.literal("open"),
  v.literal("completed"),
  v.literal("rejected"),
);

export const accessPlanSchema = v.union(
  v.object({
    kind: v.literal("free"),
  }),
  v.object({
    kind: v.literal("paid"),
    planId: v.string(),
    amount: v.number(),
  }),
);

export const PlanImpl = {
  async validatePlan<TDB extends GenericMutationCtx<any>["db"]>(
    db: TDB,
    plan_string: string,
  ): Promise<Doc<"accessPlans">> {
    const plan = await db
      .query("accessPlans")
      .withIndex("plan_key", (gt) => gt.eq("key", plan_string))
      .first();

    if (!plan) {
      throw new Error(
        "Invalid plan provided. Registration rejected. Please provide a valid plan ",
      );
    }

    return plan;
  },

  toStruct(plan: Doc<"accessPlans">) {
    if (plan.key === "free") {
      return { kind: "free" as const };
    }

    return {
      kind: "paid" as const,
      planId: plan.key,
      amount: Math.max(0, plan.price / plan.no_of_days),
    };
  },
};

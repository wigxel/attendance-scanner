import { v } from "convex/values";

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

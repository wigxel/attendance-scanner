import { v } from "convex/values";

export const featureRequestStatus = v.union(
  v.literal("open"),
  v.literal("completed"),
  v.literal("rejected"),
);

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const daily_register = defineTable({
  userId: v.string(), // v.id("profile"),
  timestamp: v.string(),
  source: v.literal("web"),
  device: v.object({
    browser: v.string(),
    name: v.string(),
    visitorId: v.string(),
  }),
  admitted_by: v.string(), // v.id("profile"),
})
  .index("admitted_by", ["admitted_by"])
  .index("unique_visitor", ["device.visitorId"]);

const featureRequest = defineTable({
  userId: v.string(), // v.id("profile"),
  title: v.string(),
  description: v.string(),
  status: v.literal("open"),
}).index("user_id", ["userId"]);

const profile = defineTable({
  id: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  phoneNumber: v.optional(v.string()),
  email: v.optional(v.string()),
  occupation: v.string(),
  role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
}).index("occupation", ["occupation"]);

//Schema for stats
const stats = defineTable({
  userId: v.string(), // v.id("profile"),
  timestamp: v.string(),
}).index("user_id", ["userId"]);

//schema for occupations
const occupations = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("name", ["name"]);

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  daily_register,
  profile,
  featureRequest,
  stats,
  occupations,
});

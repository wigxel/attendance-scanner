import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { accessPlanSchema, featureRequestStatus } from "./shared";

const accessPlans = defineTable({
  key: v.string(),
  name: v.string(),
  price: v.number(),
  no_of_days: v.number(),
  description: v.string(),
  features: v.array(v.string()),
}).index("plan_key", ["key"]);

const daily_register = defineTable({
  userId: v.string(), // v.id("profile"),
  timestamp: v.string(),
  source: v.literal("web"),
  device: v.object({
    browser: v.string(),
    name: v.string(),
    visitorId: v.string(),
  }),
  access: accessPlanSchema,
  admitted_by: v.string(), // v.id("profile"),
})
  .index("admitted_by", ["admitted_by"])
  .index("unique_visitor", ["device.visitorId"])
  .index("access_plan", ["access.kind"])
  .index("user", ["userId"]);

const featureRequest = defineTable({
  userId: v.string(), // v.id("profile"),
  title: v.string(),
  description: v.string(),
  status: featureRequestStatus,
})
  .index("user_id", ["userId"])
  .index("by_status", ["status"]);

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

const featureVotes = defineTable({
  entityId: v.string(),
  value: v.number(),
  userId: v.string(),
})
  .index("user_id", ["userId"])
  .index("request", ["entityId"]);

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
const dailyAttendanceMetrics = defineTable({
  date: v.string(),
  totalUsers: v.number(),
}).index("by_date", ["date"]);

export default defineSchema({
  // preserve the users table because of migration from Convex Auth -> Clerk Auth.
  users: authTables.users,
  daily_register,
  profile,
  featureRequest,
  stats,
  accessPlans,
  occupations,
  featureVotes,
  dailyAttendanceMetrics,
});

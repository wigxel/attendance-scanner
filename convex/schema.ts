import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const daily_register = defineTable({
  userId: v.id("users"),
  timestamp: v.string(),
  source: v.literal('web'),
  device: v.object({
    browser: v.string(),
    name: v.string(),
    visitorId: v.string(),
  }),
  admitted_by: v.id("users")
}).index('admitted_by', ['admitted_by'])
  .index('unique_visitor', ['device.visitorId'])

const featureRequest = defineTable({
  userId: v.id("users"),
  title: v.string(),
  description: v.string(),
  status: v.literal('open')
}).index('user_id', ['userId'])

const profile = defineTable({
  id: v.id('users'),
  firstName: v.string(),
  lastName: v.string(),
  occupation: v.string(),
})
  .index("occupation", ['occupation'])

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),
  daily_register,
  profile,
  featureRequest,
});

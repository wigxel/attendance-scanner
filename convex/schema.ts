import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const daily_register = defineTable({
  userId: v.id("users"),
  timestamp: v.string(),
  source: v.literal('web'),
  device_meta: v.object({
    browser: v.string(),
  }),
  status: v.literal('')
});

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
  profile
});

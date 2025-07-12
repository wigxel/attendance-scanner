import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const daily_register = defineTable({
  userId: v.id("users"),
  timestamp: v.string(),
  source: v.literal("web"),
  device: v.object({
    browser: v.string(),
    name: v.string(),
    visitorId: v.string(),
  }),
  admitted_by: v.id("users"),
})
  .index("admitted_by", ["admitted_by"])
  .index("unique_visitor", ["device.visitorId"]);

const featureRequest = defineTable({
  userId: v.id("users"),
  title: v.string(),
  description: v.string(),
  status: v.literal("open"),
}).index("user_id", ["userId"]);

const profile = defineTable({
  id: v.id("users"),
  firstName: v.string(),
  lastName: v.string(),
  phoneNumber: v.optional(v.string()),
  email: v.optional(v.string()),
  occupation: v.string(),
  role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
}).index("occupation", ["occupation"]);

//Schema for stats
const stats = defineTable({
  userId: v.id("users"),
  timestamp: v.string(),
}).index("user_id", ["userId"]);

//schema for occupations
const occupations = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("name", ["name"]);

// schema for reservation
const reservations = defineTable({
  userId: v.id("users"),
  date: v.string(),
  duration: v.string(),
  numberOfSeats: v.number(),
  seatReservationsId: v.id('seatReservations'),
  status: v.union(
   v.literal('pending'),
   v.literal('confirmed'),
   v.literal('occupied') 
  ),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()), 
}).index("by_users", ["userId"])
  .index("by_status", ["status"])

const seatReservations = defineTable({
  table: v.array(
    v.object({
      selectedTable: v.string(),
      seatReserved: v.array(
        v.object(
          {
            seatAllocation: v.string(), 
            label:v.string()
          }
        )
      ),
    })
  ),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()), 
})

const seats = defineTable({
  label: v.string(),
  tableId: v.id('tables'),
  seatOption: v.string(),
  status: v.union(
    v.literal('seatAvailable'),
    v.literal('seatSelected'),
    v.literal('seatReserved'), 
  )
}).index("by_tables", ["tableId"]).index("by_status", ["status"])

const tables = defineTable({
  label: v.string(),
  options: v.array(v.string(),)
})

const users = defineTable({
  name: v.string(),//Full name
  phone: v.string(),//Phone number
  email: v.string(),//Email address
  createdAt: v.optional(v.number()),//Timestamp (ms)
})
.index("by_emails", ["email"])//Optional index for lookups

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
  reservations,
  seats,
  tables,
  seatReservations,
  users
});

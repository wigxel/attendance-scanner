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

const reservations = defineTable({
  userId: v.id("users"),
  date: v.string(),
  timestamp: v.string(),
  duration: v.number(),
  numOfSeats: v.number(),
  tableId: v.id('tables'),
  status: v.union(
   v.literal('pending'),
   v.literal('confirmed'),
   v.literal('occupied') 
  ),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()), 
}).index("userId", ["userId"]).index("tableId", ["tableId"])

const seatReservations = defineTable({
  reservationId: v.id('reservations'),
  seatId: v.id('seats'),
  table: v.string(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()), 
}).index("seat", ["seatId"])
  .index("reservation", ["reservationId"])

const seats = defineTable({
  label: v.string(),
  tableId: v.id('tables'),
  seatOption: v.string(),
  status: v.union(
    v.literal('available'),
    v.literal('selected'),
    v.literal('reserved'), 
  )
}).index("tables", ["tableId"])

const tables = defineTable({
  label: v.string(),
  options: v.array(v.string(),),
  // )
})

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
  seatReservations
});

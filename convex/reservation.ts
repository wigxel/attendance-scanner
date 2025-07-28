import { defineTable } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// userId, date, timestamp,duration, numOfSeats, tableId, status
export type ReservationStatus = "pending" | "confirmed" | "occupied";

// single reservation fetch
export const getReservation = query({
  args: { userId: v.id("reservations"), tableId: v.id("reservations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId || args.tableId);
  },
});

// all seats fetch
export const getAllReservations = query({
  args: {
    seatFilter: v.string() as unknown as import("convex/values")
      .Validator<ReservationStatus>,
  },
  handler: async (ctx) => {
    return await ctx.db.query("reservations").order("asc").collect();
  },
});

export const getLatestReservation = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const latestReservation = await ctx.db
      .query("reservations")
      .withIndex("by_users", (q) => q.eq("userId", args.userId))
      .order("desc") // newest first, by _creationTime
      .take(1); // just the most recent one

    return latestReservation[0]; // or return null if none
  },
});

export const createReservation = mutation({
  args: {
    userId: v.id("users"),
    selectedDate: v.string(),
    duration: v.string(),
    numberOfSeats: v.number(),
    seatReservationsId: v.id("seatReservations"),
    status: v.string() as unknown as import("convex/values")
      .Validator<ReservationStatus>,
  },
  handler: async (ctx, args) => {
    console.log("Creating reservation with:", args);

    return await ctx.db.insert("reservations", {
      userId: args.userId,
      date: args.selectedDate,
      duration: args.duration,
      numberOfSeats: args.numberOfSeats,
      seatReservationsId: args.seatReservationsId,
      status: args.status,
      createdAt: Date.now(),
    });
  },
});

// schema for reservation
const reservations = defineTable({
  userId: v.id("users"),
  date: v.string(),
  duration: v.string(),
  numberOfSeats: v.number(),
  seatReservationsId: v.id("seatReservations"),
  status: v.union(
    v.literal("pending"),
    v.literal("confirmed"),
    v.literal("occupied"),
  ),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
})
  .index("by_users", ["userId"])
  .index("by_status", ["status"]);

//schema for seat reservation
const seatReservations = defineTable({
  table: v.array(
    v.object({
      selectedTable: v.string(),
      seatReserved: v.array(
        v.object({
          seatAllocation: v.string(),
          label: v.string(),
          seatStatus: v.union(
            v.literal("seatAvailable"),
            v.literal("seatReserved"),
            v.literal("seatSelected"),
          ),
        }),
      ),
    }),
  ),
  date: v.optional(v.string()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
});

const seats = defineTable({
  label: v.string(),
  tableId: v.id("tables"),
  seatOption: v.string(),
  status: v.union(
    v.literal("seatAvailable"),
    v.literal("seatSelected"),
    v.literal("seatReserved"),
  ),
})
  .index("by_tables", ["tableId"])
  .index("by_status", ["status"]);

const tables = defineTable({
  label: v.string(),
  options: v.array(v.string()),
});

export const reservationsTables = {
  reservations,
  seats,
  tables,
  seatReservations,
}

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// userId, date, timestamp,duration, numOfSeats, tableId, status
export type ReservationStatus = "pending" | "confirmed" | "occupied";
// single reservation fetch
export const getReservation = query({
    args: {userId: v.id('reservations'), tableId: v.id('reservations')},
    handler: async (ctx, args) => {
      return await ctx.db.get(args.userId || args.tableId)
    }
})

// all seats fetch
export const getAllReservations = query({
    // args: { seatFilter: v.string() as unknown as import("convex/values").Validator<ReservationStatus> },
    handler: async (ctx) => {
      return await ctx.db.query('reservations')
        .order('asc')
        .collect();
    }
})


export const getLatestReservation = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const latestReservation = await ctx.db.query("reservations")
      .withIndex("by_users", (q) => q.eq("userId", args.userId))
      .order("desc") // newest first, by _creationTime
      .take(1); // just the most recent one

    return latestReservation[0]; // or return null if none
  },
});

export const createReservation = mutation({
  args: { 
    userId: v.id('users'), 
    selectedDate: v.string(), 
    duration: v.string(),
    numberOfSeats: v.number(),
    seatReservationsId: v.id('seatReservations'),
    status:v.string() as unknown as import("convex/values").Validator<ReservationStatus>,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reservations", 
      {
        userId: args.userId,
        date: args.selectedDate,
        duration: args.duration,
        numberOfSeats: args.numberOfSeats,
        seatReservationsId: args.seatReservationsId,
        status: args.status,
        createdAt: Date.now()
      }
    );
  },
});

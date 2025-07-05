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
        return ctx.db.query('reservations')
            .order('asc')
            .collect();
    }
})

export const createReservation = mutation({
  args: { 
    userId: v.id('users'), 
    date: v.string(), 
    time: v.string(), 
    duration: v.number(),
    numOfSeats: v.number(),
    tableId: v.id('tables'),
    status:v.string() as unknown as import("convex/values").Validator<ReservationStatus>,
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.insert("reservations", 
        {
            userId: args.userId,
            date: args.date,
            time: args.time,
            duration: args.duration,
            numOfSeats: args.numOfSeats,
            tableId: args.tableId,
            status: args.status,
            createdAt: Date.now()
        }
    );
    return response;
  },
});
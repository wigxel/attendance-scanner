import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// reservationId, seatId, table, createdAt
// single seat reservation fetch
export const getSeatReservation = query({
    args: {seatReservationID: v.id('seatReservations')},
    handler: async (ctx, args) => {
      return await ctx.db.get(args.seatReservationID)
    }
})

// all seats fetch
export const getAllSeatReservations = query({
    handler: async (ctx) => {
      return ctx.db.query('seatReservations')
        .order('asc')
        .collect();
    }
})

export const createSeatReservation = mutation({
  args: { 
    reservationId: v.id('reservations'), 
    seatId: v.id('seats'), 
    table: v.string(), 
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("seatReservations", 
        {
          reservationId: args.reservationId,
          seatId: args.seatId,
          createdAt: Date.now(),
          table: args.table
        }
    );
  },
});
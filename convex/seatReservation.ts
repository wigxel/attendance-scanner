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
      return await ctx.db.query('seatReservations')
        .order('asc')
        .collect();
    }
})

export const createSeatReservation = mutation({
  args: { 
    mappedTable: v.array(
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
    )
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("seatReservations", 
      {
        createdAt: Date.now(),
        table: args.mappedTable
      }
    );
  },
});
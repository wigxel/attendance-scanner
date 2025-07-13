import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// reservationId, seatId, table, createdAt
export type SeatStatus = "seatAvailable" | "seatReserved" | "seatSelected";
// single seat reservation fetch
export const getSeatReservation = query({
    args: {seatReservationID: v.id('seatReservations')},
    handler: async (ctx, args) => {
      return await ctx.db.get(args.seatReservationID)
    }
})

// all seats fetch
export const getAllSeatReservations = query({
    args: {date: v.string()},
    handler: async (ctx, args) => {
      return await ctx.db.query('seatReservations')
        .withIndex("by_date", (q) =>q.eq("date", args.date))
        .order('asc')
        .collect()
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
              label:v.string(),
              seatStatus: v.string() as unknown as import("convex/values").Validator<SeatStatus>,
            }
          )
        ),
      })
    ),
    selectedDate: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("seatReservations", 
      {
        createdAt: Date.now(),
        table: args.mappedTable,
        date: args.selectedDate
      }
    );
  },
});
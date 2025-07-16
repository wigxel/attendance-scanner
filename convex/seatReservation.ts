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
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string())
  },
   handler: async (ctx, args) => {
    // query without filter
    const allSeats = ctx.db.query("seatReservations");
    
    // date range filter
    if (args.startDate && args.endDate) {
      return await allSeats
        .withIndex("by_date", (q) =>
          q
            .gte("date", args.startDate)
            .lte("date", args.endDate)
        )
        .collect();
    }
    
    // single date filter
    if (args.startDate) {
      return await allSeats
        .withIndex("by_date", (q) =>
          q.eq("date", args.startDate)
        )
        .collect();
    }
    
    // return everything if there is no filter
    return await allSeats.collect();
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
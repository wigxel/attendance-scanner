import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// reservationId, seatId, table, createdAt
export type SeatStatus = "seatAvailable" | "seatReserved" | "seatSelected";

// single seat reservation fetch
export const getSeatReservation = query({
  args: { seatReservationID: v.id("seatReservations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.seatReservationID);
  },
});

// all seats fetch
export const getAllSeatReservations = query({
  handler: async (ctx) => {
    // query without filter
    return ctx.db.query("seatReservations").collect();
  },
});

export const createSeatReservation = mutation({
  args: {
    mappedTable: v.array(
      v.object({
        selectedTable: v.string(),
        seatReserved: v.array(
          v.object({
            seatAllocation: v.string(),
            seatStatus: v.string(),
            label: v.string(),
          }),
        ),
      }),
    ),
    selectedDate: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Creating reservation with:", args);
    const response = await ctx.db.insert("seatReservations", {
      createdAt: Date.now(),
      table: args.mappedTable,
      date: args.selectedDate,
    });
    return response;
  },
});

import { query } from "./_generated/server";
import { v } from "convex/values";

// _id, label, seatOption, status, tableId
export type SeatStatus = "seatAvailable" | "seatSelected" | "seatReserved";
// single seat fetch
export const getSeat = query({
    args: {seatId: v.id('seats')},
    handler: async (ctx, args) => {
        return await ctx.db.get(args.seatId)
    }
})

// all seats fetch
export const getAllSeats = query({
    args: { seatFilter: v.string() as unknown as import("convex/values").Validator<SeatStatus> },
    handler: async (ctx, args) => {
        return ctx.db.query('seats')
            .withIndex("by_status", (q) => q.eq("status", args.seatFilter as SeatStatus))
            .order('asc')
            .collect();
    }
})

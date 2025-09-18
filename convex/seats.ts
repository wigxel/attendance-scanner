import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllSeats = query({
  handler: async (ctx) => {
    return await ctx.db.query("seats").collect();
  },
});

// Get available seats for a date range
export const getAvailableSeats = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const allSeats = await ctx.db
      .query("seats")
      .filter((q) => q.eq(q.field("isOccupied"), false))
      .collect();

    const conflictingBookings = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    const overlappingBookings = conflictingBookings.filter((booking) => {
      // Check if booking dates overlap with requested dates
      return !(
        booking.endDate < args.startDate || booking.startDate > args.endDate
      );
    });

    // Get seat IDs that are occupied during this period
    const occupiedSeatIds = new Set(overlappingBookings.map((b) => b.seatId));

    // Return seats that are NOT occupied
    const availableSeats = allSeats.filter(
      (seat) => !occupiedSeatIds.has(seat._id),
    );

    return {
      availableSeats,
      totalSeats: allSeats.length,
      occupiedSeats: occupiedSeatIds.size,
    };
  },
});

// Mark seat as occupied
export const markSeatOccupied = mutation({
  args: {
    seatId: v.id("seats"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.seatId, {
      isOccupied: true,
    });
  },
});

// Mark seat as available
export const markSeatAvailable = mutation({
  args: {
    seatId: v.id("seats"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.seatId, {
      isOccupied: false,
    });
  },
});

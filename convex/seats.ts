import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllSeats = query({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching all seats...");
    const seats = await ctx.db.query("seats").collect();
    return seats;
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
      .filter((q) => q.eq(q.field("isBooked"), false))
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

export const getAllSeatsForDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const allSeats = await ctx.db.query("seats").collect();

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

    // Determine the status of each seat for the given date range
    const seats = allSeats.map((seat) => ({
      ...seat,
      // Check if the seat's _id is in the set of occupied IDs
      isBooked: occupiedSeatIds.has(seat._id),
    }));

    return seats;
  },
});

// Mark seat as occupied
export const markSeatOccupied = mutation({
  args: {
    seatId: v.id("seats"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.seatId, {
      isBooked: true,
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
      isBooked: false,
    });
  },
});

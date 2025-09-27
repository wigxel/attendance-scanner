import { query } from "./_generated/server";
import { v } from "convex/values";
import { formatDateToLocalISO } from "../lib/utils";

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

export const checkSeatAvailability = query({
  args: {
    seatId: v.id("seats"),
    startDate: v.string(),
    durationType: v.string(),
  },
  handler: async (ctx, args) => {
    const seat = await ctx.db
      .query("seats")
      .filter((q) => q.eq(q.field("_id"), args.seatId))
      .first();

    if (!seat) {
      throw new Error(`Seat with ID ${args.seatId} not found`);
    }

    const conflictingBookings = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("seatId"), args.seatId),
          q.eq(q.field("status"), "confirmed"),
        ),
      )
      .collect();

    if (args.startDate === "") {
      throw new Error("StartDate is required");
    }

    const calculateEndDate = (
      startDate: string,
      workingDays: number,
    ): string => {
      const start = new Date(startDate);
      const currentDate = new Date(start);
      let daysAdded = 0;

      // Count the start date if it's not a Sunday
      if (currentDate.getDay() !== 0) {
        daysAdded++;
      }

      while (daysAdded < workingDays) {
        currentDate.setDate(currentDate.getDate() + 1);
        // skip Sundays (0 = Sunday)
        if (currentDate.getDay() !== 0) {
          daysAdded++;
        }
      }

      return formatDateToLocalISO(currentDate);
    };

    if (!args.durationType) throw new Error("Duration type is required");
    let duration: number;
    let endDate: string;
    if (args.durationType === "day") {
      duration = 1;
      const startMs = new Date(args.startDate).getTime();
      const endMs = startMs + duration * 24 * 60 * 60 * 1000;
      endDate = formatDateToLocalISO(new Date(endMs));
    } else if (args.durationType === "week") {
      duration = 6;
      endDate = calculateEndDate(args.startDate, duration);
    } else if (args.durationType === "month") {
      duration = 24;
      endDate = calculateEndDate(args.startDate, duration);
    } else {
      throw new Error("Invalid duration type");
    }

    const hasConflict = conflictingBookings.some(
      (booking) =>
        !(booking.endDate < args.startDate || booking.startDate > endDate),
    );

    // if (hasConflict) {
    //   const seat = await ctx.db.get(args.seatId);
    //   throw new Error(
    //     `Seat ${seat?.seatNumber} is not available for selected dates`,
    //   );
    // }

    const isAvailable = !hasConflict;

    return {
      isAvailable,
      hasConflict,
      startDate: args.startDate,
      endDate,
    };
  },
});

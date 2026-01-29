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

    // Get all confirmed bookings that overlap with the requested date range
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

    // Get all bookedSeats records for overlapping bookings
    const bookedSeatIds = new Set<string>();
    for (const booking of overlappingBookings) {
      const bookedSeats = await ctx.db
        .query("bookedSeats")
        .filter((q) =>
          q.and(
            q.eq(q.field("bookingId"), booking._id),
            q.eq(q.field("status"), "confirmed"),
          ),
        )
        .collect();

      bookedSeats.forEach((bs) => bookedSeatIds.add(bs.seatId));
    }

    // Return seats that are NOT occupied
    const availableSeats = allSeats.filter(
      (seat) => !bookedSeatIds.has(seat._id),
    );

    return {
      availableSeats,
      totalSeats: allSeats.length,
      occupiedSeats: bookedSeatIds.size,
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

    // Get all confirmed bookings that overlap with the requested date range
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

    // Get all bookedSeats records for overlapping bookings
    const bookedSeatIds = new Set<string>();
    for (const booking of overlappingBookings) {
      const bookedSeats = await ctx.db
        .query("bookedSeats")
        .filter((q) =>
          q.and(
            q.eq(q.field("bookingId"), booking._id),
            q.eq(q.field("status"), "confirmed"),
          ),
        )
        .collect();

      bookedSeats.forEach((bs) => bookedSeatIds.add(bs.seatId));
    }

    // Determine the status of each seat for the given date range
    const seats = allSeats.map((seat) => ({
      ...seat,
      // Check if the seat's _id is in the set of occupied IDs
      isBooked: bookedSeatIds.has(seat._id),
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
    const seat = await ctx.db.get(args.seatId);
    if (!seat) {
      throw new Error(`Seat with ID ${args.seatId} not found`);
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
      const endMs = startMs; // end date should be the same as start date for day booking
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

    // Get all confirmed bookedSeats for this seat
    const confirmedBookedSeats = await ctx.db
      .query("bookedSeats")
      .withIndex("by_seat_and_status", (q) =>
        q.eq("seatId", args.seatId).eq("status", "confirmed"),
      )
      .collect();

    // Check if any of the confirmed bookings overlap with the requested date range
    const hasConflict = await Promise.all(
      confirmedBookedSeats.map(async (bookedSeat) => {
        const booking = await ctx.db.get(bookedSeat.bookingId);
        if (!booking) return false;
        return !(
          booking.endDate < args.startDate || booking.startDate > endDate
        );
      }),
    ).then((conflicts) => conflicts.some((c) => c));

    const isAvailable = !hasConflict;

    return {
      isAvailable,
      hasConflict,
      startDate: args.startDate,
      endDate,
    };
  },
});

export const getSeatsById = query({
  args: {
    seatIds: v.array(v.id("seats")),
  },
  handler: async (ctx, args) => {
    const seats = await Promise.all(
      args.seatIds.map((seatId) => ctx.db.get(seatId)),
    );
    return seats.filter(Boolean);
  },
});

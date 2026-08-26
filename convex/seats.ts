import type { GenericQueryCtx } from "convex/server";
import { v } from "convex/values";
import { Option, pipe } from "effect";
import { DateParse } from "../lib/date.helpers";
import { DateRangeImpl } from "../lib/date-range";
import type { DurationType } from "../types";
import type { DataModel } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const getAllSeats = query({
  args: {},
  handler: async (ctx) => {
    console.log("Fetching all seats...");
    const seats = await ctx.db.query("seats").collect();
    return seats;
  },
});

/**
 * Get all confirmed bookings that overlap with the requested date range
 */
async function findOverlappingBookings(
  ctx: GenericQueryCtx<DataModel>,
  args: {
    startDate: string;
    endDate: string;
  },
) {
  const conflictingBookings = await ctx.db
    .query("bookings")
    .filter((q) => q.eq(q.field("status"), "confirmed"))
    .collect();

  const overlappingBookings = conflictingBookings.filter((booking) => {
    const cmp = DateRangeImpl.compare({
      bookingRange: booking,
      requestedRange: args,
    });

    return !cmp.isContained();
  });

  return overlappingBookings;
}

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

    const overlappingBookings = await findOverlappingBookings(ctx, args);

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

      for (const bs of bookedSeats) {
        if (bs.seatId !== "unassigned") bookedSeatIds.add(bs.seatId);
      }
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

    const overlappingBookings = await findOverlappingBookings(ctx, args);

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

      for (const bs of bookedSeats) {
        if (bs.seatId !== "unassigned") bookedSeatIds.add(bs.seatId);
      }
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

    if (!args.durationType) {
      throw new Error("Duration type is required");
    }

    const endDate = pipe(
      DateParse.parse(args.startDate),
      Option.flatMap((parsed_date) =>
        DateRangeImpl.match(args.durationType as DurationType, parsed_date),
      ),
      Option.getOrThrowWith(
        () => new Error("Invalid startDate. Provide a valid date"),
      ),
    );

    // Get all confirmed bookedSeats for this seat
    const confirmedBookedSeats = await ctx.db
      .query("bookedSeats")
      .withIndex("by_seat_and_status", (q) =>
        q.eq("seatId", args.seatId).eq("status", "confirmed"),
      )
      .collect();

    const hasConflict = await Promise.all(
      confirmedBookedSeats.map(async (bookedSeat) => {
        const booking = await ctx.db.get(bookedSeat.bookingId);

        if (!booking) return false;

        const cmp = DateRangeImpl.compare({
          bookingRange: booking,
          requestedRange: { startDate: args.startDate, endDate },
        });

        return !cmp.isContained();
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

export const getSeatLayout = query({
  args: {},
  handler: async (ctx) => {
    const layoutConfig = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "seat_layout"))
      .first();

    if (!layoutConfig) {
      return null;
    }

    try {
      return JSON.parse(layoutConfig.value);
    } catch {
      return null;
    }
  },
});

export const saveSeatLayout = mutation({
  args: {
    seats: v.array(
      v.object({
        type: v.string(),
        index: v.string(),
        seatNumber: v.optional(v.number()),
        position: v.object({
          rowIndex: v.number(),
          colIndex: v.number(),
        }),
        attributes: v.optional(v.any()),
      }),
    ),
    rowCount: v.number(),
    columnCount: v.number(),
  },
  handler: async (ctx, args) => {
    const layoutConfig = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "seat_layout"))
      .first();

    const layoutValue = JSON.stringify({
      seats: args.seats,
      rowCount: args.rowCount,
      columnCount: args.columnCount,
    });

    if (layoutConfig) {
      await ctx.db.patch(layoutConfig._id, { value: layoutValue });
    } else {
      await ctx.db.insert("config", { key: "seat_layout", value: layoutValue });
    }

    return { success: true };
  },
});

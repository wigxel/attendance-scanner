import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { formatDateToLocalISO } from "../lib/utils";

export const getBooking = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    return booking;
  },
});

export const createBooking = mutation({
  /**
   * Creates a new seat booking for the authenticated user.
   *
   * This mutation handles the complete booking process including:
   * - User authentication via Clerk
   * - Seat availability validation
   * - Pricing calculation based on duration
   * - Booking record creation
   *
   * @param args.userId - User ID (currently unused, user is determined from auth)
   * @param args.seatIds - Array of seat IDs to book
   * @param args.startDate - Booking start date in ISO string format (YYYY-MM-DD)
   * @param args.durationType - Duration type: "day" (1 day), "week" (6 days), or "month" (24 days)
   *
   * @returns Object containing:
   * - bookingIds: Array of created booking record IDs
   * - amount: Total booking amount in kobo (per seat)
   * - duration: Booking duration in days
   * - userInfo: User details (userId, userEmail, userName)
   * - message: Success message with payment instruction
   *
   * @throws Error if:
   * - User is not authenticated
   * - Duration type is not provided or invalid
   * - Start date is in the past
   * - Any requested seat is unavailable for the selected dates
   *
   * Pricing (per seat):
   * - Day: ₦1,500 (150,000 kobo)
   * - Week: ₦6,000 (600,000 kobo)
   * - Month: ₦24,000 (2,400,000 kobo)
   *
   * @example
   * ```typescript
   * const result = await createBooking({
   *   userId: "user123",
   *   seatIds: ["seat_123"],
   *   startDate: "2024-01-15",
   *   durationType: "week"
   * });
   * ```
   */
  args: {
    userId: v.string(),
    seatIds: v.array(v.id("seats")),
    startDate: v.string(),
    durationType: v.union(
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
    ),
  },
  handler: async (ctx, args) => {
    // Get current user from Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be logged in");

    const userId = identity.subject; // Clerk user ID
    const userEmail = identity.email;
    const userName = identity.name;

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

    // Calculate duration
    if (!args.durationType) throw new Error("Duration type is required");
    let duration: number;
    let pricePerSeat: number; // in kobo
    let endDate: string;
    if (args.durationType === "day") {
      duration = 1;
      pricePerSeat = 150000; // 1,500 per day
      const startMs = new Date(args.startDate).getTime();
      const endMs = startMs; // end date should be the same as start date
      endDate = formatDateToLocalISO(new Date(endMs));
    } else if (args.durationType === "week") {
      duration = 6;
      pricePerSeat = 600000; // 6,000 per week
      endDate = calculateEndDate(args.startDate, duration);
    } else if (args.durationType === "month") {
      duration = 24;
      pricePerSeat = 2400000; // 24,000 per month
      endDate = calculateEndDate(args.startDate, duration);
    } else {
      throw new Error("Invalid duration type");
    }

    // Validate dates
    if (duration < 1) throw new Error("Invalid date range");
    const startMs = new Date(args.startDate).getTime();
    if (startMs < Date.now()) throw new Error("Cannot book past dates");

    const startDate = new Date(args.startDate);
    if (startDate.getDay() === 0) {
      throw new Error("Cannot book on Sundays. Please select another date.");
    }

    if (args.seatIds.length === 0) throw new Error("No seats selected");

    // Check availability for all requested seats
    for (const seatId of args.seatIds) {
      const conflictingBookedSeats = await ctx.db
        .query("bookedSeats")
        .withIndex("by_seat_and_status", (q) =>
          q.eq("seatId", seatId).eq("status", "confirmed"),
        )
        .collect();

      for (const bookedSeat of conflictingBookedSeats) {
        // get the associated booking to check date overlap
        const booking = await ctx.db.get(bookedSeat.bookingId);
        if (!booking) continue;

        const datesOverlap = !(
          booking.endDate < args.startDate || booking.startDate > endDate
        );
        if (datesOverlap) {
          const seat = await ctx.db.get(seatId);
          throw new Error(
            `Seat ${seat?.seatNumber} is not available for selected dates`,
          );
        }
      }
    }

    // Create booking records
    const now = Date.now();
    const amount = pricePerSeat * args.seatIds.length; // price per seat multiplied by number of seats

    const bookingId = await ctx.db.insert("bookings", {
      userId,
      seatIds: args.seatIds,
      duration,
      startDate: args.startDate,
      endDate: endDate,
      durationType: args.durationType,
      status: "pending",
      pricePerSeat,
      amount,
      createdAt: now,
      updatedAt: now,
    });

    // Create bookedSeats entries for each seat
    for (const seatId of args.seatIds) {
      await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId,
        status: "pending",
      });
    }

    return {
      bookingIds: [bookingId],
      amount,
      duration,
      userInfo: { userId, userEmail, userName },
      message: "Bookings created. Please complete payment within 10 minutes.",
    };
  },
});

export const updateBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    startDate: v.string(),
    seatIds: v.array(v.id("seats")),
    durationType: v.union(
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be logged in");
    const userId = identity.subject;

    const existingBooking = await ctx.db.get(args.bookingId);

    if (!existingBooking) {
      throw new Error("Booking not found.");
    }

    if (existingBooking.userId !== userId) {
      throw new Error("You are not authorized to update this booking.");
    }

    if (existingBooking.status !== "pending") {
      console.log("Booking Id: ", existingBooking._id);
      throw new Error("Only pending bookings can be updated.");
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
    let pricePerSeat: number; // in kobo
    let endDate: string;
    if (args.durationType === "day") {
      duration = 1;
      pricePerSeat = 150000; // 1,500 per day
      const startMs = new Date(args.startDate).getTime();
      const endMs = startMs + duration * 24 * 60 * 60 * 1000;
      endDate = formatDateToLocalISO(new Date(endMs));
    } else if (args.durationType === "week") {
      duration = 6;
      pricePerSeat = 600000; // 6,000 per week
      endDate = calculateEndDate(args.startDate, duration);
    } else if (args.durationType === "month") {
      duration = 24;
      pricePerSeat = 2400000; // 24,000 per month
      endDate = calculateEndDate(args.startDate, duration);
    } else {
      throw new Error("Invalid duration type");
    }

    const amount = pricePerSeat * args.seatIds.length; // price per seat multiplied by number of seats

    await ctx.db.patch(args.bookingId, {
      startDate: args.startDate,
      endDate,
      seatIds: args.seatIds,
      durationType: args.durationType,
      duration,
      pricePerSeat,
      amount,
    });

    return { success: true, bookingId: args.bookingId };
  },
});

// Get current user's bookings
export const getUserBookings = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be logged in");

    const bookings = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    // Get seat details for each booking
    const bookingsWithSeats = await Promise.all(
      bookings.map(async (booking) => {
        // fetch all seats for this booking
        const seats = await Promise.all(
          booking.seatIds.map((seatId) => ctx.db.get(seatId)),
        );
        return {
          ...booking,
          seats: seats.filter((seat) => seat !== null), // filter out any null values
        };
      }),
    );

    return bookingsWithSeats;
  },
});

// Get current user's confirmed bookings
export const getUserConfirmedBookings = query({
  /**
   * Retrieves all confirmed bookings for the current user.
   *
   * @returns Array of confirmed bookings for the current user.
   */
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_startDate")
      .order("asc")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    // Get seat details for each booking
    const bookingsWithSeats = await Promise.all(
      bookings.map(async (booking) => {
        // fetch all seats for this booking
        const seats = await Promise.all(
          booking.seatIds.map((seatId) => ctx.db.get(seatId)),
        );
        return {
          ...booking,
          seats: seats.filter((seat) => seat !== null),
        };
      }),
    );

    return bookingsWithSeats;
  },
});

export const getUserPendingBookings = query({
  /**
   * Retrieves all pending bookings for the current user.
   *
   * @returns Array of pending bookings for the current user.
   */
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_startDate")
      .order("asc")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get seat details for each booking
    const bookingsWithSeats = await Promise.all(
      bookings.map(async (booking) => {
        // fetch all seats for this booking
        const seats = await Promise.all(
          booking.seatIds.map((seatId) => ctx.db.get(seatId)),
        );
        return {
          ...booking,
          seats: seats.filter((seat) => seat !== null),
        };
      }),
    );

    return bookingsWithSeats;
  },
});

export const confirmBooking = mutation({
  /**
   * Confirms a booking and updates bookedSeats status.
   *
   * This mutation:
   * - Updates the booking status to "confirmed"
   * - Updates all associated bookedSeats records to "confirmed"
   *
   * @param bookingId ID of the booking to confirm
   * @returns Object containing:
   * - bookingId: ID of the confirmed booking
   */
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    // Verify all seats exist
    const seats = await Promise.all(
      booking.seatIds.map((seatId) => ctx.db.get(seatId)),
    );

    if (seats.some((seat) => seat === null)) {
      throw new Error("One or more seats not found");
    }

    // update booking status
    await ctx.db.patch(args.bookingId, {
      status: "confirmed",
    });

    // update all bookedSeats records to confirmed
    const bookedSeats = await ctx.db
      .query("bookedSeats")
      .filter((q) => q.eq(q.field("bookingId"), args.bookingId))
      .collect();

    for (const bookedSeat of bookedSeats) {
      await ctx.db.patch(bookedSeat._id, {
        status: "confirmed",
      });
    }

    return {
      bookingId: args.bookingId,
    };
  },
});

// Mark seat as available when booking has expired
export const markExpiredSeatsAvailable = mutation({
  /**
   *
   * This mutation:
   * - Finds all confirmed bookings that have passed their end date
   * - Updates their status to "expired"
   *
   * Is called periodically to automatically handle expired bookings.
   *
   * @returns Object containing:
   * - expiredBookingIds: Array of booking IDs that were marked as expired
   */
  handler: async (ctx) => {
    const today = formatDateToLocalISO(new Date());

    // Find all confirmed bookings that have expired
    const expiredBookings = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "confirmed"),
          q.lt(q.field("endDate"), today),
        ),
      )
      .collect();

    const expiredBookingIds = [];
    let availableSeats = 0;

    // Update each expired booking and mark seat as available
    for (const booking of expiredBookings) {
      // Update booking status to expired
      await ctx.db.patch(booking._id, {
        status: "expired",
        updatedAt: Date.now(),
      });

      expiredBookingIds.push(booking._id);
      availableSeats++;
    }

    return {
      expiredBookingIds,
      availableSeats,
    };
  },
});

export const cancelBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (!["pending", "confirmed"].includes(booking.status)) {
      throw new Error(`Cannot cancel booking with status: ${booking.status}`);
    }

    await ctx.db.patch(bookingId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    const bookedSeats = await ctx.db
      .query("bookedSeats")
      .filter((q) => q.eq(q.field("bookingId"), booking._id))
      .collect();

    // mark associated bookedSeats as expired
    for (const bookedSeat of bookedSeats) {
      await ctx.db.patch(bookedSeat._id, {
        status: "cancelled",
      });
    }

    return { success: true, bookingId };
  },
});

export const markExpiredPendingBookings = mutation({
  /**
   * Marks pending bookings as expired if they've been pending too long.
   * Called periodically by a cron job.
   */
  handler: async (ctx) => {
    const now = Date.now();
    const expirationTime = 10 * 60 * 1000; // 10 minutes in milliseconds
    const cutoffTime = now - expirationTime;

    // Find pending bookings older than 10 minutes
    const expiredBookings = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("createdAt"), cutoffTime),
        ),
      )
      .collect();

    const expiredBookingIds = [];

    for (const booking of expiredBookings) {
      // Mark booking as expired
      await ctx.db.patch(booking._id, {
        status: "expired",
        updatedAt: now,
      });

      expiredBookingIds.push(booking._id);

      const bookedSeats = await ctx.db
        .query("bookedSeats")
        .filter((q) => q.eq(q.field("bookingId"), booking._id))
        .collect();

      // mark associated bookedSeats as expired
      for (const bookedSeat of bookedSeats) {
        await ctx.db.patch(bookedSeat._id, {
          status: "expired",
        });
      }
    }

    return {
      expiredBookingIds,
      processedAt: now,
    };
  },
});

export const markCompletedBookingsAsExpired = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const nowISO = new Date(now).toISOString();

    const completedBookings = await ctx.db
      .query("bookings")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "confirmed"),
          q.lt(q.field("endDate"), nowISO),
        ),
      )
      .collect();

    const expiredBookings = [];

    for (const booking of completedBookings) {
      await ctx.db.patch(booking._id, {
        status: "expired",
        updatedAt: now,
      });

      expiredBookings.push(booking._id);

      const bookedSeats = await ctx.db
        .query("bookedSeats")
        .filter((q) => q.eq(q.field("bookingId"), booking._id))
        .collect();

      // mark associated bookedSeats as expired
      for (const bookedSeat of bookedSeats) {
        await ctx.db.patch(bookedSeat._id, {
          status: "expired",
        });
      }
    }
    return {
      expiredBookings,
      processedAt: now,
    };
  },
});

export const markBookingAsExpired = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    await ctx.db.patch(bookingId, {
      status: "expired",
      updatedAt: Date.now(),
    });

    const bookedSeats = await ctx.db
      .query("bookedSeats")
      .filter((q) => q.eq(q.field("bookingId"), bookingId))
      .collect();

    // mark associated bookedSeats as expired
    for (const bookedSeat of bookedSeats) {
      await ctx.db.patch(bookedSeat._id, {
        status: "expired",
      });
    }

    return {
      success: true,
      booking,
    };
  },
});

export const getFullyBookedDates = query({
  handler: async (ctx) => {
    // Get total number of seats
    const allSeats = await ctx.db.query("seats").collect();
    const totalSeats = allSeats.length;

    // Get all confirmed bookings
    const confirmedBookings = await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    // Group bookings by date and count seats
    const dateSeatsMap = new Map<string, Set<string>>();

    for (const booking of confirmedBookings) {
      // Get all dates in the booking range
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split("T")[0];

        if (!dateSeatsMap.has(dateKey)) {
          dateSeatsMap.set(dateKey, new Set());
        }

        // Add all seats from this booking
        booking.seatIds.forEach((seatId) => {
          dateSeatsMap.get(dateKey)!.add(seatId);
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Find dates where all seats are booked
    const fullyBookedDates: string[] = [];
    dateSeatsMap.forEach((seats, date) => {
      if (seats.size === totalSeats) {
        fullyBookedDates.push(date);
      }
    });

    return fullyBookedDates;
  },
});

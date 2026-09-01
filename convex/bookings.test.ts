/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import aggregateTest from "@convex-dev/aggregate/test";
import { convexTest } from "convex-test";
import { addDays, format, subDays } from "date-fns";
import { afterAll, describe, expect, it, vi } from "vitest";
import { api, components } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import schema from "./schema";

// Freeze time so date-relative helpers (todayStr/futureStr/pastStr) are
// deterministic and never land on a Sunday regardless of the real calendar.
// Base is a Thursday: every used offset (+1/+2/+5, -1/-3/-5/-10/-20) avoids Sunday.
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2024-01-04T12:00:00.000Z"));

afterAll(() => vi.useRealTimers());

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function futureStr(days = 30) {
  return format(addDays(new Date(), days), "yyyy-MM-dd");
}

function pastStr(days = 5) {
  return format(subDays(new Date(), days), "yyyy-MM-dd");
}

async function seedAdmin(t: ReturnType<typeof convexTest>) {
  t.registerComponent("wigxel_acl", aclSchema, aclModules);

  // Seed the admin role into the component's DB via its own mutation
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});

    // Create an identity with the admin role
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "admin-user",
    });
  });
}

// ─── generateTickets ────────────────────────────────────────────────

describe("generateTickets", () => {
  it("throws when booking is not confirmed", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 30,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "month",
        pricePerSeat: 10000,
        amount: 10000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        ctx.runMutation(api.bookings.generateTickets, { bookingId }),
      ).rejects.toThrow("Booking not found or not confirmed");
    });
  });

  it("creates a single unassigned ticket when booking has no seats", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 30,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "month",
        pricePerSeat: 10000,
        amount: 10000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runMutation(api.bookings.generateTickets, {
        bookingId,
      });

      expect(result).toHaveProperty("ownerTicketId");
      expect(result.guestTicketIds).toEqual([]);

      const ticket = await ctx.db.get(result.ownerTicketId);
      expect(ticket).not.toBeNull();
      expect(ticket?.seatId).toBe("unassigned");
      expect(ticket?.holderUserId).toBe("user-1");
      expect(ticket?.status).toBe("claimed");
    });
  });

  it("creates one ticket per seat, first claimed by purchaser, rest reserved", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const seat1 = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });
      const seat2 = await ctx.db.insert("seats", {
        seatNumber: 2,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat1, seat2] as any,
        duration: 30,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "month",
        pricePerSeat: 10000,
        amount: 20000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runMutation(api.bookings.generateTickets, {
        bookingId,
      });

      expect(result).toHaveProperty("ownerTicketId");
      expect(result.guestTicketIds).toHaveLength(1);

      const ownerTicket = await ctx.db.get(result.ownerTicketId);
      expect(ownerTicket?.seatId).toBe(seat1);
      expect(ownerTicket?.holderUserId).toBe("user-1");
      expect(ownerTicket?.status).toBe("claimed");

      const guestTicket = await ctx.db.get(result.guestTicketIds[0]);
      expect(guestTicket?.seatId).toBe(seat2);
      expect(guestTicket?.holderUserId).toBeUndefined();
      expect(guestTicket?.status).toBe("reserved");
    });
  });

  it("returns existing tickets when called a second time (idempotent)", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 30,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "month",
        pricePerSeat: 10000,
        amount: 10000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const first = await ctx.runMutation(api.bookings.generateTickets, {
        bookingId,
      });
      const second = await ctx.runMutation(api.bookings.generateTickets, {
        bookingId,
      });

      expect(second.ownerTicketId).toBe(first.ownerTicketId);
      expect(second.guestTicketIds).toEqual(first.guestTicketIds);
    });
  });

  it("identifies the correct owner ticket when existing tickets are out of order", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 30,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "month",
        pricePerSeat: 10000,
        amount: 10000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const guestId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: "guest-1",
        status: "claimed",
        claimedAt: Date.now(),
      });
      const ownerId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: "user-1",
        status: "claimed",
        claimedAt: Date.now(),
      });

      const result = await ctx.runMutation(api.bookings.generateTickets, {
        bookingId,
      });

      expect(result.ownerTicketId).toBe(ownerId);
      expect(result.guestTicketIds).toEqual([guestId]);
    });
  });
});

// ─── systemGetBooking ───────────────────────────────────────────────

describe("systemGetBooking", () => {
  it("throws when booking does not exist", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const fakeId = await ctx.db.insert("bookings", {
        userId: "u",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "pending",
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.delete(fakeId);

      await expect(
        ctx.runQuery(api.bookings.systemGetBooking, { bookingId: fakeId }),
      ).rejects.toThrow("Booking not found");
    });
  });

  it("returns booking with user info and empty seats", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("profile", {
        id: "user-1",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@test.com",
        occupation: "None",
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 6,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "week",
        pricePerSeat: 600000,
        amount: 600000,
        status: "confirmed",
        created_by: "system",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runQuery(api.bookings.systemGetBooking, {
        bookingId,
      });

      expect(result._id).toBe(bookingId);
      expect(result.user.name).toBe("Jane Doe");
      expect(result.user.email).toBe("jane@test.com");
      expect(result.seats).toEqual([]);
      expect(result.creator).toBe("Booking system");
    });
  });

  it("returns seat details for a booking with seats", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const seat = await ctx.db.insert("seats", {
        seatNumber: 7,
        isBooked: true,
        createdAt: Date.now(),
      });

      await ctx.db.insert("profile", {
        id: "user-2",
        firstName: "John",
        lastName: "Smith",
        occupation: "None",
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-2",
        seatIds: [seat] as any,
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runQuery(api.bookings.systemGetBooking, {
        bookingId,
      });

      expect(result.seats).toHaveLength(1);
      expect(result.seats[0].seatNumber).toBe(7);
    });
  });

  it("returns Anonymous User when profile not found", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "nonexistent-user",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runQuery(api.bookings.systemGetBooking, {
        bookingId,
      });

      expect(result.user.name).toBe("Anonymous User");
      expect(result.user.email).toBe("--");
    });
  });

  it("returns planName from matching accessPlan", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("accessPlans", {
        key: "weekly",
        name: "Weekly Pass",
        price: 700000,
        no_of_days: 7,
        description: "7 days",
        features: [],
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "u",
        seatIds: [],
        duration: 7,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "week",
        pricePerSeat: 700000,
        amount: 700000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runQuery(api.bookings.systemGetBooking, {
        bookingId,
      });

      expect(result.planName).toBe("Weekly Pass");
    });
  });

  it("falls back to duration string when no matching plan", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "u",
        seatIds: [],
        duration: 13,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "month",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runQuery(api.bookings.systemGetBooking, {
        bookingId,
      });

      expect(result.planName).toBe("13 days");
    });
  });
});

// ─── systemActionConfirmBooking ─────────────────────────────────────

describe("systemActionConfirmBooking", () => {
  it("throws when booking not found", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const fakeId = await ctx.db.insert("bookings", {
        userId: "u",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "pending",
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.delete(fakeId);

      await expect(
        ctx.runMutation(api.bookings.systemActionConfirmBooking, {
          bookingId: fakeId,
        }),
      ).rejects.toThrow("Booking not found");
    });
  });

  it("confirms a pending booking and generates tickets", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const seat = await ctx.db.insert("seats", {
        seatNumber: 3,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat] as any,
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId: seat,
        status: "pending",
      });

      const result = await ctx.runMutation(
        api.bookings.systemActionConfirmBooking,
        { bookingId },
      );

      expect(result.bookingId).toBe(bookingId);

      const updated = await ctx.db.get(bookingId);
      expect(updated?.status).toBe("confirmed");

      const bookedSeat = await ctx.db
        .query("bookedSeats")
        .filter((q) => q.eq(q.field("bookingId"), bookingId))
        .first();
      expect(bookedSeat?.status).toBe("confirmed");

      const tickets = await ctx.db
        .query("tickets")
        .withIndex("by_booking", (q) => q.eq("bookingId", bookingId))
        .collect();
      expect(tickets.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ─── markExpiredSeatsAvailable ──────────────────────────────────────

describe("markExpiredSeatsAvailable", () => {
  it("marks confirmed bookings past end date as used-up", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: pastStr(10),
        endDate: pastStr(5),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "confirmed",
        createdAt: Date.now() - 20 * 86400000,
        updatedAt: Date.now(),
      });

      const result = await ctx.runMutation(
        api.bookings.markExpiredSeatsAvailable,
      );

      expect(result.expiredBookingIds).toContain(bookingId);
      expect(result.availableSeats).toBe(1);

      const updated = await ctx.db.get(bookingId);
      expect(updated?.status).toBe("used-up");
    });
  });

  it("does not touch bookings that are still active", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 30,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "month",
        pricePerSeat: 10000,
        amount: 10000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runMutation(
        api.bookings.markExpiredSeatsAvailable,
      );

      expect(result.expiredBookingIds).not.toContain(bookingId);
      expect(result.availableSeats).toBe(0);
    });
  });

  it("does not touch pending or cancelled bookings", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const pendingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: pastStr(10),
        endDate: pastStr(5),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "pending",
        createdAt: Date.now() - 20 * 86400000,
        updatedAt: Date.now(),
      });

      const cancelledId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: pastStr(10),
        endDate: pastStr(5),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "cancelled",
        createdAt: Date.now() - 20 * 86400000,
        updatedAt: Date.now(),
      });

      const result = await ctx.runMutation(
        api.bookings.markExpiredSeatsAvailable,
      );

      expect(result.expiredBookingIds).not.toContain(pendingId);
      expect(result.expiredBookingIds).not.toContain(cancelledId);
    });
  });
});

// ─── markExpiredPendingBookings ─────────────────────────────────────

describe("markExpiredPendingBookings", () => {
  it("expires pending bookings older than 10 minutes", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: futureStr(1),
        endDate: futureStr(2),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now() - 15 * 60 * 1000, // 15 minutes ago
        updatedAt: Date.now(),
      });

      const result = await ctx.runMutation(
        api.bookings.markExpiredPendingBookings,
      );

      expect(result.expiredBookingIds).toContain(bookingId);

      const updated = await ctx.db.get(bookingId);
      expect(updated?.status).toBe("expired");
    });
  });

  it("does not expire recent pending bookings", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: futureStr(1),
        endDate: futureStr(2),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now(), // just now
        updatedAt: Date.now(),
      });

      const result = await ctx.runMutation(
        api.bookings.markExpiredPendingBookings,
      );

      expect(result.expiredBookingIds).not.toContain(bookingId);

      const updated = await ctx.db.get(bookingId);
      expect(updated?.status).toBe("pending");
    });
  });

  it("expires associated bookedSeats records", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const seat = await ctx.db.insert("seats", {
        seatNumber: 10,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat] as any,
        duration: 1,
        startDate: futureStr(1),
        endDate: futureStr(2),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now() - 15 * 60 * 1000,
        updatedAt: Date.now(),
      });

      const bookedSeatId = await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId: seat,
        status: "pending",
      });

      await ctx.runMutation(api.bookings.markExpiredPendingBookings);

      const bookedSeat = await ctx.db.get(bookedSeatId);
      expect(bookedSeat?.status).toBe("expired");
    });
  });
});

// ─── markCompletedBookingsAsUsedUp ──────────────────────────────────

describe("markCompletedBookingsAsUsedUp", () => {
  it("marks confirmed bookings past end date as used-up", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 6,
        startDate: pastStr(20),
        endDate: pastStr(10),
        durationType: "week",
        pricePerSeat: 600000,
        amount: 600000,
        status: "confirmed",
        createdAt: Date.now() - 20 * 86400000,
        updatedAt: Date.now(),
      });

      const result = await ctx.runMutation(
        api.bookings.markCompletedBookingsAsUsedUp,
      );

      expect(result.usedUpBookings).toContain(bookingId);

      const updated = await ctx.db.get(bookingId);
      expect(updated?.status).toBe("used-up");
    });
  });

  it("does not touch active bookings", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 30,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "month",
        pricePerSeat: 10000,
        amount: 10000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await ctx.runMutation(
        api.bookings.markCompletedBookingsAsUsedUp,
      );

      expect(result.usedUpBookings).not.toContain(bookingId);
    });
  });

  it("updates associated bookedSeats to used-up", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const seat = await ctx.db.insert("seats", {
        seatNumber: 5,
        isBooked: true,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat] as any,
        duration: 1,
        startDate: pastStr(5),
        endDate: pastStr(3),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "confirmed",
        createdAt: Date.now() - 5 * 86400000,
        updatedAt: Date.now(),
      });

      const bookedSeatId = await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId: seat,
        status: "confirmed",
      });

      await ctx.runMutation(api.bookings.markCompletedBookingsAsUsedUp);

      const bookedSeat = await ctx.db.get(bookedSeatId);
      expect(bookedSeat?.status).toBe("used-up");
    });
  });
});

// ─── getFullyBookedDates ────────────────────────────────────────────

describe("getFullyBookedDates", () => {
  it("returns empty when no seats exist", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const result = await ctx.runQuery(api.bookings.getFullyBookedDates);
      expect(result).toEqual([]);
    });
  });

  it("returns empty when not all seats are booked", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const seat1 = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: true,
        createdAt: Date.now(),
      });
      await ctx.db.insert("seats", {
        seatNumber: 2,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat1] as any,
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId: seat1,
        status: "confirmed",
      });

      const result = await ctx.runQuery(api.bookings.getFullyBookedDates);
      expect(result).not.toContain(todayStr());
    });
  });

  it("returns date when all seats are booked for that day", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const seat1 = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: true,
        createdAt: Date.now(),
      });
      const seat2 = await ctx.db.insert("seats", {
        seatNumber: 2,
        isBooked: true,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat1, seat2] as any,
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 300000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId: seat1,
        status: "confirmed",
      });
      await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId: seat2,
        status: "confirmed",
      });

      const result = await ctx.runQuery(api.bookings.getFullyBookedDates);
      expect(result).toContain(todayStr());
    });
  });
});

// ─── createBooking ──────────────────────────────────────────────────

describe("createBooking", () => {
  it("throws when not logged in", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await expect(
        ctx.runMutation(api.bookings.createBooking, {
          userId: "user-1",
          seatIds: [],
          startDate: futureStr(1),
          planKey: "daily",
        }),
      ).rejects.toThrow();
    });
  });

  it("creates a booking when authenticated with valid profile and plan", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("profile", {
        id: "user-1",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        occupation: "None",
      });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: 1500,
        no_of_days: 1,
        description: "One day access",
        features: [],
      });

      const seat = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });

      const result = await authed.runMutation(api.bookings.createBooking, {
        userId: "user-1",
        seatIds: [seat] as any,
        startDate: futureStr(1),
        planKey: "daily",
      });

      expect(result.bookingIds).toHaveLength(1);
      expect(result.amount).toBe(150000);
      expect(result.duration).toBe(1);
      expect(result.userInfo.userEmail).toBe("test@example.com");

      const booking = await ctx.db.get(result.bookingIds[0]);
      expect(booking?.status).toBe("pending");
      expect(booking?.durationType).toBe("day");
    });
  });

  it("throws when profile has no email", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-noemail" });

      await ctx.db.insert("profile", {
        id: "user-noemail",
        firstName: "No",
        lastName: "Email",
        occupation: "None",
      });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: 1500,
        no_of_days: 1,
        description: "One day access",
        features: [],
      });

      await expect(
        authed.runMutation(api.bookings.createBooking, {
          userId: "user-noemail",
          seatIds: [],
          startDate: futureStr(1),
          planKey: "daily",
        }),
      ).rejects.toThrow("email address");
    });
  });

  it("throws when access plan not found", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("profile", {
        id: "user-1",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        occupation: "None",
      });

      await expect(
        authed.runMutation(api.bookings.createBooking, {
          userId: "user-1",
          seatIds: [],
          startDate: futureStr(1),
          planKey: "daily",
        }),
      ).rejects.toThrow("Access plan not found");
    });
  });

  it("throws when start date is in the past", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("profile", {
        id: "user-1",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        occupation: "None",
      });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: 1500,
        no_of_days: 1,
        description: "One day access",
        features: [],
      });

      await expect(
        authed.runMutation(api.bookings.createBooking, {
          userId: "user-1",
          seatIds: [],
          startDate: pastStr(1),
          planKey: "daily",
        }),
      ).rejects.toThrow("past dates");
    });
  });

  it("throws when no seats selected", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("profile", {
        id: "user-1",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        occupation: "None",
      });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: 1500,
        no_of_days: 1,
        description: "One day access",
        features: [],
      });

      await expect(
        authed.runMutation(api.bookings.createBooking, {
          userId: "user-1",
          seatIds: [],
          startDate: futureStr(1),
          planKey: "daily",
        }),
      ).rejects.toThrow("No seats selected");
    });
  });

  it("creates a booking with full_month durationType using calendar_month plan", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("profile", {
        id: "user-1",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        occupation: "None",
      });

      await ctx.db.insert("accessPlans", {
        key: "calendar_month",
        name: "Calendar Month",
        price: 20000,
        no_of_days: 31,
        description: "Full calendar month",
        features: ["priority-check-in", "booking"],
      });

      const seat = await ctx.db.insert("seats", {
        seatNumber: 10,
        isBooked: false,
        createdAt: Date.now(),
      });

      const result = await authed.runMutation(api.bookings.createBooking, {
        userId: "user-1",
        seatIds: [seat] as any,
        startDate: futureStr(1),
        planKey: "calendar_month",
      });

      expect(result.bookingIds).toHaveLength(1);
      expect(result.duration).toBe(31);
      expect(result.amount).toBe(2000000);

      const booking = await ctx.db.get(result.bookingIds[0]);
      expect(booking?.durationType).toBe("month");
      expect(booking?.duration).toBe(31);
    });
  });

  it("throws when user profile is not found", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "ghost" });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: 1500,
        no_of_days: 1,
        description: "One day access",
        features: [],
      });

      await expect(
        authed.runMutation(api.bookings.createBooking, {
          userId: "ghost",
          seatIds: [],
          startDate: futureStr(1),
          planKey: "daily",
        }),
      ).rejects.toThrow("User profile not found");
    });
  });

  it("throws when price per seat is negative", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("profile", {
        id: "user-1",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        occupation: "None",
      });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: -1,
        no_of_days: 1,
        description: "One day access",
        features: [],
      });

      const seat = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });

      await expect(
        authed.runMutation(api.bookings.createBooking, {
          userId: "user-1",
          seatIds: [seat] as any,
          startDate: futureStr(1),
          planKey: "daily",
        }),
      ).rejects.toThrow("non-negative");
    });
  });

  it("throws when plan duration is invalid", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("profile", {
        id: "user-1",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        occupation: "None",
      });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: 1500,
        no_of_days: 0,
        description: "Zero length",
        features: [],
      });

      const seat = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });

      await expect(
        authed.runMutation(api.bookings.createBooking, {
          userId: "user-1",
          seatIds: [seat] as any,
          startDate: futureStr(1),
          planKey: "daily",
        }),
      ).rejects.toThrow("Invalid date range");
    });
  });

  it("throws when booking on a Sunday", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("profile", {
        id: "user-1",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        occupation: "None",
      });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: 1500,
        no_of_days: 1,
        description: "One day access",
        features: [],
      });

      const seat = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });

      // Base clock is Thursday; +3 days is a Sunday in local tz.
      const sunday = format(addDays(new Date(), 3), "yyyy-MM-dd");

      await expect(
        authed.runMutation(api.bookings.createBooking, {
          userId: "user-1",
          seatIds: [seat] as any,
          startDate: sunday,
          planKey: "daily",
        }),
      ).rejects.toThrow("Cannot book on Sundays");
    });
  });

  it("throws when requested seat is already booked for overlapping dates", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("profile", {
        id: "user-1",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        occupation: "None",
      });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: 1500,
        no_of_days: 1,
        description: "One day access",
        features: [],
      });

      const seat = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });

      const existingBookingId = await ctx.db.insert("bookings", {
        userId: "other-user",
        seatIds: [seat] as any,
        duration: 30,
        startDate: todayStr(),
        endDate: futureStr(30),
        durationType: "month",
        status: "confirmed",
        pricePerSeat: 150000,
        amount: 150000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("bookedSeats", {
        bookingId: existingBookingId,
        seatId: seat,
        status: "confirmed",
      });

      await expect(
        authed.runMutation(api.bookings.createBooking, {
          userId: "user-1",
          seatIds: [seat] as any,
          startDate: futureStr(1),
          planKey: "daily",
        }),
      ).rejects.toThrow("not available");
    });
  });
});

// ─── updateBooking ──────────────────────────────────────────────────

describe("updateBooking", () => {
  it("throws when not logged in", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        ctx.runMutation(api.bookings.updateBooking, {
          bookingId,
          startDate: futureStr(1),
          seatIds: [],
          planKey: "daily",
        }),
      ).rejects.toThrow();
    });
  });

  it("throws when booking not found", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: 1500,
        no_of_days: 1,
        description: "One day access",
        features: [],
      });

      const fakeId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "pending",
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.delete(fakeId);

      await expect(
        authed.runMutation(api.bookings.updateBooking, {
          bookingId: fakeId,
          startDate: futureStr(1),
          seatIds: [],
          planKey: "daily",
        }),
      ).rejects.toThrow("Booking not found");
    });
  });

  it("throws when user does not own the booking", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "other-user" });

      await ctx.db.insert("accessPlans", {
        key: "daily",
        name: "Day Pass",
        price: 1500,
        no_of_days: 1,
        description: "One day access",
        features: [],
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        authed.runMutation(api.bookings.updateBooking, {
          bookingId,
          startDate: futureStr(1),
          seatIds: [],
          planKey: "daily",
        }),
      ).rejects.toThrow("not authorized");
    });
  });

  it("throws when booking is not pending", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        authed.runMutation(api.bookings.updateBooking, {
          bookingId,
          startDate: futureStr(1),
          seatIds: [],
          planKey: "daily",
        }),
      ).rejects.toThrow("Only pending bookings can be updated");
    });
  });

  it("updates a pending booking with new dates and seats", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("accessPlans", {
        key: "weekly",
        name: "Weekly",
        price: 6000,
        no_of_days: 6,
        description: "Weekly pass",
        features: [],
      });

      const seat = await ctx.db.insert("seats", {
        seatNumber: 4,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await authed.runMutation(api.bookings.updateBooking, {
        bookingId,
        startDate: futureStr(5),
        seatIds: [seat] as any,
        planKey: "weekly",
      });

      expect(result.success).toBe(true);

      const updated = await ctx.db.get(bookingId);
      expect(updated?.durationType).toBe("week");
      expect(updated?.duration).toBe(6);
      expect(updated?.seatIds).toEqual([seat]);
    });
  });
});

// ─── getUserBookings ────────────────────────────────────────────────

describe("getUserBookings", () => {
  it("throws when not logged in", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await expect(
        ctx.runQuery(api.bookings.getUserBookings),
      ).rejects.toThrow();
    });
  });

  it("returns only the current user's bookings", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("bookings", {
        userId: "user-2",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await authed.runQuery(api.bookings.getUserBookings);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-1");
    });
  });
});

// ─── getUserConfirmedBookings ───────────────────────────────────────

describe("getUserConfirmedBookings", () => {
  it("returns empty array when not logged in", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const result = await ctx.runQuery(api.bookings.getUserConfirmedBookings);
      expect(result).toEqual([]);
    });
  });

  it("returns only confirmed bookings for the user", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: futureStr(1),
        endDate: futureStr(1),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await authed.runQuery(
        api.bookings.getUserConfirmedBookings,
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("confirmed");
      expect(result[0].role).toBe("purchaser");
    });
  });
});

// ─── getUserPendingBookings ─────────────────────────────────────────

describe("getUserPendingBookings", () => {
  it("returns empty array when not logged in", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const result = await ctx.runQuery(api.bookings.getUserPendingBookings);
      expect(result).toEqual([]);
    });
  });

  it("returns only pending bookings for the user", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const result = await authed.runQuery(api.bookings.getUserPendingBookings);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("pending");
    });
  });
});

// ─── cancelBooking ──────────────────────────────────────────────────

describe("cancelBooking", () => {
  it("throws when not logged in", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        ctx.runMutation(api.bookings.cancelBooking, { bookingId }),
      ).rejects.toThrow("Authentication required");
    });
  });

  it("cancels a pending booking owned by the user", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      const seat = await ctx.db.insert("seats", {
        seatNumber: 11,
        isBooked: true,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat] as any,
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const bookedSeatId = await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId: seat,
        status: "pending",
      });

      const result = await authed.runMutation(api.bookings.cancelBooking, {
        bookingId,
      });

      expect(result.success).toBe(true);

      const booking = await ctx.db.get(bookingId);
      expect(booking?.status).toBe("cancelled");

      const bookedSeat = await ctx.db.get(bookedSeatId);
      expect(bookedSeat?.status).toBe("cancelled");
    });
  });

  it("throws when booking status is not cancellable", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 150000,
        amount: 150000,
        status: "expired",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await expect(
        authed.runMutation(api.bookings.cancelBooking, { bookingId }),
      ).rejects.toThrow("Cannot cancel booking with status");
    });
  });

  it("throws when booking not found", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      const fakeId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "pending",
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.delete(fakeId);

      await expect(
        authed.runMutation(api.bookings.cancelBooking, { bookingId: fakeId }),
      ).rejects.toThrow("Booking not found");
    });
  });
});

// ─── claimTicket ────────────────────────────────────────────────────

describe("claimTicket", () => {
  it("throws when not logged in", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        status: "reserved",
      });

      await expect(
        ctx.runMutation(api.bookings.claimTicket, { ticketId }),
      ).rejects.toThrow("Unauthorized");
    });
  });

  it("throws when ticket not found", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        status: "reserved",
      });
      await ctx.db.delete(ticketId);

      await expect(
        authed.runMutation(api.bookings.claimTicket, { ticketId }),
      ).rejects.toThrow("Ticket not found");
    });
  });

  it("throws when ticket already has a holder", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-2" });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: "user-1",
        status: "claimed",
        claimedAt: Date.now(),
      });

      await expect(
        authed.runMutation(api.bookings.claimTicket, { ticketId }),
      ).rejects.toThrow("Seat already claimed");
    });
  });

  it("throws when user already claimed a seat in the same booking", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // already claimed a seat
      await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: "user-1",
        status: "claimed",
        claimedAt: Date.now(),
      });

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        status: "reserved",
      });

      await expect(
        authed.runMutation(api.bookings.claimTicket, { ticketId }),
      ).rejects.toThrow("already claimed a seat");
    });
  });

  it("successfully claims an unclaimed ticket", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-2" });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        status: "reserved",
      });

      await authed.runMutation(api.bookings.claimTicket, { ticketId });

      const ticket = await ctx.db.get(ticketId);
      expect(ticket?.holderUserId).toBe("user-2");
      expect(ticket?.status).toBe("claimed");
      expect(ticket?.claimedAt).toBeDefined();
    });
  });
});

// ─── removeClaim ────────────────────────────────────────────────────

describe("removeClaim", () => {
  it("throws when not logged in", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: "user-1",
        status: "claimed",
        claimedAt: Date.now(),
      });

      await expect(
        ctx.runMutation(api.bookings.removeClaim, { ticketId }),
      ).rejects.toThrow("Unauthorized");
    });
  });

  it("removes claim from a claimed ticket", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: "user-1",
        status: "claimed",
        claimedAt: Date.now(),
      });

      await authed.runMutation(api.bookings.removeClaim, { ticketId });

      const ticket = await ctx.db.get(ticketId);
      expect(ticket?.holderUserId).toBeUndefined();
      expect(ticket?.claimedAt).toBeUndefined();
      expect(ticket?.status).toBe("reserved");
    });
  });

  it("does nothing when ticket is already unclaimed", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        status: "reserved",
      });

      await authed.runMutation(api.bookings.removeClaim, { ticketId });

      const ticket = await ctx.db.get(ticketId);
      expect(ticket?.status).toBe("reserved");
      expect(ticket?.holderUserId).toBeUndefined();
    });
  });

  it("throws when ticket not found", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const authed = t.withIdentity({ profile_id: "user-1" });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        status: "reserved",
      });
      await ctx.db.delete(ticketId);

      await expect(
        authed.runMutation(api.bookings.removeClaim, { ticketId }),
      ).rejects.toThrow("Ticket not found");
    });
  });
});

describe("assignUnassignedSeats", () => {
  it("returns 'No unassigned tickets' when no tickets exist for the day", async () => {
    const t = convexTest(schema, modules);
    const result = await t.mutation(api.bookings.assignUnassignedSeats, {
      day: todayStr(),
    });
    expect(result.assignedCount).toBe(0);
    expect(result.reason).toBe("No unassigned tickets to assign");
  });

  it("returns 'No available seats' when seats exist but all are occupied", async () => {
    const t = convexTest(schema, modules);
    const today = todayStr();

    await t.run(async (ctx) => {
      const seat1 = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });
      const seat2 = await ctx.db.insert("seats", {
        seatNumber: 2,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-x",
        seatIds: [seat1, seat2],
        startDate: today,
        endDate: today,
        duration: 1,
        durationType: "day",
        status: "confirmed",
        amount: 5000,
        pricePerSeat: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId: seat1,
        status: "confirmed",
      });
      await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId: seat2,
        status: "confirmed",
      });

      await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        status: "reserved",
      });
    });

    const result = await t.mutation(api.bookings.assignUnassignedSeats, {
      day: today,
    });
    expect(result.assignedCount).toBe(0);
    expect(result.reason).toBe("No available seats for the day");
  });

  it("assigns unassigned tickets to available seats", async () => {
    const t = convexTest(schema, modules);
    const today = todayStr();

    const { bookingId } = await t.run(async (ctx) => {
      const seat1 = await ctx.db.insert("seats", {
        seatNumber: 10,
        isBooked: false,
        createdAt: Date.now(),
      });
      const seat2 = await ctx.db.insert("seats", {
        seatNumber: 11,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-y",
        seatIds: [],
        startDate: today,
        endDate: today,
        duration: 1,
        durationType: "day",
        status: "confirmed",
        amount: 5000,
        pricePerSeat: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        status: "reserved",
      });
      await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        status: "reserved",
      });

      return { bookingId, seatIds: [seat1, seat2] };
    });

    const result = await t.mutation(api.bookings.assignUnassignedSeats, {
      day: today,
    });

    expect(result.assignedCount).toBe(2);
    expect(result.remainingUnassigned).toBe(0);

    const tickets = await t.run(async (ctx) => {
      const all = await ctx.db
        .query("tickets")
        .filter((q) => q.eq(q.field("bookingId"), bookingId))
        .collect();
      return all;
    });

    expect(tickets.every((t) => t.seatId !== "unassigned")).toBe(true);
  });

  it("partially assigns when fewer seats than tickets", async () => {
    const t = convexTest(schema, modules);
    const today = todayStr();

    await t.run(async (ctx) => {
      await ctx.db.insert("seats", {
        seatNumber: 20,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-z",
        seatIds: [],
        startDate: today,
        endDate: today,
        duration: 1,
        durationType: "day",
        status: "confirmed",
        amount: 5000,
        pricePerSeat: 5000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      for (let i = 0; i < 3; i++) {
        await ctx.db.insert("tickets", {
          bookingId,
          seatId: "unassigned",
          status: "reserved",
        });
      }

      return bookingId;
    });

    const result = await t.mutation(api.bookings.assignUnassignedSeats, {
      day: today,
    });

    expect(result.assignedCount).toBe(1);
    expect(result.remainingUnassigned).toBe(2);
  });
});

describe("deleteBooking error paths", () => {
  it("throws 'Authentication required' when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.bookings.deleteBooking, { bookingId: "fake" as any }),
    ).rejects.toThrow();
  });

  it("throws 'Booking not found' for non-existent booking", async () => {
    const t = convexTest(schema, modules);
    const authed = t.withIdentity({ profile_id: "admin-user" });

    await expect(
      authed.runMutation(api.bookings.deleteBooking, {
        bookingId: "fake" as any,
      }),
    ).rejects.toThrow();
  });
});

describe("markBookingAsExpired error paths", () => {
  it("throws for non-existent booking", async () => {
    const t = convexTest(schema, modules);
    const authed = t.withIdentity({ profile_id: "admin-user" });

    await expect(
      authed.runMutation(api.bookings.markBookingAsExpired, {
        bookingId: "fake" as any,
      }),
    ).rejects.toThrow();
  });
});

// ─── list ───────────────────────────────────────────────────────────

describe("list", () => {
  it("returns planName from matching accessPlan", async () => {
    const t = convexTest(schema, modules);
    await seedAdmin(t);
    const authed = t.withIdentity({ profile_id: "admin-user" });

    await t.run(async (ctx) => {
      await ctx.db.insert("accessPlans", {
        key: "weekly",
        name: "Weekly Pass",
        price: 700000,
        no_of_days: 7,
        description: "7 days",
        features: [],
      });

      await ctx.db.insert("bookings", {
        userId: "u",
        seatIds: [],
        duration: 7,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "week",
        pricePerSeat: 700000,
        amount: 700000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await authed.runQuery(api.bookings.list, {
      month: format(new Date(), "yyyy-MM"),
    });

    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0].planName).toBe("Weekly Pass");
  });

  it("falls back to duration string when no matching plan", async () => {
    const t = convexTest(schema, modules);
    await seedAdmin(t);
    const authed = t.withIdentity({ profile_id: "admin-user" });

    await t.run(async (ctx) => {
      await ctx.db.insert("bookings", {
        userId: "u",
        seatIds: [],
        duration: 13,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "month",
        pricePerSeat: 0,
        amount: 0,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await authed.runQuery(api.bookings.list, {
      month: format(new Date(), "yyyy-MM"),
    });

    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0].planName).toBe("13 days");
  });

  it("throws when unauthenticated", async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.runQuery(api.bookings.list, {
        month: format(new Date(), "yyyy-MM"),
      }),
    ).rejects.toThrow();
  });
});

describe("bookings.getUserActiveBookings", () => {
  it("returns null when no confirmed booking", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.bookings.getUserActiveBookings, {
      userId: "user-no-booking",
    });
    expect(result).toBeNull();
  });

  it("returns booking when confirmed and today is within range", async () => {
    const t = convexTest(schema, modules);
    const now = new Date();
    const start = format(subDays(now, 1), "yyyy-MM-dd");
    const end = format(new Date(now.getTime() + 86400000), "yyyy-MM-dd");

    await t.run(async (ctx) => {
      await ctx.db.insert("bookings", {
        userId: "user-with-booking",
        seatIds: [],
        startDate: start,
        endDate: end,
        duration: 2,
        durationType: "week",
        pricePerSeat: 5000,
        amount: 5000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(api.bookings.getUserActiveBookings, {
      userId: "user-with-booking",
    });

    expect(result).not.toBeNull();
    expect(result?.durationType).toBe("week");
  });

  it("returns null for past booking", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("bookings", {
        userId: "user-past-booking",
        seatIds: [],
        startDate: "2020-01-01",
        endDate: "2020-01-01",
        duration: 1,
        durationType: "day",
        pricePerSeat: 5000,
        amount: 5000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(api.bookings.getUserActiveBookings, {
      userId: "user-past-booking",
    });

    expect(result).toBeNull();
  });
});

describe("bookings.getUserActiveBookings (active)", () => {
  it("returns normalized booking when user has an active confirmed booking", async () => {
    const t = convexTest(schema, modules);
    const date = new Date(2026, 0, 20).getTime();

    await t.run(async (ctx) => {
      await ctx.db.insert("bookings", {
        userId: "user-active",
        seatIds: [],
        duration: 30,
        startDate: todayStr(),
        endDate: futureStr(),
        durationType: "month",
        pricePerSeat: 10000,
        amount: 10000,
        status: "confirmed",
        createdAt: date,
        updatedAt: date,
      });
    });

    const result = await t.query(api.bookings.getUserActiveBookings, {
      userId: "user-active",
    });

    expect(result).not.toBeNull();
    expect(result).toMatchInlineSnapshot(`
      {
        "_creationTime": 1704369600000,
        "_id": "000000000000000000010000bookings",
        "_v": "booking_v1",
        "amount": 10000,
        "createdAt": 1768863600000,
        "duration": 30,
        "durationType": "month",
        "endDate": "2024-02-03",
        "pricePerSeat": 10000,
        "seatIds": [],
        "startDate": "2024-01-04",
        "status": "confirmed",
        "updatedAt": 1768863600000,
        "userId": "user-active",
      }
    `);
  });
});

describe("bookings.exportList", () => {
  it("exports bookings as CSV for admin", async () => {
    const t = convexTest(schema, modules);
    await seedAdmin(t);
    aggregateTest.register(t, "customerStats");

    const adminAuthed = t.withIdentity({
      subject: "admin-user",
      profile_id: "admin-user",
    });

    await t.run(async (ctx) => {
      const userId = "user-export";

      const bookingId = await ctx.db.insert("bookings", {
        userId,
        seatIds: [],
        duration: 1,
        startDate: todayStr(),
        endDate: todayStr(),
        durationType: "day",
        pricePerSeat: 5000,
        amount: 5000,
        status: "confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("payments", {
        bookingId,
        userId,
        amount: 5000,
        method: "bank_transfer",
        status: "completed",
        createdAt: Date.now(),
      });
    });

    const result = await adminAuthed.runAction(api.bookings.exportList, {
      month: format(new Date(), "yyyy-MM"),
    });

    expect(result.storageUrl).toBeTruthy();
  });
});

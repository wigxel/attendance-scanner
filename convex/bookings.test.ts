/* eslint-disable @typescript-eslint/no-explicit-any */
/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { addDays, format } from "date-fns";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function futureStr() {
  return format(addDays(new Date(), 30), "yyyy-MM-dd");
}

describe("generateTickets", () => {
  it("throws ConvexError when booking is not confirmed", async () => {
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

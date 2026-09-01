/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import aggregateTest from "@convex-dev/aggregate/test";
import { convexTest } from "convex-test";
import { addDays, format } from "date-fns";
import { describe, expect, it } from "vitest";
import type { Doc } from "./_generated/dataModel";
import {
  insertRegisterAndAggregate,
  isRegisteredToday,
  processReservationCheckIn,
  updateTodaysRegisterForSubscriber,
} from "./register_common";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function makeDevice(visitorId = "visitor-1") {
  return { browser: "Chrome", name: "Test", visitorId };
}

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function tomorrowStr() {
  return format(addDays(new Date(), 1), "yyyy-MM-dd");
}

function futureStr() {
  return format(addDays(new Date(), 30), "yyyy-MM-dd");
}

describe("updateTodaysRegisterForSubscriber", () => {
  it("patches a free walk-in register to subscriber when booking covers today", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const registerId = await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice(),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });

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

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: "user-1",
        status: "claimed",
        claimedAt: Date.now(),
      });

      const booking = (await ctx.db.get(bookingId)) as Doc<"bookings">;

      const result = await updateTodaysRegisterForSubscriber(ctx as any, {
        actorId: "staff-1" as any,
        userId: "user-1",
        ticketId,
        booking,
      });

      expect(result).toEqual({
        success: true,
        message: "Register updated to subscriber",
      });

      const updated = await ctx.db.get(registerId);
      expect(updated?.ticketId).toBe(ticketId);
      expect(updated?.access).toHaveProperty("kind", "paid");
    });
  });

  it("returns success:false when user has no register for today", async () => {
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

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: "user-1",
        status: "claimed",
        claimedAt: Date.now(),
      });

      const booking = (await ctx.db.get(bookingId)) as Doc<"bookings">;

      const result = await updateTodaysRegisterForSubscriber(ctx as any, {
        actorId: "staff-1" as any,
        userId: "user-1",
        ticketId,
        booking,
      });

      expect(result).toEqual({
        success: false,
        message: "No register found for today",
      });
    });
  });

  it("returns success:false when subscription does not cover today", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice(),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        duration: 30,
        startDate: tomorrowStr(),
        endDate: format(addDays(new Date(), 31), "yyyy-MM-dd"),
        durationType: "month",
        pricePerSeat: 10000,
        amount: 10000,
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

      const booking = (await ctx.db.get(bookingId)) as Doc<"bookings">;

      const result = await updateTodaysRegisterForSubscriber(ctx as any, {
        actorId: "staff-1" as any,
        userId: "user-1",
        ticketId,
        booking,
      });

      expect(result).toEqual({
        success: false,
        message: "Subscription does not cover today",
      });
    });
  });

  it("patches a paid walk-in register to subscriber when booking covers today", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const registerId = await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice(),
        access: {
          kind: "paid",
          planId: "daily",
          amountInKobo: 5000,
          paymentMethod: "cash",
          _v: "2",
        },
        admitted_by: "staff-1",
      });

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

      const ticketId = await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: "user-1",
        status: "claimed",
        claimedAt: Date.now(),
      });

      const booking = (await ctx.db.get(bookingId)) as Doc<"bookings">;

      const result = await updateTodaysRegisterForSubscriber(ctx as any, {
        actorId: "staff-1" as any,
        userId: "user-1",
        ticketId,
        booking,
      });

      expect(result).toEqual({
        success: true,
        message: "Register updated to subscriber",
      });

      const updated = await ctx.db.get(registerId);
      expect(updated?.ticketId).toBe(ticketId);
    });
  });
});

describe("isRegisteredToday", () => {
  it("returns true when user has a register entry today", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "user-1",
        timestamp: new Date().toISOString(),
        source: "web",
        device: makeDevice(),
        access: { kind: "free" },
        admitted_by: "staff-1",
      });

      const result = await isRegisteredToday(ctx as any, "user-1");
      expect(result).toBe(true);
    });
  });

  it("returns false when user has no register entry today", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      const result = await isRegisteredToday(ctx as any, "user-999");
      expect(result).toBe(false);
    });
  });
});

describe("insertRegisterAndAggregate", () => {
  it("inserts a register record and aggregates", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    await t.run(async (ctx) => {
      await insertRegisterAndAggregate(ctx as any, {
        userId: "user-1",
        device: makeDevice(),
        admittedBy: "staff-1",
        timestamp: new Date().toISOString(),
        access: { kind: "free" },
        method: "qr",
      });

      const records = await ctx.db.query("daily_register").collect();
      expect(records).toHaveLength(1);
      expect(records[0].userId).toBe("user-1");
    });
  });
});

describe("processReservationCheckIn", () => {
  it("throws when no active reservation found", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

    await t.run(async (ctx) => {
      await expect(
        processReservationCheckIn(ctx as any, {
          userId: "nonexistent-user",
          device: makeDevice(),
          admittedBy: "staff-1",
        }),
      ).rejects.toThrow("No active reservation found");
    });
  });

  it("checks in user with active reservation", async () => {
    const t = convexTest(schema, modules);
    aggregateTest.register(t, "customerStats");

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

      await ctx.db.insert("tickets", {
        bookingId,
        seatId: "unassigned",
        holderUserId: "user-1",
        status: "claimed",
        claimedAt: Date.now(),
      });

      await processReservationCheckIn(ctx as any, {
        userId: "user-1",
        device: makeDevice(),
        admittedBy: "staff-1",
      });

      const records = await ctx.db.query("daily_register").collect();
      expect(records).toHaveLength(1);
      expect(records[0].userId).toBe("user-1");
    });
  });
});

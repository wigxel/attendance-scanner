/* eslint-disable @typescript-eslint/no-explicit-any */
/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { addDays, format } from "date-fns";
import { describe, expect, it } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { updateTodaysRegisterForSubscriber } from "./register_common";
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

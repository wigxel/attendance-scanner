/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

describe("verifyPayment", () => {
  it("returns exists=false when no booking matches", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.webhooks.verifyPayment, {
      reference: "nonexistent-ref",
    });
    expect(result.exists).toBe(false);
    expect(result.status).toBeNull();
  });

  it("returns booking details when reference matches", async () => {
    const t = convexTest(schema, modules);

    const bookingId = await t.run(async (ctx) => {
      return await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        startDate: todayStr(),
        endDate: todayStr(),
        duration: 1,
        durationType: "day",
        pricePerSeat: 5000,
        amount: 5000,
        status: "confirmed",
        paymentReference: "ref-abc-123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(api.webhooks.verifyPayment, {
      reference: "ref-abc-123",
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "amount": 5000,
        "bookingId": "${bookingId}",
        "exists": true,
        "status": "confirmed",
      }
    `);
  });
});

describe("onPaystackChargeSuccess", () => {
  it("returns error when reference is missing", async () => {
    const t = convexTest(schema, modules);
    const result = await t.runMutation(api.webhooks.onPaystackChargeSuccess, {
      data: { amount: 5000, customer: { email: "a@b.com" } },
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "error": "missing_reference",
        "success": false,
      }
    `);
  });

  it("returns error when amount is missing", async () => {
    const t = convexTest(schema, modules);
    const result = await t.runMutation(api.webhooks.onPaystackChargeSuccess, {
      data: { reference: "ref-1", customer: { email: "a@b.com" } },
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "error": "missing_amount",
        "success": false,
      }
    `);
  });

  it("returns already_processed for confirmed booking", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        startDate: todayStr(),
        endDate: todayStr(),
        duration: 1,
        durationType: "day",
        pricePerSeat: 5000,
        amount: 5000,
        status: "confirmed",
        paymentReference: "ref-confirmed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.runMutation(api.webhooks.onPaystackChargeSuccess, {
      data: {
        reference: "ref-confirmed",
        amount: 5000,
        customer: { email: "a@b.com" },
      },
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "message": "already_processed",
        "success": true,
      }
    `);
  });

  it("returns booking_not_found when no matching booking", async () => {
    const t = convexTest(schema, modules);

    const result = await t.runMutation(api.webhooks.onPaystackChargeSuccess, {
      data: {
        reference: "ref-nomatch",
        amount: 99999,
        customer: { email: "a@b.com" },
      },
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "error": "booking_not_found",
        "success": false,
      }
    `);
  });

  it("confirms pending booking with matching amount via metadata", async () => {
    const t = convexTest(schema, modules);

    const bookingId = await t.run(async (ctx) => {
      return await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [],
        startDate: todayStr(),
        endDate: todayStr(),
        duration: 1,
        durationType: "day",
        pricePerSeat: 5000,
        amount: 5000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.runMutation(api.webhooks.onPaystackChargeSuccess, {
      data: {
        reference: "ref-meta",
        amount: 5000,
        customer: { email: "a@b.com" },
        metadata: { bookingId },
      },
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "bookingId": "${bookingId}",
        "success": true,
      }
    `);

    const booking = await t.run(async (ctx) => {
      return await ctx.db.get(bookingId);
    });
    expect(booking!.status).toBe("confirmed");
    expect(booking!.paymentReference).toBe("ref-meta");
  });

  it("confirms pending booking by matching amount when no metadata", async () => {
    const t = convexTest(schema, modules);

    const bookingId = await t.run(async (ctx) => {
      return await ctx.db.insert("bookings", {
        userId: "user-2",
        seatIds: [],
        startDate: todayStr(),
        endDate: todayStr(),
        duration: 1,
        durationType: "day",
        pricePerSeat: 7500,
        amount: 7500,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.runMutation(api.webhooks.onPaystackChargeSuccess, {
      data: {
        reference: "ref-amount-match",
        amount: 7500,
        customer: { email: "b@c.com" },
      },
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "bookingId": "${bookingId}",
        "success": true,
      }
    `);

    const booking = await t.run(async (ctx) => {
      return await ctx.db.get(bookingId);
    });
    expect(booking!.status).toBe("confirmed");
  });

  it("returns amount_mismatch when amount does not match", async () => {
    const t = convexTest(schema, modules);

    const bookingId = await t.run(async (ctx) => {
      return await ctx.db.insert("bookings", {
        userId: "user-3",
        seatIds: [],
        startDate: todayStr(),
        endDate: todayStr(),
        duration: 1,
        durationType: "day",
        pricePerSeat: 5000,
        amount: 5000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const result = await t.runMutation(api.webhooks.onPaystackChargeSuccess, {
      data: {
        reference: "ref-mismatch",
        amount: 9999,
        customer: { email: "c@d.com" },
        metadata: { bookingId },
      },
    });

    expect(result).toMatchInlineSnapshot(`
      {
        "error": "amount_mismatch",
        "success": false,
      }
    `);
  });

  it("confirms bookedSeats when booking is confirmed", async () => {
    const t = convexTest(schema, modules);

    const { bookingId } = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        seatNumber: 50,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-4",
        seatIds: [seatId],
        startDate: todayStr(),
        endDate: todayStr(),
        duration: 1,
        durationType: "day",
        pricePerSeat: 5000,
        amount: 5000,
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("bookedSeats", {
        bookingId,
        seatId,
        status: "pending",
      });

      return { bookingId, seatId };
    });

    await t.runMutation(api.webhooks.onPaystackChargeSuccess, {
      data: {
        reference: "ref-seats",
        amount: 5000,
        customer: { email: "d@e.com" },
        metadata: { bookingId },
      },
    });

    const bookedSeat = await t.run(async (ctx) => {
      const records = await ctx.db
        .query("bookedSeats")
        .filter((q) => q.eq(q.field("bookingId"), bookingId))
        .collect();
      return records[0];
    });

    expect(bookedSeat.status).toBe("confirmed");
  });
});

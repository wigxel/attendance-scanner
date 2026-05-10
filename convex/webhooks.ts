import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, query } from "./_generated/server";

type PaystackEventData = {
  reference: string;
  amount: number;
  currency?: string;
  customer: {
    email: string;
  };
  metadata?: {
    bookingId?: string;
  };
};

/**
 * Verify a payment by reference.
 * Returns payment status for frontend validation.
 */
export const verifyPayment = query({
  args: { reference: v.string() },
  handler: async (ctx, { reference }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_payment_reference", (q) =>
        q.eq("paymentReference", reference),
      )
      .first();

    if (!booking) {
      return { exists: false, status: null };
    }

    return {
      exists: true,
      status: booking.status,
      amount: booking.amount,
      bookingId: booking._id,
    };
  },
});

/**
 * Paystack charge.success webhook:
 * Processes successful payments with verification.
 *
 * Verification steps:
 * 1. Validate amount matches booking amount
 * 2. Check if already processed (idempotency)
 * 3. Confirm booking
 */
export const onPaystackChargeSuccess = internalMutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const payload = data as PaystackEventData;
    const reference = payload.reference;

    if (!reference) {
      console.warn("Paystack charge.success missing reference.");
      return { success: false, error: "missing_reference" };
    }

    const amount = payload.amount;
    if (!amount) {
      console.warn("Paystack charge.success missing amount.");
      return { success: false, error: "missing_amount" };
    }

    // Check if already processed (idempotency)
    const existingBooking = await ctx.db
      .query("bookings")
      .withIndex("by_payment_reference", (q) =>
        q.eq("paymentReference", reference),
      )
      .first();

    if (existingBooking) {
      if (existingBooking.status === "confirmed") {
        console.log(`Payment ${reference} already processed.`);
        return { success: true, message: "already_processed" };
      }
      // If exists but not confirmed, treat as potential duplicate
      console.warn(
        `Payment ${reference} has existing booking but not confirmed.`,
      );
    }

    // Get booking from metadata or find by matching amount
    const bookingId = payload.metadata?.bookingId as Id<"bookings"> | undefined;
    let booking = bookingId ? await ctx.db.get(bookingId) : null;

    // If no bookingId in metadata, find by amount
    if (!booking && amount) {
      const pendingBookings = await ctx.db
        .query("bookings")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect();

      const matchingAmount = pendingBookings.filter((b) => b.amount === amount);
      booking = matchingAmount[0];
    }

    if (!booking) {
      console.warn(
        `No matching booking found for payment ${reference}, amount ${amount}`,
      );
      return { success: false, error: "booking_not_found" };
    }

    // Verify amount matches
    const bookingDoc = await ctx.db.get(booking._id);
    if (!bookingDoc) {
      return { success: false, error: "booking_not_found" };
    }

    if (bookingDoc.amount !== amount) {
      console.error(
        `Amount mismatch for booking ${bookingDoc._id}: expected ${bookingDoc.amount}, got ${amount}`,
      );
      return { success: false, error: "amount_mismatch" };
    }

    // Update booking with payment reference and confirm
    await ctx.db.patch(bookingDoc._id, {
      paymentReference: reference,
      status: "confirmed",
    });

    // Update bookedSeats
    const bookedSeats = await ctx.db
      .query("bookedSeats")
      .filter((q) => q.eq(q.field("bookingId"), bookingDoc._id))
      .collect();

    for (const bookedSeat of bookedSeats) {
      await ctx.db.patch(bookedSeat._id, {
        status: "confirmed",
      });
    }

    console.log(`Payment ${reference} confirmed booking ${booking._id}`);
    return { success: true, bookingId: booking._id };
  },
});

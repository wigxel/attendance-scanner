import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { ConvexError } from "convex/values";
import { endOfDay, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { api, internal } from "./_generated/api";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import { subscriberUpdateAudit } from "./booking_audit";
import { visitsAggregate } from "./customers";
import { type AccessStruct, PlanImpl } from "./shared";

export async function isRegisteredToday(
  ctx: GenericQueryCtx<DataModel>,
  userId: string,
): Promise<boolean> {
  const today = new Date();
  const start = startOfDay(today).toISOString();
  const end = endOfDay(today).toISOString();

  const entry = await ctx.db
    .query("daily_register")
    .filter((q) =>
      q.and(
        q.eq(q.field("userId"), userId),
        q.gte(q.field("timestamp"), start),
        q.lte(q.field("timestamp"), end),
      ),
    )
    .first();

  return entry !== null;
}

export async function insertRegisterAndAggregate(
  ctx: GenericMutationCtx<DataModel>,
  params: {
    userId: string;
    device: { name: string; visitorId: string; browser: string };
    admittedBy: string;
    timestamp: string;
    access: AccessStruct;
    ticketId?: Id<"tickets">;
    method: "one-tap" | "qr";
  },
): Promise<void> {
  const user_record = ctx.db.get(params?.userId as Id<"users">);

  if (user_record == null) {
    throw new ConvexError("User doesn't exist");
  }

  const id = await ctx.db.insert("daily_register", {
    userId: params.userId,
    device: params.device,
    source: "web" as const,
    admitted_by: params.admittedBy,
    timestamp: params.timestamp,
    access: params.access,
    ticketId: params.ticketId,
    method: params.method,
  });

  const entry = await ctx.db.get(id);
  if (entry) {
    await visitsAggregate.insert(ctx, entry);
  }
}

export async function processReservationCheckIn(
  ctx: GenericMutationCtx<DataModel>,
  params: {
    userId: string;
    device: { name: string; visitorId: string; browser: string };
    admittedBy: string;
  },
): Promise<void> {
  const reservation = await ctx.runQuery(
    api.myFunctions.getUserActiveReservation,
    { userId: params.userId },
  );

  if (!reservation) {
    throw new ConvexError("No active reservation found.");
  }

  const booking = await ctx.db.get(reservation.bookingId as Id<"bookings">);
  if (!booking) {
    throw new ConvexError("Booking not found.");
  }

  const tickets = await (async function getTickets() {
    const existing = await ctx.db
      .query("tickets")
      .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
      .collect();

    if (existing.length > 0) return existing;

    await ctx.runMutation(api.bookings.generateTickets, {
      bookingId: booking._id,
    });

    return ctx.db
      .query("tickets")
      .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
      .collect();
  })();

  const ticket =
    tickets.find((t) => t.holderUserId === params.userId) ?? tickets[0];

  if (!ticket) {
    throw new ConvexError("Ticket not found.");
  }

  await insertRegisterAndAggregate(ctx, {
    userId: params.userId,
    device: params.device,
    admittedBy: params.admittedBy,
    timestamp: new Date().toISOString(),
    access: PlanImpl.fromBooking(booking),
    ticketId: ticket._id,
    method: "qr",
  });
}

export async function updateTodaysRegisterForSubscriber(
  ctx: GenericMutationCtx<DataModel>,
  params: {
    actorId: Id<"users"> | "system";
    userId: string;
    ticketId: Id<"tickets">;
    booking: Doc<"bookings">;
  },
): Promise<{ success: boolean; message: string }> {
  const today = new Date();

  if (
    !isWithinInterval(today, {
      start: parseISO(params.booking.startDate),
      end: parseISO(params.booking.endDate),
    })
  ) {
    return { success: false, message: "Subscription does not cover today" };
  }

  const dayStart = startOfDay(today).toISOString();
  const dayEnd = endOfDay(today).toISOString();

  const existing = await ctx.db
    .query("daily_register")
    .withIndex("user", (q) => q.eq("userId", params.userId))
    .filter((q) =>
      q.and(
        q.gte(q.field("timestamp"), dayStart),
        q.lte(q.field("timestamp"), dayEnd),
      ),
    )
    .first();

  if (!existing) {
    return { success: false, message: "No register found for today" };
  }

  await ctx.db.patch(existing._id, {
    ticketId: params.ticketId,
    access: PlanImpl.fromBooking(params.booking),
  });

  await ctx.scheduler.runAfter(
    0,
    internal.audit.log,
    subscriberUpdateAudit({
      actorId: params.actorId,
      targetId: existing._id,
      userId: params.userId,
      bookingId: params.booking._id,
      ticketId: params.ticketId,
    }),
  );

  return { success: true, message: "Register updated to subscriber" };
}

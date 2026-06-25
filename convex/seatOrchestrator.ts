import type { GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "./_generated/dataModel";

// --- Types ---

export interface UnassignedTicket {
  ticketId: Id<"tickets">;
  bookingId: Id<"bookings">;
}

export interface SeatAssignment {
  ticketId: Id<"tickets">;
  seatId: Id<"seats">;
  bookingId: Id<"bookings">;
}

export interface AssignmentResult {
  assignments: SeatAssignment[];
  assignedCount: number;
  remainingUnassigned: number;
  reason: string | null;
}

// --- Pure core function ---

export function assignSeats(
  availableSeatIds: Id<"seats">[],
  unassignedTickets: UnassignedTicket[],
): AssignmentResult {
  if (unassignedTickets.length === 0) {
    return {
      assignments: [],
      assignedCount: 0,
      remainingUnassigned: 0,
      reason: "No unassigned tickets to assign",
    };
  }

  if (availableSeatIds.length === 0) {
    return {
      assignments: [],
      assignedCount: 0,
      remainingUnassigned: unassignedTickets.length,
      reason: "No available seats for the day",
    };
  }

  const pairs = Math.min(availableSeatIds.length, unassignedTickets.length);
  const assignments: SeatAssignment[] = [];

  for (let i = 0; i < pairs; i++) {
    assignments.push({
      ticketId: unassignedTickets[i].ticketId,
      seatId: availableSeatIds[i],
      bookingId: unassignedTickets[i].bookingId,
    });
  }

  const remaining = unassignedTickets.length - pairs;
  return {
    assignments,
    assignedCount: pairs,
    remainingUnassigned: remaining,
    reason:
      remaining > 0
        ? `Not enough available seats for ${remaining} unassigned ticket(s)`
        : null,
  };
}

// --- Query helpers (internal) ---

export async function getAvailableSeatsForDay(
  ctx: GenericQueryCtx<DataModel>,
  day: string,
): Promise<Id<"seats">[]> {
  const allSeats = await ctx.db.query("seats").collect();

  const overlappingBookings = (
    await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect()
  ).filter((b: Doc<"bookings">) => b.startDate <= day && b.endDate >= day);

  const occupiedSeatIds = new Set<Id<"seats">>();
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
      if (bs.seatId !== "unassigned") {
        occupiedSeatIds.add(bs.seatId);
      }
    }
  }

  return allSeats
    .filter((seat: Doc<"seats">) => !occupiedSeatIds.has(seat._id))
    .map((seat: Doc<"seats">) => seat._id);
}

export async function getUnassignedTicketsForDay(
  ctx: GenericQueryCtx<DataModel>,
  day: string,
): Promise<UnassignedTicket[]> {
  const overlappingBookings = (
    await ctx.db
      .query("bookings")
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect()
  ).filter((b: Doc<"bookings">) => b.startDate <= day && b.endDate >= day);

  const result: UnassignedTicket[] = [];
  for (const booking of overlappingBookings) {
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
      .collect();

    for (const ticket of tickets) {
      if (ticket.seatId === "unassigned") {
        result.push({ ticketId: ticket._id, bookingId: booking._id });
      }
    }
  }

  return result;
}

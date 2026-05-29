import { describe, expect, it } from "vitest";
import { assignSeats } from "./seat-orchestrator";
import type { Id } from "./_generated/dataModel";

const tid = (n: number) => `ticket-${n}` as Id<"tickets">;
const bid = (n: number) => `booking-${n}` as Id<"bookings">;
const sid = (n: number) => `seat-${n}` as Id<"seats">;

describe("assignSeats", () => {
  it("should assign all when enough seats are available", () => {
    const result = assignSeats(
      [sid(1), sid(2), sid(3)],
      [
        { ticketId: tid(1), bookingId: bid(1) },
        { ticketId: tid(2), bookingId: bid(1) },
        { ticketId: tid(3), bookingId: bid(2) },
      ],
    );

    expect(result.assignments).toHaveLength(3);
    expect(result.assignments[0]).toEqual({
      ticketId: tid(1),
      seatId: sid(1),
      bookingId: bid(1),
    });
    expect(result.assignments[1]).toEqual({
      ticketId: tid(2),
      seatId: sid(2),
      bookingId: bid(1),
    });
    expect(result.assignments[2]).toEqual({
      ticketId: tid(3),
      seatId: sid(3),
      bookingId: bid(2),
    });
    expect(result.assignedCount).toBe(3);
    expect(result.remainingUnassigned).toBe(0);
    expect(result.reason).toBeNull();
  });

  it("should assign partial when not enough seats", () => {
    const result = assignSeats(
      [sid(1)],
      [
        { ticketId: tid(1), bookingId: bid(1) },
        { ticketId: tid(2), bookingId: bid(1) },
        { ticketId: tid(3), bookingId: bid(2) },
      ],
    );

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]).toEqual({
      ticketId: tid(1),
      seatId: sid(1),
      bookingId: bid(1),
    });
    expect(result.assignedCount).toBe(1);
    expect(result.remainingUnassigned).toBe(2);
    expect(result.reason).toBe(
      "Not enough available seats for 2 unassigned ticket(s)",
    );
  });

  it("should return no assignments when no seats available", () => {
    const result = assignSeats([], [{ ticketId: tid(1), bookingId: bid(1) }]);

    expect(result.assignments).toHaveLength(0);
    expect(result.assignedCount).toBe(0);
    expect(result.remainingUnassigned).toBe(1);
    expect(result.reason).toBe("No available seats for the day");
  });

  it("should return no assignments when no unassigned tickets", () => {
    const result = assignSeats([sid(1), sid(2)], []);

    expect(result.assignments).toHaveLength(0);
    expect(result.assignedCount).toBe(0);
    expect(result.remainingUnassigned).toBe(0);
    expect(result.reason).toBe("No unassigned tickets to assign");
  });

  it("should assign all when counts match exactly", () => {
    const result = assignSeats(
      [sid(1), sid(2), sid(3)],
      [
        { ticketId: tid(1), bookingId: bid(1) },
        { ticketId: tid(2), bookingId: bid(2) },
        { ticketId: tid(3), bookingId: bid(3) },
      ],
    );

    expect(result.assignments).toHaveLength(3);
    expect(result.assignedCount).toBe(3);
    expect(result.remainingUnassigned).toBe(0);
    expect(result.reason).toBeNull();
  });

  it("should handle both empty arrays", () => {
    const result = assignSeats([], []);

    expect(result.assignments).toHaveLength(0);
    expect(result.assignedCount).toBe(0);
    expect(result.remainingUnassigned).toBe(0);
    expect(result.reason).toBe("No unassigned tickets to assign");
  });

  it("should handle more seats than tickets", () => {
    const result = assignSeats(
      [sid(1), sid(2), sid(3), sid(4), sid(5)],
      [{ ticketId: tid(1), bookingId: bid(1) }],
    );

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]).toEqual({
      ticketId: tid(1),
      seatId: sid(1),
      bookingId: bid(1),
    });
    expect(result.assignedCount).toBe(1);
    expect(result.remainingUnassigned).toBe(0);
    expect(result.reason).toBeNull();
  });

  it("should assign in order (first come first served)", () => {
    const result = assignSeats(
      [sid(1), sid(2)],
      [
        { ticketId: tid(10), bookingId: bid(1) },
        { ticketId: tid(20), bookingId: bid(1) },
      ],
    );

    expect(result.assignments[0].ticketId).toBe(tid(10));
    expect(result.assignments[0].seatId).toBe(sid(1));
    expect(result.assignments[1].ticketId).toBe(tid(20));
    expect(result.assignments[1].seatId).toBe(sid(2));
  });
});

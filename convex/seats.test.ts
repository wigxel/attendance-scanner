/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { format, subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function daysAgo(n: number) {
  return format(subDays(new Date(), n), "yyyy-MM-dd");
}

describe("getAllSeats", () => {
  it("returns empty array when no seats exist", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.seats.getAllSeats, {});
    expect(result).toEqual([]);
  });

  it("returns all seats", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });
      await ctx.db.insert("seats", {
        seatNumber: 2,
        isBooked: true,
        createdAt: Date.now(),
      });
    });

    const result = await t.query(api.seats.getAllSeats, {});
    expect(result).toHaveLength(2);
  });
});

describe("getAvailableSeats", () => {
  it("returns all unbooked seats when no bookings exist", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });
      await ctx.db.insert("seats", {
        seatNumber: 2,
        isBooked: false,
        createdAt: Date.now(),
      });
    });

    const result = await t.query(api.seats.getAvailableSeats, {
      startDate: todayStr(),
      endDate: todayStr(),
    });

    expect(result.totalSeats).toBe(2);
    expect(result.occupiedSeats).toBe(0);
    expect(result.availableSeats).toHaveLength(2);
  });

  it("excludes seats occupied by overlapping bookings", async () => {
    const t = convexTest(schema, modules);
    const today = todayStr();

    await t.run(async (ctx) => {
      const seat1 = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });
      await ctx.db.insert("seats", {
        seatNumber: 2,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat1],
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
    });

    const result = await t.query(api.seats.getAvailableSeats, {
      startDate: today,
      endDate: today,
    });

    expect(result.totalSeats).toBe(2);
    expect(result.occupiedSeats).toBe(1);
    expect(result.availableSeats).toHaveLength(1);
    expect(result.availableSeats[0].seatNumber).toBe(2);
  });

  it("returns all seats when booking dates do not overlap", async () => {
    const t = convexTest(schema, modules);
    const today = todayStr();
    const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

    await t.run(async (ctx) => {
      const seat1 = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat1],
        startDate: daysAgo(5),
        endDate: daysAgo(3),
        duration: 3,
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
    });

    const result = await t.query(api.seats.getAvailableSeats, {
      startDate: today,
      endDate: tomorrow,
    });

    expect(result.occupiedSeats).toBe(0);
    expect(result.availableSeats).toHaveLength(1);
  });

  it("ignores cancelled bookings", async () => {
    const t = convexTest(schema, modules);
    const today = todayStr();

    await t.run(async (ctx) => {
      const seat1 = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat1],
        startDate: today,
        endDate: today,
        duration: 1,
        durationType: "day",
        status: "cancelled",
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
    });

    const result = await t.query(api.seats.getAvailableSeats, {
      startDate: today,
      endDate: today,
    });

    expect(result.occupiedSeats).toBe(0);
  });
});

describe("getAllSeatsForDateRange", () => {
  it("marks seats as booked only when overlapping", async () => {
    const t = convexTest(schema, modules);
    const today = todayStr();

    await t.run(async (ctx) => {
      const seat1 = await ctx.db.insert("seats", {
        seatNumber: 1,
        isBooked: false,
        createdAt: Date.now(),
      });
      await ctx.db.insert("seats", {
        seatNumber: 2,
        isBooked: false,
        createdAt: Date.now(),
      });

      const bookingId = await ctx.db.insert("bookings", {
        userId: "user-1",
        seatIds: [seat1],
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
    });

    const result = await t.query(api.seats.getAllSeatsForDateRange, {
      startDate: today,
      endDate: today,
    });

    expect(result).toHaveLength(2);
    const booked = result.find((s) => s.seatNumber === 1);
    const free = result.find((s) => s.seatNumber === 2);
    expect(booked!.isBooked).toBe(true);
    expect(free!.isBooked).toBe(false);
  });
});

describe("getSeatsById", () => {
  it("returns seats for given IDs", async () => {
    const t = convexTest(schema, modules);

    const seatIds = await t.run(async (ctx) => {
      const s1 = await ctx.db.insert("seats", {
        seatNumber: 5,
        isBooked: false,
        createdAt: Date.now(),
      });
      const s2 = await ctx.db.insert("seats", {
        seatNumber: 6,
        isBooked: false,
        createdAt: Date.now(),
      });
      return [s1, s2];
    });

    const result = await t.query(api.seats.getSeatsById, { seatIds });
    expect(result).toHaveLength(2);
  });

  it("filters out null results for deleted IDs", async () => {
    const t = convexTest(schema, modules);

    const { seatId, deletedId } = await t.run(async (ctx) => {
      const seatId = await ctx.db.insert("seats", {
        seatNumber: 7,
        isBooked: false,
        createdAt: Date.now(),
      });
      const s2 = await ctx.db.insert("seats", {
        seatNumber: 8,
        isBooked: false,
        createdAt: Date.now(),
      });
      await ctx.db.delete(s2);
      return { seatId, deletedId: s2 };
    });

    const result = await t.query(api.seats.getSeatsById, {
      seatIds: [seatId, deletedId],
    });
    expect(result).toHaveLength(1);
  });
});

describe("getSeatLayout", () => {
  it("returns null when no config exists", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.seats.getSeatLayout, {});
    expect(result).toBeNull();
  });

  it("returns parsed layout when config exists", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("config", {
        key: "seat_layout",
        value: JSON.stringify({
          seats: [{ type: "desk", index: "0-0" }],
          rowCount: 1,
          columnCount: 1,
        }),
      });
    });

    const result = await t.query(api.seats.getSeatLayout, {});
    expect(result).toMatchInlineSnapshot(`
      {
        "columnCount": 1,
        "rowCount": 1,
        "seats": [
          {
            "index": "0-0",
            "type": "desk",
          },
        ],
      }
    `);
  });

  it("returns null when config value is invalid JSON", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("config", {
        key: "seat_layout",
        value: "not-json",
      });
    });

    const result = await t.query(api.seats.getSeatLayout, {});
    expect(result).toBeNull();
  });
});

describe("saveSeatLayout", () => {
  it("creates new config when none exists", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.seats.saveSeatLayout, {
      seats: [
        {
          type: "desk",
          index: "0-0",
          position: { rowIndex: 0, colIndex: 0 },
        },
      ],
      rowCount: 1,
      columnCount: 1,
    });

    const result = await t.query(api.seats.getSeatLayout, {});
    expect(result).toMatchInlineSnapshot(`
      {
        "columnCount": 1,
        "rowCount": 1,
        "seats": [
          {
            "index": "0-0",
            "position": {
              "colIndex": 0,
              "rowIndex": 0,
            },
            "type": "desk",
          },
        ],
      }
    `);
  });

  it("updates existing config", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("config", {
        key: "seat_layout",
        value: JSON.stringify({ seats: [], rowCount: 0, columnCount: 0 }),
      });
    });

    await t.mutation(api.seats.saveSeatLayout, {
      seats: [
        { type: "desk", index: "0-0", position: { rowIndex: 0, colIndex: 0 } },
      ],
      rowCount: 2,
      columnCount: 3,
    });

    const result = await t.query(api.seats.getSeatLayout, {});
    expect(result!.rowCount).toBe(2);
    expect(result!.columnCount).toBe(3);
  });
});

describe("checkSeatAvailability", () => {
  it("throws for non-existent seat", async () => {
    const t = convexTest(schema, modules);

    const fakeId = await t.run(async (ctx) => {
      const seat = await ctx.db.insert("seats", {
        seatNumber: 99,
        isBooked: false,
        createdAt: Date.now(),
      });
      await ctx.db.delete(seat);
      return seat;
    });

    await expect(
      t.query(api.seats.checkSeatAvailability, {
        seatId: fakeId,
        startDate: todayStr(),
        planKey: "daily",
      }),
    ).rejects.toThrow();
  });
});

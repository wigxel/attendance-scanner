/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { TEN_MIN, toDayKey } from "./lib";

const modules = import.meta.glob("./**/*.ts");

// helpers to create bucketStart at day 00:00 + offset
const DAY_MS = 24 * 60 * 60 * 1000;
const dayStart = (daysFromEpoch: number) => daysFromEpoch * DAY_MS;

describe("dailyTemperatureCalendar stored async", () => {
  it("empty when no daily rows", async () => {
    const testEnvironment = convexTest(schema, modules);
    const result = await testEnvironment.query(api.index.getDailyCalendar, {
      roomId: "all",
      days: 7,
    });
    expect(result).toHaveLength(0);
  });

  it("aggregates 10m buckets into daily avg after aggregateDaily", async () => {
    const testEnvironment = convexTest(schema, modules);
    // seed 3 buckets same day (day 10)
    const baseDay = dayStart(10);
    await testEnvironment.mutation(api.index.store, {
      temperature: 20,
      humidity: 40,
      pressure: 1000,
      timestamp: baseDay + 1000,
    });
    await testEnvironment.mutation(api.index.store, {
      temperature: 24,
      humidity: 50,
      pressure: 1020,
      timestamp: baseDay + 2000,
    });
    await testEnvironment.mutation(api.index.store, {
      temperature: 22,
      humidity: 45,
      pressure: 1010,
      timestamp: baseDay + 3000,
    });
    await testEnvironment.mutation(api.index.smoothAggregations, {});
    await testEnvironment.mutation(api.index.aggregateDaily, {});

    const daily = await testEnvironment.query(api.index.getDailyCalendar, {
      roomId: "all",
      days: 7,
    });
    expect(daily).toHaveLength(1);
    expect(daily[0].date).toBe("1970-01-11");
    expect(daily[0].avgTemperature).toBeCloseTo(22, 0);
    expect(daily[0].count).toBe(3);
  });

  it("wall-clock day boundary split", async () => {
    const testEnvironment = convexTest(schema, modules);
    const day10 = dayStart(10);
    const day11 = dayStart(11);
    await testEnvironment.mutation(api.index.store, {
      temperature: 20,
      humidity: 40,
      pressure: 1000,
      timestamp: day10 + TEN_MIN - 1000,
    });
    await testEnvironment.mutation(api.index.store, {
      temperature: 30,
      humidity: 60,
      pressure: 1015,
      timestamp: day11 + 1000,
    });
    await testEnvironment.mutation(api.index.smoothAggregations, {});
    await testEnvironment.mutation(api.index.aggregateDaily, {});

    const daily = await testEnvironment.query(api.index.getDailyCalendar, {
      roomId: "all",
      days: 7,
    });
    expect(daily).toHaveLength(2);
  });

  it("idempotent cursor", async () => {
    const testEnvironment = convexTest(schema, modules);
    await testEnvironment.mutation(api.index.store, {
      temperature: 22,
      humidity: 50,
      pressure: 1013,
      timestamp: dayStart(5),
    });
    await testEnvironment.mutation(api.index.smoothAggregations, {});
    await testEnvironment.mutation(api.index.aggregateDaily, {});
    const firstCursor = await testEnvironment.run(
      async (context) =>
        await context.db
          .query("config")
          .withIndex("by_key", (query) =>
            query.eq("key", "roomMetricsDaily_cursor"),
          )
          .unique(),
    );
    await testEnvironment.mutation(api.index.aggregateDaily, {});
    const secondCursor = await testEnvironment.run(
      async (ctx) =>
        await ctx.db
          .query("config")
          .withIndex("by_key", (query) =>
            query.eq("key", "roomMetricsDaily_cursor"),
          )
          .unique(),
    );
    expect(firstCursor?.value).toBe(secondCursor?.value);
    const daily = await testEnvironment.query(api.index.getDailyCalendar, {
      roomId: "all",
      days: 7,
    });
    expect(daily).toHaveLength(1);
  });

  it("trailing 53 weeks last entry is today", async () => {
    const testEnvironment = convexTest(schema, modules);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    await testEnvironment.mutation(api.index.store, {
      temperature: 25,
      humidity: 50,
      pressure: 1013,
      timestamp: todayMs + 1000,
    });
    await testEnvironment.mutation(api.index.smoothAggregations, {});
    await testEnvironment.mutation(api.index.aggregateDaily, {});
    const daily = await testEnvironment.query(api.index.getDailyCalendar, {
      roomId: "all",
      days: 1,
    });
    const todayKey = todayStart.toISOString().slice(0, 10);
    expect(daily[0].date).toBe(todayKey);
  });
});

describe("getLast7DaysStrip", () => {
  const seedDay = async (
    testEnvironment: ReturnType<typeof convexTest>,
    day: number,
  ) => {
    for (const [temperature, offset] of [
      [20, 1000],
      [24, 2000],
      [22, 3000],
    ] as const) {
      await testEnvironment.mutation(api.index.store, {
        temperature,
        humidity: 50,
        pressure: 1013,
        timestamp: dayStart(day) + offset,
      });
    }
    await testEnvironment.mutation(api.index.smoothAggregations, {});
    await testEnvironment.mutation(api.index.aggregateDaily, {});
  };

  it("returns 7 null rows oldest-first when empty", async () => {
    const testEnvironment = convexTest(schema, modules);
    const strip = await testEnvironment.query(api.index.getLast7DaysStrip, {
      roomId: "all",
      asOf: dayStart(20),
    });
    expect(strip).toHaveLength(7);
    expect(strip.map((row) => row.date)).toEqual(
      [14, 15, 16, 17, 18, 19, 20].map((day) => toDayKey(dayStart(day))),
    );
    for (const row of strip) {
      expect(row.avgTemperature).toBeNull();
      expect(row.count).toBe(0);
    }
  });

  it("fills the seeded day and leaves the rest null", async () => {
    const testEnvironment = convexTest(schema, modules);
    await seedDay(testEnvironment, 18);
    const strip = await testEnvironment.query(api.index.getLast7DaysStrip, {
      roomId: "all",
      asOf: dayStart(20),
    });
    expect(strip).toHaveLength(7);
    expect(strip[4].date).toBe(toDayKey(dayStart(18)));
    expect(strip[4].avgTemperature).toBeCloseTo(22, 0);
    expect(strip[4].count).toBe(3);
    const rest = [...strip.slice(0, 4), ...strip.slice(5)];
    expect(rest).toHaveLength(6);
    for (const row of rest) {
      expect(row.avgTemperature).toBeNull();
    }
  });

  it("excludes data outside the window and other rooms", async () => {
    const testEnvironment = convexTest(schema, modules);
    await seedDay(testEnvironment, 5);
    const stale = await testEnvironment.query(api.index.getLast7DaysStrip, {
      roomId: "all",
      asOf: dayStart(20),
    });
    expect(stale.every((row) => row.avgTemperature === null)).toBe(true);
    const otherRoom = await testEnvironment.query(api.index.getLast7DaysStrip, {
      roomId: "other",
      asOf: dayStart(20),
    });
    expect(otherRoom.every((row) => row.avgTemperature === null)).toBe(true);
  });
});

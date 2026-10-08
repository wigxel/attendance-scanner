/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { TEN_MIN } from "../lib/room-aggregation";

const modules = import.meta.glob("./**/*.ts");

// helpers to create bucketStart at day 00:00 + offset
const DAY_MS = 24 * 60 * 60 * 1000;
const dayStart = (daysFromEpoch: number) => daysFromEpoch * DAY_MS;

describe("dailyTemperatureCalendar stored async", () => {
  it("empty when no daily rows", async () => {
    const testEnvironment = convexTest(schema, modules);
    const result = await testEnvironment.query(
      api.roomMetrics.getDailyCalendar,
      { roomId: "all", days: 7 },
    );
    expect(result).toHaveLength(0);
  });

  it("aggregates 10m buckets into daily avg after aggregateDaily", async () => {
    const testEnvironment = convexTest(schema, modules);
    // seed 3 buckets same day (day 10)
    const baseDay = dayStart(10);
    await testEnvironment.mutation(api.roomMetrics.store, {
      temperature: 20,
      humidity: 40,
      pressure: 1000,
      timestamp: baseDay + 1000,
    });
    await testEnvironment.mutation(api.roomMetrics.store, {
      temperature: 24,
      humidity: 50,
      pressure: 1020,
      timestamp: baseDay + 2000,
    });
    await testEnvironment.mutation(api.roomMetrics.store, {
      temperature: 22,
      humidity: 45,
      pressure: 1010,
      timestamp: baseDay + 3000,
    });
    await testEnvironment.mutation(api.roomMetrics.smoothAggregations, {});
    await testEnvironment.mutation(api.roomMetrics.aggregateDaily, {});

    const daily = await testEnvironment.query(
      api.roomMetrics.getDailyCalendar,
      { roomId: "all", days: 7 },
    );
    expect(daily).toHaveLength(1);
    expect(daily[0].date).toBe("1970-01-11");
    expect(daily[0].avgTemperature).toBeCloseTo(22, 0);
    expect(daily[0].count).toBe(3);
  });

  it("wall-clock day boundary split", async () => {
    const testEnvironment = convexTest(schema, modules);
    const day10 = dayStart(10);
    const day11 = dayStart(11);
    await testEnvironment.mutation(api.roomMetrics.store, {
      temperature: 20,
      humidity: 40,
      pressure: 1000,
      timestamp: day10 + TEN_MIN - 1000,
    });
    await testEnvironment.mutation(api.roomMetrics.store, {
      temperature: 30,
      humidity: 60,
      pressure: 1015,
      timestamp: day11 + 1000,
    });
    await testEnvironment.mutation(api.roomMetrics.smoothAggregations, {});
    await testEnvironment.mutation(api.roomMetrics.aggregateDaily, {});

    const daily = await testEnvironment.query(
      api.roomMetrics.getDailyCalendar,
      { roomId: "all", days: 7 },
    );
    expect(daily).toHaveLength(2);
  });

  it("idempotent cursor", async () => {
    const testEnvironment = convexTest(schema, modules);
    await testEnvironment.mutation(api.roomMetrics.store, {
      temperature: 22,
      humidity: 50,
      pressure: 1013,
      timestamp: dayStart(5),
    });
    await testEnvironment.mutation(api.roomMetrics.smoothAggregations, {});
    await testEnvironment.mutation(api.roomMetrics.aggregateDaily, {});
    const firstCursor = await testEnvironment.run(
      async (context) =>
        await context.db
          .query("config")
          .withIndex("by_key", (query) =>
            query.eq("key", "roomMetricsDaily_cursor"),
          )
          .unique(),
    );
    await testEnvironment.mutation(api.roomMetrics.aggregateDaily, {});
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
    const daily = await testEnvironment.query(
      api.roomMetrics.getDailyCalendar,
      { roomId: "all", days: 7 },
    );
    expect(daily).toHaveLength(1);
  });

  it("trailing 53 weeks last entry is today", async () => {
    const testEnvironment = convexTest(schema, modules);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    await testEnvironment.mutation(api.roomMetrics.store, {
      temperature: 25,
      humidity: 50,
      pressure: 1013,
      timestamp: todayMs + 1000,
    });
    await testEnvironment.mutation(api.roomMetrics.smoothAggregations, {});
    await testEnvironment.mutation(api.roomMetrics.aggregateDaily, {});
    const daily = await testEnvironment.query(
      api.roomMetrics.getDailyCalendar,
      { roomId: "all", days: 1 },
    );
    const todayKey = todayStart.toISOString().slice(0, 10);
    expect(daily[0].date).toBe(todayKey);
  });
});

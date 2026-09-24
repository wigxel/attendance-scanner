/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { DAY_MS, TEN_MIN } from "../lib/room-aggregation";

const modules = import.meta.glob("./**/*.ts");
const DAY = DAY_MS;

const dayStart = (days: number) => days * DAY;
const toDateStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);

describe("roomMetrics backfill RED", () => {
  it("startRoomMetricsBackfill exists and rejects invalid date", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(internal.roomMetrics.startRoomMetricsBackfill, { from: "bad-date" } as any)).rejects.toThrow();
  });

  it("startRoomMetricsBackfill sets lock", async () => {
    const t = convexTest(schema, modules);
    const from = toDateStr(dayStart(10));
    const to = toDateStr(dayStart(11));
    const res: any = await t.mutation(internal.roomMetrics.startRoomMetricsBackfill, { from, to, target: "10m" });
    expect(res.started).toBe(true);
    const lock = await t.run(async (ctx) => {
      return await ctx.db.query("config").withIndex("by_key", (q) => q.eq("key", "roomMetrics_backfill_lock")).unique();
    });
    expect(lock?.value).toBe("true");
  });

  it("backfillRoomMetrics10m aggregates raw 7d window into 10m buckets", async () => {
    const t = convexTest(schema, modules);
    const base = dayStart(10);
    await t.mutation(api.roomMetrics.store, { temperature: 20, humidity: 40, pressure: 1000, timestamp: base + 1000 });
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 42, pressure: 1005, timestamp: base + 2000 });
    await t.mutation(internal.roomMetrics.backfillRoomMetrics10m, { cursor: base - 1, to: base + DAY, target: "10m" });
    const buckets = await t.query(api.roomMetrics.history, { roomId: "all", limit: 10 });
    expect(buckets.length).toBe(1);
    expect(buckets[0].count).toBe(2);
  });

  it("backfillRoomMetricsDaily handles >3 months (90 days)", async () => {
    const t = convexTest(schema, modules);
    for (let d = 0; d < 90; d++) {
      const bucketStart = dayStart(d) + 1000;
      await t.run(async (ctx) => {
        await ctx.db.insert("roomMetrics10m", {
          roomId: "all",
          bucketStart,
          avgTemperature: 20 + (d % 5),
          avgHumidity: 40,
          avgPressure: 1000,
          count: 1,
          updatedAt: Date.now(),
        });
      });
    }
    await t.mutation(internal.roomMetrics.backfillRoomMetricsDaily, { cursor: -1, to: dayStart(90) });
    const daily = await t.query(api.roomMetrics.getDailyCalendar, { roomId: "all", days: 100 });
    expect(daily.length).toBe(90);
  });

  it("surgical destroy deletes only range", async () => {
    const t = convexTest(schema, modules);
    const d5 = dayStart(5);
    const d10 = dayStart(10);
    await t.mutation(api.roomMetrics.store, { temperature: 20, humidity: 40, pressure: 1000, timestamp: d5 + 1000 });
    await t.mutation(api.roomMetrics.store, { temperature: 30, humidity: 60, pressure: 1010, timestamp: d10 + 1000 });
    await t.mutation(internal.roomMetrics.backfillRoomMetrics10m, { cursor: -1, to: d10 + DAY, target: "10m" });
    // destroy only d10 range
    await t.mutation(internal.roomMetrics.startRoomMetricsBackfill, { from: toDateStr(d10), to: toDateStr(d10), target: "10m", destroy: true, force: true });
    // run the chained 10m backfill for the destroyed window
    await t.mutation(internal.roomMetrics.backfillRoomMetrics10m, { cursor: d10 - 1, to: d10 + DAY, target: "10m" });
    const buckets = await t.query(api.roomMetrics.history, { roomId: "all", limit: 10 });
    // d5 bucket should still exist
    expect(buckets.some((b: any) => b.bucketStart === Math.floor((d5 + 1000) / TEN_MIN) * TEN_MIN)).toBe(true);
  });

  it("idempotent double run does not double count", async () => {
    const t = convexTest(schema, modules);
    const base = dayStart(20);
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 50, pressure: 1013, timestamp: base + 1000 });
    await t.mutation(internal.roomMetrics.backfillRoomMetrics10m, { cursor: base - 1, to: base + DAY, target: "10m" });
    // second run with advanced cursor reads zero new rows
    await t.mutation(internal.roomMetrics.backfillRoomMetrics10m, { cursor: base + 1000, to: base + DAY, target: "10m" });
    const buckets = await t.query(api.roomMetrics.history, { roomId: "all", limit: 10 });
    expect(buckets[0].count).toBe(1);
  });

  it("keeps outlier filter during backfill", async () => {
    const t = convexTest(schema, modules);
    const base = dayStart(30);
    // seed 3 normal readings to establish count>=3 then try outlier
    await t.mutation(api.roomMetrics.store, { temperature: 20, humidity: 40, pressure: 1000, timestamp: base + 1000 });
    await t.mutation(api.roomMetrics.store, { temperature: 20, humidity: 40, pressure: 1000, timestamp: base + 1100 });
    await t.mutation(api.roomMetrics.store, { temperature: 20, humidity: 40, pressure: 1000, timestamp: base + 1200 });
    await t.mutation(internal.roomMetrics.backfillRoomMetrics10m, { cursor: base - 1, to: base + DAY, target: "10m" });
    // outlier temp diff >10 should be dropped
    await t.mutation(api.roomMetrics.store, { temperature: 50, humidity: 40, pressure: 1000, timestamp: base + 1300 });
    await t.mutation(internal.roomMetrics.backfillRoomMetrics10m, { cursor: base + 1200, to: base + DAY, target: "10m" });
    const buckets = await t.query(api.roomMetrics.history, { roomId: "all", limit: 10 });
    expect(buckets[0].count).toBe(3);
  });

  it("live smoothAggregations bails when backfill lock held", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("config", { key: "roomMetrics_backfill_lock", value: "true" });
      await ctx.db.insert("config", { key: "roomMetrics_backfill_heartbeat", value: String(Date.now()) });
    });
    const base = dayStart(40);
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 50, pressure: 1013, timestamp: base + 1000 });
    const res: any = await t.mutation(internal.roomMetrics.smoothAggregations, {});
    expect(res.skipped).toBe("backfill");
  });

  it("cancelRoomMetricsBackfill clears lock", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.roomMetrics.startRoomMetricsBackfill, { from: toDateStr(dayStart(1)), to: toDateStr(dayStart(2)), target: "10m" });
    await t.mutation(internal.roomMetrics.cancelRoomMetricsBackfill, {});
    const lock = await t.run(async (ctx) => await ctx.db.query("config").withIndex("by_key", (q) => q.eq("key", "roomMetrics_backfill_lock")).unique());
    expect(lock?.value).not.toBe("true");
  });

  it("target both chains 10m -> daily", async () => {
    const t = convexTest(schema, modules);
    const base = dayStart(50);
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 50, pressure: 1013, timestamp: base + 1000 });
    await t.mutation(internal.roomMetrics.startRoomMetricsBackfill, { from: toDateStr(base), to: toDateStr(base), target: "both", force: true });
    // drive the self-chain manually: 10m then daily
    await t.mutation(internal.roomMetrics.backfillRoomMetrics10m, { cursor: base - 1, to: base + DAY, target: "both" });
    await t.mutation(internal.roomMetrics.backfillRoomMetricsDaily, { cursor: -1, to: base + DAY });
    const daily = await t.query(api.roomMetrics.getDailyCalendar, { roomId: "all", days: 10 });
    expect(daily.length).toBe(1);
  });
});

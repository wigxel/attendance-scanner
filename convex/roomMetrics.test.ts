/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { TEN_MIN } from "../lib/room-aggregation";

const modules = import.meta.glob("./**/*.ts");

describe("roomMetrics store", () => {
  it("applies defaults all/general and validates", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 50, pressure: 1013 });
    const docs = await t.query(api.roomMetrics.history, { roomId: "all", limit: 10 });
    // raw still empty smoothed, so store just inserts raw
    const raw = await t.run(async (ctx) => await ctx.db.query("roomMetrics").take(1));
    expect(raw).toHaveLength(1);
    expect(raw[0].roomId).toBe("all");
    expect(raw[0].deviceId).toBe("general");
  });

  it("rejects out of range", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.roomMetrics.store, { temperature: 200, humidity: 50, pressure: 1013 })).rejects.toThrow();
  });
});

describe("getLiveReading", () => {
  it("null when no buckets", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.roomMetrics.getLiveReading, { roomId: "all" });
    expect(result).toBeNull();
  });

  it("newest bucket", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 50, pressure: 1013, timestamp: 0 });
    await t.mutation(api.roomMetrics.store, { temperature: 24, humidity: 55, pressure: 1014, timestamp: TEN_MIN });
    await t.mutation(api.roomMetrics.smoothAggregations, {});
    await t.mutation(api.roomMetrics.smoothAggregations, {});
    const result = await t.query(api.roomMetrics.getLiveReading, { roomId: "all" });
    expect(result?.bucketStart).toBe(TEN_MIN);
  });
});

describe("history", () => {
  it("empty array when no buckets", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.roomMetrics.history, { roomId: "all", limit: 10 });
    expect(result).toHaveLength(0);
  });

  it("respects limit and order desc", async () => {
    const t = convexTest(schema, modules);
    for (let bucketIndex = 0; bucketIndex < 5; bucketIndex += 1) {
      await t.mutation(api.roomMetrics.store, { temperature: 22 + bucketIndex, humidity: 50, pressure: 1013, timestamp: bucketIndex * TEN_MIN });
    }
    await t.mutation(api.roomMetrics.smoothAggregations, {});
    const result = await t.query(api.roomMetrics.history, { roomId: "all", limit: 2 });
    expect(result).toHaveLength(2);
    expect(result[0].bucketStart).toBeGreaterThan(result[1].bucketStart);
  });
});

describe("smoothAggregations", () => {
  it("wall-clock split and average", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.roomMetrics.store, { temperature: 20, humidity: 40, pressure: 1000, timestamp: TEN_MIN - 1000 });
    await t.mutation(api.roomMetrics.store, { temperature: 24, humidity: 50, pressure: 1020, timestamp: TEN_MIN + 1000 });
    await t.mutation(api.roomMetrics.smoothAggregations, {});
    const buckets = await t.run(async (ctx) => await ctx.db.query("roomMetrics10m").collect());
    expect(buckets).toHaveLength(2);
    expect(buckets.map((bucket) => bucket.bucketStart).sort()).toEqual([0, TEN_MIN]);
  });

  it("outlier clamp when count >=3", async () => {
    const t = convexTest(schema, modules);
    // seed bucket count 5 avg 22
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 45, pressure: 1013, timestamp: 0 });
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 45, pressure: 1013, timestamp: 1000 });
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 45, pressure: 1013, timestamp: 2000 });
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 45, pressure: 1013, timestamp: 3000 });
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 45, pressure: 1013, timestamp: 4000 });
    await t.mutation(api.roomMetrics.smoothAggregations, {});
    // outlier 35 should be dropped
    await t.mutation(api.roomMetrics.store, { temperature: 35, humidity: 45, pressure: 1013, timestamp: 5000 });
    await t.mutation(api.roomMetrics.store, { temperature: 23, humidity: 45, pressure: 1013, timestamp: 6000 });
    await t.mutation(api.roomMetrics.smoothAggregations, {});
    const bucket = await t.run(async (ctx) =>
      (await ctx.db.query("roomMetrics10m").withIndex("by_room_and_bucket", (query) => query.eq("roomId", "all").eq("bucketStart", 0)).unique()),
    );
    expect(bucket?.count).toBe(6); // 5 + 1 (outlier dropped)
  });

  it("cursor idempotent", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.roomMetrics.store, { temperature: 22, humidity: 50, pressure: 1013, timestamp: 0 });
    await t.mutation(api.roomMetrics.smoothAggregations, {});
    const first = await t.run(async (ctx) => await ctx.db.query("config").withIndex("by_key", (query) => query.eq("key", "roomMetrics10m_cursor")).unique());
    await t.mutation(api.roomMetrics.smoothAggregations, {});
    const second = await t.run(async (ctx) => await ctx.db.query("config").withIndex("by_key", (query) => query.eq("key", "roomMetrics10m_cursor")).unique());
    expect(first?.value).toBe(second?.value);
  });
});

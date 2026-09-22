import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import * as E from "effect/Either";
import {
  averageReadings,
  CURSOR_KEY,
  DEFAULT_DEVICE,
  DEFAULT_ROOM,
  groupByBucket,
  isOutlier,
  isValidReading,
  mergeAverages,
  toBucketStart,
  withDefaults,
} from "../lib/room-aggregation";

// — store: pure validation via functional helpers, defaults via withDefaults
export const store = mutation({
  args: {
    temperature: v.number(),
    humidity: v.number(),
    pressure: v.number(),
    roomId: v.optional(v.string()),
    deviceId: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const reading = withDefaults(args);
    if (!isValidReading(reading))
      throw new Error("Invalid reading out of range");

    await ctx.db.insert("roomMetrics", {
      temperature: reading.temperature,
      humidity: reading.humidity,
      pressure: reading.pressure,
      timestamp: reading.timestamp,
      roomId: reading.roomId,
      deviceId: reading.deviceId,
    });
  },
});

// — reads only from smoothed table (roomMetrics10m), returns Either not null
export const getLiveReading = query({
  args: { roomId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<E.Either<any, string>> => {
    const roomId = args.roomId ?? DEFAULT_ROOM;
    const buckets = await ctx.db
      .query("roomMetrics10m")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("desc")
      .take(1);
    const b = buckets[0];
    return b ? E.right(b) : E.left("no readings");
  },
});

export const history = query({
  args: { roomId: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<E.Either<any, string>> => {
    const roomId = args.roomId ?? DEFAULT_ROOM;
    const lim = Math.min(args.limit ?? 100, 200);
    const buckets = await ctx.db
      .query("roomMetrics10m")
      .withIndex("by_room_and_bucket", (q) => q.eq("roomId", roomId))
      .order("desc")
      .take(lim);
    return E.right(buckets);
  },
});

// — smoothing job: reads raw via cursor in config, writes smoothed 10-min buckets
export const smoothAggregations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cursorRow = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", CURSOR_KEY))
      .unique();
    const cursor = cursorRow ? Number.parseInt(cursorRow.value, 10) : 0;

    const batch: Array<{
      _id: string;
      temperature: number;
      humidity: number;
      pressure: number;
      timestamp?: number;
      roomId?: string;
      deviceId?: string;
      _creationTime: number;
    }> = await ctx.db
      .query("roomMetrics")
      .withIndex("by_timestamp")
      .order("asc")
      .take(500)
      .then((rows) =>
        rows
          .map((r) => ({
            ...r,
            timestamp: r.timestamp ?? r._creationTime,
          }))
          .filter((r) => r.timestamp > cursor),
      );

    if (batch.length === 0) return { processed: 0, cursor };

    const readings = batch
      .map((r) =>
        withDefaults({
          temperature: r.temperature,
          humidity: r.humidity,
          pressure: r.pressure,
          timestamp: r.timestamp!,
          roomId: r.roomId,
          deviceId: r.deviceId,
        }),
      )
      .filter(isValidReading);

    const groups = groupByBucket(readings);

    const bucketStarts = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b);

    // functional iteration via Promise.all on mapped buckets (no for loops for merge logic)
    await Promise.all(
      bucketStarts.map(async (bucketStart) => {
        const inBucket = groups[bucketStart] ?? [];
        if (inBucket.length === 0) return;

        // clamp outliers against existing bucket if present
        const existing = await ctx.db
          .query("roomMetrics10m")
          .withIndex("by_room_and_bucket", (q) =>
            q.eq("roomId", DEFAULT_ROOM).eq("bucketStart", bucketStart),
          )
          .unique();

        const filtered = existing
          ? inBucket.filter((r) => !isOutlier(r, existing))
          : inBucket;

        if (filtered.length === 0) return;

        const avg = averageReadings(filtered);

        if (!existing) {
          await ctx.db.insert("roomMetrics10m", {
            roomId: DEFAULT_ROOM,
            bucketStart,
            avgTemperature: avg.avgTemperature,
            avgHumidity: avg.avgHumidity,
            avgPressure: avg.avgPressure,
            count: filtered.length,
            updatedAt: Date.now(),
          });
        } else {
          const merged = mergeAverages(existing, avg, filtered.length);
          await ctx.db.patch(existing._id, {
            ...merged,
            updatedAt: Date.now(),
          });
        }
      }),
    );

    const newCursor = Math.max(...batch.map((r) => r.timestamp!));
    if (cursorRow)
      await ctx.db.patch(cursorRow._id, { value: String(newCursor) });
    else
      await ctx.db.insert("config", {
        key: CURSOR_KEY,
        value: String(newCursor),
      });

    if (batch.length === 500) {
      await ctx.scheduler.runAfter(
        0,
        "roomMetrics:smoothAggregations" as never,
        {},
      );
    }

    return { processed: readings.length, cursor: newCursor };
  },
});

// — separate prune cron: reads same cursor, deletes raw older than cursor - 7d
export const pruneRaw = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cursorRow = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", CURSOR_KEY))
      .unique();
    if (!cursorRow) return { pruned: 0 };
    const cursor = Number.parseInt(cursorRow.value, 10);
    const threshold = cursor - 7 * 24 * 60 * 60 * 1000;
    const stale = await ctx.db
      .query("roomMetrics")
      .withIndex("by_timestamp")
      .order("asc")
      .take(500);
    const toDelete = stale.filter(
      (r) => (r.timestamp ?? r._creationTime) < threshold,
    );
    await Promise.all(toDelete.map((r) => ctx.db.delete(r._id)));
    return { pruned: toDelete.length, threshold };
  },
});

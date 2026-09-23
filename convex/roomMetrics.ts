import { v } from "convex/values";
import {
  averageDailyBuckets,
  averageReadings,
  CURSOR_KEY,
  CURSOR_KEY_DAILY,
  DEFAULT_DEVICE,
  DEFAULT_ROOM,
  groupByBucket,
  groupByDay,
  isOutlier,
  isValidReading,
  mergeAverages,
  toDayKey,
  toDayStart,
  withDefaults,
} from "../lib/room-aggregation";
import type { RoomMetricsBucket, RoomMetricsDailyBucket, RoomMetricsHistory } from "../types/room-metrics";
import { internalMutation, mutation, query } from "./_generated/server";

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

// — reads only from smoothed table (roomMetrics10m)
export const getLiveReading = query({
  args: { roomId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<RoomMetricsBucket | null> => {
    const roomId = args.roomId ?? DEFAULT_ROOM;
    const buckets = await ctx.db
      .query("roomMetrics10m")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("desc")
      .take(1);
    return buckets[0] ?? null;
  },
});

export const history = query({
  args: { roomId: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<RoomMetricsHistory> => {
    const roomId = args.roomId ?? DEFAULT_ROOM;
    const limit = Math.min(args.limit ?? 100, 200);
    return await ctx.db
      .query("roomMetrics10m")
      .withIndex("by_room_and_bucket", (q) => q.eq("roomId", roomId))
      .order("desc")
      .take(limit);
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
    const cursor = cursorRow ? Number(cursorRow.value) : -1;

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
      .withIndex("by_timestamp", (query) => query.gt("timestamp", cursor))
      .order("asc")
      .take(500)
      .then((rows) =>
        rows.map((reading) => ({
          ...reading,
          timestamp: reading.timestamp ?? reading._creationTime,
        })),
      );

    if (batch.length === 0) return { processed: 0, cursor };

    const readings = batch
      .map((reading) =>
        withDefaults({
          temperature: reading.temperature,
          humidity: reading.humidity,
          pressure: reading.pressure,
          timestamp: reading.timestamp!,
          roomId: reading.roomId,
          deviceId: reading.deviceId,
        }),
      )
      .filter(isValidReading);

    const groups = groupByBucket(readings);

    const bucketStarts = Object.keys(groups)
      .map(Number)
      .sort((firstBucket, secondBucket) => firstBucket - secondBucket);

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
          ? inBucket.filter((reading) => !isOutlier(reading, existing))
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

    const newCursor = Math.max(...batch.map((reading) => reading.timestamp!));
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

// — daily aggregation: reads smoothed 10m buckets via cursor, writes daily buckets
export const aggregateDaily = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cursorRow = await ctx.db.query("config").withIndex("by_key", (query) => query.eq("key", CURSOR_KEY_DAILY)).unique();
    const cursor = cursorRow ? Number(cursorRow.value) : -1;

    const buckets = await ctx.db
      .query("roomMetrics10m")
      .withIndex("by_room_and_bucket", (query) => query.eq("roomId", DEFAULT_ROOM).gt("bucketStart", cursor))
      .order("asc")
      .take(500);

    if (buckets.length === 0) return { processed: 0, cursor };

    const grouped = groupByDay(buckets);

    const dayKeys = Object.keys(grouped).sort();

    await Promise.all(
      dayKeys.map(async (dayKey) => {
        const dayBuckets = grouped[dayKey] ?? [];
        if (dayBuckets.length === 0) return;
        const dayStart = toDayStart(dayBuckets[0].bucketStart);
        const existing = await ctx.db
          .query("roomMetricsDaily")
          .withIndex("by_room_and_day", (query) => query.eq("roomId", DEFAULT_ROOM).eq("dayStart", dayStart))
          .unique();

        const dailyAvg = averageDailyBuckets(dayBuckets);

        if (!existing) {
          await ctx.db.insert("roomMetricsDaily", {
            roomId: DEFAULT_ROOM,
            date: dayKey,
            dayStart,
            avgTemperature: dailyAvg.avgTemperature,
            avgHumidity: dailyAvg.avgHumidity,
            avgPressure: dailyAvg.avgPressure,
            minTemperature: dailyAvg.minTemperature,
            maxTemperature: dailyAvg.maxTemperature,
            count: dailyAvg.count,
            updatedAt: Date.now(),
          });
        } else {
          const totalCount = existing.count + dailyAvg.count;
          const mergedAvgTemperature = Math.round(((existing.avgTemperature * existing.count + dailyAvg.avgTemperature * dailyAvg.count) / totalCount) * 10) / 10;
          const mergedAvgHumidity = Math.round(((existing.avgHumidity * existing.count + dailyAvg.avgHumidity * dailyAvg.count) / totalCount) * 10) / 10;
          const mergedAvgPressure = Math.round(((existing.avgPressure * existing.count + dailyAvg.avgPressure * dailyAvg.count) / totalCount) * 10) / 10;
          await ctx.db.patch(existing._id, {
            avgTemperature: mergedAvgTemperature,
            avgHumidity: mergedAvgHumidity,
            avgPressure: mergedAvgPressure,
            minTemperature: Math.min(existing.minTemperature, dailyAvg.minTemperature),
            maxTemperature: Math.max(existing.maxTemperature, dailyAvg.maxTemperature),
            count: totalCount,
            updatedAt: Date.now(),
          });
        }
      }),
    );

    const newCursor = Math.max(...buckets.map((bucket) => bucket.bucketStart));
    if (cursorRow) await ctx.db.patch(cursorRow._id, { value: String(newCursor) });
    else await ctx.db.insert("config", { key: CURSOR_KEY_DAILY, value: String(newCursor) });

    if (buckets.length === 500) await ctx.scheduler.runAfter(0, "roomMetrics:aggregateDaily" as never, {});

    return { processed: buckets.length, cursor: newCursor };
  },
});

export const getDailyCalendar = query({
  args: { roomId: v.optional(v.string()), days: v.optional(v.number()) },
  handler: async (ctx, args): Promise<RoomMetricsDailyBucket[]> => {
    const roomId = args.roomId ?? DEFAULT_ROOM;
    const dayLimit = Math.min(args.days ?? 371, 500);
    return await ctx.db
      .query("roomMetricsDaily")
      .withIndex("by_room_and_day", (query) => query.eq("roomId", roomId))
      .order("desc")
      .take(dayLimit);
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
    const cursor = Number(cursorRow.value);
    const threshold = cursor - 7 * 24 * 60 * 60 * 1000;
    const stale = await ctx.db
      .query("roomMetrics")
      .withIndex("by_timestamp")
      .order("asc")
      .take(500);
    const toDelete = stale.filter(
      (reading) => (reading.timestamp ?? reading._creationTime) < threshold,
    );
    await Promise.all(toDelete.map((reading) => ctx.db.delete(reading._id)));
    return { pruned: toDelete.length, threshold };
  },
});

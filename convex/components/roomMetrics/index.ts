import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";
import { ensureAlert } from "./alerts";
import {
  ALERT_HIGH_C,
  ALERT_LOW_C,
  ALERT_RECENT_WINDOW_MS,
  averageDailyBuckets,
  averageReadings,
  CURSOR_KEY,
  CURSOR_KEY_DAILY,
  classifyBreach,
  DAY_MS,
  DEFAULT_ROOM,
  groupByBucket,
  groupByDay,
  isOutlier,
  isValidReading,
  mergeAverages,
  toDayKey,
  toDayStart,
  withDefaults,
} from "./lib";

type RoomMetricsBucket = Doc<"roomMetrics10m">;
type RoomMetricsReading = Doc<"roomMetrics">;
type RoomMetricsHistory = RoomMetricsBucket[];
type RoomMetricsDailyBucket = Doc<"roomMetricsDaily">;

type RawReadingRow = {
  _id: string;
  temperature: number;
  humidity: number;
  pressure: number;
  timestamp?: number;
  roomId?: string;
  deviceId?: string;
  _creationTime: number;
};

const BACKFILL_LOCK = "roomMetrics_backfill_lock";
const BACKFILL_HEARTBEAT = "roomMetrics_backfill_heartbeat";
const LOCK_TTL_MS = 10 * 60 * 1000;

// A live backfill owns the pipeline; scheduled jobs stand down until it
// goes stale so the two writers never interleave buckets.
async function activeBackfillSkip(ctx: MutationCtx) {
  const backfillLock = await ctx.db
    .query("config")
    .withIndex("by_key", (q) => q.eq("key", BACKFILL_LOCK))
    .unique();
  if (backfillLock?.value !== "true") return null;
  const heartbeat = await ctx.db
    .query("config")
    .withIndex("by_key", (q) => q.eq("key", BACKFILL_HEARTBEAT))
    .unique();
  const stale =
    !heartbeat || Date.now() - Number(heartbeat.value) > LOCK_TTL_MS;
  if (stale) return null;
  return { skipped: "backfill" as const, processed: 0, cursor: -1 };
}

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

// — latest raw device reading with no smoothing — used where freshness beats stability
export const getRawReading = query({
  args: { roomId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<RoomMetricsReading | null> => {
    const roomId = args.roomId ?? DEFAULT_ROOM;
    const readings = await ctx.db
      .query("roomMetrics")
      .withIndex("by_room_and_timestamp", (q) => q.eq("roomId", roomId))
      .order("desc")
      .take(1);
    return readings[0] ?? null;
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

/** Timestamp of the most recent raw reading fed into the store. */
export const lastReading = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("roomMetrics")
      .withIndex("by_timestamp")
      .order("desc")
      .first();
    return { timestamp: row?.timestamp ?? null };
  },
});

// — smoothing job: reads raw via cursor in config, writes smoothed 10-min buckets
export const smoothAggregations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const skipped = await activeBackfillSkip(ctx);
    if (skipped) return skipped;
    const cursorRow = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", CURSOR_KEY))
      .unique();
    const cursor = cursorRow ? Number(cursorRow.value) : -1;

    const batch: Array<RawReadingRow> = await ctx.db
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

        // A jump this big against an established bucket is a sensor
        // glitch, not weather — exclude it so one bad sample can't drag
        // the running average.
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

        const finalAvg = existing
          ? mergeAverages(existing, avg, filtered.length)
          : avg;

        if (!existing) {
          await ctx.db.insert("roomMetrics10m", {
            roomId: DEFAULT_ROOM,
            bucketStart,
            avgTemperature: finalAvg.avgTemperature,
            avgHumidity: finalAvg.avgHumidity,
            avgPressure: finalAvg.avgPressure,
            count: filtered.length,
            updatedAt: Date.now(),
          });
        } else {
          await ctx.db.patch(existing._id, {
            ...finalAvg,
            updatedAt: Date.now(),
          });
        }

        // only alert for fresh buckets — cursor replays must not flood
        const breach = classifyBreach(finalAvg.avgTemperature);
        if (breach && bucketStart >= Date.now() - ALERT_RECENT_WINDOW_MS) {
          const limit = breach === "low" ? ALERT_LOW_C : ALERT_HIGH_C;
          await ensureAlert(ctx, {
            type: "temperature_breach",
            roomId: DEFAULT_ROOM,
            dedupeKey: `${DEFAULT_ROOM}:temperature_breach:${bucketStart}`,
            value: finalAvg.avgTemperature,
            detail: `avg ${finalAvg.avgTemperature}°C (limit ${limit}) — ${breach} breach`,
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
      await ctx.scheduler.runAfter(0, internal.index.smoothAggregations, {});
    }

    return { processed: readings.length, cursor: newCursor };
  },
});

// — daily aggregation: reads smoothed 10m buckets via cursor, writes daily buckets
export const aggregateDaily = internalMutation({
  args: {},
  handler: async (ctx) => {
    const skipped = await activeBackfillSkip(ctx);
    if (skipped) return skipped;
    const cursorRow = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", CURSOR_KEY_DAILY))
      .unique();
    const cursor = cursorRow ? Number(cursorRow.value) : -1;

    const buckets = await ctx.db
      .query("roomMetrics10m")
      .withIndex("by_room_and_bucket", (q) =>
        q.eq("roomId", DEFAULT_ROOM).gt("bucketStart", cursor),
      )
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
          .withIndex("by_room_and_day", (q) =>
            q.eq("roomId", DEFAULT_ROOM).eq("dayStart", dayStart),
          )
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
          const mergedAvgTemperature =
            Math.round(
              ((existing.avgTemperature * existing.count +
                dailyAvg.avgTemperature * dailyAvg.count) /
                totalCount) *
                10,
            ) / 10;
          const mergedAvgHumidity =
            Math.round(
              ((existing.avgHumidity * existing.count +
                dailyAvg.avgHumidity * dailyAvg.count) /
                totalCount) *
                10,
            ) / 10;
          const mergedAvgPressure =
            Math.round(
              ((existing.avgPressure * existing.count +
                dailyAvg.avgPressure * dailyAvg.count) /
                totalCount) *
                10,
            ) / 10;
          await ctx.db.patch(existing._id, {
            avgTemperature: mergedAvgTemperature,
            avgHumidity: mergedAvgHumidity,
            avgPressure: mergedAvgPressure,
            minTemperature: Math.min(
              existing.minTemperature,
              dailyAvg.minTemperature,
            ),
            maxTemperature: Math.max(
              existing.maxTemperature,
              dailyAvg.maxTemperature,
            ),
            count: totalCount,
            updatedAt: Date.now(),
          });
        }
      }),
    );

    const newCursor = Math.max(...buckets.map((bucket) => bucket.bucketStart));
    if (cursorRow)
      await ctx.db.patch(cursorRow._id, { value: String(newCursor) });
    else
      await ctx.db.insert("config", {
        key: CURSOR_KEY_DAILY,
        value: String(newCursor),
      });

    if (buckets.length === 500)
      await ctx.scheduler.runAfter(0, internal.index.aggregateDaily, {});

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
      .withIndex("by_room_and_day", (q) => q.eq("roomId", roomId))
      .order("desc")
      .take(dayLimit);
  },
});

// — filled 7-day strip for embeddable widgets: server builds the UTC date
// spine and left-joins daily buckets, so clients never compute date keys.
export const getLast7DaysStrip = query({
  args: { roomId: v.optional(v.string()), asOf: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const roomId = args.roomId ?? DEFAULT_ROOM;
    // asOf is client-supplied for testability; defaults to now.
    const todayStart = toDayStart(args.asOf ?? Date.now());
    const windowStart = todayStart - 6 * DAY_MS;
    const rows = await ctx.db
      .query("roomMetricsDaily")
      .withIndex("by_room_and_day", (q) =>
        q.eq("roomId", roomId).gte("dayStart", windowStart),
      )
      .collect();
    const byDayStart = new Map(rows.map((row) => [row.dayStart, row]));
    return Array.from({ length: 7 }, (_, index) => {
      const dayStart = windowStart + index * DAY_MS;
      const bucket = byDayStart.get(dayStart) ?? null;
      return {
        date: toDayKey(dayStart),
        avgTemperature: bucket?.avgTemperature ?? null,
        minTemperature: bucket?.minTemperature ?? null,
        maxTemperature: bucket?.maxTemperature ?? null,
        count: bucket?.count ?? 0,
      };
    });
  },
});

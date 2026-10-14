import { ConvexError, v } from "convex/values";
import {
  averageDailyBuckets,
  averageReadings,
  CURSOR_KEY,
  DAY_MS,
  DEFAULT_ROOM,
  groupByBucket,
  groupByDay,
  isOutlier,
  isValidReading,
  mergeAverages,
  toDayStart,
  withDefaults,
} from "./lib";
import { internal } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";

const BACKFILL_LOCK = "roomMetrics_backfill_lock";
const BACKFILL_HEARTBEAT = "roomMetrics_backfill_heartbeat";
const LOCK_TTL_MS = 10 * 60 * 1000;

function parseDateArg(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new ConvexError(`Invalid date: "${value}". Expected yyyy-MM-dd`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime()))
    throw new ConvexError(`Invalid date: "${value}"`);
  return value;
}
function dateStrToDayStart(value: string): number {
  return new Date(value).getTime();
}
function dateStrToDayEnd(value: string): number {
  return new Date(value).getTime() + DAY_MS;
}

// Proof-of-life for a running backfill so scheduled jobs stand down.
async function touchBackfillHeartbeat(ctx: MutationCtx) {
  const heartbeatRow = await ctx.db
    .query("config")
    .withIndex("by_key", (q) => q.eq("key", BACKFILL_HEARTBEAT))
    .unique();
  if (heartbeatRow)
    await ctx.db.patch(heartbeatRow._id, { value: String(Date.now()) });
}

export const startRoomMetricsBackfill = internalMutation({
  args: {
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    target: v.optional(
      v.union(v.literal("10m"), v.literal("daily"), v.literal("both")),
    ),
    destroy: v.optional(v.boolean()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.from) parseDateArg(args.from);
    if (args.to) parseDateArg(args.to);
    if (args.from && args.to && args.from > args.to)
      throw new ConvexError("from must be <= to");

    const lockRow = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", BACKFILL_LOCK))
      .unique();
    const hbRow = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", BACKFILL_HEARTBEAT))
      .unique();
    const isStale = !hbRow || Date.now() - Number(hbRow.value) > LOCK_TTL_MS;
    const isLocked = lockRow?.value === "true" && !isStale;
    if (isLocked && !args.force)
      return { started: false, reason: "already running" };

    const target = args.target ?? "both";
    const destroy = args.destroy ?? false;

    if (destroy) {
      if (!args.from) throw new ConvexError("destroy requires from");
      const fromStart = dateStrToDayStart(args.from);
      const toEnd = args.to ? dateStrToDayEnd(args.to) : fromStart + DAY_MS;
      if (target === "10m" || target === "both") {
        const toDelete = await ctx.db.query("roomMetrics10m").collect();
        await Promise.all(
          toDelete
            .filter((b) => b.bucketStart >= fromStart && b.bucketStart < toEnd)
            .map((b) => ctx.db.delete(b._id)),
        );
      }
      if (target === "daily" || target === "both") {
        const toDeleteDaily = await ctx.db.query("roomMetricsDaily").collect();
        await Promise.all(
          toDeleteDaily
            .filter((d) => d.dayStart >= fromStart && d.dayStart < toEnd)
            .map((d) => ctx.db.delete(d._id)),
        );
      }
    }

    if (lockRow) await ctx.db.patch(lockRow._id, { value: "true" });
    else await ctx.db.insert("config", { key: BACKFILL_LOCK, value: "true" });
    if (hbRow) await ctx.db.patch(hbRow._id, { value: String(Date.now()) });
    else
      await ctx.db.insert("config", {
        key: BACKFILL_HEARTBEAT,
        value: String(Date.now()),
      });

    const fromTs = args.from
      ? dateStrToDayStart(args.from) - 1
      : Date.now() - 7 * DAY_MS - 1;
    const toTs = args.to ? dateStrToDayEnd(args.to) : Date.now();

    if (target === "10m" || target === "both") {
      await ctx.scheduler.runAfter(
        0,
        internal.backfill.backfillRoomMetrics10m as any,
        { cursor: fromTs, to: toTs, target },
      );
    } else {
      await ctx.scheduler.runAfter(
        0,
        internal.backfill.backfillRoomMetricsDaily as any,
        { cursor: fromTs, to: toTs },
      );
    }
    return { started: true };
  },
});

export const backfillRoomMetrics10m = internalMutation({
  args: { cursor: v.number(), to: v.number(), target: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await touchBackfillHeartbeat(ctx);

    const batch: any[] = await ctx.db
      .query("roomMetrics")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", args.cursor))
      .order("asc")
      .take(500)
      .then((rows) =>
        rows
          .map((r: any) => ({
            ...r,
            timestamp: r.timestamp ?? r._creationTime,
          }))
          .filter((r: any) => r.timestamp <= args.to),
      );

    if (batch.length === 0) {
      if (args.target === "both") {
        await ctx.scheduler.runAfter(
          0,
          internal.backfill.backfillRoomMetricsDaily as any,
          { cursor: -1, to: args.to },
        );
      } else {
        // release lock if no more work and not chaining
        const l = await ctx.db
          .query("config")
          .withIndex("by_key", (q) => q.eq("key", BACKFILL_LOCK))
          .unique();
        if (l) await ctx.db.patch(l._id, { value: "false" });
      }
      return { processed: 0 };
    }

    const readings = batch
      .map((r: any) =>
        withDefaults({
          temperature: r.temperature,
          humidity: r.humidity,
          pressure: r.pressure,
          timestamp: r.timestamp,
          roomId: r.roomId,
          deviceId: r.deviceId,
        }),
      )
      .filter(isValidReading);
    const groups = groupByBucket(readings);
    const bucketStarts = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b);
    await Promise.all(
      bucketStarts.map(async (bucketStart) => {
        const inBucket = (groups as any)[bucketStart] ?? [];
        if (inBucket.length === 0) return;
        const existing = await ctx.db
          .query("roomMetrics10m")
          .withIndex("by_room_and_bucket", (q) =>
            q.eq("roomId", DEFAULT_ROOM).eq("bucketStart", bucketStart),
          )
          .unique();
        const filtered = existing
          ? inBucket.filter((r: any) => !isOutlier(r, existing as any))
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
          const merged = mergeAverages(existing as any, avg, filtered.length);
          await ctx.db.patch(existing._id, {
            ...merged,
            updatedAt: Date.now(),
          });
        }
      }),
    );

    const newCursor = Math.max(...batch.map((r: any) => r.timestamp));
    await ctx.scheduler.runAfter(
      0,
      internal.backfill.backfillRoomMetrics10m as any,
      { cursor: newCursor, to: args.to, target: args.target ?? "10m" },
    );
    return { processed: readings.length, cursor: newCursor };
  },
});

export const backfillRoomMetricsDaily = internalMutation({
  args: { cursor: v.number(), to: v.number() },
  handler: async (ctx, args) => {
    await touchBackfillHeartbeat(ctx);

    const buckets = await ctx.db
      .query("roomMetrics10m")
      .withIndex("by_room_and_bucket", (q) =>
        q.eq("roomId", DEFAULT_ROOM).gt("bucketStart", args.cursor),
      )
      .order("asc")
      .take(500)
      .then((rows: any[]) => rows.filter((b) => b.bucketStart <= args.to));

    if (buckets.length === 0) {
      const l = await ctx.db
        .query("config")
        .withIndex("by_key", (q) => q.eq("key", BACKFILL_LOCK))
        .unique();
      if (l) await ctx.db.patch(l._id, { value: "false" });
      return { processed: 0 };
    }

    const grouped = groupByDay(buckets as any);
    const dayKeys = Object.keys(grouped).sort();
    await Promise.all(
      dayKeys.map(async (dayKey) => {
        const dayBuckets = (grouped as any)[dayKey] ?? [];
        if (dayBuckets.length === 0) return;
        const dayStartVal = toDayStart(dayBuckets[0].bucketStart);
        const existing = await ctx.db
          .query("roomMetricsDaily")
          .withIndex("by_room_and_day", (q) =>
            q.eq("roomId", DEFAULT_ROOM).eq("dayStart", dayStartVal),
          )
          .unique();
        const dailyAvg = averageDailyBuckets(dayBuckets);
        if (!existing) {
          await ctx.db.insert("roomMetricsDaily", {
            roomId: DEFAULT_ROOM,
            date: dayKey,
            dayStart: dayStartVal,
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

    const newCursor = Math.max(...buckets.map((b: any) => b.bucketStart));
    await ctx.scheduler.runAfter(
      0,
      internal.backfill.backfillRoomMetricsDaily as any,
      { cursor: newCursor, to: args.to },
    );
    return { processed: buckets.length, cursor: newCursor };
  },
});

export const cancelRoomMetricsBackfill = internalMutation({
  args: {},
  handler: async (ctx) => {
    const lockRow = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", BACKFILL_LOCK))
      .unique();
    if (lockRow) await ctx.db.patch(lockRow._id, { value: "false" });
    const hbRow = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", BACKFILL_HEARTBEAT))
      .unique();
    if (hbRow) await ctx.db.delete(hbRow._id);
    return { cancelled: true };
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

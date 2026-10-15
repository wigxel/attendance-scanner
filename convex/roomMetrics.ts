import { v } from "convex/values";
import type {
  RoomMetricsAlert,
  RoomMetricsBucket,
  RoomMetricsDailyBucket,
  RoomMetricsHistory,
  RoomMetricsReading,
} from "../types/room-metrics";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";

// Public surface for roomMetrics. Storage and aggregation live in the
// roomMetrics component (convex/components/roomMetrics); these wrappers
// keep every client call site on api.roomMetrics.* unchanged.
// Return types are annotated explicitly: component function references
// resolve to `any` across the component boundary (same as wigxel_acl).

export const store = mutation({
  args: {
    temperature: v.number(),
    humidity: v.number(),
    pressure: v.number(),
    roomId: v.optional(v.string()),
    deviceId: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.runMutation(components.roomMetrics.index.store, args);
  },
});

export const getLiveReading = query({
  args: { roomId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<RoomMetricsBucket | null> => {
    return await ctx.runQuery(
      components.roomMetrics.index.getLiveReading,
      args,
    );
  },
});

export const getRawReading = query({
  args: { roomId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<RoomMetricsReading | null> => {
    return await ctx.runQuery(components.roomMetrics.index.getRawReading, args);
  },
});

export const history = query({
  args: { roomId: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<RoomMetricsHistory> => {
    return await ctx.runQuery(components.roomMetrics.index.history, args);
  },
});

export const lastReading = query({
  args: {},
  handler: async (ctx): Promise<{ timestamp: number | null }> => {
    return await ctx.runQuery(components.roomMetrics.index.lastReading, {});
  },
});

export const getDailyCalendar = query({
  args: { roomId: v.optional(v.string()), days: v.optional(v.number()) },
  handler: async (ctx, args): Promise<RoomMetricsDailyBucket[]> => {
    return await ctx.runQuery(
      components.roomMetrics.index.getDailyCalendar,
      args,
    );
  },
});

export const getLast7DaysStrip = query({
  args: { roomId: v.optional(v.string()), asOf: v.optional(v.number()) },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      date: string;
      avgTemperature: number | null;
      minTemperature: number | null;
      maxTemperature: number | null;
      count: number;
    }>
  > => {
    return await ctx.runQuery(
      components.roomMetrics.index.getLast7DaysStrip,
      args,
    );
  },
});

// — alerts live in the roomMetrics component (generic `alerts` table);
// these wrappers keep client call sites on api.roomMetrics.*.
export const recentAlerts = query({
  args: { type: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<RoomMetricsAlert[]> => {
    return await ctx.runQuery(components.roomMetrics.alerts.recentAlerts, args);
  },
});

// alertId crosses the component boundary as a string: `alerts` exists in
// the component schema, not the app's, so v.id("alerts") here would fail.
export const acknowledge = mutation({
  args: { alertId: v.string() },
  handler: async (ctx, args): Promise<void> => {
    await ctx.runMutation(components.roomMetrics.alerts.acknowledge, args);
  },
});

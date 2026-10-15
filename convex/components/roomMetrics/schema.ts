import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roomMetrics = defineTable({
  temperature: v.number(),
  humidity: v.number(),
  pressure: v.number(),
  timestamp: v.optional(v.number()),
  roomId: v.optional(v.string()),
  deviceId: v.optional(v.string()),
})
  .index("by_room", ["roomId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_room_and_timestamp", ["roomId", "timestamp"]);

const roomMetrics10m = defineTable({
  roomId: v.string(),
  bucketStart: v.number(),
  avgTemperature: v.number(),
  avgHumidity: v.number(),
  avgPressure: v.number(),
  count: v.number(),
  updatedAt: v.number(),
})
  .index("by_room", ["roomId"])
  .index("by_room_and_bucket", ["roomId", "bucketStart"]);

const roomMetricsDaily = defineTable({
  roomId: v.string(),
  date: v.string(),
  dayStart: v.number(),
  avgTemperature: v.number(),
  avgHumidity: v.number(),
  avgPressure: v.number(),
  minTemperature: v.number(),
  maxTemperature: v.number(),
  count: v.number(),
  updatedAt: v.number(),
})
  .index("by_room", ["roomId"])
  .index("by_room_and_day", ["roomId", "dayStart"])
  .index("by_date", ["date"]);

// Generic anomaly alerts. Producers write via ensureAlert (alerts.ts);
// type/dedupeKey are free strings — dedupeKey e.g.
// `all:temperature_breach:<bucketStart>` — so new alert kinds need no
// schema change.
const alerts = defineTable({
  type: v.string(),
  roomId: v.string(),
  dedupeKey: v.string(),
  value: v.optional(v.number()),
  detail: v.string(),
  severity: v.optional(v.string()),
  acknowledged: v.boolean(),
  notifiedAt: v.optional(v.number()),
}).index("by_dedupe_key", ["dedupeKey"]);

const config = defineTable({
  key: v.string(),
  value: v.string(),
}).index("by_key", ["key"]);

export default defineSchema({
  roomMetrics,
  roomMetrics10m,
  roomMetricsDaily,
  alerts,
  config,
});

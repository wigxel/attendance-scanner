import type { Doc } from "../convex/_generated/dataModel";

export type RoomMetricsBucket = Doc<"roomMetrics10m">;

export type RoomMetricsReading = Doc<"roomMetrics">;

export type RoomMetricsHistory = RoomMetricsBucket[];

export type RoomMetricsDailyBucket = Doc<"roomMetricsDaily">;

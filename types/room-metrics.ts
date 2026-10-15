import type { Doc } from "../convex/components/roomMetrics/_generated/dataModel";

export type RoomMetricsBucket = Doc<"roomMetrics10m">;

export type RoomMetricsReading = Doc<"roomMetrics">;

export type RoomMetricsHistory = RoomMetricsBucket[];

export type RoomMetricsDailyBucket = Doc<"roomMetricsDaily">;

// generic alert row from the roomMetrics component's `alerts` table
export type RoomMetricsAlert = Doc<"alerts">;

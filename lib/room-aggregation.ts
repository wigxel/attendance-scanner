// Functional helpers for T/H/P smoothing + 10-min bucketing — Effect only for Result.

import * as E from "effect/Either";

export type Reading = {
  readonly temperature: number;
  readonly humidity: number;
  readonly pressure: number;
  readonly timestamp: number;
  readonly roomId: string;
  readonly deviceId: string;
};

export type Bucket = {
  readonly roomId: string;
  readonly bucketStart: number;
  readonly avgTemperature: number;
  readonly avgHumidity: number;
  readonly avgPressure: number;
  readonly count: number;
  readonly updatedAt: number;
};

export type Result<T, E = string> = E.Either<T, E>;

export const TEN_MIN = 10 * 60 * 1000;
export const DEFAULT_ROOM = "all";
export const DEFAULT_DEVICE = "general";
export const CURSOR_KEY = "roomMetrics10m_cursor";

export const toBucketStart = (timestamp: number): number =>
  Math.floor(timestamp / TEN_MIN) * TEN_MIN;

export const withDefaults = (r: {
  temperature: number;
  humidity: number;
  pressure: number;
  timestamp?: number;
  roomId?: string;
  deviceId?: string;
}): Reading => ({
  temperature: r.temperature,
  humidity: r.humidity,
  pressure: r.pressure,
  timestamp: r.timestamp ?? Date.now(),
  roomId: r.roomId ?? DEFAULT_ROOM,
  deviceId: r.deviceId ?? DEFAULT_DEVICE,
});

export const isValidReading = (r: Reading): boolean =>
  r.temperature >= -40 &&
  r.temperature <= 85 &&
  r.humidity >= 0 &&
  r.humidity <= 100 &&
  r.pressure >= 300 &&
  r.pressure <= 1100;

export const isOutlier = (r: Reading, avg: Bucket): boolean =>
  avg.count < 3
    ? false
    : Math.abs(r.temperature - avg.avgTemperature) > 10 ||
      Math.abs(r.humidity - avg.avgHumidity) > 20 ||
      Math.abs(r.pressure - avg.avgPressure) > 15;

export const averageReadings = (
  readings: readonly Reading[],
): Pick<Bucket, "avgTemperature" | "avgHumidity" | "avgPressure"> => {
  const n = readings.length;
  const sums = readings.reduce(
    (a, r) => ({
      t: a.t + r.temperature / n,
      h: a.h + r.humidity / n,
      p: a.p + r.pressure / n,
    }),
    { t: 0, h: 0, p: 0 },
  );
  return {
    avgTemperature: Math.round(sums.t * 10) / 10,
    avgHumidity: Math.round(sums.h * 10) / 10,
    avgPressure: Math.round(sums.p * 10) / 10,
  };
};

export const mergeAverages = (
  existing: Bucket,
  nextAvg: Pick<Bucket, "avgTemperature" | "avgHumidity" | "avgPressure">,
  nextCount: number,
): Pick<Bucket, "avgTemperature" | "avgHumidity" | "avgPressure" | "count"> => {
  const total = existing.count + nextCount;
  return {
    avgTemperature:
      Math.round(
        ((existing.avgTemperature * existing.count +
          nextAvg.avgTemperature * nextCount) /
          total) *
          10,
      ) / 10,
    avgHumidity:
      Math.round(
        ((existing.avgHumidity * existing.count +
          nextAvg.avgHumidity * nextCount) /
          total) *
          10,
      ) / 10,
    avgPressure:
      Math.round(
        ((existing.avgPressure * existing.count +
          nextAvg.avgPressure * nextCount) /
          total) *
          10,
      ) / 10,
    count: total,
  };
};

export const groupByBucket = (
  readings: readonly Reading[],
): Readonly<Record<number, readonly Reading[]>> =>
  readings.reduce<Record<number, readonly Reading[]>>((acc, r) => {
    const b = toBucketStart(r.timestamp);
    return { ...acc, [b]: [...(acc[b] ?? []), r] };
  }, {});

// filter-then-partition helpers keep callsite functional (no for/while)
export const partitionValid = (
  readings: readonly Reading[],
): { readonly valid: readonly Reading[]; readonly dropped: number } => {
  const valid = readings.filter(isValidReading);
  return { valid, dropped: readings.length - valid.length };
};

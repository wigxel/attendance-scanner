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
export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_ROOM = "all";
export const DEFAULT_DEVICE = "general";
export const CURSOR_KEY = "roomMetrics10m_cursor";
export const CURSOR_KEY_DAILY = "roomMetricsDaily_cursor";

export const toBucketStart = (timestamp: number): number =>
  Math.floor(timestamp / TEN_MIN) * TEN_MIN;

export const toDayStart = (timestamp: number): number => Math.floor(timestamp / DAY_MS) * DAY_MS;

export const toDayKey = (timestamp: number): string => new Date(toDayStart(timestamp)).toISOString().slice(0, 10);

export const withDefaults = (readingInput: {
  temperature: number;
  humidity: number;
  pressure: number;
  timestamp?: number;
  roomId?: string;
  deviceId?: string;
}): Reading => ({
  temperature: readingInput.temperature,
  humidity: readingInput.humidity,
  pressure: readingInput.pressure,
  timestamp: readingInput.timestamp ?? Date.now(),
  roomId: readingInput.roomId ?? DEFAULT_ROOM,
  deviceId: readingInput.deviceId ?? DEFAULT_DEVICE,
});

export const isValidReading = (reading: Reading): boolean =>
  reading.temperature >= -40 &&
  reading.temperature <= 85 &&
  reading.humidity >= 0 &&
  reading.humidity <= 100 &&
  reading.pressure >= 300 &&
  reading.pressure <= 1100;

export const isOutlier = (reading: Reading, bucket: Bucket): boolean =>
  bucket.count < 3
    ? false
    : Math.abs(reading.temperature - bucket.avgTemperature) > 10 ||
      Math.abs(reading.humidity - bucket.avgHumidity) > 20 ||
      Math.abs(reading.pressure - bucket.avgPressure) > 15;

export const averageReadings = (
  readings: readonly Reading[],
): Pick<Bucket, "avgTemperature" | "avgHumidity" | "avgPressure"> => {
  const readingCount = readings.length;
  const sums = readings.reduce(
    (accumulator, reading) => ({
      temperatureSum: accumulator.temperatureSum + reading.temperature / readingCount,
      humiditySum: accumulator.humiditySum + reading.humidity / readingCount,
      pressureSum: accumulator.pressureSum + reading.pressure / readingCount,
    }),
    { temperatureSum: 0, humiditySum: 0, pressureSum: 0 },
  );
  return {
    avgTemperature: Math.round(sums.temperatureSum * 10) / 10,
    avgHumidity: Math.round(sums.humiditySum * 10) / 10,
    avgPressure: Math.round(sums.pressureSum * 10) / 10,
  };
};

export const mergeAverages = (
  existing: Bucket,
  nextAvg: Pick<Bucket, "avgTemperature" | "avgHumidity" | "avgPressure">,
  nextCount: number,
): Pick<Bucket, "avgTemperature" | "avgHumidity" | "avgPressure" | "count"> => {
  const totalCount = existing.count + nextCount;
  return {
    avgTemperature:
      Math.round(
        ((existing.avgTemperature * existing.count +
          nextAvg.avgTemperature * nextCount) /
          totalCount) *
          10,
      ) / 10,
    avgHumidity:
      Math.round(
        ((existing.avgHumidity * existing.count +
          nextAvg.avgHumidity * nextCount) /
          totalCount) *
          10,
      ) / 10,
    avgPressure:
      Math.round(
        ((existing.avgPressure * existing.count +
          nextAvg.avgPressure * nextCount) /
          totalCount) *
          10,
      ) / 10,
    count: totalCount,
  };
};

export const groupByBucket = (
  readings: readonly Reading[],
): Readonly<Record<number, readonly Reading[]>> =>
  readings.reduce<Record<number, readonly Reading[]>>((groupedBuckets, reading) => {
    const bucketStart = toBucketStart(reading.timestamp);
    return { ...groupedBuckets, [bucketStart]: [...(groupedBuckets[bucketStart] ?? []), reading] };
  }, {});

// filter-then-partition helpers keep callsite functional (no for/while)
export const partitionValid = (
  readings: readonly Reading[],
): { readonly valid: readonly Reading[]; readonly dropped: number } => {
  const valid = readings.filter(isValidReading);
  return { valid, dropped: readings.length - valid.length };
};

export type DailyBucket = {
  readonly roomId: string;
  readonly date: string;
  readonly dayStart: number;
  readonly avgTemperature: number;
  readonly avgHumidity: number;
  readonly avgPressure: number;
  readonly minTemperature: number;
  readonly maxTemperature: number;
  readonly count: number;
  readonly updatedAt: number;
};

export const groupByDay = (
  buckets: readonly Pick<Bucket, "bucketStart" | "avgTemperature" | "avgHumidity" | "avgPressure" | "count">[],
): Readonly<Record<string, readonly Pick<Bucket, "bucketStart" | "avgTemperature" | "avgHumidity" | "avgPressure" | "count">[]>> =>
  buckets.reduce<Record<string, readonly Pick<Bucket, "bucketStart" | "avgTemperature" | "avgHumidity" | "avgPressure" | "count">[]>>((grouped, bucket) => {
    const dayKey = toDayKey(bucket.bucketStart);
    return { ...grouped, [dayKey]: [...(grouped[dayKey] ?? []), bucket] };
  }, {});

export const averageDailyBuckets = (
  dayBuckets: readonly Pick<Bucket, "avgTemperature" | "avgHumidity" | "avgPressure" | "count">[],
): Pick<DailyBucket, "avgTemperature" | "avgHumidity" | "avgPressure" | "minTemperature" | "maxTemperature" | "count"> => {
  const totalCount = dayBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const weighted = dayBuckets.reduce(
    (accumulator, bucket) => ({
      temperatureSum: accumulator.temperatureSum + bucket.avgTemperature * bucket.count,
      humiditySum: accumulator.humiditySum + bucket.avgHumidity * bucket.count,
      pressureSum: accumulator.pressureSum + bucket.avgPressure * bucket.count,
    }),
    { temperatureSum: 0, humiditySum: 0, pressureSum: 0 },
  );
  const temperatures = dayBuckets.map((bucket) => bucket.avgTemperature);
  return {
    avgTemperature: Math.round((weighted.temperatureSum / totalCount) * 10) / 10,
    avgHumidity: Math.round((weighted.humiditySum / totalCount) * 10) / 10,
    avgPressure: Math.round((weighted.pressureSum / totalCount) * 10) / 10,
    minTemperature: Math.min(...temperatures),
    maxTemperature: Math.max(...temperatures),
    count: totalCount,
  };
};

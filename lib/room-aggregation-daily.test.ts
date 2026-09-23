import { describe, expect, it } from "vitest";
import { TEN_MIN, toBucketStart } from "./room-aggregation";

const DAY_MS = 24 * 60 * 60 * 1000;
const toDayStart = (timestamp: number) => Math.floor(timestamp / DAY_MS) * DAY_MS;

describe("toDayStart wall-clock", () => {
  it("floors to 00:00", () => {
    expect(toDayStart(DAY_MS * 5 + 12345)).toBe(DAY_MS * 5);
  });
  it("midnight unchanged", () => {
    expect(toDayStart(DAY_MS * 3)).toBe(DAY_MS * 3);
  });
});

describe("daily grouping via 10m buckets", () => {
  it("groups buckets by day", () => {
    const buckets: Array<{ bucketStart: number; avgTemperature: number; count: number }> = [
      { bucketStart: DAY_MS * 10 + 1000, avgTemperature: 20, count: 2 },
      { bucketStart: DAY_MS * 10 + TEN_MIN, avgTemperature: 24, count: 2 },
      { bucketStart: DAY_MS * 11 + 1000, avgTemperature: 30, count: 1 },
    ];
    const grouped = buckets.reduce<Record<string, typeof buckets>>((acc, bucket) => {
      const key = new Date(bucket.bucketStart).toISOString().slice(0, 10);
      return { ...acc, [key]: [...(acc[key] ?? []), bucket] };
    }, {});
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["1970-01-11"]).toHaveLength(2);
    expect(grouped["1970-01-12"]).toHaveLength(1);
  });

  it("weighted daily avg", () => {
    const dayBuckets: Array<{ avgTemperature: number; count: number }> = [
      { avgTemperature: 20, count: 2 },
      { avgTemperature: 24, count: 2 },
    ];
    const totalCount = dayBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
    const weightedSum = dayBuckets.reduce((sum, bucket) => sum + bucket.avgTemperature * bucket.count, 0);
    const avg = Math.round((weightedSum / totalCount) * 10) / 10;
    expect(avg).toBe(22);
  });
});

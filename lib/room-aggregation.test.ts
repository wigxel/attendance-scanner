import { describe, expect, it } from "vitest";
import {
  averageReadings,
  DEFAULT_DEVICE,
  DEFAULT_ROOM,
  groupByBucket,
  isOutlier,
  isValidReading,
  mergeAverages,
  partitionValid,
  TEN_MIN,
  toBucketStart,
  withDefaults,
} from "./room-aggregation";

describe("toBucketStart", () => {
  it("wall-clock floor to 10min", () => {
    // 00:09:59 -> 00:00, 00:10:01 -> 00:10
    expect(toBucketStart(9 * 60 * 1000 + 59 * 1000)).toBe(0);
    expect(toBucketStart(10 * 60 * 1000 + 1000)).toBe(10 * 60 * 1000);
  });
  it("aligned timestamp unchanged", () => {
    expect(toBucketStart(TEN_MIN * 3)).toBe(TEN_MIN * 3);
  });
});

describe("withDefaults", () => {
  it("applies room all and device general", () => {
    const r = withDefaults({ temperature: 22, humidity: 50, pressure: 1013 });
    expect(r.roomId).toBe(DEFAULT_ROOM);
    expect(r.deviceId).toBe(DEFAULT_DEVICE);
    expect(r.timestamp).toBeDefined();
  });
  it("preserves provided room/device", () => {
    const r = withDefaults({
      temperature: 22,
      humidity: 50,
      pressure: 1013,
      roomId: "r1",
      deviceId: "d1",
    });
    expect(r.roomId).toBe("r1");
    expect(r.deviceId).toBe("d1");
  });
});

describe("isValidReading", () => {
  it("valid range", () => {
    expect(
      isValidReading(
        withDefaults({ temperature: 22, humidity: 50, pressure: 1013 }),
      ),
    ).toBe(true);
  });
  it("invalid temp", () => {
    expect(
      isValidReading(
        withDefaults({ temperature: 100, humidity: 50, pressure: 1013 }),
      ),
    ).toBe(false);
  });
  it("invalid humidity", () => {
    expect(
      isValidReading(
        withDefaults({ temperature: 22, humidity: 150, pressure: 1013 }),
      ),
    ).toBe(false);
  });
  it("invalid pressure", () => {
    expect(
      isValidReading(
        withDefaults({ temperature: 22, humidity: 50, pressure: 200 }),
      ),
    ).toBe(false);
  });
});

describe("averageReadings", () => {
  it("averages temps", () => {
    const avg = averageReadings([
      withDefaults({
        temperature: 20,
        humidity: 40,
        pressure: 1000,
        timestamp: 0,
      }),
      withDefaults({
        temperature: 24,
        humidity: 50,
        pressure: 1020,
        timestamp: 0,
      }),
    ]);
    expect(avg.avgTemperature).toBe(22);
    expect(avg.avgHumidity).toBe(45);
    expect(avg.avgPressure).toBe(1010);
  });
  it("single reading returns itself rounded", () => {
    const avg = averageReadings([
      withDefaults({
        temperature: 22.35,
        humidity: 44.44,
        pressure: 1013.33,
        timestamp: 0,
      }),
    ]);
    expect(avg.avgTemperature).toBe(22.4);
  });
});

describe("mergeAverages", () => {
  it("weighted average", () => {
    const existing = {
      roomId: "all",
      bucketStart: 0,
      avgTemperature: 20,
      avgHumidity: 40,
      avgPressure: 1000,
      count: 2,
      updatedAt: 0,
    };
    const next = { avgTemperature: 26, avgHumidity: 50, avgPressure: 1020 };
    const merged = mergeAverages(existing, next, 1);
    expect(merged.count).toBe(3);
    expect(merged.avgTemperature).toBe(22); // (20*2+26)/3
  });
});

describe("groupByBucket", () => {
  it("groups by wall-clock bucket", () => {
    const a = withDefaults({
      temperature: 22,
      humidity: 50,
      pressure: 1013,
      timestamp: 1_000,
    });
    const b = withDefaults({
      temperature: 23,
      humidity: 51,
      pressure: 1014,
      timestamp: 2_000,
    });
    const c = withDefaults({
      temperature: 24,
      humidity: 52,
      pressure: 1015,
      timestamp: TEN_MIN + 5_000,
    });
    const groups = groupByBucket([a, b, c]);
    expect(Object.keys(groups)).toHaveLength(2);
    expect(groups[0]).toHaveLength(2);
    expect(groups[TEN_MIN]).toHaveLength(1);
  });
});

describe("isOutlier", () => {
  it("not outlier when count <3", () => {
    const bucket = {
      roomId: "all",
      bucketStart: 0,
      avgTemperature: 22,
      avgHumidity: 45,
      avgPressure: 1013,
      count: 2,
      updatedAt: 0,
    };
    const r = withDefaults({
      temperature: 50,
      humidity: 90,
      pressure: 800,
      timestamp: 0,
    });
    expect(isOutlier(r, bucket)).toBe(false);
  });
  it("outlier when temp >10 away and count >=3", () => {
    const bucket = {
      roomId: "all",
      bucketStart: 0,
      avgTemperature: 22,
      avgHumidity: 45,
      avgPressure: 1013,
      count: 5,
      updatedAt: 0,
    };
    const r = withDefaults({
      temperature: 35,
      humidity: 45,
      pressure: 1013,
      timestamp: 0,
    });
    expect(isOutlier(r, bucket)).toBe(true);
  });
  it("not outlier within threshold", () => {
    const bucket = {
      roomId: "all",
      bucketStart: 0,
      avgTemperature: 22,
      avgHumidity: 45,
      avgPressure: 1013,
      count: 5,
      updatedAt: 0,
    };
    const r = withDefaults({
      temperature: 24,
      humidity: 50,
      pressure: 1015,
      timestamp: 0,
    });
    expect(isOutlier(r, bucket)).toBe(false);
  });
});

describe("partitionValid", () => {
  it("splits valid/invalid", () => {
    const readings = [
      withDefaults({
        temperature: 22,
        humidity: 50,
        pressure: 1013,
        timestamp: 0,
      }),
      withDefaults({
        temperature: 200,
        humidity: 50,
        pressure: 1013,
        timestamp: 0,
      }),
    ];
    const p = partitionValid(readings);
    expect(p.valid).toHaveLength(1);
    expect(p.dropped).toBe(1);
  });
});

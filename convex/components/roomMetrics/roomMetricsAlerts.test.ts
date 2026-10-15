/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { ensureAlert } from "./alerts";
import { TEN_MIN, toBucketStart } from "./lib";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const BASE_READING = { humidity: 50, pressure: 1013 } as const;

const seedReading = async (
  t: ReturnType<typeof convexTest>,
  temperature: number,
  timestamp: number,
) => {
  await t.mutation(api.index.store, {
    ...BASE_READING,
    temperature,
    timestamp,
  });
};

describe("temperature breach detection", () => {
  it("writes a low-breach alert for a cold bucket", async () => {
    const t = convexTest(schema, modules);
    const bucketStart = toBucketStart(Date.now());
    await seedReading(t, 10, bucketStart + 1000);
    await seedReading(t, 11, bucketStart + 2000);
    await t.mutation(api.index.smoothAggregations, {});

    const alerts = await t.query(api.alerts.recentAlerts, {});
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("temperature_breach");
    expect(alerts[0].roomId).toBe("all");
    expect(alerts[0].value).toBe(10.5);
    expect(alerts[0].detail).toContain("low");
    expect(alerts[0].acknowledged).toBe(false);
  });

  it("does not alert at exactly 12 or 45, alerts just outside", async () => {
    const t = convexTest(schema, modules);
    const base = toBucketStart(Date.now());
    await seedReading(t, 12, base + 1000);
    await seedReading(t, 45, base - TEN_MIN + 1000);
    await seedReading(t, 45.1, base - 2 * TEN_MIN + 1000);
    await seedReading(t, 11.9, base - 3 * TEN_MIN + 1000);
    await t.mutation(api.index.smoothAggregations, {});

    const alerts = await t.query(api.alerts.recentAlerts, {});
    expect(alerts).toHaveLength(2);
    expect(alerts[0].value).toBe(45.1);
    expect(alerts[1].value).toBe(11.9);
  });

  it("never duplicates an alert for the same bucket", async () => {
    const t = convexTest(schema, modules);
    const bucketStart = toBucketStart(Date.now());
    await seedReading(t, 10, bucketStart + 1000);
    await t.mutation(api.index.smoothAggregations, {});

    // re-process the same bucket via a cursor advance with a new reading
    await seedReading(t, 12, bucketStart + 2000);
    await t.mutation(api.index.smoothAggregations, {});

    const alerts = await t.query(api.alerts.recentAlerts, {});
    expect(alerts).toHaveLength(1);
    // dedupe keeps the first breach's row untouched
    expect(alerts[0].value).toBe(10);
  });

  it("ignores stale buckets so replays cannot flood alerts", async () => {
    const t = convexTest(schema, modules);
    const staleBucketStart = toBucketStart(Date.now() - 2 * 60 * 60 * 1000);
    await seedReading(t, 10, staleBucketStart + 1000);
    await t.mutation(api.index.smoothAggregations, {});

    const alerts = await t.query(api.alerts.recentAlerts, {});
    expect(alerts).toHaveLength(0);
  });
});

describe("ensureAlert", () => {
  it("dedupes by dedupeKey", async () => {
    const t = convexTest(schema, modules);
    const alert = {
      type: "temperature_breach",
      roomId: "all",
      detail: "avg 10°C",
    };
    const first = await t.run((ctx) =>
      ensureAlert(ctx, { ...alert, dedupeKey: "all:temperature_breach:1" }),
    );
    expect(first).not.toBeNull();
    const second = await t.run((ctx) =>
      ensureAlert(ctx, { ...alert, dedupeKey: "all:temperature_breach:1" }),
    );
    expect(second).toBeNull();

    const rows = await t.run((ctx) => ctx.db.query("alerts").collect());
    expect(rows).toHaveLength(1);
  });
});

describe("push delivery support", () => {
  it("unnotifiedAlerts excludes marked alerts", async () => {
    const t = convexTest(schema, modules);
    const created = await t.run((ctx) =>
      ensureAlert(ctx, {
        type: "temperature_breach",
        roomId: "all",
        dedupeKey: "all:temperature_breach:n1",
        detail: "notify me",
      }),
    );
    expect(created).not.toBeNull();

    expect(await t.query(api.alerts.unnotifiedAlerts, {})).toHaveLength(1);

    await t.mutation(api.alerts.markNotified, { alertId: created! });
    expect(await t.query(api.alerts.unnotifiedAlerts, {})).toHaveLength(0);
  });
});

describe("recentAlerts and acknowledge", () => {
  it("lists newest first and acknowledges", async () => {
    const t = convexTest(schema, modules);
    const grow = "all:temperature_breach:k";
    const older = await t.run((ctx) =>
      ensureAlert(ctx, {
        type: "temperature_breach",
        roomId: "all",
        dedupeKey: `${grow}1`,
        detail: "older",
      }),
    );
    expect(older).not.toBeNull();
    const newer = await t.run((ctx) =>
      ensureAlert(ctx, {
        type: "temperature_breach",
        roomId: "all",
        dedupeKey: `${grow}2`,
        detail: "newer",
      }),
    );
    expect(newer).not.toBeNull();

    const alerts = await t.query(api.alerts.recentAlerts, {});
    expect(alerts.map((alert) => alert.dedupeKey)).toStrictEqual([
      `${grow}2`,
      `${grow}1`,
    ]);

    await t.mutation(api.alerts.acknowledge, { alertId: newer! });
    const acknowledged = await t.run((ctx) => ctx.db.get(newer!));
    expect(acknowledged?.acknowledged).toBe(true);
  });
});

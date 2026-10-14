/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const baseReading = {
  temperature: 22,
  humidity: 50,
  pressure: 1013,
};

async function storeAt(t: ReturnType<typeof convexTest>, ts: number) {
  await t.mutation(api.index.store, {
    ...baseReading,
    timestamp: ts,
  });
}

describe("roomMetrics.lastReading", () => {
  it("returns null timestamp for an empty store", async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.index.lastReading, {});
    expect(result).toEqual({ timestamp: null });
  });

  it("returns the most recent raw reading", async () => {
    const t = convexTest(schema, modules);
    const older = Date.parse("2026-10-14T09:00:00Z");
    const newer = Date.parse("2026-10-14T09:30:00Z");
    await storeAt(t, older);
    await storeAt(t, newer);

    const result = await t.query(api.index.lastReading, {});
    expect(result).toEqual({ timestamp: newer });
  });

  it("does not depend on smoothing having run", async () => {
    const t = convexTest(schema, modules);
    await storeAt(t, Date.parse("2026-10-14T09:00:00Z"));
    const buckets = await t.query(api.index.history, {
      limit: 10,
    });
    expect(buckets).toHaveLength(0);

    const result = await t.query(api.index.lastReading, {});
    expect(result?.timestamp).not.toBeNull();
  });
});

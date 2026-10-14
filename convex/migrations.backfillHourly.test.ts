/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Prod fixture: exports/daily_register_prod_2026-08_2026-10.json
// (uncommitted working-tree file, exported via `npx convex export --prod`).
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../exports/daily_register_prod_2026-08_2026-10.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const WINDOW = {
  start: "2026-08-07T00:00:00.000Z",
  end: "2026-10-07T23:59:59.999Z",
};

async function seedProdWindow(t: ReturnType<typeof convexTest>) {
  for (const doc of fixture) {
    const { _id, _creationTime, ticketId, ...rest } = doc;
    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", rest as never);
    });
  }
}

async function accessSnapshot(t: ReturnType<typeof convexTest>) {
  const rows = await t.run(async (ctx) => {
    return ctx.db.query("daily_register").collect();
  });
  return new Map(
    rows.map((r) => [`${r.userId}|${r.timestamp}`, r.access] as const),
  );
}

describe("backfillHourlyPlanAccess on prod fixture (2026-08-07..2026-10-07)", () => {
  it("converts exactly the stale hourly rows and corrects the cash total", async () => {
    const t = convexTest(schema, modules);
    await seedProdWindow(t);

    // Pre-backfill the stale rows bill at the flat daily rate — the same
    // 42000 total prod's cron wrote.
    const before = await t.query(api.metrics.sumCashPayments, WINDOW);
    expect(before).toEqual({ count: 14, total: 42000 });

    const snapshotBefore = await accessSnapshot(t);

    const { updated } = await t.mutation(
      internal.migrations.backfillHourlyPlanAccess,
      {},
    );

    // 35 stale rows in the prod window: 6 cash + 29 bank_transfer, all
    // planId "daily" carrying an hourly duration.
    expect(updated).toBe(35);

    const snapshotAfter = await accessSnapshot(t);
    expect(snapshotAfter.size).toBe(snapshotBefore.size);

    const changed = [...snapshotAfter.entries()].filter(
      ([key, access]) =>
        JSON.stringify(access) !== JSON.stringify(snapshotBefore.get(key)),
    );
    expect(changed).toHaveLength(35);

    for (const [, access] of changed) {
      const a = access as {
        planId: string;
        planPriceInKobo: number;
        amountInKobo: number;
        duration: { type: string; value?: number };
      };
      expect(a.planId).toBe("hourly");
      expect(a.duration.type).toBe("hourly"); // hours preserved
      expect(a.planPriceInKobo).toBe(50000); // HOURLY_RATE fallback snapshot
      expect(a.amountInKobo).toBe(a.planPriceInKobo * (a.duration.value ?? 0));
    }

    // Pricing reads the stored total, so moving the rows onto the hourly
    // plan with the hourly snapshot bills them at snapshot x hours:
    // 8 x 3000 (fullday) + 14h x 500 = 31000.
    const after = await t.query(api.metrics.sumCashPayments, WINDOW);
    expect(after).toEqual({ count: 14, total: 31000 });
  });

  it("takes the snapshot from the hourly plan row when one exists", async () => {
    const t = convexTest(schema, modules);
    await seedProdWindow(t);

    // Priced from the plan row (600 naira), not the HOURLY_RATE fallback:
    // 8 fullday x 3000 + 14h x 600 = 32400, not 31000.
    await t.run(async (ctx) => {
      await ctx.db.insert("accessPlans", {
        key: "hourly",
        name: "Hourly",
        price: 600,
        no_of_days: 1,
        description: "",
        features: [],
      });
    });

    const { updated } = await t.mutation(
      internal.migrations.backfillHourlyPlanAccess,
      {},
    );
    expect(updated).toBe(35);

    const after = await t.query(api.metrics.sumCashPayments, WINDOW);
    expect(after).toEqual({ count: 14, total: 24000 + 14 * 600 });

    // Snapshot comes from the plan row (60000), not the fallback — and
    // every patched total is snapshot x its own hours.
    const rows = await t.run(async (ctx) =>
      ctx.db.query("daily_register").collect(),
    );
    const patched = rows.filter(
      (r) => (r.access as { planId?: string }).planId === "hourly",
    );
    expect(patched).toHaveLength(35);
    for (const row of patched) {
      const a = row.access as {
        planPriceInKobo: number;
        amountInKobo: number;
        duration: { value: number };
      };
      expect(a.planPriceInKobo).toBe(60000);
      expect(a.amountInKobo).toBe(60000 * a.duration.value);
    }
  });

  it("is a no-op when run twice", async () => {
    const t = convexTest(schema, modules);
    await seedProdWindow(t);

    const first = await t.mutation(
      internal.migrations.backfillHourlyPlanAccess,
      {},
    );
    expect(first.updated).toBe(35);

    const second = await t.mutation(
      internal.migrations.backfillHourlyPlanAccess,
      {},
    );
    expect(second.updated).toBe(0);
  });
});

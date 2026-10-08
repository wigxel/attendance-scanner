/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { PlanImpl } from "./shared";

const modules = import.meta.glob("./**/*.ts");

function makeDevice(visitorId: string) {
  return { browser: "Chrome", name: "Test", visitorId };
}

// After fix: daily 3000 naira => 300000 kobo => 9000 naira for 3 records
describe("sumCashPayments naira", () => {
  it("daily 3000 naira x3 => 9000 naira", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 3; i++) {
      await t.run(async (ctx) => {
        await ctx.db.insert("daily_register", {
          userId: `user-${i}`,
          timestamp: `2026-09-0${2 + i}T12:00:00.000Z`,
          source: "web",
          device: makeDevice(`vis-${i}`),
          access: {
            _v: "2",
            kind: "paid",
            planId: "daily",
            amountInKobo: 300000, // 3000 naira in kobo
            paymentMethod: "cash",
            duration: { type: "fullday" },
          },
          admitted_by: "staff-1",
        });
      });
    }
    const result = await t.query(api.metrics.sumCashPayments, {
      start: "2026-09-01T00:00:00.000Z",
      end: "2026-09-30T23:59:59.999Z",
    });
    expect(result).toEqual({ count: 3, total: 9000 });
  });

  it("PlanImpl.toStruct daily 3000 price => 300000 kobo (3000 naira)", async () => {
    const plan = { key: "daily", price: 3000, no_of_days: 1, name: "Daily", description: "", features: [] } as any;
    const struct: any = PlanImpl.toStruct(plan);
    expect(struct.amountInKobo).toBe(300000);
  });

  it("hourly 500 price => 50000 kobo base", async () => {
    const plan = { key: "hourly", price: 500, no_of_days: 1, name: "Hourly", description: "", features: [] } as any;
    const struct: any = PlanImpl.toStruct(plan);
    expect(struct.amountInKobo).toBe(50000);
  });
});

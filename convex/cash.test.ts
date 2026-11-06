/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, components } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

type Tester = ReturnType<typeof convexTest>;

async function seedAcl(t: Tester, grantAdmin: boolean) {
  t.registerComponent("wigxel_acl", aclSchema, aclModules);

  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    if (grantAdmin) {
      await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
        identity: "admin-user",
      });
    }
  });
}

function movement(overrides: {
  occurredAt: string;
  channel: "cash" | "pos" | "transfer";
  direction: "in" | "out";
  amountKobo: number;
  sourceRef: string;
}) {
  return { ...overrides, createdBy: "staff-1" };
}

describe("cash.dailySummary", () => {
  it("reports per-day, per-channel in/out/balance and till cash on hand", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);

    await t.run(async (ctx) => {
      await ctx.db.insert(
        "cashMovements",
        movement({
          occurredAt: "2026-05-15T10:00:00.000Z",
          channel: "cash",
          direction: "in",
          amountKobo: 5000,
          sourceRef: "register:a",
        }),
      );
      await ctx.db.insert(
        "cashMovements",
        movement({
          occurredAt: "2026-05-15T11:00:00.000Z",
          channel: "cash",
          direction: "out",
          amountKobo: 2000,
          sourceRef: "register:b",
        }),
      );
      await ctx.db.insert(
        "cashMovements",
        movement({
          occurredAt: "2026-05-15T12:00:00.000Z",
          channel: "pos",
          direction: "in",
          amountKobo: 10000,
          sourceRef: "pos:manual:2026-05-15",
        }),
      );
      await ctx.db.insert(
        "cashMovements",
        movement({
          occurredAt: "2026-05-15T13:00:00.000Z",
          channel: "transfer",
          direction: "in",
          amountKobo: 30000,
          sourceRef: "booking:a",
        }),
      );
      await ctx.db.insert(
        "cashMovements",
        movement({
          occurredAt: "2026-05-16T08:00:00.000Z",
          channel: "transfer",
          direction: "out",
          amountKobo: 12000,
          sourceRef: "purchase:a",
        }),
      );
      // 23:30 UTC is already the next day in Lagos.
      await ctx.db.insert(
        "cashMovements",
        movement({
          occurredAt: "2026-05-15T23:30:00.000Z",
          channel: "cash",
          direction: "in",
          amountKobo: 3000,
          sourceRef: "register:c",
        }),
      );
    });

    const admin = t.withIdentity({ profile_id: "admin-user" });
    const summary = await admin.query(api.cash.dailySummary, {
      start: "2026-05-15",
      end: "2026-05-16",
    });

    expect(summary.days.map((day) => day.date)).toEqual([
      "2026-05-16",
      "2026-05-15",
    ]);

    const [may16, may15] = summary.days;
    expect(may16.cash).toEqual({
      inKobo: 3000,
      outKobo: 0,
      balanceKobo: 3000,
    });
    expect(may16.transfer).toEqual({
      inKobo: 0,
      outKobo: 12000,
      balanceKobo: -12000,
    });
    expect(may15.cash).toEqual({
      inKobo: 5000,
      outKobo: 2000,
      balanceKobo: 3000,
    });
    expect(may15.pos).toEqual({
      inKobo: 10000,
      outKobo: 0,
      balanceKobo: 10000,
    });

    // POS and transfer never enter cash on hand.
    expect(summary.cashOnHandKobo).toBe(6000);
    expect(summary.totals.cash).toEqual({
      inKobo: 8000,
      outKobo: 2000,
      balanceKobo: 6000,
    });
  });

  it("rejects callers without reports:read", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, false);
    const nobody = t.withIdentity({ profile_id: "nobody" });

    await expect(
      nobody.query(api.cash.dailySummary, {
        start: "2026-05-15",
        end: "2026-05-16",
      }),
    ).rejects.toThrow('Access denied. Required privilege: "reports:read".');
  });
});

describe("cash.recordPosTakings", () => {
  it("keeps one movement per day and corrects it on re-entry", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);
    const admin = t.withIdentity({ profile_id: "admin-user" });

    await admin.mutation(api.cash.recordPosTakings, {
      date: "2026-05-15",
      totalKobo: 10000,
    });
    await admin.mutation(api.cash.recordPosTakings, {
      date: "2026-05-15",
      totalKobo: 12000,
    });

    const movements = await t.run(async (ctx) =>
      ctx.db.query("cashMovements").collect(),
    );

    expect(movements).toHaveLength(1);
    expect(movements[0].channel).toBe("pos");
    expect(movements[0].amountKobo).toBe(12000);
    expect(movements[0].sourceRef).toBe("pos:manual:2026-05-15");
  });

  it("clears the day when the total is zero", async () => {
    const t = convexTest(schema, modules);
    await seedAcl(t, true);
    const admin = t.withIdentity({ profile_id: "admin-user" });

    await admin.mutation(api.cash.recordPosTakings, {
      date: "2026-05-15",
      totalKobo: 10000,
    });
    await admin.mutation(api.cash.recordPosTakings, {
      date: "2026-05-15",
      totalKobo: 0,
    });

    const movements = await t.run(async (ctx) =>
      ctx.db.query("cashMovements").collect(),
    );
    expect(movements).toHaveLength(0);
  });
});

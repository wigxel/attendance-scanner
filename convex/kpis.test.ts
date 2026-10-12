/** biome-ignore-all lint/suspicious/noExplicitAny: This is a test file */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterAll, describe, expect, it, vi } from "vitest";
import { api, components, internal } from "./_generated/api";
import aclSchema from "./components/acl/schema";
import {
  dayBounds,
  isDue,
  isoWeekKey,
  type LagosDay,
  periodKeyFor,
  windowAllows,
} from "./kpis";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const aclModules = import.meta.glob("./components/acl/**/*.ts");

vi.useFakeTimers({ toFake: ["Date"] });
afterAll(() => vi.useRealTimers());

// Thursday: noon and evening in Lagos (UTC+1, no DST).
const NOON = new Date("2026-10-08T11:00:00.000Z");
const EVENING = new Date("2026-10-08T18:30:00.000Z");
const TODAY = "2026-10-08";

async function setupUser(identity: string, privileges: string[]) {
  const t = convexTest(schema, modules);
  t.registerComponent("wigxel_acl", aclSchema, aclModules);
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "test-admin",
    });
    const role = await ctx.runMutation(components.wigxel_acl.roles.createRole, {
      callerId: "test-admin",
      name: `role-${identity}`,
      description: "",
      privileges,
    });
    if (!role.success) throw new Error(role.error);
    const reg = await ctx.runMutation(
      components.wigxel_acl.identities.registerIdentity,
      {
        callerId: "test-admin",
        identity,
        roleId: role.data.roleId as any,
      },
    );
    if (!reg.success) throw new Error(reg.error);
  });
  return { t, authed: t.withIdentity({ profile_id: identity }) };
}

async function setupTwoUsers() {
  const t = convexTest(schema, modules);
  t.registerComponent("wigxel_acl", aclSchema, aclModules);
  await t.run(async (ctx) => {
    await ctx.runMutation(components.wigxel_acl.seed.seedRoles, {});
    await ctx.runMutation(components.wigxel_acl.seed.makeSuperAdmin, {
      identity: "test-admin",
    });
    for (const [identity, privileges] of [
      ["mgr-1", ["kpis:complete"]],
      ["mgr-2", ["kpis:complete"]],
    ] as const) {
      const role = await ctx.runMutation(
        components.wigxel_acl.roles.createRole,
        {
          callerId: "test-admin",
          name: `role-${identity}`,
          description: "",
          privileges: [...privileges],
        },
      );
      if (!role.success) throw new Error(role.error);
      const reg = await ctx.runMutation(
        components.wigxel_acl.identities.registerIdentity,
        {
          callerId: "test-admin",
          identity,
          roleId: role.data.roleId as any,
        },
      );
      if (!reg.success) throw new Error(reg.error);
    }
  });
  return {
    t,
    mgr1: t.withIdentity({ profile_id: "mgr-1" }),
    mgr2: t.withIdentity({ profile_id: "mgr-2" }),
  };
}

async function insertKpi(t: ReturnType<typeof convexTest>, overrides = {}) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("kpis", {
      title: "Mop floor",
      cadence: "daily",
      audience: "all",
      points: 5,
      isActive: true,
      ...overrides,
    } as any);
  });
}

describe("isoWeekKey", () => {
  it("labels 2026-01-01 (Thursday) as W01", () => {
    expect(isoWeekKey(2026, 1, 1)).toBe("2026-W01");
  });

  it("labels Sunday 2026-10-11 as W41", () => {
    expect(isoWeekKey(2026, 10, 11)).toBe("2026-W41");
  });

  it("labels Monday 2026-10-12 as W42", () => {
    expect(isoWeekKey(2026, 10, 12)).toBe("2026-W42");
  });
});

describe("periodKeyFor", () => {
  it("builds daily, weekly, monthly keys", () => {
    const parts = { year: 2026, month: 10, day: 11, hhmm: "09:00" };
    expect(periodKeyFor("daily", parts)).toBe("2026-10-11");
    expect(periodKeyFor("weekly", parts)).toBe("2026-W41");
    expect(periodKeyFor("monthly", parts)).toBe("2026-10");
  });
});

describe("windowAllows", () => {
  it("allows anytime when no window set", () => {
    expect(windowAllows({}, "03:00")).toBe(true);
  });

  it("blocks outside the window", () => {
    expect(
      windowAllows({ windowStart: "18:00", windowEnd: "22:00" }, "09:00"),
    ).toBe(false);
    expect(
      windowAllows({ windowStart: "18:00", windowEnd: "22:00" }, "19:00"),
    ).toBe(true);
  });

  it("wraps overnight windows past midnight", () => {
    const overnight = { windowStart: "18:00", windowEnd: "06:00" };
    expect(windowAllows(overnight, "17:59")).toBe(false);
    expect(windowAllows(overnight, "18:00")).toBe(true);
    expect(windowAllows(overnight, "23:30")).toBe(true);
    expect(windowAllows(overnight, "00:00")).toBe(true);
    expect(windowAllows(overnight, "06:00")).toBe(true);
    expect(windowAllows(overnight, "06:01")).toBe(false);
    expect(windowAllows(overnight, "12:00")).toBe(false);
  });
});

const THU: LagosDay = {
  year: 2026,
  month: 10,
  day: 8,
  weekdayMon0: 3,
  daysInMonth: 31,
};

describe("isDue", () => {
  it("shows weekly KPIs from the due weekday through Sunday", () => {
    const kpi = { cadence: "weekly", dueWeekday: 4 };
    expect(isDue(kpi, THU)).toBe(false);
    expect(isDue(kpi, { ...THU, day: 9, weekdayMon0: 4 })).toBe(true);
    expect(isDue(kpi, { ...THU, day: 11, weekdayMon0: 6 })).toBe(true);
  });

  it("shows weekly KPIs all week when no due weekday", () => {
    expect(isDue({ cadence: "weekly" }, { ...THU, weekdayMon0: 0 })).toBe(true);
  });

  it("clamps monthly due days to short months", () => {
    const kpi = { cadence: "monthly", dueMonthDay: 30 };
    const feb27: LagosDay = {
      year: 2026,
      month: 2,
      day: 27,
      weekdayMon0: 4,
      daysInMonth: 28,
    };
    expect(isDue(kpi, feb27)).toBe(false);
    expect(isDue(kpi, { ...feb27, day: 28, weekdayMon0: 5 })).toBe(true);
  });

  it("shows daily KPIs always", () => {
    expect(isDue({ cadence: "daily" }, THU)).toBe(true);
  });
});

describe("dayBounds", () => {
  it("covers the Lagos day", () => {
    const { fromMs, toMs } = dayBounds("2026-10-08");
    expect(new Date(fromMs).toISOString()).toBe("2026-10-07T23:00:00.000Z");
    expect(toMs - fromMs).toBe(86400000 - 1);
  });
});

describe("toggleCheck auth", () => {
  it("rejects unauthenticated callers", async () => {
    const t = convexTest(schema, modules);
    const kpiId = await insertKpi(t);
    await expect(t.mutation(api.kpis.toggleCheck, { kpiId })).rejects.toThrow();
  });

  it("rejects users without kpis:complete", async () => {
    const { t, authed } = await setupUser("mgr-nopriv", []);
    const kpiId = await insertKpi(t);
    await expect(
      authed.mutation(api.kpis.toggleCheck, { kpiId }),
    ).rejects.toThrow('Required privilege: "kpis:complete"');
  });
});

describe("toggleCheck", () => {
  it("checks a KPI and snapshots points", async () => {
    vi.setSystemTime(NOON);
    const { t, authed } = await setupUser("mgr-1", ["kpis:complete"]);
    const kpiId = await insertKpi(t, { points: 7 });

    expect(await authed.mutation(api.kpis.toggleCheck, { kpiId })).toEqual({
      checked: true,
    });

    const row = await t.run(async (ctx) =>
      ctx.db.query("kpiCompletions").first(),
    );
    expect(row).toMatchObject({
      periodKey: TODAY,
      completedBy: "mgr-1",
      pointsEarned: 7,
    });
  });

  it("undoes a check within 10 minutes", async () => {
    vi.setSystemTime(NOON);
    const { t, authed } = await setupUser("mgr-1", ["kpis:complete"]);
    const kpiId = await insertKpi(t);

    await authed.mutation(api.kpis.toggleCheck, { kpiId });
    vi.setSystemTime(new Date(NOON.getTime() + 9 * 60 * 1000));
    expect(await authed.mutation(api.kpis.toggleCheck, { kpiId })).toEqual({
      checked: false,
    });

    const row = await t.run(async (ctx) =>
      ctx.db.query("kpiCompletions").first(),
    );
    expect(row).toBeNull();
  });

  it("locks the check after 10 minutes", async () => {
    vi.setSystemTime(NOON);
    const { t, authed } = await setupUser("mgr-1", ["kpis:complete"]);
    const kpiId = await insertKpi(t);

    await authed.mutation(api.kpis.toggleCheck, { kpiId });
    vi.setSystemTime(new Date(NOON.getTime() + 11 * 60 * 1000));
    await expect(
      authed.mutation(api.kpis.toggleCheck, { kpiId }),
    ).rejects.toThrow("locked");
  });

  it("blocks checks outside the KPI window", async () => {
    vi.setSystemTime(NOON);
    const { t, authed } = await setupUser("mgr-1", ["kpis:complete"]);
    const kpiId = await insertKpi(t, {
      windowStart: "18:00",
      windowEnd: "22:00",
    });

    await expect(
      authed.mutation(api.kpis.toggleCheck, { kpiId }),
    ).rejects.toThrow("cannot be checked at this time");

    vi.setSystemTime(EVENING);
    expect(await authed.mutation(api.kpis.toggleCheck, { kpiId })).toEqual({
      checked: true,
    });
  });

  it("rejects inactive KPIs", async () => {
    vi.setSystemTime(NOON);
    const { t, authed } = await setupUser("mgr-1", ["kpis:complete"]);
    const kpiId = await insertKpi(t, { isActive: false });
    await expect(
      authed.mutation(api.kpis.toggleCheck, { kpiId }),
    ).rejects.toThrow("KPI not found");
  });

  it("rejects checks before the due day", async () => {
    vi.setSystemTime(NOON); // Thursday
    const { t, authed } = await setupUser("mgr-1", ["kpis:complete"]);
    const kpiId = await insertKpi(t, {
      cadence: "weekly",
      dueWeekday: 4, // Friday
    });
    await expect(
      authed.mutation(api.kpis.toggleCheck, { kpiId }),
    ).rejects.toThrow("not due yet");
  });

  it("rejects out-of-range due fields", async () => {
    const { authed } = await setupUser("admin-1", ["kpis:manage"]);
    const base = {
      title: "X",
      cadence: "weekly",
      audience: "all",
      points: 5,
      isActive: true,
    } as const;
    await expect(
      authed.mutation(api.kpis.createKpi, { ...base, dueWeekday: 7 }),
    ).rejects.toThrow("dueWeekday");
    await expect(
      authed.mutation(api.kpis.createKpi, { ...base, dueMonthDay: 32 }),
    ).rejects.toThrow("dueMonthDay");
  });

  it("tracks each manager separately", async () => {
    vi.setSystemTime(NOON);
    const { t, mgr1, mgr2 } = await setupTwoUsers();
    const kpiId = await insertKpi(t);

    await mgr1.mutation(api.kpis.toggleCheck, { kpiId });
    await mgr2.mutation(api.kpis.toggleCheck, { kpiId });

    const rows = await t.run(async (ctx) =>
      ctx.db.query("kpiCompletions").collect(),
    );
    expect(rows).toHaveLength(2);
  });

  it("keeps the snapshot when preset points change", async () => {
    vi.setSystemTime(NOON);
    const { t, authed } = await setupUser("mgr-1", [
      "kpis:complete",
      "kpis:manage",
    ]);
    const kpiId = await insertKpi(t, { points: 5 });

    await authed.mutation(api.kpis.toggleCheck, { kpiId });
    await authed.mutation(api.kpis.updateKpi, {
      kpiId,
      title: "Mop floor",
      cadence: "daily",
      audience: "all",
      points: 50,
      isActive: true,
    });

    const row = await t.run(async (ctx) =>
      ctx.db.query("kpiCompletions").first(),
    );
    expect(row?.pointsEarned).toBe(5);
  });
});

describe("myChecklist", () => {
  it("returns empty for unauthenticated callers", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.kpis.myChecklist, {})).resolves.toEqual([]);
  });

  it("reflects completion, window and undo state", async () => {
    vi.setSystemTime(NOON);
    const { t, authed } = await setupUser("mgr-1", ["kpis:complete"]);
    const openId = await insertKpi(t, { title: "Open" });
    await insertKpi(t, {
      title: "Evening only",
      windowStart: "18:00",
      windowEnd: "22:00",
    });

    await authed.mutation(api.kpis.toggleCheck, {
      kpiId: openId,
    });
    const list = await authed.query(api.kpis.myChecklist, {});

    expect(list).toHaveLength(2);
    const open = list.find((e) => e.title === "Open");
    const evening = list.find((e) => e.title === "Evening only");
    expect(open).toMatchObject({
      completed: true,
      windowOpen: true,
      undoable: true,
    });
    expect(evening).toMatchObject({ completed: false, windowOpen: false });
  });

  it("hides KPIs that are not due yet", async () => {
    vi.setSystemTime(NOON); // Thursday
    const { t, authed } = await setupUser("mgr-1", ["kpis:complete"]);
    await insertKpi(t, {
      title: "Due Friday",
      cadence: "weekly",
      dueWeekday: 4,
    });
    await insertKpi(t, { title: "Always" });

    const list = await authed.query(api.kpis.myChecklist, {});
    expect(list.map((e) => e.title)).toEqual(["Always"]);
  });
});

describe("presets", () => {
  it("rejects create without kpis:manage", async () => {
    const { authed } = await setupUser("mgr-1", ["kpis:complete"]);
    await expect(
      authed.mutation(api.kpis.createKpi, {
        title: "X",
        cadence: "daily",
        audience: "day",
        points: 5,
        isActive: true,
      }),
    ).rejects.toThrow('Required privilege: "kpis:manage"');
  });

  it("requires audience on create", async () => {
    const { authed } = await setupUser("admin-1", ["kpis:manage"]);
    await expect(
      authed.mutation(api.kpis.createKpi, {
        title: "X",
        cadence: "daily",
        points: 5,
        isActive: true,
      } as any),
    ).rejects.toThrow();
  });

  it("creates, updates and archives; archive keeps history", async () => {
    vi.setSystemTime(NOON);
    const { t, authed } = await setupUser("admin-1", ["kpis:manage"]);

    const kpiId = await authed.mutation(api.kpis.createKpi, {
      title: "Original",
      cadence: "weekly",
      audience: "night",
      points: 10,
      isActive: true,
    });

    // History outlives the preset: a completion recorded before archiving.
    await t.run(async (ctx) => {
      await ctx.db.insert("kpiCompletions", {
        kpiId,
        periodKey: "2026-W41",
        completedBy: "mgr-9",
        completedAt: Date.now(),
        pointsEarned: 10,
      });
    });

    await authed.mutation(api.kpis.updateKpi, {
      kpiId,
      title: "Renamed",
      cadence: "weekly",
      audience: "night",
      points: 10,
      isActive: true,
    });
    const all = await authed.query(api.kpis.listAll, {});
    expect(all.find((e) => e._id === kpiId)?.title).toBe("Renamed");

    await authed.mutation(api.kpis.archiveKpi, { kpiId });
    const archived = await t.run(async (ctx) => ctx.db.get(kpiId));
    expect(archived?.isActive).toBe(false);
    const history = await t.run(async (ctx) =>
      ctx.db.query("kpiCompletions").collect(),
    );
    expect(history).toHaveLength(1);
  });
});

describe("performance", () => {
  it("rejects unauthenticated callers and bad ranges", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.kpis.performance, { from: TODAY, to: TODAY }),
    ).rejects.toThrow();
    const { authed } = await setupUser("mgr-1", ["kpis:complete"]);
    await expect(
      authed.query(api.kpis.performance, {
        from: TODAY,
        to: "2026-10-01",
      }),
    ).rejects.toThrow("Invalid date range");
  });

  it("aggregates earned points and ranks the leaderboard", async () => {
    vi.setSystemTime(NOON);
    const { t, mgr1, mgr2 } = await setupTwoUsers();
    const dailyId = await insertKpi(t, { title: "Daily", points: 5 });
    const weeklyId = await insertKpi(t, {
      title: "Weekly",
      cadence: "weekly",
      points: 10,
    });

    await mgr1.mutation(api.kpis.toggleCheck, { kpiId: dailyId });
    await mgr1.mutation(api.kpis.toggleCheck, { kpiId: weeklyId });
    await mgr2.mutation(api.kpis.toggleCheck, { kpiId: dailyId });

    const res = await mgr1.query(api.kpis.performance, {
      from: TODAY,
      to: TODAY,
    });

    // available = 5 daily + 10 weekly (both visible, one day in range)
    expect(res.availableTotal).toBe(15);
    expect(res.leaderboard).toHaveLength(2);
    expect(res.leaderboard[0]).toMatchObject({
      userId: "mgr-1",
      earned: 15,
      pct: 100,
    });
    expect(res.leaderboard[1].userId).toBe("mgr-2");
    expect(res.leaderboard[1].earned).toBe(5);
    expect(res.daily).toHaveLength(1);
    expect(res.daily[0].earned).toEqual({ "mgr-1": 15, "mgr-2": 5 });
    expect(res.daily[0].available).toBe(15);
  });

  it("excludes not-yet-due KPIs from available", async () => {
    vi.setSystemTime(NOON); // Thursday
    const { t, mgr1 } = await setupTwoUsers();
    await insertKpi(t, { title: "Daily", points: 5 });
    await insertKpi(t, {
      title: "Friday weekly",
      cadence: "weekly",
      points: 10,
      dueWeekday: 4,
    });

    const res = await mgr1.query(api.kpis.performance, {
      from: TODAY,
      to: TODAY,
    });
    expect(res.availableTotal).toBe(5);
    expect(res.daily[0].available).toBe(5);
  });
});

describe("closeKpiDayJob", () => {
  it("writes one score row per day and upserts on re-run", async () => {
    vi.setSystemTime(NOON);
    const { t, mgr1 } = await setupTwoUsers();
    const dailyId = await insertKpi(t, { title: "Daily", points: 5 });

    await mgr1.mutation(api.kpis.toggleCheck, { kpiId: dailyId });
    await t.mutation(internal.kpis.closeKpiDayJob, { day: TODAY });
    await t.mutation(internal.kpis.closeKpiDayJob, { day: TODAY });

    const rows = await t.run(async (ctx) =>
      ctx.db.query("kpiDailyScores").collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: TODAY,
      available: 5,
      earned: { "mgr-1": 5 },
    });
  });

  it("performance prefers stored rows over live data", async () => {
    vi.setSystemTime(NOON);
    const { t, mgr1 } = await setupTwoUsers();
    const kpiId = await insertKpi(t, { title: "Daily", points: 5 });

    await mgr1.mutation(api.kpis.toggleCheck, { kpiId });
    await t.mutation(internal.kpis.closeKpiDayJob, { day: TODAY });

    // Presets change after close: stored history must not move.
    await t.run(async (ctx) => {
      await ctx.db.patch(kpiId, { points: 50 });
    });

    const res = await mgr1.query(api.kpis.performance, {
      from: TODAY,
      to: TODAY,
    });
    expect(res.availableTotal).toBe(5);
    expect(res.daily[0]).toMatchObject({
      available: 5,
      earned: { "mgr-1": 5 },
    });
  });
});

async function seedVisit(
  t: ReturnType<typeof convexTest>,
  userId: string,
  firstName = "James",
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("profile", {
      id: userId,
      firstName,
      lastName: "Doe",
      occupation: "None",
    });
    await ctx.db.insert("daily_register", {
      userId,
      timestamp: new Date().toISOString(),
      source: "web",
      device: { browser: "x", name: "x", visitorId: "x" },
      access: { kind: "free" },
      admitted_by: "staff-1",
    });
  });
}

describe("onDynamicEvent", () => {
  it("spawns a Priority instance on first visit with the customer name", async () => {
    vi.setSystemTime(NOON);
    const t = convexTest(schema, modules);
    await seedVisit(t, "cust-1");

    await t.mutation(internal.kpis.onDynamicEvent, {
      event: { kind: "first-visit", userId: "cust-1" },
    });

    const rows = await t.run(async (ctx) =>
      ctx.db.query("kpiInstances").collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      customerId: "cust-1",
      date: TODAY,
      points: 5,
    });
    expect(rows[0].title).toContain("James");
  });

  it("does not duplicate on re-run or second visit", async () => {
    vi.setSystemTime(NOON);
    const t = convexTest(schema, modules);
    await seedVisit(t, "cust-1");

    await t.mutation(internal.kpis.onDynamicEvent, {
      event: { kind: "first-visit", userId: "cust-1" },
    });
    await t.mutation(internal.kpis.onDynamicEvent, {
      event: { kind: "first-visit", userId: "cust-1" },
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("daily_register", {
        userId: "cust-1",
        timestamp: new Date().toISOString(),
        source: "web",
        device: { browser: "x", name: "x", visitorId: "x" },
        access: { kind: "free" },
        admitted_by: "staff-1",
      });
    });
    await t.mutation(internal.kpis.onDynamicEvent, {
      event: { kind: "first-visit", userId: "cust-1" },
    });

    const rows = await t.run(async (ctx) =>
      ctx.db.query("kpiInstances").collect(),
    );
    expect(rows).toHaveLength(1);
  });

  it("spawns nothing without a visit", async () => {
    vi.setSystemTime(NOON);
    const t = convexTest(schema, modules);
    await t.mutation(internal.kpis.onDynamicEvent, {
      event: { kind: "first-visit", userId: "ghost" },
    });
    const rows = await t.run(async (ctx) =>
      ctx.db.query("kpiInstances").collect(),
    );
    expect(rows).toHaveLength(0);
  });
});

describe("priority instances", () => {
  it("checks, undoes and locks like routine KPIs", async () => {
    vi.setSystemTime(NOON);
    const { t, mgr1 } = await setupTwoUsers();
    await seedVisit(t, "cust-1");
    await t.mutation(internal.kpis.onDynamicEvent, {
      event: { kind: "first-visit", userId: "cust-1" },
    });
    const inst = await t.run(async (ctx) =>
      ctx.db.query("kpiInstances").first(),
    );
    if (!inst) throw new Error("setup failed: no instance");
    const instanceId = inst._id;

    expect(
      await mgr1.mutation(api.kpis.toggleCheck, {
        instanceId: instanceId,
      }),
    ).toEqual({ checked: true });
    expect(
      await mgr1.mutation(api.kpis.toggleCheck, {
        instanceId: instanceId,
      }),
    ).toEqual({ checked: false });

    await mgr1.mutation(api.kpis.toggleCheck, { instanceId: instanceId });
    vi.setSystemTime(new Date(NOON.getTime() + 11 * 60 * 1000));
    await expect(
      mgr1.mutation(api.kpis.toggleCheck, { instanceId: instanceId }),
    ).rejects.toThrow("locked");
  });

  it("rejects checks after the day closes", async () => {
    vi.setSystemTime(NOON);
    const { t, mgr1 } = await setupTwoUsers();
    await seedVisit(t, "cust-1");
    await t.mutation(internal.kpis.onDynamicEvent, {
      event: { kind: "first-visit", userId: "cust-1" },
    });
    const inst = await t.run(async (ctx) =>
      ctx.db.query("kpiInstances").first(),
    );
    if (!inst) throw new Error("setup failed: no instance");
    const instanceId = inst._id;

    vi.setSystemTime(new Date(NOON.getTime() + 24 * 60 * 60 * 1000));
    await expect(
      mgr1.mutation(api.kpis.toggleCheck, { instanceId: instanceId }),
    ).rejects.toThrow("expired");
  });

  it("appears in the checklist as priority and counts toward available", async () => {
    vi.setSystemTime(NOON);
    const { t, mgr1 } = await setupTwoUsers();
    await seedVisit(t, "cust-1");
    await t.mutation(internal.kpis.onDynamicEvent, {
      event: { kind: "first-visit", userId: "cust-1" },
    });

    const list = await mgr1.query(api.kpis.myChecklist, {});
    const priority = list.filter((e) => e.kind === "priority");
    expect(priority).toHaveLength(1);
    expect(priority[0]).toMatchObject({ completed: false, windowOpen: true });

    const res = await mgr1.query(api.kpis.performance, {
      from: TODAY,
      to: TODAY,
    });
    expect(res.availableTotal).toBe(5);
  });

  it("requires exactly one of kpiId or instanceId", async () => {
    vi.setSystemTime(NOON);
    const { mgr1 } = await setupTwoUsers();
    await expect(mgr1.mutation(api.kpis.toggleCheck, {})).rejects.toThrow(
      "exactly one",
    );
  });
});

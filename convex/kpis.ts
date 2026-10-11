import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { requirePrivilege } from "./acl";
import { readId } from "./myFunctions";

const LAGOS = "Africa/Lagos";
const UNDO_WINDOW_MS = 10 * 60 * 1000;
const MAX_RANGE_DAYS = 93;

const cadenceValidator = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
);

const kpiValidator = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  cadence: cadenceValidator,
  audience: v.union(v.literal("day"), v.literal("night"), v.literal("all")),
  dueWeekday: v.optional(v.number()),
  dueMonthDay: v.optional(v.number()),
  points: v.number(),
  isActive: v.boolean(),
  windowStart: v.optional(v.string()),
  windowEnd: v.optional(v.string()),
});

type DueFields = { dueWeekday?: number; dueMonthDay?: number };

function checkDueFields(args: DueFields) {
  if (
    args.dueWeekday !== undefined &&
    !(args.dueWeekday >= 0 && args.dueWeekday <= 6)
  ) {
    throw new Error("dueWeekday must be 0 (Monday) to 6 (Sunday).");
  }
  if (
    args.dueMonthDay !== undefined &&
    !(args.dueMonthDay >= 1 && args.dueMonthDay <= 31)
  ) {
    throw new Error("dueMonthDay must be 1 to 31.");
  }
}

type LagosParts = {
  year: number;
  month: number;
  day: number;
  hhmm: string;
};

export function lagosParts(now: number): LagosParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(now))) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hhmm: `${parts.hour}:${parts.minute}`,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dayKey(p: LagosParts) {
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function isoWeekKey(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dow = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dow + 3);
  const yearOfThursday = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(yearOfThursday, 0, 4));
  const fDow = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fDow + 3);
  const week =
    1 + Math.round((date.getTime() - firstThursday.getTime()) / 604800000);
  return `${yearOfThursday}-W${pad(week)}`;
}

export function periodKeyFor(
  cadence: "daily" | "weekly" | "monthly",
  p: LagosParts,
) {
  if (cadence === "daily") return dayKey(p);
  if (cadence === "weekly") return isoWeekKey(p.year, p.month, p.day);
  return `${p.year}-${pad(p.month)}`;
}

type KpiWindow = { windowStart?: string; windowEnd?: string };

export function windowAllows(kpi: KpiWindow, hhmm: string) {
  if (!kpi.windowStart && !kpi.windowEnd) return true;
  const start = kpi.windowStart ?? "00:00";
  const end = kpi.windowEnd ?? "23:59";
  // Overnight windows (e.g. 18:00–06:00) wrap past midnight.
  if (end <= start) return hhmm >= start || hhmm <= end;
  return start <= hhmm && hhmm <= end;
}

export type LagosDay = {
  year: number;
  month: number;
  day: number;
  /** 0=Monday..6=Sunday */
  weekdayMon0: number;
  daysInMonth: number;
};

export function lagosDay(ms: number): LagosDay {
  const p = lagosParts(ms);
  const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return {
    year: p.year,
    month: p.month,
    day: p.day,
    weekdayMon0: (dow + 6) % 7,
    daysInMonth: new Date(Date.UTC(p.year, p.month, 0)).getUTCDate(),
  };
}

export function dayKeyOf(d: LagosDay) {
  return `${d.year}-${pad(d.month)}-${pad(d.day)}`;
}

export function dayBounds(date: string) {
  const fromMs = Date.parse(`${date}T00:00:00+01:00`);
  return { fromMs, toMs: fromMs + 86400000 - 1 };
}

export type KpiDue = {
  cadence: string;
  dueWeekday?: number;
  dueMonthDay?: number;
};

export function isDue(kpi: KpiDue, d: LagosDay) {
  if (kpi.cadence === "weekly" && kpi.dueWeekday !== undefined) {
    return d.weekdayMon0 >= kpi.dueWeekday;
  }
  if (kpi.cadence === "monthly" && kpi.dueMonthDay !== undefined) {
    return d.day >= Math.min(kpi.dueMonthDay, d.daysInMonth);
  }
  return true;
}

export const myChecklist = query({
  args: {},
  handler: async (ctx) => {
    const caller = await readId(ctx);
    if (!caller) return [];
    const now = Date.now();
    const parts = lagosParts(now);
    const today = lagosDay(now);
    const kpis = await ctx.db
      .query("kpis")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const out = [];
    for (const kpi of kpis) {
      if (!isDue(kpi, today)) continue;
      const periodKey = periodKeyFor(kpi.cadence, parts);
      const completion = await ctx.db
        .query("kpiCompletions")
        .withIndex("by_kpi_period_user", (q) =>
          q
            .eq("kpiId", kpi._id)
            .eq("periodKey", periodKey)
            .eq("completedBy", String(caller)),
        )
        .first();
      out.push({
        ...kpi,
        periodKey,
        windowOpen: windowAllows(kpi, parts.hhmm),
        completed: completion !== null,
        completedAt: completion?.completedAt ?? null,
        undoable:
          completion !== null && now - completion.completedAt <= UNDO_WINDOW_MS,
      });
    }
    return out.sort((a, b) => a._creationTime - b._creationTime);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requirePrivilege(ctx, "kpis:manage");
    return await ctx.db.query("kpis").collect();
  },
});

export const toggleCheck = mutation({
  args: { kpiId: v.id("kpis") },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "kpis:complete");
    const caller = await readId(ctx);
    if (!caller) throw new Error("Authentication required.");
    const kpi = await ctx.db.get("kpis", args.kpiId);
    if (!kpi?.isActive) throw new Error("KPI not found.");
    const now = Date.now();
    const parts = lagosParts(now);
    if (!isDue(kpi, lagosDay(now))) {
      throw new Error("This KPI is not due yet.");
    }
    if (!windowAllows(kpi, parts.hhmm)) {
      throw new Error("This KPI cannot be checked at this time.");
    }
    const periodKey = periodKeyFor(kpi.cadence, parts);
    const existing = await ctx.db
      .query("kpiCompletions")
      .withIndex("by_kpi_period_user", (q) =>
        q
          .eq("kpiId", kpi._id)
          .eq("periodKey", periodKey)
          .eq("completedBy", String(caller)),
      )
      .first();
    if (existing) {
      if (now - existing.completedAt > UNDO_WINDOW_MS) {
        throw new Error("Check is locked and cannot be undone.");
      }
      await ctx.db.delete("kpiCompletions", existing._id);
      return { checked: false };
    }
    await ctx.db.insert("kpiCompletions", {
      kpiId: kpi._id,
      periodKey,
      completedBy: String(caller),
      completedAt: now,
      pointsEarned: kpi.points,
    });
    return { checked: true };
  },
});

export const createKpi = mutation({
  args: kpiValidator.fields,
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "kpis:manage");
    checkDueFields(args);
    return await ctx.db.insert("kpis", args);
  },
});

export const updateKpi = mutation({
  args: { kpiId: v.id("kpis"), ...kpiValidator.fields },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "kpis:manage");
    checkDueFields(args);
    const { kpiId, ...fields } = args;
    await ctx.db.patch("kpis", kpiId, fields);
    return kpiId;
  },
});

export const archiveKpi = mutation({
  args: { kpiId: v.id("kpis") },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "kpis:manage");
    await ctx.db.patch("kpis", args.kpiId, { isActive: false });
    return args.kpiId;
  },
});

export const performance = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, args) => {
    const caller = await readId(ctx);
    if (!caller) throw new Error("Authentication required.");
    const fromMs = Date.parse(`${args.from}T00:00:00+01:00`);
    const toMs = Date.parse(`${args.to}T00:00:00+01:00`);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs > toMs) {
      throw new Error("Invalid date range.");
    }
    const days: string[] = [];
    for (
      let t = fromMs;
      t <= toMs && days.length < MAX_RANGE_DAYS;
      t += 86400000
    ) {
      days.push(dayKey(lagosParts(t)));
    }
    const kpis = await ctx.db
      .query("kpis")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const completions = await ctx.db
      .query("kpiCompletions")
      .withIndex("by_completed_at", (q) =>
        q.gte("completedAt", fromMs).lte("completedAt", toMs + 86400000 - 1),
      )
      .collect();

    const earnedByUser: Record<string, number> = {};
    const daily: {
      date: string;
      earned: Record<string, number>;
      available: number;
    }[] = [];
    const byDay = new Map<string, number>();
    for (const date of days) {
      const [y, m, d] = date.split("-").map(Number);
      const day: LagosDay = {
        year: y,
        month: m,
        day: d,
        weekdayMon0: (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7,
        daysInMonth: new Date(Date.UTC(y, m, 0)).getUTCDate(),
      };
      const available = kpis
        .filter((k) => isDue(k, day))
        .reduce((s, k) => s + k.points, 0);
      const stored = await ctx.db
        .query("kpiDailyScores")
        .withIndex("by_date", (q) => q.eq("date", date))
        .first();
      if (stored) {
        byDay.set(date, daily.length);
        daily.push({
          date,
          earned: stored.earned,
          available: stored.available,
        });
        for (const [userId, pts] of Object.entries(stored.earned)) {
          earnedByUser[userId] = (earnedByUser[userId] ?? 0) + pts;
        }
        continue;
      }
      byDay.set(date, daily.length);
      daily.push({ date, earned: {}, available });
    }
    const closed = new Set(
      (
        await Promise.all(
          days.map((date) =>
            ctx.db
              .query("kpiDailyScores")
              .withIndex("by_date", (q) => q.eq("date", date))
              .first(),
          ),
        )
      )
        .filter((r) => r !== null)
        .map((r) => r.date),
    );
    for (const c of completions) {
      const idx = byDay.get(dayKey(lagosParts(c.completedAt)));
      if (idx === undefined) continue;
      const bucket = daily[idx];
      // Closed days are frozen; live completions only feed open days.
      if (closed.has(bucket.date)) continue;
      bucket.earned[c.completedBy] =
        (bucket.earned[c.completedBy] ?? 0) + c.pointsEarned;
      earnedByUser[c.completedBy] =
        (earnedByUser[c.completedBy] ?? 0) + c.pointsEarned;
    }
    const availableTotal = daily.reduce((s, d) => s + d.available, 0);
    const leaderboard = Object.entries(earnedByUser)
      .map(([userId, earned]) => ({
        userId,
        earned,
        available: availableTotal,
        pct: availableTotal > 0 ? (earned / availableTotal) * 100 : 0,
      }))
      .sort((a, b) => b.pct - a.pct || b.earned - a.earned);
    return { daily, leaderboard, availableTotal };
  },
});

async function closeKpiDay(ctx: MutationCtx, date: string): Promise<void> {
  const { fromMs, toMs } = dayBounds(date);
  const day = lagosDay(fromMs);
  const kpis = await ctx.db
    .query("kpis")
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();
  const available = kpis
    .filter((k) => isDue(k, day))
    .reduce((s, k) => s + k.points, 0);
  const earned: Record<string, number> = {};
  const completions = await ctx.db
    .query("kpiCompletions")
    .withIndex("by_completed_at", (q) =>
      q.gte("completedAt", fromMs).lte("completedAt", toMs),
    )
    .collect();
  for (const c of completions) {
    earned[c.completedBy] = (earned[c.completedBy] ?? 0) + c.pointsEarned;
  }
  const existing = await ctx.db
    .query("kpiDailyScores")
    .withIndex("by_date", (q) => q.eq("date", date))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { available, earned });
  } else {
    await ctx.db.insert("kpiDailyScores", { date, available, earned });
  }
}

export const closeKpiDayJob = internalMutation({
  args: { day: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const date = args.day ?? dayKeyOf(lagosDay(Date.now() - 86400000));
    await closeKpiDay(ctx, date);
  },
});

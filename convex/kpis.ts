import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
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

function dayKey(parts: LagosParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
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
  parts: LagosParts,
) {
  if (cadence === "daily") return dayKey(parts);
  if (cadence === "weekly")
    return isoWeekKey(parts.year, parts.month, parts.day);
  return `${parts.year}-${pad(parts.month)}`;
}

type KpiWindow = { windowStart?: string; windowEnd?: string };

export function windowAllows(rule: KpiWindow, hhmm: string) {
  if (!rule.windowStart && !rule.windowEnd) return true;
  const start = rule.windowStart ?? "00:00";
  const end = rule.windowEnd ?? "23:59";
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

export function dayKeyOf(day: LagosDay) {
  return `${day.year}-${pad(day.month)}-${pad(day.day)}`;
}

export function lagosDayFromKey(date: string): LagosDay {
  const [year, month, day] = date.split("-").map(Number);
  return {
    year,
    month,
    day,
    weekdayMon0: (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7,
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
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

export function isDue(kpi: KpiDue, day: LagosDay) {
  if (kpi.cadence === "weekly" && kpi.dueWeekday !== undefined) {
    return day.weekdayMon0 >= kpi.dueWeekday;
  }
  if (kpi.cadence === "monthly" && kpi.dueMonthDay !== undefined) {
    return day.day >= Math.min(kpi.dueMonthDay, day.daysInMonth);
  }
  return true;
}

type CompletionInsert = {
  kpiId?: Id<"kpis">;
  instanceId?: Id<"kpiInstances">;
  periodKey: string;
  completedBy: string;
  completedAt: number;
  pointsEarned: number;
};

async function findPresetCompletion(
  ctx: QueryCtx,
  kpiId: Id<"kpis">,
  periodKey: string,
  userId: string,
): Promise<Doc<"kpiCompletions"> | null> {
  return await ctx.db
    .query("kpiCompletions")
    .withIndex("by_kpi_period_user", (q) =>
      q.eq("kpiId", kpiId).eq("periodKey", periodKey).eq("completedBy", userId),
    )
    .first();
}

async function findInstanceCompletion(
  ctx: QueryCtx,
  instanceId: Id<"kpiInstances">,
  periodKey: string,
  userId: string,
): Promise<Doc<"kpiCompletions"> | null> {
  return await ctx.db
    .query("kpiCompletions")
    .withIndex("by_instance_period_user", (q) =>
      q
        .eq("instanceId", instanceId)
        .eq("periodKey", periodKey)
        .eq("completedBy", userId),
    )
    .first();
}

function checklistStatus(
  completion: { completedAt: number } | null,
  now: number,
) {
  return {
    completed: completion !== null,
    completedAt: completion?.completedAt ?? null,
    undoable:
      completion !== null && now - completion.completedAt <= UNDO_WINDOW_MS,
  };
}

async function settleToggle(
  ctx: MutationCtx,
  existing: Doc<"kpiCompletions"> | null,
  insert: CompletionInsert,
  now: number,
): Promise<{ checked: boolean }> {
  if (existing) {
    if (now - existing.completedAt > UNDO_WINDOW_MS) {
      throw new Error("Check is locked and cannot be undone.");
    }
    await ctx.db.delete("kpiCompletions", existing._id);
    return { checked: false };
  }
  await ctx.db.insert("kpiCompletions", insert);
  return { checked: true };
}

async function availableForDay(
  ctx: QueryCtx,
  kpis: Doc<"kpis">[],
  date: string,
  day: LagosDay,
): Promise<number> {
  const presetPoints = kpis
    .filter((kpi) => isDue(kpi, day))
    .reduce((sum, kpi) => sum + kpi.points, 0);
  const instances = await ctx.db
    .query("kpiInstances")
    .withIndex("by_date", (q) => q.eq("date", date))
    .collect();
  return presetPoints + instances.reduce((sum, inst) => sum + inst.points, 0);
}

async function closedDates(
  ctx: QueryCtx,
  days: string[],
): Promise<Set<string>> {
  const rows = await Promise.all(
    days.map((date) =>
      ctx.db
        .query("kpiDailyScores")
        .withIndex("by_date", (q) => q.eq("date", date))
        .first(),
    ),
  );
  return new Set(rows.filter((row) => row !== null).map((row) => row.date));
}

export const myChecklist = query({
  args: {},
  handler: async (ctx) => {
    const caller = await readId(ctx);
    if (!caller) return [];
    const callerId = String(caller);
    const now = Date.now();
    const parts = lagosParts(now);
    const today = lagosDay(now);
    const todayKey = dayKeyOf(today);
    const kpis = await ctx.db
      .query("kpis")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const items = [];
    for (const kpi of kpis) {
      if (!isDue(kpi, today)) continue;
      const periodKey = periodKeyFor(kpi.cadence, parts);
      const completion = await findPresetCompletion(
        ctx,
        kpi._id,
        periodKey,
        callerId,
      );
      items.push({
        ...kpi,
        kind: "preset" as const,
        periodKey,
        windowOpen: windowAllows(kpi, parts.hhmm),
        ...checklistStatus(completion, now),
      });
    }
    const instances = await ctx.db
      .query("kpiInstances")
      .withIndex("by_date", (q) => q.eq("date", todayKey))
      .collect();
    for (const instance of instances) {
      const completion = await findInstanceCompletion(
        ctx,
        instance._id,
        todayKey,
        callerId,
      );
      items.push({
        _id: instance._id,
        _creationTime: instance._creationTime,
        kind: "priority" as const,
        title: instance.title,
        points: instance.points,
        periodKey: todayKey,
        windowOpen: true,
        ...checklistStatus(completion, now),
      });
    }
    return items.sort((a, b) => a._creationTime - b._creationTime);
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
  args: {
    kpiId: v.optional(v.id("kpis")),
    instanceId: v.optional(v.id("kpiInstances")),
  },
  handler: async (ctx, args) => {
    await requirePrivilege(ctx, "kpis:complete");
    const caller = await readId(ctx);
    if (!caller) throw new Error("Authentication required.");
    if ((args.kpiId == null) === (args.instanceId == null)) {
      throw new Error("Provide exactly one of kpiId or instanceId.");
    }
    const callerId = String(caller);
    const now = Date.now();

    if (args.instanceId) {
      const instance = await ctx.db.get("kpiInstances", args.instanceId);
      if (!instance) throw new Error("KPI not found.");
      if (instance.date !== dayKeyOf(lagosDay(now))) {
        throw new Error("This KPI has expired.");
      }
      const existing = await findInstanceCompletion(
        ctx,
        instance._id,
        instance.date,
        callerId,
      );
      return settleToggle(
        ctx,
        existing,
        {
          instanceId: instance._id,
          periodKey: instance.date,
          completedBy: callerId,
          completedAt: now,
          pointsEarned: instance.points,
        },
        now,
      );
    }

    const kpiId = args.kpiId;
    if (kpiId == null) throw new Error("KPI not found.");
    const kpi = await ctx.db.get("kpis", kpiId);
    if (!kpi?.isActive) throw new Error("KPI not found.");
    const parts = lagosParts(now);
    if (!isDue(kpi, lagosDay(now))) {
      throw new Error("This KPI is not due yet.");
    }
    if (!windowAllows(kpi, parts.hhmm)) {
      throw new Error("This KPI cannot be checked at this time.");
    }
    const periodKey = periodKeyFor(kpi.cadence, parts);
    const existing = await findPresetCompletion(
      ctx,
      kpi._id,
      periodKey,
      callerId,
    );
    return settleToggle(
      ctx,
      existing,
      {
        kpiId: kpi._id,
        periodKey,
        completedBy: callerId,
        completedAt: now,
        pointsEarned: kpi.points,
      },
      now,
    );
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
      let ms = fromMs;
      ms <= toMs && days.length < MAX_RANGE_DAYS;
      ms += 86400000
    ) {
      days.push(dayKey(lagosParts(ms)));
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
      const day = lagosDayFromKey(date);
      const available = await availableForDay(ctx, kpis, date, day);
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
    // Closed days are frozen; live completions only feed open days.
    const closed = await closedDates(ctx, days);
    for (const completion of completions) {
      const dayIndex = byDay.get(dayKey(lagosParts(completion.completedAt)));
      if (dayIndex === undefined) continue;
      const dayBucket = daily[dayIndex];
      if (closed.has(dayBucket.date)) continue;
      dayBucket.earned[completion.completedBy] =
        (dayBucket.earned[completion.completedBy] ?? 0) +
        completion.pointsEarned;
      earnedByUser[completion.completedBy] =
        (earnedByUser[completion.completedBy] ?? 0) + completion.pointsEarned;
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

const FIRST_VISIT_POINTS = 5;

const dynamicTemplates = {
  "first-visit": (name: string) => ({
    title: `Ask ${name} how their experience was and if we can help make them comfortable before they leave`,
    points: FIRST_VISIT_POINTS,
  }),
};

export type DynamicEvent = { kind: "first-visit"; userId: string };

export const dynamicEventValidator = v.object({
  kind: v.literal("first-visit"),
  userId: v.string(),
});

/** Dispatcher for event-triggered KPIs. Add a case + template per trigger. */
export async function spawnDynamicKpis(
  ctx: MutationCtx,
  event: DynamicEvent,
): Promise<void> {
  if (event.kind !== "first-visit") return;

  const visits = await ctx.db
    .query("daily_register")
    .withIndex("user", (q) => q.eq("userId", event.userId))
    .take(2);
  if (visits.length !== 1) return;

  const today = dayKeyOf(lagosDay(Date.now()));
  const alreadySpawned = await ctx.db
    .query("kpiInstances")
    .withIndex("by_date", (q) => q.eq("date", today))
    .filter((q) => q.eq(q.field("customerId"), event.userId))
    .first();
  if (alreadySpawned) return;

  const profile = await ctx.db
    .query("profile")
    .withIndex("by_user_id", (q) => q.eq("id", event.userId))
    .first();
  const fullName = profile && `${profile.firstName} ${profile.lastName}`.trim();
  const template = dynamicTemplates["first-visit"](fullName || "our guest");
  await ctx.db.insert("kpiInstances", {
    title: template.title,
    customerId: event.userId,
    points: template.points,
    date: today,
    createdAt: Date.now(),
  });
}

export const onDynamicEvent = internalMutation({
  args: { event: dynamicEventValidator },
  handler: async (ctx, args) => {
    await spawnDynamicKpis(ctx, args.event);
  },
});

async function closeKpiDay(ctx: MutationCtx, date: string): Promise<void> {
  const { fromMs, toMs } = dayBounds(date);
  const day = lagosDay(fromMs);
  const kpis = await ctx.db
    .query("kpis")
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();
  const available = await availableForDay(ctx, kpis, date, day);
  const earned: Record<string, number> = {};
  const completions = await ctx.db
    .query("kpiCompletions")
    .withIndex("by_completed_at", (q) =>
      q.gte("completedAt", fromMs).lte("completedAt", toMs),
    )
    .collect();
  for (const completion of completions) {
    earned[completion.completedBy] =
      (earned[completion.completedBy] ?? 0) + completion.pointsEarned;
  }
  const existingScore = await ctx.db
    .query("kpiDailyScores")
    .withIndex("by_date", (q) => q.eq("date", date))
    .first();
  if (existingScore) {
    await ctx.db.patch(existingScore._id, { available, earned });
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

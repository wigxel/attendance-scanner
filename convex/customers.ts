import { TableAggregate } from "@convex-dev/aggregate";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isAfter,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { components } from "./_generated/api";
import { api, internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { type MutationCtx, internalMutation, query } from "./_generated/server";
import { deleteConfig, getConfig, setConfig } from "./config";

export const getVisitHistory = query({
  args: { paginationOpts: paginationOptsValidator, userId: v.string() },
  handler: async (ctx, args) => {
    const visits = await ctx.db
      .query("daily_register")
      .withIndex("user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedVisits = await Promise.all(
      visits.page.map(async (visit) => {
        let adminName = "Unknown";

        if (visit.admitted_by) {
          const user = await ctx.db
            .get(visit.admitted_by as Id<"users">)
            .catch(() => null);

          if (user) {
            adminName = user.name ?? adminName;
          }
        }

        return { ...visit, adminName };
      }),
    );

    return { ...visits, page: enrichedVisits };
  },
});

export const getCustomerVisitTrend = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const visits = await ctx.db
      .query("daily_register")
      .withIndex("user", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();

    if (visits.length === 0) return [];

    const grouped = new Map<string, number>();
    for (const v of visits) {
      const visitDate = parseISO(v.timestamp);
      const weekStart = format(startOfWeek(visitDate), "yyyy-MM-dd");
      grouped.set(weekStart, (grouped.get(weekStart) || 0) + 1);
    }

    const start = parseISO(visits[0].timestamp);
    const end = parseISO(visits[visits.length - 1].timestamp);

    const result = [];
    let current = startOfWeek(start);
    while (!isAfter(current, startOfWeek(end))) {
      const dateStr = format(current, "yyyy-MM-dd");
      result.push({
        date: format(current, "MMM d"), // formatting for chart
        visits: grouped.get(dateStr) || 0,
      });
      current = addWeeks(current, 1);
    }

    return result;
  },
});

const profileAggregate = new TableAggregate<{
  Key: number;
  DataModel: DataModel;
  TableName: "profile";
}>(components.customerStats, {
  sortKey: (doc) => doc._creationTime,
});

export const visitsAggregate = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "daily_register";
}>(components.customerStats, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => parseISO(doc.timestamp).getTime(),
});

const metricKinds = v.union(
  v.literal("totalCustomers"),
  v.literal("newCustomers"),
  v.literal("activeCustomers"),
  v.literal("repeatCustomerRate"),
  v.literal("avgVisitsPerCustomer"),
  v.literal("lapsedCustomers"),
);

export type MetricKind =
  | "totalCustomers"
  | "newCustomers"
  | "activeCustomers"
  | "repeatCustomerRate"
  | "avgVisitsPerCustomer"
  | "lapsedCustomers";

/**
 * Returns the total number of registered customer profiles.
 * Uses the `profileAggregate` B-tree for an O(log n) count.
 */
export const countTotalCustomers = query({
  handler: async (ctx) => {
    return await profileAggregate.count(ctx);
  },
});

/**
 * Returns the number of customer profiles created on or after `startTime`.
 * Useful for counting new customers since a given timestamp (e.g. start of month).
 *
 * @param startTime - Unix timestamp (ms) used as the inclusive lower bound.
 */
export const countNewCustomers = query({
  args: {
    startTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await profileAggregate.count(ctx, {
      bounds: { lower: { key: args.startTime, inclusive: true } },
    });
  },
});

/**
 * Returns the list of customer profiles created on or after `startTime`.
 * Intended to be used to display new customers in the tooltip.
 *
 * @param startTime - Unix timestamp (ms) used as the inclusive lower bound.
 */
export const listNewCustomers = query({
  args: {
    startTime: v.number(),
  },
  handler: async (ctx, args) => {
    const profiles = await ctx.db
      .query("profile")
      .filter((q) => q.gte(q.field("_creationTime"), args.startTime))
      .order("desc")
      .collect();

    return profiles;
  },
});

/**
 * Returns the number of customer profiles created on or after `startTime`.
 * Intended to approximate "active" customers by filtering to a recent window
 * (e.g. the last 30 days).
 *
 * @param startTime - Unix timestamp (ms) used as the inclusive lower bound.
 */
export const countActiveCustomers = query({
  args: {
    startTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await profileAggregate.count(ctx, {
      bounds: { lower: { key: args.startTime, inclusive: true } },
    });
  },
});

/**
 * Alias for `countTotalCustomers`. Returns the total count of all profiles.
 * @deprecated Prefer `countTotalCustomers` for clarity.
 */
export const countCustomers = query({
  handler: async (ctx) => {
    return await profileAggregate.count(ctx);
  },
});

// ---------------------------------------------------------------------------
// Core per-day computation helper
// ---------------------------------------------------------------------------

/**
 * Computes and upserts all customer metrics for a single calendar day.
 * Shared by both the daily cron (`computeMetrics`) and the
 * historical backfill (`backfillMetrics`).
 *
 * @param ctx  - Convex mutation context.
 * @param date - Target date in `yyyy-MM-dd` format.
 */
async function computeMetricsForDate(
  ctx: MutationCtx,
  date: string,
): Promise<void> {
  const targetDate = parseISO(date);
  const monthStart = startOfMonth(targetDate);
  const thirtyDaysAgo = subDays(targetDate, 30);

  const totalCustomers = await ctx.runQuery(api.customers.countTotalCustomers);
  const monthStartTime = monthStart.getTime();
  const thirtyDaysAgoTime = thirtyDaysAgo.getTime();

  const newCustomers = await ctx.runQuery(api.customers.countNewCustomers, {
    startTime: monthStartTime,
  });

  const activeCustomers = await ctx.runQuery(
    api.customers.countActiveCustomers,
    {
      startTime: thirtyDaysAgoTime,
    },
  );

  // Collect all check-ins within the month window for this date.
  const allRegisters = await ctx.db
    .query("daily_register")
    .filter((q) => q.gte(q.field("timestamp"), monthStart.toISOString()))
    .collect();

  const userVisitCounts = new Map<string, number>();
  for (const reg of allRegisters) {
    userVisitCounts.set(reg.userId, (userVisitCounts.get(reg.userId) ?? 0) + 1);
  }

  const repeatVisitors = Array.from(userVisitCounts.values()).filter(
    (count) => count >= 2,
  ).length;
  const repeatCustomerRate =
    userVisitCounts.size > 0
      ? Math.round((repeatVisitors / userVisitCounts.size) * 100)
      : 0;

  const totalVisits = allRegisters.length;
  const avgVisitsPerCustomer =
    userVisitCounts.size > 0
      ? Math.round((totalVisits / userVisitCounts.size) * 10) / 10
      : 0;

  const lapsedCustomers = Math.max(0, totalCustomers - activeCustomers);

  const metrics: Array<{ kind: string; value: number }> = [
    { kind: "totalCustomers", value: totalCustomers },
    { kind: "newCustomers", value: newCustomers },
    { kind: "activeCustomers", value: activeCustomers },
    { kind: "repeatCustomerRate", value: repeatCustomerRate },
    { kind: "avgVisitsPerCustomer", value: avgVisitsPerCustomer },
    { kind: "lapsedCustomers", value: lapsedCustomers },
  ];

  // Upsert each metric record.
  for (const metric of metrics) {
    const existing = await ctx.db
      .query("app_metrics")
      .withIndex("by_date_category_kind", (q) =>
        q
          .eq("date", date)
          .eq("category", "customer")
          .eq("kind", metric.kind as any),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: metric.value });
    } else {
      await ctx.db.insert("app_metrics", {
        date,
        category: "customer",
        kind: metric.kind as any,
        value: metric.value,
      });
    }
  }

  // Refresh top-customers snapshot for this date.
  const topCustomers = Array.from(userVisitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  const existingTopCustomers = await ctx.db
    .query("app_metrics_top_customers")
    .withIndex("by_date", (q) => q.eq("date", date))
    .collect();

  for (const tc of existingTopCustomers) {
    await ctx.db.delete(tc._id);
  }

  for (const [userId, visits] of topCustomers) {
    await ctx.db.insert("app_metrics_top_customers", {
      date,
      userId,
      visits,
    });
  }
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * Parses and validates a date string argument.
 *
 * Accepts `yyyy-MM-dd` format only. Throws a `ConvexError` with a descriptive
 * message if the input is missing, malformed, or represents an invalid
 * calendar date (e.g. `"2024-02-30"`).
 *
 * @param value    - The raw string from the caller.
 * @param argName  - Name of the argument, used in the error message.
 * @returns A normalised `yyyy-MM-dd` string.
 */
function parseDateArg(value: string, argName = "date"): string {
  // Must match yyyy-MM-dd exactly.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ConvexError(
      `Invalid ${argName}: "${value}". Expected format: yyyy-MM-dd (e.g. "2024-03-15").`,
    );
  }

  const parsed = parseISO(value);

  if (!isValid(parsed)) {
    throw new ConvexError(
      `Invalid ${argName}: "${value}" is not a real calendar date.`,
    );
  }

  // Normalise back to yyyy-MM-dd in case of any edge cases.
  return format(parsed, "yyyy-MM-dd");
}

// ---------------------------------------------------------------------------
// Exported mutations
// ---------------------------------------------------------------------------

/**
 * Internal cron-triggered mutation that computes and persists customer metrics
 * for a given day into the `app_metrics` table. Also refreshes the
 * `app_metrics_top_customers` table with the top 50 most-visited customers.
 *
 * @param day - Target date in `yyyy-MM-dd` format. Defaults to yesterday
 *              when omitted, which is the standard cron usage.
 */
export const computeMetrics = internalMutation({
  args: {
    day: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const date = args.day
      ? parseDateArg(args.day, "day")
      : format(subDays(new Date(), 1), "yyyy-MM-dd");
    await computeMetricsForDate(ctx, date);
  },
});

// Config keys
const CONFIG_LOCK = "processing_backfill";
const CONFIG_LAST_DATE = "last_processed_backfill";
const CONFIG_HEARTBEAT = "backfill_heartbeat";

/**
 * How long (ms) without a heartbeat before a lock is considered stale.
 * Each `backfillMetrics` tick refreshes the heartbeat, so 10 minutes gives
 * generous headroom above the Convex mutation timeout (~2 min).
 */
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// Backfill mutations
// ---------------------------------------------------------------------------

/**
 * Kicks off the historical backfill process.
 *
 * Sets the `processing_backfill` lock in the `config` table and schedules
 * the first `backfillMetrics` invocation. Rejects if a backfill is already
 * running unless `force: true` is passed.
 *
 * @param startFrom - Date (`yyyy-MM-dd`) to begin from. When omitted and no
 *                    prior progress exists, the earliest `daily_register`
 *                    record determines the start. When omitted but progress
 *                    exists, the run resumes from the last processed date.
 * @param force     - If `true`, clears any existing lock and restarts.
 */
export const startBackfill = internalMutation({
  args: {
    startFrom: v.optional(v.string()),
    force: v.optional(v.boolean()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate startFrom before touching any state.
    const startFrom = args.startFrom
      ? parseDateArg(args.startFrom, "startFrom")
      : undefined;

    const lock = await getConfig(ctx, CONFIG_LOCK);
    const heartbeat = await getConfig(ctx, CONFIG_HEARTBEAT);
    const isStale = !heartbeat || Date.now() - Number(heartbeat) > LOCK_TTL_MS;
    const isCurrentlyLocked = lock === "true" && !isStale;

    if (args.dryRun) {
      let simulatedStartDate = startFrom;

      if (!simulatedStartDate) {
        const lastProcessed = await getConfig(ctx, CONFIG_LAST_DATE);
        if (lastProcessed) {
          simulatedStartDate = format(
            addDays(startOfDay(parseISO(lastProcessed)), 1),
            "yyyy-MM-dd",
          );
        } else {
          const earliest = await ctx.db
            .query("daily_register")
            .order("asc")
            .first();
          simulatedStartDate = earliest
            ? format(startOfDay(parseISO(earliest.timestamp)), "yyyy-MM-dd")
            : undefined;
        }
      }

      const yesterday = startOfDay(subDays(new Date(), 1));
      const wouldProcess =
        !!simulatedStartDate &&
        !isAfter(parseISO(simulatedStartDate), yesterday);

      return {
        dryRun: true,
        wouldProcess,
        wouldStartFrom: simulatedStartDate ?? null,
        wouldEndAt: format(yesterday, "yyyy-MM-dd"),
        isCurrentlyLocked,
      };
    }

    if (isCurrentlyLocked && !args.force) {
      return {
        started: false,
        reason:
          "A backfill is already running. Pass force: true to override, or wait for it to finish.",
      };
    }

    // If a new startFrom is provided, reset progress so we start fresh.
    if (startFrom) {
      await setConfig(ctx, CONFIG_LAST_DATE, ""); // empty = start from startFrom
    }

    await setConfig(ctx, CONFIG_LOCK, "true");

    // Store the explicit start date so backfillMetrics can read it.
    if (startFrom) {
      await setConfig(ctx, CONFIG_LAST_DATE, "");
      await setConfig(ctx, "backfill_start_date", startFrom);
    } else if (!args.force) {
      // Fresh start with no explicit override — clear any stale start anchor.
      await deleteConfig(ctx, "backfill_start_date");
    }

    // Schedule the first day.
    await ctx.scheduler.runAfter(0, internal.customers.backfillMetrics);

    return { started: true };
  },
});

/**
 * Processes a single calendar day of metrics and then schedules itself for
 * the next day. Called repeatedly by the scheduler until all days are done.
 *
 * Progress is committed after each day, so failures only lose the
 * in-progress day — the next manual or automatic retry resumes from the
 * last successfully persisted date.
 *
 * Do **not** call this directly; use `startBackfill` instead.
 */
export const backfillMetrics = internalMutation({
  handler: async (ctx) => {
    // Guard: bail if the lock has been cleared (e.g. by cancelBackfill).
    const lock = await getConfig(ctx, CONFIG_LOCK);
    if (lock !== "true") return;

    // Refresh heartbeat so startBackfill can detect a live vs. stale process.
    await setConfig(ctx, CONFIG_HEARTBEAT, String(Date.now()));

    // Determine the next date to process.
    const lastProcessed = await getConfig(ctx, CONFIG_LAST_DATE);
    const explicitStart = await getConfig(ctx, "backfill_start_date");

    let nextDate: Date;

    if (lastProcessed) {
      // Resume: advance one day past the last successfully processed date.
      nextDate = addDays(startOfDay(parseISO(lastProcessed)), 1);
    } else if (explicitStart) {
      // First run with an explicit startFrom override.
      nextDate = startOfDay(parseISO(explicitStart));
    } else {
      // First run with no override: find the earliest daily_register record.
      const earliest = await ctx.db
        .query("daily_register")
        .order("asc")
        .first();

      if (!earliest) {
        // No data to backfill.
        await setConfig(ctx, CONFIG_LOCK, "false");
        return;
      }

      nextDate = startOfDay(parseISO(earliest.timestamp));
    }

    const yesterday = startOfDay(subDays(new Date(), 1));

    if (isAfter(nextDate, yesterday)) {
      // All days have been processed — release the lock.
      await setConfig(ctx, CONFIG_LOCK, "false");
      return;
    }

    // Process this single day.
    const dateStr = format(nextDate, "yyyy-MM-dd");
    await computeMetricsForDate(ctx, dateStr);

    // Persist progress AFTER successful computation.
    await setConfig(ctx, CONFIG_LAST_DATE, dateStr);

    // Schedule the next day.
    await ctx.scheduler.runAfter(0, internal.customers.backfillMetrics);
  },
});

/**
 * Clears the `processing_backfill` lock and heartbeat so a new backfill can
 * be started. Use this to recover from a stuck or failed backfill job.
 * Note: with stale-lock detection, manual cancellation is rarely needed.
 */
export const cancelBackfill = internalMutation({
  handler: async (ctx) => {
    await setConfig(ctx, CONFIG_LOCK, "false");
    await deleteConfig(ctx, CONFIG_HEARTBEAT);
  },
});

/**
 * Returns the current backfill state for monitoring.
 *
 * - `isRunning`        – whether the lock is currently set to `"true"`
 * - `isStale`         – lock is set but the heartbeat is older than `LOCK_TTL_MS`
 *                       (indicates a dead process that can be auto-recovered)
 * - `lastHeartbeatMs` – raw epoch ms of the last heartbeat, or `null`
 * - `lastProcessedDate` – last successfully written date
 * - `startDate`       – the configured start anchor
 */
export const getBackfillStatus = query({
  handler: async (ctx) => {
    const records = await ctx.db.query("config").collect();
    const map = Object.fromEntries(records.map((r) => [r.key, r.value]));
    const lastHeartbeatMs = map[CONFIG_HEARTBEAT]
      ? Number(map[CONFIG_HEARTBEAT])
      : null;
    return {
      isRunning: map[CONFIG_LOCK] === "true",
      isStale:
        lastHeartbeatMs !== null && Date.now() - lastHeartbeatMs > LOCK_TTL_MS,
      lastHeartbeatMs,
      lastProcessedDate: map[CONFIG_LAST_DATE] ?? null,
      startDate: map.backfill_start_date ?? null,
    };
  },
});

/**
 * Retrieves aggregated values for a single customer metric kind over a date
 * range from the `app_metrics` table.
 *
 * @param kind        - The metric to query (e.g. `"totalCustomers"`).
 * @param start       - Start date string `yyyy-MM-dd` (defaults to 30 days ago).
 * @param end         - End date string `yyyy-MM-dd` (defaults to today).
 * @param aggregation - How to reduce multiple records:
 *                      `"sum"` adds all values,
 *                      `"avg"` averages them,
 *                      `"latest"` (default) returns the most recent record.
 * @returns The aggregated number, or `null` if no records exist for the range.
 */
export const getCustomerMetrics = query({
  args: {
    kind: metricKinds,
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    aggregation: v.optional(
      v.union(v.literal("sum"), v.literal("avg"), v.literal("latest")),
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const defaultEnd = format(now, "yyyy-MM-dd");
    const defaultStart = format(subDays(now, 30), "yyyy-MM-dd");

    const start = args.start ?? defaultStart;
    const end = args.end ?? defaultEnd;

    const records = await ctx.db
      .query("app_metrics")
      .withIndex("by_date_category_kind", (q) => q.gte("date", start))
      .filter((q) =>
        q.and(
          q.lte(q.field("date"), end),
          q.eq(q.field("category"), "customer"),
          q.eq(q.field("kind"), args.kind),
        ),
      )
      .collect();

    if (records.length === 0) return null;

    const values = records.map((r) => r.value);
    const aggregation = args.aggregation ?? "latest";

    if (aggregation === "sum") {
      return values.reduce((a, b) => a + b, 0);
    }
    if (aggregation === "avg") {
      return (
        Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) /
        10
      );
    }
    const latest = records.sort((a, b) => b.date.localeCompare(a.date))[0];
    return latest?.value ?? null;
  },
});

/**
 * Returns the top customers ranked by visit count for a given date, enriched
 * with profile names from the `profile` table.
 *
 * @param start - Start date string `yyyy-MM-dd` (defaults to start of current month).
 * @param end   - End date string `yyyy-MM-dd` (defaults to today).
 * @param limit - Maximum number of results to return (defaults to 50).
 * @param filter - Filter by access plan: "all", "free", or "paid" (defaults to "all").
 * @returns Array of `{ userId, name, visits, accessPlan }` sorted by visits descending.
 */
export const getTopCustomers = query({
  args: {
    start: v.optional(v.string()),
    end: v.optional(v.string()),
    limit: v.optional(v.number()),
    filter: v.optional(
      v.union(v.literal("all"), v.literal("free"), v.literal("paid")),
    ),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const defaultEnd = format(now, "yyyy-MM-dd");
    const defaultStart = format(startOfMonth(now), "yyyy-MM-dd");

    const end = args.end ?? defaultEnd;
    const start = args.start ?? defaultStart;
    const filter = args.filter ?? "all";

    const startISO = startOfDay(parseISO(start)).toISOString();
    const endISO = startOfDay(addDays(parseISO(end), 1)).toISOString();

    const profiles = await ctx.db.query("profile").collect();

    const visitCounts = await Promise.all(
      profiles.map(async (profile) => {
        const registers = await ctx.db
          .query("daily_register")
          .withIndex("user", (q) => q.eq("userId", profile.id))
          .filter((q) =>
            q.and(
              q.gte(q.field("timestamp"), startISO),
              q.lt(q.field("timestamp"), endISO),
            ),
          )
          .collect();

        const count = registers.length;

        if (count === 0) return null;

        const sortedByTime = registers.sort(
          (a, b) => Number.parseInt(b.timestamp) - Number.parseInt(a.timestamp),
        );
        const mostRecent = sortedByTime[0];
        const accessPlan = mostRecent.access.kind;

        return {
          userId: profile.id,
          name: `${profile.firstName} ${profile.lastName}`,
          visits: count,
          accessPlan,
        };
      }),
    );

    let filtered = visitCounts.filter(
      (uv): uv is NonNullable<typeof uv> => uv !== null,
    );

    if (filter !== "all") {
      filtered = filtered.filter((uv) => uv.accessPlan === filter);
    }

    const limit = args.limit ?? 50;
    const sorted = filtered.sort((a, b) => b.visits - a.visits).slice(0, limit);

    return sorted;
  },
});

export const backfillVisitsAggregate = internalMutation({
  handler: async (ctx) => {
    const registers = await ctx.db.query("daily_register").collect();
    for (const reg of registers) {
      await visitsAggregate.insert(ctx, reg);
    }
  },
});

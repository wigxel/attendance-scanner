# Analytics & Metrics Architecture

## Overview

The app tracks attendance, customer engagement, and revenue through three systems:
1. **Pre-computed metrics** (cron-written, query-read)
2. **Read-time computed metrics** (live aggregation on query)
3. **B-tree aggregates** (O(log n) counts maintained on write)

---

## Stored Metrics

### `dailyAttendanceMetrics` — Daily Unique Visitors

- **Table:** `dailyAttendanceMetrics`
- **Schema:** `{ date: string ("yyyy-MM-dd"), totalUsers: number }`
- **Index:** `by_date` on `["date"]`
- **Writer:** `register.saveCount` internal mutation
- **Schedule:** Cron daily at 00:00 UTC (`crons.ts:6`)
- **Reader:** `metrics.metricsDailyAttendance` query
- **Logic:** Queries `daily_register` for yesterday (WAT), counts distinct `userId` values, upserts one row.

### `app_metrics` — Customer KPIs

- **Table:** `app_metrics`
- **Schema:** `{ date: string, category: "customer", kind: MetricKind, value: number }`
- **Index:** `by_date_category_kind` on `["date", "category", "kind"]`
- **Writer:** `customers.computeMetricsForDate` (internal)
- **Schedule:** Cron daily at 00:00 UTC (`crons.ts:12`)
- **Reader:** `customers.getCustomerMetrics` query (supports `latest`, `sum`, `avg` aggregation)
- **Backfill:** `customers.startBackfill` / `customers.backfillMetrics`

**Metric kinds:**

| Kind | Calculation |
|------|-------------|
| `totalCustomers` | `profileAggregate.count()` — all profiles |
| `newCustomers` | `profileAggregate.count()` with lower bound at month start |
| `activeCustomers` | `profileAggregate.count()` with lower bound at 30 days ago |
| `repeatCustomerRate` | `round((users with >=2 visits / total visitors in month) * 100)` |
| `avgVisitsPerCustomer` | `round((total visits / unique visitors) * 10) / 10` |
| `lapsedCustomers` | `max(0, totalCustomers - activeCustomers)` |

### `app_metrics_top_customers` — Top 50 Customers

- **Table:** `app_metrics_top_customers`
- **Schema:** `{ date: string, userId: string, visits: number }`
- **Index:** `by_date` on `["date"]`
- **Writer:** `customers.computeMetricsForDate` (same cron as `app_metrics`)
- **Reader:** `customers.getTopCustomers` (recomputes from `daily_register` live — does NOT read from this table)

---

## Read-Time Computed Metrics

These scan `daily_register` on every query — no pre-computation.

| Function | What it computes |
|----------|-----------------|
| `metrics.sumPaidAccess` | Total revenue from paid registers (filters `access.kind === "paid"`) |
| `reports.getDaily` | Full daily report: unique customers, paid/free/subscribed counts, sales by payment method, staff admissions |
| `myFunctions.countAttendance` | Total registers in a time range |
| `myFunctions.registrationCount` | Register count for a specific user |
| `customers.getCustomerVisitTrend` | Weekly visit buckets for a user |

---

## B-Tree Aggregates (`@convex-dev/aggregate`)

Registered in `convex.config.ts` as two instances of the `aggregate` component:

### `profileAggregate`

- **Instance:** `customerStats`
- **Table:** `profile`
- **Sort key:** `_creationTime`
- **Written by:** `auth.createOrUpdateProfile`, `myFunctions.createUser` (on profile insert)
- **Read by:** `countTotalCustomers`, `countNewCustomers`, `countActiveCustomers` queries
- **Used by:** `computeMetricsForDate` for customer count metrics

### `visitsAggregate`

- **Instance:** `customerStats`
- **Table:** `daily_register`
- **Namespace:** `userId` (per-user)
- **Sort key:** `parseISO(timestamp).getTime()`
- **Written by:** `register_common.insertRegisterAndAggregate`, `register.debugRegisterForToday`
- **Read by:** None — maintained but never queried

### `aggregateBySuggestion`

- **Instance:** `aggregate` (default)
- **Table:** `featureVotes`
- **Namespace:** `featureRequest._id`
- **Sort key:** vote value (+1/-1)
- **Written by:** `myFunctions.voteFeatureRequest`, `myFunctions.deleteSuggestion`
- **Read by:** `myFunctions.listSuggestions` (returns `voteCount`)

---

## Cron Jobs

| Name | Schedule | Target | Purpose |
|------|----------|--------|---------|
| `take daily visit metrics` | Daily 00:00 UTC | `internal.register.saveCount` | Write `dailyAttendanceMetrics` |
| `compute customer metrics` | Daily 00:00 UTC | `internal.customers.computeMetrics` | Write `app_metrics` + `app_metrics_top_customers` |
| `cleanup expired pending bookings` | Every 5 min | `api.bookings.markExpiredPendingBookings` | Booking lifecycle |
| `mark completed bookings as used-up` | Every 5 min | `api.bookings.markCompletedBookingsAsUsedUp` | Booking lifecycle |

---

## Dead/Legacy Items

| Item | Issue |
|------|-------|
| `stats` table | Nothing writes to it; `getUserStats` reads stale data |
| `roomMetrics` table | IoT data flows in via HTTP, no query reads it |
| `visitsAggregate` B-tree | Maintained on every check-in, never queried |
| `app_metrics_top_customers` | Written by cron, but `getTopCustomers` recomputes from raw data |

---

## Key Files

| File | Role |
|------|------|
| `convex/schema.ts` | Table definitions for all metrics tables |
| `convex/metrics.ts` | `metricsDailyAttendance`, `sumPaidAccess` queries |
| `convex/customers.ts` | `computeMetricsForDate`, `getCustomerMetrics`, `getTopCustomers`, aggregate definitions |
| `convex/register.ts` | `saveCount` (daily visitor cron), `insertRegisterAndAggregate` |
| `convex/reports.ts` | `getDaily` (live daily report) |
| `convex/crons.ts` | Cron job definitions |
| `convex/convex.config.ts` | Component registration (`customerStats`, `aggregate`) |

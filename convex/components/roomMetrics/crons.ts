import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "smooth roomMetrics 10m buckets",
  { minutes: 2 },
  internal.index.smoothAggregations,
  {},
);

crons.interval(
  "prune raw roomMetrics",
  { hours: 24 },
  internal.backfill.pruneRaw,
  {},
);

crons.daily(
  "aggregate daily room metrics",
  { hourUTC: 0, minuteUTC: 5 },
  internal.index.aggregateDaily,
  {},
);

export default crons;

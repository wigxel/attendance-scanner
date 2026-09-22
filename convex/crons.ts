import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "take daily visit metrics",
  { hourUTC: 0, minuteUTC: 0 },
  internal.register.saveCount,
);

crons.daily(
  "compute customer metrics",
  { hourUTC: 0, minuteUTC: 0 },
  internal.customers.computeMetrics,
  {},
);

crons.interval(
  "cleanup expired pending bookings",
  { minutes: 5 },
  api.bookings.markExpiredPendingBookings,
);

crons.interval(
  "mark completed bookings as used-up",
  { minutes: 5 },
  api.bookings.markCompletedBookingsAsUsedUp,
);

crons.interval(
  "smooth roomMetrics 10m buckets",
  { minutes: 2 },
  internal.roomMetrics.smoothAggregations,
  {},
);

crons.interval(
  "prune raw roomMetrics",
  { hours: 24 },
  internal.roomMetrics.pruneRaw,
  {},
);

export default crons;

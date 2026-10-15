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

crons.daily(
  "close KPI day scores",
  { hourUTC: 23, minuteUTC: 5 },
  internal.kpis.closeKpiDayJob,
  {},
);

crons.interval(
  "deliver temperature alert push",
  { minutes: 2 },
  internal.pushSender.deliverTemperatureAlerts,
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

export default crons;

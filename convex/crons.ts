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

// retry sweep: notifications.send also runs this immediately after queueing,
// so this is only the safety net for failed/stuck rows
crons.interval(
  "drain notification queue",
  { minutes: 1 },
  internal.notificationSender.deliver,
  {},
);

// hourly sweep: sends each inventory staff one low-stock digest per local
// day (dedupeKey inside), so mid-day drops appear in the next morning's digest
crons.interval(
  "send low-stock digest",
  { minutes: 60 },
  internal.lowStockDigest.sweep,
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

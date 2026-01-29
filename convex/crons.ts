import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "take daily visit metrics",
  { hourUTC: 0, minuteUTC: 0 }, // 12 AM UTC
  internal.register.saveCount,

const crons = cronJobs();

crons.interval(
  "cleanup expired pending bookings",
  { minutes: 5 },
  api.bookings.markExpiredPendingBookings,
);

crons.interval(
  "mark completed bookings as expired",
  { minutes: 5 },
  api.bookings.markCompletedBookingsAsExpired,
);

export default crons;

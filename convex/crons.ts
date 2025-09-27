import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup expired pending bookings",
  { minutes: 5 },
  api.bookings.markExpiredPendingBookings,
);

export default crons;

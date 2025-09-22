import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "mark expired seats available",
  { hours: 1 },
  api.bookings.markExpiredSeatsAvailable,
);

export default crons;

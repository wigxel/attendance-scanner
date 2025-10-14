import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "take daily visit metrics",
  { hourUTC: 0, minuteUTC: 0 }, // 12 AM UTC
  internal.register.saveCount,
);

export default crons;

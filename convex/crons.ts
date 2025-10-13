import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "take daily visit metrics",
  { hourUTC: 9, minuteUTC: 0 }, // 9 AM UTC
  internal.register.saveCount
);

export default crons;

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "prune delivered notifications",
  { hours: 24 },
  internal.index.purgeOld,
  {},
);

export default crons;

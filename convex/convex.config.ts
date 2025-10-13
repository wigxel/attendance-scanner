import aggregate from "@convex-dev/aggregate/convex.config";
// convex/convex.config.ts
import { defineApp } from "convex/server";

const app = defineApp();
app.use(aggregate);

export default app;

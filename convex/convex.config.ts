import aggregate from "@convex-dev/aggregate/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(aggregate);
app.use(aggregate, { name: "customerStats" });

export default app;

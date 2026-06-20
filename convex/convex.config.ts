import aggregate from "@convex-dev/aggregate/convex.config";
import { defineApp } from "convex/server";
import access_control_list from "./components/acl/convex.config";

const app = defineApp();
app.use(access_control_list);
app.use(aggregate);
app.use(aggregate, { name: "customerStats" });

export default app;

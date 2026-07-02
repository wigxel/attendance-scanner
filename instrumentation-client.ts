import posthog from "posthog-js";
import { safeStr } from "./lib/data.helpers";

posthog.init(safeStr(process.env.NEXT_PUBLIC_POSTHOG_KEY), {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST,
  defaults: "2025-11-30",
});

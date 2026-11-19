import createMDX from "@next/mdx";
import { withPostHogConfig } from "@posthog/nextjs-config";
import { withVoxx } from "@prudentbird/voxx-core/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: false,
};

const withMdx = createMDX({});

export default withPostHogConfig(withVoxx(withMdx(nextConfig)), {
  personalApiKey: process.env.POSTHOG_API_KEY ?? "",
  projectId: process.env.POSTHOG_PROJECT_ID ?? "",
  host: process.env.POSTHOG_HOST,
  sourcemaps: {
    enabled: Boolean(
      process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID,
    ),
    deleteAfterUpload: true,
  },
});

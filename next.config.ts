import createMDX from "@next/mdx";
import { withVoxx } from "@prudentbird/voxx-core/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: false,
};

const withMdx = createMDX({});

export default withVoxx(withMdx(nextConfig));

import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

const withMdx = createMDX({});

export default withMdx(nextConfig);

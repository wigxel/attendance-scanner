import viteTsConfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
  },
  plugins: [viteTsConfigPaths()]
});

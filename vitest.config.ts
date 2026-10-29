import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
      "next/server": path.resolve(__dirname, "node_modules/next/server.js"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/setup/global-db.ts"],
    env: {
      DATABASE_URL: "file:../data/test-integration.db",
      AUTH_SECRET: "test-secret",
      AUTH_TRUST_HOST: "true",
    },
    fileParallelism: false,
    testTimeout: 20000,
  },
});

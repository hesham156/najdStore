import { defineConfig } from "vitest/config";

export default defineConfig({
  // `.mts` so the config loads as ESM, and native tsconfig path resolution so
  // tests import via `@/…` exactly like the app does — no extra plugin needed.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // These suites cover pure logic only — no database, no network — so they
    // run in CI and on a laptop with Postgres switched off.
    passWithNoTests: false,
  },
});

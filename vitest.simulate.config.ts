/**
 * Vitest config for simulation tests (excluded from the regular test suite).
 *
 * Run all simulations:
 *   npm run simulate
 *
 * Run a single simulation by filename substring:
 *   npm run simulate -- matching
 *   npm run simulate -- two-stage
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@graph-algorithm/maximum-matching":
        "./node_modules/@graph-algorithm/maximum-matching/dist/module/index.js",
    },
  },
  test: {
    include: ["src/sim/simulate-*.test.ts"],
    alias: {
      "@graph-algorithm/maximum-matching": "@graph-algorithm/maximum-matching",
    },
  },
});

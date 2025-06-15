import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/tournicano/",
  resolve: {
    alias: {
      "@graph-algorithm/maximum-matching":
        "./node_modules/@graph-algorithm/maximum-matching/dist/module/index.js",
    },
  },
  optimizeDeps: {
    include: ["@graph-algorithm/maximum-matching"],
  },
  test: {
    alias: {
      "@graph-algorithm/maximum-matching": "@graph-algorithm/maximum-matching",
    },
  },
});

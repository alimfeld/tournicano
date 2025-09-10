import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

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
  plugins: [
    VitePWA({
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Tournicano",
        short_name: "Tournicano",
      },
      pwaAssets: {
      }
    })
  ],
  test: {
    alias: {
      "@graph-algorithm/maximum-matching": "@graph-algorithm/maximum-matching",
    },
  },
});

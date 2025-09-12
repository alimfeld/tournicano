import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import { minimal2023Preset } from "@vite-pwa/assets-generator/config"

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
      manifest: {
        name: "Tournicano",
        short_name: "Tournicano",
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}', '*.{png,ico,svg}'],
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

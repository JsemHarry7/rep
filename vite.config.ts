import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "rep — repetice",
        short_name: "rep",
        description: "flashcards & quiz trainer",
        theme_color: "#1f2b44",
        background_color: "#11192a",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/home",
        icons: [
          { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" },
          {
            src: "/icon-maskable.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
  },
});

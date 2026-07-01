import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Base path — set VITE_BASE_PATH when hosting under a sub-path (e.g. "/zap/").
  const base = env.VITE_BASE_PATH || "/";

  return {
    base,
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { port: 5010, host: true },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
        manifest: {
          name: "Zap Trade",
          short_name: "Zap",
          description: "The AI drafts. You commit. Confirm your trades in one tap.",
          theme_color: "#0b0f17",
          background_color: "#0b0f17",
          display: "standalone",
          orientation: "portrait",
          scope: base,
          start_url: base,
          icons: [
            { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "pwa-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // Network-first for the API is NOT configured here — trading data must
          // never be served stale from cache. Only the app shell is precached.
          navigateFallbackDenylist: [/^\/api/, /^\/zap-api/],
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        },
      }),
    ],
  };
});

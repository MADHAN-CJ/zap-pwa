import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// Dev-only Claude proxy. The safety invariant says the CLIENT never holds an
// LLM key — the key lives here, server-side, read from .env.local (gitignored).
// This stands in for the real zap-api §7 endpoints until Madhan lands them;
// production must route through zap-api, not this.
function agentProxy(apiKey: string | undefined): Plugin {
  return {
    name: "zap-agent-proxy",
    configureServer(server) {
      server.middlewares.use("/agent/chat", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end();
        }
        if (!apiKey) {
          res.statusCode = 503;
          return res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }));
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          try {
            const { system, messages, max_tokens } = JSON.parse(body);
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-sonnet-5",
                max_tokens: max_tokens ?? 700,
                system,
                messages,
              }),
            });
            const data: any = await r.json();
            if (!r.ok) {
              res.statusCode = 502;
              return res.end(JSON.stringify({ error: data?.error?.message ?? "LLM error" }));
            }
            const text = (data.content ?? [])
              .filter((b: any) => b.type === "text")
              .map((b: any) => b.text)
              .join("");
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ text }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e?.message ?? "proxy error" }));
          }
        });
      });
    },
  };
}

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
      agentProxy(env.ANTHROPIC_API_KEY),
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

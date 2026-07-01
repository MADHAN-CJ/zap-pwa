# Zap Trade — PWA

Installable web dashboard for **Zap Trade** — the human-confirmation surface for the
"AI drafts, you commit" model. Feature-for-feature port of the Expo mobile app
(`zap-expo/`), built as a static, installable PWA you can host anywhere.

> **Safety invariant:** AI-drafted orders never execute automatically. They arrive
> here as `DRAFT` and reach the market **only** when you confirm them.

## Features

- **Login** — email → 6-digit OTP → JWT (stored in `localStorage`, auto-attached as
  Bearer; any `401` drops the session back to login).
- **Confirm queue** — lists pending `DRAFT` orders. Swipe a card **right to confirm**
  (submits to the market), **left to delete**; tap buttons also provided for
  desktop/pointer. "Confirm all" and a quick-draft form (FAB).
- **Portfolio** — funds, holdings, positions, and **Close position** (opposite-side
  MARKET square-off).
- **Broker** — Dhan connection status, connect via access-token **or** the api-key
  consent flow, disconnect, sign out.

## Stack

Vite + React + TypeScript + `vite-plugin-pwa` (manifest + service worker). The API
layer (`src/api/`) and auth store (`src/store/auth.ts`) mirror the Expo app 1:1;
React Native's `Alert` is replaced by a toast + confirm-dialog provider
(`src/components/ui.tsx`).

## Configure

Copy `.env.example` → `.env` and set the backend:

```
VITE_API_BASE_URL=https://uat.revise.network/zap-api/v1/api
# VITE_BASE_PATH=/            # set e.g. "/zap/" when hosting under a sub-path
```

## Develop / build

```bash
npm install
npm run dev        # http://localhost:5010
npm run build      # → dist/ (static, installable)
npm run preview    # serve the production build locally
```

## Deploy (static hosting)

`dist/` is fully static. SPA fallback (deep links like `/orders`) is handled by
`public/_redirects` (Netlify) and `vercel.json` (Vercel). For **nginx**:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

The service worker only precaches the app shell — trading data (`/api/*`) is always
fetched live and never served stale from cache.

## Notes

- Set `VITE_BASE_PATH` when serving under an nginx path prefix (mirrors the
  zap-api deploy). The router `basename` and PWA `scope`/`start_url` follow it.
- Icons are generated with `node scripts/gen-icons.mjs` (zero-dependency) into
  `public/`.

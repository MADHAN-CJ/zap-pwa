# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Zap Trade — an installable PWA dashboard, the human-confirmation surface for the "AI drafts, you commit" trading model. It's a feature-for-feature web port of the Expo mobile app (`zap-expo/`); the API layer (`src/api/`) and auth store (`src/store/auth.ts`) mirror that app 1:1, so changes here should generally stay in sync with it.

**Safety invariant:** AI-drafted orders never execute automatically. They arrive as `DRAFT` and reach the market **only** when a human confirms them in the app. Any code touching order confirmation must preserve this — never add a path that submits a draft without explicit user action.

## Commands

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5010 (host: true)
npm run build      # tsc -b && vite build → dist/ (static, installable)
npm run preview    # serve the production build locally
npm run typecheck  # tsc -b --noEmit
```

There is no test runner or linter configured. `npm run build` runs the TypeScript project build (`tsc -b`) first, so type errors fail the build.

## Configuration

Copy `.env.example` → `.env`:

- `VITE_API_BASE_URL` — backend the PWA talks to. Defaults (build- and runtime-fallback) to `https://uat.revise.network/zap-api/v1/api`.
- `VITE_BASE_PATH` — set (e.g. `/zap/`) only when hosting under a sub-path; leave `/` for root. This one value propagates to Vite `base`, the PWA manifest `scope`/`start_url`, and the router `basename` (derived from `import.meta.env.BASE_URL` in `src/main.tsx`). Change base-path behavior in one of those three places and you must reconcile the others.

## Architecture

**Stack:** Vite + React 18 + TypeScript + `react-router-dom` v6 + `vite-plugin-pwa`. No state library, no data-fetching library, no CSS framework — pages fetch on mount with `useEffect`/`useState`, and all styling is one hand-written file (`src/theme.css`) plus inline styles keyed to CSS variables (`--accent`, `--green`, `--red`, etc.).

**API layer (`src/api/`)** — every network call goes through `apiRequest` in `client.ts`, which:
- prepends `BASE_URL`, auto-attaches the stored bearer token, and JSON-encodes bodies;
- returns a discriminated union `ApiResponse<T>` = `{ ok: true; data }` | `{ ok: false; error; status; description?; code? }`. **Callers branch on `res.ok`; there are no thrown exceptions to catch.** For user-facing errors prefer `res.description || res.error`.
- on any `401`, calls `triggerAuthError()` — the global session-expiry hook.

The per-domain modules just wrap `apiRequest` with typed endpoints:
- `auth.ts` — email → OTP → JWT.
- `dashboard.ts` — **the confirmation surface; these submit real orders to the market** (`confirmOrder`, `confirmAll`, `deleteOrder`, `closePosition`, `listPending`).
- `orders.ts` — drafting only (`placeDraft` creates a `DRAFT`, never reaches the market).
- `broker.ts` — Dhan connection (two flows: `access_token`/`totp` via `connect`, or `apiKey` via `consentStart`→`consentComplete`), plus holdings/positions/funds.

Note the split: `orders.listDrafts` hits `/orders` and returns `.drafts`; `dashboard.listPending` hits `/dashboard/orders` and returns `.orders`. Pages use `dashboard.listPending`.

**Auth (`src/store/auth.ts`)** — token + user in `localStorage` (`zap_token`, `zap_user`); no React context. The session-expiry mechanism is a module-level callback: `App.tsx` registers a handler via `setAuthErrorHandler` on mount that clears auth and navigates to `/login`; `client.ts` fires it via `triggerAuthError()` on a 401. This decouples the API layer from the router. `RequireAuth` guards routes against a missing token up front; the 401 handler covers tokens that expire mid-session.

**Routing (`App.tsx`)** — `/` redirects to `/orders` (if token) or `/login`. Authenticated routes (`/orders`, `/portfolio`, `/broker`) render inside `RequireAuth` → `TabLayout` (bottom tab bar). `Confirm` (`/orders`) is the main screen.

**UI provider (`src/components/ui.tsx`)** — replaces React Native's `Alert`. `<UIProvider>` wraps the app and exposes `useUI()` → `{ toast, confirm }`. `confirm(opts)` returns a `Promise<boolean>` (resolved by an async modal); use it before any destructive/market action. `toast(kind, title, msg?)` shows an auto-dismissing notification.

**Swipe interaction (`src/components/SwipeRow.tsx`)** — pointer-events–based swipeable card: drag right past threshold → `onConfirm`, left → `onDelete`; also exposes tap buttons so it works without a touchscreen.

**PWA / service worker (`vite.config.ts`)** — `registerType: autoUpdate`. Only the app shell is precached; trading data is always fetched live. `navigateFallbackDenylist` excludes `/api` and `/zap-api` so API paths are never served the SPA fallback. Do not add runtime caching for API responses — stale trading data is a correctness bug.

**SPA deep-link fallback** for static hosts is configured outside the app: `public/_redirects` (Netlify) and `vercel.json` (Vercel); nginx uses `try_files ... /index.html` (see README).

**Icons** are generated (zero-dependency) via `node scripts/gen-icons.mjs` into `public/`.

## Conventions

- Import via the `@/` alias → `src/` (configured in both `vite.config.ts` and `tsconfig`).
- Currency formatting goes through `inr()` in `src/lib/format.ts`.

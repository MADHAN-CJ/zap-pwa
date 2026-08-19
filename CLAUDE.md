# zap-pwa — context for Claude

## What this app is

Zap Trade is an **"AI drafts, you commit"** trading system. This repo is the
**human confirmation surface** — a mobile-first installable PWA. The full chain:

Claude/ChatGPT (via **zap-mcp** connector at `https://uat.revise.network/zap-mcp/v1/mcp`)
→ writes DRAFT orders → **zap-api** backend (`https://uat.revise.network/zap-api/v1/api`)
→ human reviews & confirms **here in this PWA** → zap-api submits to **Dhan** (the broker) → market.

**Safety invariant (never violate):** the AI can only *draft*. Orders reach the
market only when a human confirms in this app. Therefore:
- This app holds **no LLM API keys** and never calls an LLM directly.
- Any future chat/AI-adjacent feature routes actions through the existing
  draft → confirm queue; the app never executes on the AI's behalf.

## Repo state (as of 2026-08-19)

- Current branch: **`redesign-v2`**, a deliberate **blank canvas** branched off
  `main`. `src/` contains only a placeholder `App.tsx`, a minimal CSS reset in
  `theme.css`, and the `main.tsx` entry (React Router `BrowserRouter` wired).
- The **full previous app lives on `main`** (pages: Login, Broker, Portfolio,
  Confirm, Analysis; complete `src/api/` layer; auth store). We **pick and
  choose** pieces back as needed: `git checkout main -- src/api/client.ts` etc.
  Do not rewrite from scratch what `main` already has working — especially the
  API layer and auth.
- Remote: `https://github.com/MADHAN-CJ/zap-pwa` (branches: `main`,
  `feature/ui-revamp`). Madhan is the other developer. The old `redesign`
  branch was deleted from GitHub; a local copy + a stash of WIP still exist.

## Stack & environment

- Vite 5 + React 18 + TypeScript, `react-router-dom` v6, `vite-plugin-pwa`,
  `@tabler/icons-react` (icon system), `web-haptics` (haptic feedback — use it
  for microinteractions).
- Dev server: `npm run dev` → port **5010**, `host: true`. Sunny reviews live
  on their **iPhone via Tailscale** at `http://100.83.24.93:5010`, and as the
  installed PWA (Add to Home Screen). Assume iOS Safari is the primary target.
- `npm run typecheck` must stay clean. `npm run build` = `tsc -b && vite build`.
- Env: `VITE_API_BASE_URL` (defaults to the UAT zap-api URL above),
  `VITE_BASE_PATH` for sub-path hosting. No secrets belong in this repo.

## Backend API surface (already exists — client code on `main` in `src/api/`)

- **Auth:** email → OTP → JWT (`/auth/request-otp`, `/auth/verify-otp`).
- **Broker (Dhan):** status, connect (access_token/TOTP or consent flow),
  disconnect, static IP, holdings, positions, funds.
- **Orders:** place draft, list drafts by status.
- **Dashboard:** confirm one / confirm all / reject draft, close positions,
  EDIS flow (TPIN + verification form) for sells.
- **Analysis:** fetch / start position analyses.

## Design direction (current — supersedes the old light/green direction)

- **Minimal, but futuristic.** Restraint over decoration: few colors, strong
  typography, generous space. Futuristic comes from motion and precision, not
  from ornament.
- **Light mode AND dark mode**, with a user-facing option (light / dark /
  system). Build both from day one with CSS custom-property tokens in
  `theme.css` — never hardcode a color in a component.
- **Color:** the app's main color is a **rich forest green** (or whatever green
  reads best on the mode's background — white and/or black surfaces).
  The two modes may use **different primary shades** — pick per mode for
  **contrast first**: the primary must hold up against its background and
  text must hold up against the primary (WCAG AA minimum). Brand history for
  reference: deep green `#001908` was the old console/theme color and
  `#17BE5F` the old accent — the new palette can draw on these but isn't
  bound to them.
- **Microinteractions are the product's feel.** Every touch responds: press
  states, haptics (`web-haptics`), transitions between states. Nothing snaps.
- **Liquid motion with inertia.** Animations should feel like a physical
  material: spring-based (mass/stiffness/damping), momentum that carries and
  settles, interruptible mid-flight, follow the finger 1:1 during gestures and
  release with velocity. No linear easing; avoid canned `ease-in-out` for
  anything gestural.
- **Smoothness is non-negotiable:** animate `transform` and `opacity` only,
  60fps on a real iPhone, respect `prefers-reduced-motion`.

## Working style (important)

Go **page by page**. Sunny names a screen → propose/show just that one → they
approve → implement only that. Do **not** build ahead or restyle other pages
unprompted. Shared tokens in `theme.css` grow as needed, not in a big upfront
rewrite.

## Hard-won iOS PWA gotchas (from the previous redesign — respect these)

- **Standalone PWA under-reports viewport height on first paint.** The old fix
  (see `main.tsx` on the old local `redesign` branch): when
  `display-mode: standalone`, drive the shell height from `window.screen.height`.
  At minimum, prefer `100dvh` + `env(safe-area-inset-*)` over `100vh`.
- **Swipe gestures: use window-level pointer listeners, NOT
  `setPointerCapture`** — pointer capture broke touch on iOS.

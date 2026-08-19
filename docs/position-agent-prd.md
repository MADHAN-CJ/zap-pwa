# Position Agent — PRD

**Repo:** zap-pwa · branch `redesign-v2`
**Feature owner:** Sunny Joshi
**Status:** Draft, specified enough to build in parallel
**Audience:** the Claude/engineer picking this up in the repo

---

## 0. Read this before writing any code

- **Build in parallel, not screen-by-screen.** The repo's usual working style is one screen at a time because intent is normally still being worked out live with Sunny. That's not the situation here — this PRD already specifies every screen, so there's no ambiguity left to protect against by going slow. Land the shared foundation first (routing shell, shared types, API client stubs, status tokens — see §10), then split the remaining screens across parallel agents. Reconcile shared components before merging so parallel agents don't each ship their own version of the status pill or chat bubble.
- **Build the backend too — don't treat it as someone else's job.** The interview logic, the 30-minute reasoning pass, the conversational pushback, and the digest generation all need to exist somewhere server-side. Build them against `zap-api` directly, reusing whatever's already wired up there — auth, DB, existing endpoint patterns, and any LLM provider access that's already configured. If a piece genuinely needs a new credential that isn't connected (most likely an LLM provider API key for the reasoning endpoints), implement everything up to that point in full and flag Sunny for the specific missing piece — don't silently stub it and move on.
- **Before you route anything:** read `src/api/` on `main`, and specifically check what the existing **Analysis** page and its API (`fetch / start position analyses`) actually do today. There's a real chance this feature overlaps with it or should extend it rather than compete with it as a separate surface. If it's ambiguous, ask Sunny before you commit to a route structure — don't guess and build.
- **Safety invariant, restated because it matters more here than anywhere else in the app:** this feature never places, modifies, or cancels an order. It is strictly read-only. If a future version wants to act on the user's behalf ("help me exit this"), that has to go through the existing draft → confirm → execute queue like everything else in this app. Do not build any execution path inside Position Agent, ever, even a small one.

---

## 1. What this is

A read-only companion for a single open trade — not a dashboard, not an alert firehose. The trader tells it what they're watching for, in their own words. It turns that into five concrete, visible conditions. It stays quiet until one of those conditions actually moves. When it does interrupt, it leads with what changed, not with an instruction — and it'll argue with the trader rather than just answering their question.

The product it's explicitly not: something that pings on every tick, something that tells you to exit, something that requires you to build a dashboard before it's useful.

## 2. Why

The trigger case from user research: a trader anxious about one specific position going against them — not their whole portfolio, one trade. They think in their own vocabulary (divergence, OI, writers defending a strike), and existing tools either stay silent on the thing they actually care about or scream about everything else. What they wanted was something closer to a second, sharper pair of eyes on their own stated reasoning — not a signal service.

This sits downstream of the existing Zap Trade chain (AI drafts orders → human confirms → Dhan executes) but doesn't touch it. It's a different, more conservative mode: no drafting, no confirming, no executing — just reading and talking.

## 3. Product principles

These aren't vibes — treat disagreement with any of these as a reason to stop and check with Sunny, not a reason to quietly reinterpret the screen.

1. **Read-only, always.** No button anywhere in this feature places or edits an order.
2. **The interview is the product.** Don't compress it into a single text field. Four questions, and the agent pushes back once — reflects the trader's stated reason back and asks what would falsify it.
3. **Show its work before it watches.** The five watch-items are shown, editable, and require explicit confirmation ("Start watching") before anything begins.
4. **Two mechanisms, visibly different, everywhere.** ⚡ = deterministic, checked tick-by-tick. ◐ = reasoning, checked on a ~30-minute pass. Never merge these into one generic "alert."
5. **Pull, not push — until something real happens.** The timeline is something the trader grazes on their own schedule. It does not badge or notify on "nothing happened."
6. **Lead with what changed, never with a verdict.** No "Action suggested: Exit" anywhere in this UI. Ever.
7. **It argues, it doesn't instruct.** Conversational replies give trade-offs and turn the trader's own stated thesis back at them. They never issue a directive.
8. **Home is the hub, not a filmstrip.** Every position being watched is its own always-visible row. Starting or finishing one never disrupts the others — they run independently.
9. **One paragraph, then silence.** The digest is prose, not a table, and it says out loud when nothing else needs the trader tonight.

## 4. Information architecture

Home is the hub. Two sub-flows branch off it and both return to it. Digest is a tab, not a step in the sequence.

| # | Screen | Proposed route | Entry point | Exit |
|---|---|---|---|---|
| — | Broker connect | *reuse existing Broker page* | First use with no broker connected | Home |
| 1 | **Home** | `/watch` | App nav | hub — doesn't "exit" |
| 2 | Add position — Pick | `/watch/new` | Home, "+ Watch a new position" | back to Home (cancel) or → 3 |
| 3 | Add position — Interview | `/watch/new/interview` | 2 | → 4 |
| 4 | Add position — Confirm | `/watch/new/confirm` | 3 | → Home, new row added |
| 5 | Position detail — Timeline | `/watch/:id` | Home row tap, or push notification | → Home |
| 6 | Position detail — Flipped | `/watch/:id` (flipped state) | live update inside 5, or push deep link | → Home |
| 7 | Position detail — Ask | `/watch/:id/ask` | 6, "ask a question" | → Home |
| 8 | Digest | `/digest` | Home tab bar | → Home |

Do **not** build a new broker-connect screen. `Broker` already handles Zerodha/Dhan connect, disconnect, and status — Add Position should check that state and deep-link into the existing flow if nothing's connected, not duplicate it.

## 5. Screen specs

### Home — `/watch`
**Purpose.** The only screen a returning trader needs. At a glance: what's holding, what's bending, what needs them.

**Elements**
- Primary CTA, top: "+ Watch a new position"
- Section label "Watching · N"
- One row per active watch: symbol, status pill (`holding` / `bending` / `flipped`), one-line meta ("checked 30 min ago" / "2 of 5 flipped · updated 1:35p")
- Tab bar: Home (active) / Digest

**States**
- Empty (0 watches): CTA is the only content, plus a short empty-state line — don't leave it looking broken.
- 1–N watches: list, most-recently-updated or most-urgent first (confirm sort with Sunny; recommend urgency first — flipped > bending > holding — then recency).
- A row updating live (status just flipped) should animate the pill change, not just repaint it.

**Data needed:** `GET /watches` (id, symbol, status, lastUpdateText).

**Edge cases:** broker disconnected mid-session — surface a non-blocking banner, don't block the list.

---

### Add position — Pick — `/watch/new`
**Purpose.** Choose exactly one position to start a watch on. Not a portfolio view.

**Elements**
- Header: back chevron, "N open" tag
- Copy: "Which one is on your mind? Start with one — add the others later."
- List of open positions pulled from the **existing positions API** (reuse, don't rebuild): symbol, P&L, side/qty/expiry
- Secondary path: "Tell it about this trade" → manual entry (symbol, side, qty, entry price, expiry — freeform is fine, this isn't a broker order)

**Data needed:** existing `positions` endpoint.

**Transition:** tapping a position card *or* completing manual entry → Interview, carrying the position context forward.

---

### Add position — Interview — `/watch/new/interview`
**Purpose.** Get the trader's actual thesis in their own words, conversationally.

**Elements**
- Header: back chevron, tag with the position symbol
- Chat thread, agent-led, four turns in order:
  1. Why'd you take this one?
  2. What would tell you it isn't failing? *(the pushback: agent should reflect the trader's own reason back before asking this)*
  3. Any level where you're out regardless of what I say?
  4. How are you sitting with this trade right now? → answered via chips: **Uneasy / Comfortable / Confident / A bit greedy**, not free text

**Data needed:** `POST /watches/:id/interview/turn` per exchange (see §7).

**Transition:** mood chip selection → Confirm.

**Edge case:** trader gives a one-word non-answer — agent should ask a lightweight follow-up once, not just move on with nothing to work with. (Exact retry copy is a backend/prompt concern, not a UI one — UI just needs to support an arbitrary number of agent turns per question, not assume exactly one bubble per question.)

---

### Add position — Confirm — `/watch/new/confirm`
**Purpose.** The trust moment. Show the trader their thesis turned into five concrete, correctable watch-items before the agent earns the right to interrupt them later.

**Elements**
- Header: back chevron, "confirm" tag
- One-line restated thesis, in the trader's own words
- Exactly 5 watch-item rows, each tagged:
  - ⚡ hard line — checked tick-by-tick (expect 1–2 of these; numeric, binary)
  - ◐ signal — checked on a 30-min pass (expect 3–4 of these; interpretive)
- "+ Add something else to watch" — freeform addition
- Primary CTA: "Start watching" (disabled until the trader has seen all five — don't auto-enable on screen load)

**Data needed:** `GET /watches/:id/synthesis`, `PATCH /watches/:id/watchitems`, `POST /watches/:id/start`.

**Transition:** Start watching → **Home**, with the new row visible. Do not route to the position's own detail screen automatically — the whole point of Home-as-hub is that finishing setup drops you back at the list, not deeper into one item.

**Open question (flag, don't silently resolve):** should a freeform addition here get auto-classified ⚡ vs ◐ by the agent, or does the trader pick? Leave a TODO, don't guess in the UI copy.

---

### Position detail — Timeline — `/watch/:id`
**Purpose.** One position's own pull-based feed. Quiet by design.

**Elements**
- Header: back to Home, tag with position symbol
- Chronological feed, most recent first, two visual weights:
  - **quiet** entries ("Nothing moved against you," "Quiet. Spot 24,388.") — low-contrast, small
  - **real** entries (an actual read on one of the five items) — full weight, normal contrast
- Footer note: "It stays quiet. You'll hear from it when one of your five flips."

**Data needed:** `GET /watches/:id/feed`.

**States:** if status is `flipped`, this screen shows the **Flipped** state instead (see next) — same route, different data, not a separate push.

**Explicitly not on this screen:** any manual "check now" / "skip ahead" control. That was a demo affordance for a walkthrough, not real product surface — cut it.

---

### Position detail — Flipped
**Purpose.** The interruption. Leads with what changed; never with a verdict.

**Elements**
- Header: back to Home, tag "N of 5 flipped"
- Sub-line: position + price move ("short 75 · ₹186 → ₹241 · bending")
- "What changed" — one short paragraph, plain language, references the specific watch-items that moved
- All 5 watch-items, each showing current state (`gone` / `holding`) — not just the ones that flipped; showing what's still holding is what makes this a thinking partner instead of an alarm
- Input affordance at the bottom: "Ask it anything about the position…" → Ask screen

**Data needed:** same `GET /watches/:id`, plus the flip event detail.

**Push notification:** this is the state a push notification should deep-link into. Needs a service worker + push subscription (vite-plugin-pwa supports this — confirm whether push infra exists yet or needs building; don't assume).

---

### Position detail — Ask — `/watch/:id/ask`
**Purpose.** Conversational drill-down. Trade-offs, not answers.

**Elements**
- Header: back to Home, status tag
- Chat thread: trader's question, agent's trade-off response, and — where relevant — the agent turning the trader's own earlier stated thesis back at them as a question
- History callout, when applicable: pattern from the trader's own past trades, explicitly caveated ("that's the record, not a verdict") — never framed as a recommendation
- Two exits at the bottom, equal weight: "Leave it watching" / "See me after close" — both return to Home; they are not functionally different, they're just different framings for the trader's own state of mind

**Data needed:** `POST /watches/:id/ask`.

**Risk flag, carry into build:** the trade-history pattern-matching is the highest-hallucination surface in this whole feature. It must be backed by the trader's actual fill history, not inferred or approximated. If the backend can't back a claim like "3 times since May," the UI should not render it — no plausible-sounding placeholder copy here, ever.

---

### Digest — `/digest`
**Purpose.** End of day. One card per position that had something worth saying that day — not a table, not a log.

**Elements**
- Header: "Digest", date
- One card per position with activity: symbol tag, short headline, one prose paragraph recapping the day against the trader's stated thesis
- Positions with no activity get a single line, not a full card ("Quiet day. Nothing on your five moved.")
- Closing line, always present: "Nothing else needs you tonight."
- Tab bar: Home / Digest (active)

**Data needed:** `GET /digest?date=`.

## 6. Data model (proposed)

```
Watch {
  id
  symbol
  side, qty, entryPrice, expiry
  thesis: string            // trader's own words, from the interview
  status: holding | bending | flipped
  createdAt
}

WatchItem {
  id
  watchId
  kind: hard | signal        // ⚡ vs ◐
  label
  state: holding | gone
  lastCheckedAt
}

FeedEntry {
  id
  watchId
  timestamp
  weight: quiet | real
  text
}

InterviewTurn {
  watchId (draft, pre-start)
  question
  answer
}

DigestEntry {
  watchId
  date
  paragraph
  prompts: string[]           // "worth thinking about tonight" — facts/questions, never instructions
}
```

## 7. Backend API — build this

```
GET   /positions                          // existing — reuse for Add:Pick
POST  /watches                            // { symbol | manualEntry } → starts interview session
POST  /watches/:id/interview/turn         // { answer } → next agent question, or final synthesis
GET   /watches/:id/synthesis              // the 5 draft watch-items for Confirm
PATCH /watches/:id/watchitems             // trader edits before starting
POST  /watches/:id/start                  // begins watching
GET   /watches                            // list for Home
GET   /watches/:id                        // detail + current status
GET   /watches/:id/feed                   // timeline
POST  /watches/:id/ask                    // { question } → conversational turn
GET   /digest?date=
```

Build these against `zap-api` directly, reusing its existing auth and data patterns rather than inventing a parallel service. Check whether `zap-api` already has an LLM provider connected before assuming it doesn't — if it does, build the real interview/reasoning/ask logic against it now, not later. If it doesn't, implement each endpoint's request/response shape and surrounding logic in full anyway, and flag Sunny directly for the specific credential that needs connecting (an LLM provider API key, most likely) — a fully-built endpoint waiting on one flagged secret is far more useful to hand back than a silent mock.

The one rule that doesn't bend either way: **the PWA itself never calls an LLM directly and never holds an LLM API key.** That's this app's core safety invariant (§0), and it's specifically about the client — it doesn't mean the backend work is out of scope. All interview/reasoning/conversation logic belongs server-side, behind these endpoints; the PWA's job stays the same as everywhere else in this repo — call REST, render the response.

## 8. Design system requirements

- Every color from `theme.css` tokens. No hardcoded hex in a component, same rule as the rest of the app.
- **Status color decision needed:** `holding` / `bending` / `flipped` need their own semantic tokens. Don't reflexively reuse the brand forest green for `holding` — check with Sunny whether that reads as "the app's primary action color" vs "this specific thing is fine," which are different meanings. Recommend a distinct, calmer token for `holding` and reserving brand green for actual primary actions (Start watching, + Watch a new position).
- Motion: spring-based, transform/opacity only, 60fps, respects `prefers-reduced-motion` — same standard as the rest of the app. Specific moments that need it: status pill transitions on Home, feed entry insertion, chat bubble entry in Interview/Ask, screen transitions in and out of the sub-flows.
- Haptics (`web-haptics`) on: watch-item confirm, sending a message in Interview/Ask, tapping a flip notification, Start watching.
- Light + dark from day one, per screen, per the existing app-wide rule.

## 9. Technical constraints carried over from the repo

- iOS is the primary target. `100dvh` + safe-area insets over `100vh`; if this feature adds any swipe gesture (e.g., dismissing a feed entry), use window-level pointer listeners — `setPointerCapture` broke touch on iOS in the last redesign, don't repeat that.
- Router: new nested routes under `/watch` and `/digest`, same `BrowserRouter` already wired in `main.tsx`.
- Reuse `src/api/client.ts` patterns from `main` for all new endpoints rather than inventing a second HTTP pattern.
- `npm run typecheck` stays clean; don't merge a page with red types "to fix later."

## 10. Suggested build order

Specified enough to split across parallel agents rather than go screen-by-screen. Foundation lands first and blocks everything else; the three screen groups after that have no hard dependency on each other and can build concurrently.

**Foundation (blocking — land before splitting):**
- Routing shell: `/watch`, `/watch/new/*`, `/watch/:id`, `/watch/:id/ask`, `/digest`
- Shared types from §6 (`Watch`, `WatchItem`, `FeedEntry`, `InterviewTurn`, `DigestEntry`)
- API layer per §7, built against `zap-api` directly wherever its existing connections allow it. Where an endpoint needs a credential that isn't wired up yet — most likely an LLM provider key for the interview/reasoning/ask endpoints — implement that endpoint fully anyway and flag Sunny for the missing piece rather than mocking around it indefinitely
- Status color tokens (§8 decision — needed before any screen can render a status pill)

**Then, in parallel (one agent per group):**
- **Group A — Home + Digest.** Both consume the same watch list/status data; worth one agent owning both.
- **Group B — Add position sub-flow.** Pick → Interview → Confirm, one continuous flow. Wire Pick to the real `positions` API immediately since it already exists. Build the Interview/Confirm endpoints for real against `zap-api`; if they need an LLM credential that isn't connected, flag Sunny for it specifically rather than leaving the flow on mock data.
- **Group C — Position detail sub-flow.** Timeline → Flipped → Ask, one continuous flow.

**After parallel work lands (integration pass, one agent):**
- Reconcile shared components — status pill, chat bubble, check-row — into single implementations; each group will likely have built its own version.
- Push notification wiring.
- Confirm every §7 endpoint is actually live end-to-end and remove any remaining placeholder responses; anywhere a credential is still missing, leave one clearly flagged item for Sunny rather than a silent mock.

## 11. Explicitly out of scope for v1

- Any order placement, modification, or cancellation from anywhere in this feature.
- Bulk/portfolio-wide watching — v1 is one position at a time, through the interview, on purpose.
- The "skip ahead" control and any other testing/demo-only affordance from early concept walkthroughs.

## 12. Open questions — decide, don't silently guess

1. Manual entry vs broker connect: for a trader whose broker isn't supported, should manual entry lead instead of following the connect buttons?
2. Do position 2 and 3 (once a trader has one running) get their own full interview, or does the agent start proposing watch-items itself once it's learned how this trader thinks?
3. What's the actual ceiling on interview length before a trader drops off? Four exchanges felt close to it in early walkthroughs — worth testing, not assuming.
4. Freeform "add something else to watch" — auto-classify ⚡/◐, or ask the trader?
5. Do "quiet" feed entries stay useful past day three, or should repeated quiet checks collapse into a single rollup line?
6. Flip-to-notify threshold: does one flip log quietly while two flips inside an hour push a notification? Needs an actual rule from Sunny/product, not an engineering guess.
7. Trade-history pattern matching in Ask — is the available fill history (how many months?) enough to state a claim like "3 times since May" as fact, or does it need a confidence caveat in the copy?
8. Packaging: free tier (alerts only) vs paid tier (converses, remembers) — not urgent for v1 build, but don't build anything that assumes one answer over the other.
9. **New this round:** does Position Agent live at a new `/watch` route, or does it absorb/extend the existing Analysis page? Needs investigation before the routing in §4 is treated as final.
10. Status color semantics (see §8) — needs a design decision, not a default.

## Appendix — reference dataset

Use this as the canonical example while building/testing, so screenshots and fixtures stay consistent across screens:

- **NIFTY 24,700 CE** — short 75, sold at ₹186, 19 Aug expiry. Thesis: bearish divergence, writers defending the strike. Watch items: closes above 24,500 (⚡), premium doubles to ₹372 (⚡), writers unwind the wall (◐), OI migrates to a higher strike (◐), divergence resolves (◐).
- **NIFTY 24,000 PE** — short 75, sold at ₹94, 19 Aug expiry. Quiet throughout — use this one for empty/quiet-state fixtures.
- **SILVERMIC** — long 1, 30 Sep expiry, MCX. Third position, for testing multi-watch Home states.

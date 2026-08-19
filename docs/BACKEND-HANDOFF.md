# Position Agent — backend handoff (for Madhan)

Everything the PWA needs from zap-api to go from demo to real. Written to be
fed to an LLM as context alongside the code. The product spec is in
[position-agent-prd.md](position-agent-prd.md) (§7 is the API contract, §6 the
data model). The frontend is DONE and already calls every endpoint below with
the exact paths and shapes — flip `VITE_MOCK_API=0` and it runs against zap-api.

## The one rule

The PWA never holds an LLM key and never calls an LLM directly. All
interview/reasoning/ask logic lives behind these zap-api endpoints. Position
Agent is strictly read-only: it never places, modifies, or cancels an order.

## Where things are in this repo

- `src/api/watch.ts` — the client for every endpoint below. Each function
  shows the exact request body and the response shape it expects
  (`{ success: boolean, ...payload }`, same envelope as the rest of zap-api).
- `src/types.ts` — the shared data model (Watch, WatchItem, FeedEntry,
  InterviewStep, Synthesis, AskTurn, DigestEntry). Mirror these server-side.
- `src/api/agentLocal.ts` — **the LLM prompts, ready to lift as-is**:
  `INTERVIEW_SYSTEM` (4-question interview incl. the pushback turn and the
  `[MOOD]`/`[DONE]` markers the client parses), `SYNTH_SYSTEM` (turns the
  transcript into exactly 5 watch-items as JSON), `ASK_SYSTEM` (trade-offs,
  never directives, never invented history). Includes the voice rules
  (conversational, no em-dashes) — keep them.
- `src/api/fixtures.ts` — the mock layer, useful as a reference for expected
  payloads and canonical test data (PRD appendix dataset).
- `vite.config.ts` (`agentProxy`) — the dev-only Claude proxy the prompts run
  through locally. Retire it once the real endpoints exist; the Anthropic call
  it makes (model `claude-sonnet-5`, messages API) moves into zap-api.

## Endpoints to build (PRD §7)

```
POST  /watches                     { symbol, side, qty, entryPrice, expiry? }
                                   → { success, id, step: InterviewStep }   // starts interview
POST  /watches/:id/interview/turn  { answer } → { success, step: InterviewStep }
GET   /watches/:id/synthesis       → { success, synthesis: { thesisLine, items[5] } }
PATCH /watches/:id/watchitems      { items } → { success }
POST  /watches/:id/start           → { success, watch }
GET   /watches                     → { success, watches[] }                 // Home list
GET   /watches/:id                 → { success, watch, items }              // detail + status
GET   /watches/:id/feed            → { success, feed[] }                    // timeline
POST  /watches/:id/ask             { question, history? } → { success, turn: AskTurn }
GET   /digest?date=                → { success, entries[] }
```

`InterviewStep = { agentMessages: string[], done: boolean, expectsMood?: boolean }`.
The client renders each string in `agentMessages` as its own message, switches
to mood chips when `expectsMood`, and routes to Confirm when `done`.

Reuse existing zap-api auth (JWT) and the existing `/broker/positions` — the
Pick screen already consumes it.

## The watching engine (the big piece — nothing client-side can do this)

- **⚡ hard items**: numeric, binary, checked tick-by-tick against the Dhan
  feed (price levels, premium doubling).
- **◐ signal items**: interpretive, checked on a ~30-minute LLM reasoning pass
  (OI behaviour, structure, the trader's stated failure condition).
- Each check appends a FeedEntry (`weight: "quiet" | "real"`). Status rolls up
  to `holding | bending | flipped`; when flipped, populate `changeSummary`
  (the "what changed" paragraph — leads with what changed, never a verdict)
  and `priceLine`.
- End of day: generate one DigestEntry per watch (prose paragraph per the PRD
  §5 Digest spec; quiet watches get `quietLine` instead).

## Also pending

1. **Push notifications** — service-worker subscription client-side +
   server push on flip. Flip-to-notify threshold is PRD open question #6 —
   ask Sunny for the rule, don't guess.
2. **Fill history for Ask** — `historyNote` on AskTurn must be backed by real
   fill history or omitted entirely. The client renders it only when present;
   never send an approximation (PRD flags this as the highest-hallucination
   surface).
3. **Login screen** — the redesign branch has the auth client (`src/api/auth.ts`
   on `main`, token store in `src/store/auth.ts`) but no login UI yet; needed
   before real-API mode works end to end.
4. **Open questions** (PRD §12) — decide with Sunny, notably: does Position
   Agent absorb/extend the existing Analysis feature or stay a separate
   surface (frontend currently assumes separate, at `/watch`)?

## Config

- `VITE_API_BASE_URL` — defaults to `https://uat.revise.network/zap-api/v1/api`
- `VITE_MOCK_API` — unset/`1` = fixtures (current demo mode); `0` = real API
- `ANTHROPIC_API_KEY` in `.env.local` — dev-proxy only, gitignored, dies with
  the proxy once zap-api owns the LLM calls

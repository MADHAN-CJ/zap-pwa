// Position Agent API — PRD §7. Real endpoint shapes against zap-api.
//
// ⚠️ BACKEND NOT BUILT YET — FLAGGED FOR SUNNY (see PRD §7 / build report).
// The zap-api source isn't accessible from this machine, so these endpoints
// don't exist server-side yet. Until they do, MOCK MODE is on by default and
// every call below routes to src/api/fixtures.ts. Set VITE_MOCK_API=0 once
// the backend lands — the real request paths are already correct per §7.
import { apiRequest } from "./client";
import type {
  AskTurn,
  DigestEntry,
  FeedEntry,
  InterviewStep,
  PositionRef,
  Synthesis,
  Watch,
  WatchItem,
} from "@/types";
import * as fx from "./fixtures";
import * as agent from "./agentLocal";

export const MOCK = import.meta.env.VITE_MOCK_API !== "0";
if (MOCK) {
  console.warn("[zap] Position Agent API in MOCK mode — zap-api endpoints pending (flagged).");
}

export async function listWatches(): Promise<Watch[]> {
  if (MOCK) return fx.fxListWatches();
  const r = await apiRequest<{ success: boolean; watches: Watch[] }>("/watches");
  if (!r.ok) throw new Error(r.error);
  return r.data.watches;
}

export async function createWatch(
  position: PositionRef
): Promise<{ id: string; step: InterviewStep }> {
  if (MOCK) {
    const r = await fx.fxCreateWatch(position);
    agent.beginSession(r.id, position); // interview turns go through Claude (dev proxy)
    return r;
  }
  const r = await apiRequest<{ success: boolean; id: string; step: InterviewStep }>("/watches", {
    method: "POST",
    body: { ...position },
  });
  if (!r.ok) throw new Error(r.error);
  return { id: r.data.id, step: r.data.step };
}

export async function interviewTurn(id: string, answer: string): Promise<InterviewStep> {
  if (MOCK) return agent.llmInterviewTurn(id, answer);
  const r = await apiRequest<{ success: boolean; step: InterviewStep }>(
    `/watches/${id}/interview/turn`,
    { method: "POST", body: { answer } }
  );
  if (!r.ok) throw new Error(r.error);
  return r.data.step;
}

/** Retry the last interview exchange: same answer, fresh agent reply.
 *  MOCK-mode only concern for now; the real backend will own this. */
export async function retryInterviewTurn(id: string, answer: string): Promise<InterviewStep> {
  if (MOCK) {
    agent.popLastExchange(id);
    return agent.llmInterviewTurn(id, answer);
  }
  return interviewTurn(id, answer);
}

export async function getSynthesis(id: string): Promise<Synthesis> {
  if (MOCK) {
    const s = await agent.llmSynthesis(id);
    await fx.fxPatchItems(id, s.items);
    return s;
  }
  const r = await apiRequest<{ success: boolean; synthesis: Synthesis }>(
    `/watches/${id}/synthesis`
  );
  if (!r.ok) throw new Error(r.error);
  return r.data.synthesis;
}

export async function patchWatchItems(id: string, items: WatchItem[]): Promise<void> {
  if (MOCK) return fx.fxPatchItems(id, items);
  const r = await apiRequest<{ success: boolean }>(`/watches/${id}/watchitems`, {
    method: "PATCH",
    body: { items },
  });
  if (!r.ok) throw new Error(r.error);
}

export async function startWatch(id: string): Promise<Watch> {
  if (MOCK) return fx.fxStart(id);
  const r = await apiRequest<{ success: boolean; watch: Watch }>(`/watches/${id}/start`, {
    method: "POST",
    body: {},
  });
  if (!r.ok) throw new Error(r.error);
  return r.data.watch;
}

export async function getWatch(id: string): Promise<{ watch: Watch; items: WatchItem[] } | null> {
  if (MOCK) return fx.fxGetWatch(id);
  const r = await apiRequest<{ success: boolean; watch: Watch; items: WatchItem[] }>(
    `/watches/${id}`
  );
  if (!r.ok) return null;
  return { watch: r.data.watch, items: r.data.items };
}

export async function getFeed(id: string): Promise<FeedEntry[]> {
  if (MOCK) return fx.fxGetFeed(id);
  const r = await apiRequest<{ success: boolean; feed: FeedEntry[] }>(`/watches/${id}/feed`);
  if (!r.ok) throw new Error(r.error);
  return r.data.feed;
}

export async function askAgent(
  id: string,
  question: string,
  history: { role: "user" | "assistant"; content: string }[] = []
): Promise<AskTurn> {
  if (MOCK) {
    const d = await fx.fxGetWatch(id);
    if (!d) return fx.fxAsk(id, question);
    const ctx = [
      `Position: ${d.watch.symbol}${d.watch.side ? `, ${d.watch.side} ${d.watch.qty} @ ₹${d.watch.entryPrice}` : ""}${d.watch.expiry ? `, expiry ${d.watch.expiry}` : ""}. Status: ${d.watch.status}.`,
      `Trader's thesis, their words: ${d.watch.thesis}`,
      `Watch-items: ${d.items.map((i) => `${i.label} [${i.kind}] — ${i.state}`).join("; ")}`,
      d.watch.changeSummary ? `What changed: ${d.watch.changeSummary}` : "",
    ].join("\n");
    return agent.llmAsk(id, question, ctx, history);
  }
  const r = await apiRequest<{ success: boolean; turn: AskTurn }>(`/watches/${id}/ask`, {
    method: "POST",
    body: { question },
  });
  if (!r.ok) throw new Error(r.error);
  return r.data.turn;
}

export async function getDigest(date?: string): Promise<DigestEntry[]> {
  if (MOCK) return fx.fxDigest(date);
  const r = await apiRequest<{ success: boolean; entries: DigestEntry[] }>(
    `/digest${date ? `?date=${encodeURIComponent(date)}` : ""}`
  );
  if (!r.ok) throw new Error(r.error);
  return r.data.entries;
}

/** Market-wide instrument search for Add:Pick's search bar.
 *  Backend (Madhan): GET /instruments/search?q= → { success, instruments }. */
export async function searchInstruments(q: string): Promise<{ symbol: string; name: string }[]> {
  if (MOCK) return fx.fxSearchInstruments(q);
  const r = await apiRequest<{ success: boolean; instruments: { symbol: string; name: string }[] }>(
    `/instruments/search?q=${encodeURIComponent(q)}`
  );
  if (!r.ok) throw new Error(r.error);
  return r.data.instruments;
}

/** Open positions for Add:Pick — reuses the existing broker endpoint. */
export async function listOpenPositions(): Promise<PositionRef[]> {
  if (MOCK) return fx.fixturePositions;
  const r = await apiRequest<{ success: boolean; positions: any[] }>("/broker/positions");
  if (!r.ok) throw new Error(r.error);
  return r.data.positions.map((p) => ({
    symbol: p.tradingSymbol ?? p.symbol,
    side: (p.netQty ?? p.qty ?? 0) >= 0 ? "long" : "short",
    qty: Math.abs(p.netQty ?? p.qty ?? 0),
    entryPrice: p.avgPrice ?? p.entryPrice ?? 0,
    expiry: p.expiry,
    pnl: p.pnl ?? p.unrealizedPnl,
  }));
}

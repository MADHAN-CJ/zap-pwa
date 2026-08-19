// Shared Position Agent types — PRD §6. All screens consume these.

export type WatchStatus = "holding" | "bending" | "flipped";
export type WatchItemKind = "hard" | "signal"; // ⚡ tick-by-tick | ◐ 30-min reasoning pass
export type WatchItemState = "holding" | "gone";
export type Mood = "Uneasy" | "Comfortable" | "Confident" | "A bit greedy";

export interface PositionRef {
  symbol: string;
  /* Present only when the trader actually holds it (broker-sourced). A pick
     from the market list carries just the symbol. */
  side?: "long" | "short";
  qty?: number;
  entryPrice?: number;
  expiry?: string;
  pnl?: number;
}

export interface Watch {
  id: string;
  symbol: string;
  side?: "long" | "short";
  qty?: number;
  entryPrice?: number;
  expiry?: string;
  thesis: string; // trader's own words, from the interview
  status: WatchStatus;
  lastUpdateText: string; // "checked 30 min ago" / "2 of 5 flipped · updated 1:35p"
  createdAt: string;
  /** Present when status is flipped/bending: the "what changed" paragraph. */
  changeSummary?: string;
  /** Current price line for the flipped header, e.g. "₹186 → ₹241". */
  priceLine?: string;
}

export interface WatchItem {
  id: string;
  watchId: string;
  kind: WatchItemKind;
  label: string;
  state: WatchItemState;
  lastCheckedAt?: string;
}

export interface FeedEntry {
  id: string;
  watchId: string;
  timestamp: string;
  weight: "quiet" | "real";
  text: string;
}

export interface InterviewTurn {
  role: "agent" | "trader";
  text: string;
}

/** Response of an interview exchange: the agent's next message(s), and
 *  whether the interview is complete (→ route to Confirm). */
export interface InterviewStep {
  agentMessages: string[];
  done: boolean;
  /** When the next answer should be mood chips instead of free text. */
  expectsMood?: boolean;
}

export interface Synthesis {
  thesisLine: string; // one-line restated thesis, trader's own words
  items: WatchItem[]; // exactly 5 drafts
}

export interface AskTurn {
  role: "trader" | "agent";
  text: string;
  /** History callout — ONLY rendered when backed by real fill history. */
  historyNote?: string;
}

export interface DigestEntry {
  watchId: string;
  symbol: string;
  date: string;
  headline: string;
  /** Full card paragraph; quiet positions get quietLine instead. */
  paragraph?: string;
  quietLine?: string;
  prompts: string[]; // facts/questions, never instructions
}

// LLM-driven agent logic, routed through the DEV-ONLY /agent/chat proxy
// (see vite.config.ts — the key never touches this bundle). This is the
// stand-in for zap-api's interview/reasoning/ask endpoints; the prompts here
// should migrate server-side with them. Falls back to the scripted fixtures
// when the proxy/key is unavailable so screens never dead-end.
import type { AskTurn, InterviewStep, PositionRef, Synthesis, WatchItem } from "@/types";
import * as fx from "./fixtures";

type Msg = { role: "user" | "assistant"; content: string };

async function chat(system: string, messages: Msg[], max_tokens = 700): Promise<string> {
  const r = await fetch("/agent/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ system, messages, max_tokens }),
  });
  if (!r.ok) throw new Error(`agent proxy ${r.status}`);
  const data = await r.json();
  return data.text as string;
}

const positionLine = (p: PositionRef) =>
  `${p.symbol}, ${p.side} ${p.qty} @ ₹${p.entryPrice}${p.expiry ? `, expiry ${p.expiry}` : ""}`;

const INTERVIEW_SYSTEM = (p: PositionRef) => `You are the Position Agent for an Indian options/futures trader — a second, sharper pair of eyes on THEIR reasoning. You never instruct, never recommend an action, never say exit/hold/buy/sell as advice.

You are interviewing the trader about ONE position: ${positionLine(p)}.

Run exactly four questions, one at a time, in this order. The app has ALREADY asked question 1 ("Why'd you take this one?") — the first user message you receive is its answer, so start from question 2:
1. Why'd you take this one? (their thesis, their words — already asked by the app)
2. The pushback: reflect their stated reason back at them in one tight sentence, then ask what would tell them that read is FAILING — not "price goes against me," the thing that breaks their actual reason.
3. Any level where they're out regardless of what you say?
4. How are they sitting with this trade right now? End this question with the literal marker [MOOD] — the app renders mood chips for it.

Rules:
- Never use em-dashes in your replies; use commas, colons, or full stops.
- One question per turn. Never number the questions out loud. Keep each turn under 50 words, plain speech, no emoji, no bullet points.
- If an answer is a one-word non-answer, ask ONE lightweight follow-up, then move on regardless.
- After the mood answer arrives, reply with a single short closing line ending with the literal marker [DONE].`;

interface Session {
  position: PositionRef;
  history: Msg[];
}
const sessions: Record<string, Session> = {};

export function beginSession(id: string, position: PositionRef) {
  sessions[id] = { position, history: [] };
}

export async function llmInterviewTurn(id: string, answer: string): Promise<InterviewStep> {
  const s = sessions[id];
  if (!s) return fx.fxInterviewTurn(id, answer);
  s.history.push({ role: "user", content: answer });
  try {
    const raw = await chat(INTERVIEW_SYSTEM(s.position), s.history, 300);
    s.history.push({ role: "assistant", content: raw });
    const done = raw.includes("[DONE]");
    const expectsMood = raw.includes("[MOOD]");
    const text = raw.replace("[DONE]", "").replace("[MOOD]", "").trim();
    return { agentMessages: [text], done, expectsMood };
  } catch {
    return fx.fxInterviewTurn(id, answer); // proxy down — scripted fallback
  }
}

const SYNTH_SYSTEM = `From the interview transcript, produce exactly 5 watch-items for this position — the concrete conditions the agent will monitor. 1–2 must be kind "hard" (numeric, binary, checkable tick-by-tick — price levels, premium doubling). 3–4 must be kind "signal" (interpretive, checked on a ~30-minute reasoning pass — OI behaviour, structure, the trader's stated failure condition). Ground every item in what the trader actually said; use their numbers where they gave them.

Also produce "thesisLine": the trader's thesis restated in ONE line, keeping their own vocabulary.

Reply with ONLY valid JSON: {"thesisLine": string, "items": [{"kind": "hard"|"signal", "label": string}]} — labels under 10 words each, and never use em-dashes in any label or thesisLine.`;

export async function llmSynthesis(id: string): Promise<Synthesis> {
  const s = sessions[id];
  if (!s || s.history.length === 0) return fx.fxSynthesis(id);
  try {
    const transcript = s.history
      .map((m) => `${m.role === "user" ? "TRADER" : "AGENT"}: ${m.content}`)
      .join("\n");
    const raw = await chat(
      SYNTH_SYSTEM,
      [{ role: "user", content: `Position: ${positionLine(s.position)}\n\n${transcript}` }],
      600
    );
    const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const items: WatchItem[] = parsed.items.slice(0, 5).map((it: any, i: number) => ({
      id: `${id}-${i + 1}`,
      watchId: id,
      kind: it.kind === "hard" ? "hard" : "signal",
      label: String(it.label),
      state: "holding" as const,
    }));
    if (items.length !== 5) return fx.fxSynthesis(id);
    return { thesisLine: String(parsed.thesisLine), items };
  } catch {
    return fx.fxSynthesis(id);
  }
}

const ASK_SYSTEM = (ctx: string) => `You are the Position Agent — a second pair of eyes on the trader's own reasoning about one position. Context:
${ctx}

Rules for every reply:
- Lead with what changed or what's true, never with a verdict. No directives — never "you should", never "exit"/"hold" as advice.
- Give the trade-off both ways, then turn the trader's own stated thesis or their own stated out-level back at them as a question.
- You may reference their stated rules ("you told me..."). You may NOT invent trade history, past behaviour, or statistics — you have no fill history available, so never claim things like "you've done this N times".
- Under 120 words. Plain speech, no bullets, no emoji, no em-dashes (use commas, colons, or full stops).`;

export async function llmAsk(
  id: string,
  question: string,
  ctx: string,
  history: Msg[]
): Promise<AskTurn> {
  try {
    const text = await chat(ASK_SYSTEM(ctx), [...history, { role: "user", content: question }], 400);
    return { role: "agent", text: text.trim() };
  } catch {
    return fx.fxAsk(id, question);
  }
}

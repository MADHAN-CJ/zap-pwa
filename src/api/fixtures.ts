// ⚠️ DEV FIXTURES — NOT PRODUCT LOGIC ⚠️
// zap-api has no Position Agent endpoints yet (see §7 of the PRD; backend
// work is flagged for Sunny — the zap-api source isn't accessible from this
// machine). This in-memory layer exists ONLY so screens are buildable and
// reviewable on-device. It is enabled by default until the backend lands;
// set VITE_MOCK_API=0 to hit the real endpoints.
// Dataset mirrors the PRD appendix so screenshots stay canonical.
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

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

// ---------- seed data (PRD appendix) ----------

export const fixturePositions: PositionRef[] = [
  { symbol: "NIFTY 24700 CE", side: "short", qty: 75, entryPrice: 186, expiry: "19 Aug", pnl: -4125 },
  { symbol: "NIFTY 24000 PE", side: "short", qty: 75, entryPrice: 94, expiry: "19 Aug", pnl: 2280 },
  { symbol: "SILVERMIC", side: "long", qty: 1, entryPrice: 90210, expiry: "30 Sep", pnl: 1160 },
];

let watches: Watch[] = [
  {
    id: "w1",
    symbol: "NIFTY 24700 CE",
    side: "short",
    qty: 75,
    entryPrice: 186,
    expiry: "19 Aug",
    thesis: "Bearish divergence on the hourly; writers defending 24,700.",
    status: "flipped",
    lastUpdateText: "2 of 5 flipped · updated 1:35p",
    createdAt: "2026-08-17T09:20:00+05:30",
    changeSummary:
      "Two of your five moved inside the last hour. Price closed above 24,500 — the hard line you set — and the premium has run from ₹186 to ₹241. The divergence you built this on hasn't resolved yet, and writers are still holding the 24,700 wall. What's changed is price and premium; what hasn't is the structure you originally read.",
    priceLine: "short 75 · ₹186 → ₹241 · bending",
  },
  {
    id: "w2",
    symbol: "NIFTY 24000 PE",
    side: "short",
    qty: 75,
    entryPrice: 94,
    expiry: "19 Aug",
    thesis: "Support at 24,200 keeps holding; theta does the work.",
    status: "holding",
    lastUpdateText: "checked 30 min ago",
    createdAt: "2026-08-17T09:25:00+05:30",
  },
];

let watchItems: Record<string, WatchItem[]> = {
  w1: [
    { id: "i1", watchId: "w1", kind: "hard", label: "Closes above 24,500", state: "gone", lastCheckedAt: "1:35p" },
    { id: "i2", watchId: "w1", kind: "hard", label: "Premium doubles to ₹372", state: "holding", lastCheckedAt: "1:35p" },
    { id: "i3", watchId: "w1", kind: "signal", label: "Writers unwind the 24,700 wall", state: "holding", lastCheckedAt: "1:10p" },
    { id: "i4", watchId: "w1", kind: "signal", label: "OI migrates to a higher strike", state: "gone", lastCheckedAt: "1:10p" },
    { id: "i5", watchId: "w1", kind: "signal", label: "Hourly divergence resolves upward", state: "holding", lastCheckedAt: "1:10p" },
  ],
  w2: [
    { id: "i6", watchId: "w2", kind: "hard", label: "Closes below 24,000", state: "holding", lastCheckedAt: "1:30p" },
    { id: "i7", watchId: "w2", kind: "hard", label: "Premium doubles to ₹188", state: "holding", lastCheckedAt: "1:30p" },
    { id: "i8", watchId: "w2", kind: "signal", label: "24,200 support breaks on volume", state: "holding", lastCheckedAt: "1:00p" },
    { id: "i9", watchId: "w2", kind: "signal", label: "Put writers retreat from 24,000", state: "holding", lastCheckedAt: "1:00p" },
    { id: "i10", watchId: "w2", kind: "signal", label: "VIX pops above 16", state: "holding", lastCheckedAt: "1:00p" },
  ],
};

let feeds: Record<string, FeedEntry[]> = {
  w1: [
    { id: "f5", watchId: "w1", timestamp: "1:35p", weight: "real", text: "Price closed the hour above 24,500 — your hard line. Premium ₹241 against your ₹186 entry." },
    { id: "f4", watchId: "w1", timestamp: "1:10p", weight: "real", text: "OI is starting to build at 24,900 while 24,700 adds nothing. That migration you called out is underway." },
    { id: "f3", watchId: "w1", timestamp: "12:30p", weight: "quiet", text: "Quiet. Spot 24,462." },
    { id: "f2", watchId: "w1", timestamp: "12:00p", weight: "quiet", text: "Nothing moved against you." },
    { id: "f1", watchId: "w1", timestamp: "11:30a", weight: "quiet", text: "Quiet. Spot 24,388." },
  ],
  w2: [
    { id: "f8", watchId: "w2", timestamp: "1:30p", weight: "quiet", text: "Nothing moved against you." },
    { id: "f7", watchId: "w2", timestamp: "1:00p", weight: "quiet", text: "Quiet. Spot 24,462, well above your 24,200 shelf." },
    { id: "f6", watchId: "w2", timestamp: "12:30p", weight: "quiet", text: "Quiet. Premium decaying as expected." },
  ],
};

// ---------- interview script (stand-in for the backend agent) ----------

interface Draft {
  position: PositionRef;
  answers: string[];
  step: number;
}
const drafts: Record<string, Draft> = {};
let nextId = 10;

const Q2_PUSHBACK = (reason: string) =>
  `So the trade is: ${reason.length > 120 ? reason.slice(0, 117) + "…" : reason} Fair. Now flip it — what would tell you that read is *failing*? Not "price goes against me," but the thing that breaks your actual reason.`;

export async function fxCreateWatch(position: PositionRef): Promise<{ id: string; step: InterviewStep }> {
  await delay();
  const id = `w${nextId++}`;
  drafts[id] = { position, answers: [], step: 0 };
  return {
    id,
    step: {
      agentMessages: [
        `${position.symbol} — ${position.side} ${position.qty}. Got it.`,
        "Why'd you take this one? In your own words — what's the read?",
      ],
      done: false,
    },
  };
}

export async function fxInterviewTurn(id: string, answer: string): Promise<InterviewStep> {
  await delay(500);
  const d = drafts[id];
  if (!d) return { agentMessages: ["Hmm, lost the thread — go back and start again."], done: true };
  d.answers.push(answer);

  // Lightweight one-word follow-up, once per question (PRD edge case).
  if (answer.trim().split(/\s+/).length < 3 && !d.answers[d.answers.length - 2]?.startsWith("__retry")) {
    d.answers[d.answers.length - 1] = `__retry:${answer}`;
    return {
      agentMessages: ["Give me a little more than that — I can only watch what you actually tell me."],
      done: false,
      expectsMood: d.step === 3,
    };
  }

  d.step++;
  switch (d.step) {
    case 1:
      return { agentMessages: [Q2_PUSHBACK(d.answers[0])], done: false };
    case 2:
      return {
        agentMessages: ["Any level where you're out regardless of what I say? A line that isn't up for debate."],
        done: false,
      };
    case 3:
      return {
        agentMessages: ["Last one. How are you sitting with this trade right now?"],
        done: false,
        expectsMood: true,
      };
    default:
      return { agentMessages: ["Alright. Give me a second to turn that into something I can actually watch…"], done: true };
  }
}

export async function fxSynthesis(id: string): Promise<Synthesis> {
  await delay(700);
  const d = drafts[id];
  const thesis = d?.answers[0]?.replace(/^__retry:/, "") ?? "Your stated thesis";
  const sym = d?.position.symbol ?? "the position";
  return {
    thesisLine: thesis,
    items: [
      { id: `${id}-1`, watchId: id, kind: "hard", label: `Closes beyond your stated line on ${sym}`, state: "holding" },
      { id: `${id}-2`, watchId: id, kind: "hard", label: "Premium doubles from your entry", state: "holding" },
      { id: `${id}-3`, watchId: id, kind: "signal", label: "The structure behind your read starts unwinding", state: "holding" },
      { id: `${id}-4`, watchId: id, kind: "signal", label: "OI shifts against your position", state: "holding" },
      { id: `${id}-5`, watchId: id, kind: "signal", label: "Your stated failure condition shows up", state: "holding" },
    ],
  };
}

export async function fxPatchItems(id: string, items: WatchItem[]): Promise<void> {
  await delay(200);
  watchItems[id] = items;
}

export async function fxStart(id: string): Promise<Watch> {
  await delay(400);
  const d = drafts[id];
  const w: Watch = {
    id,
    symbol: d?.position.symbol ?? "—",
    side: d?.position.side ?? "long",
    qty: d?.position.qty ?? 0,
    entryPrice: d?.position.entryPrice ?? 0,
    expiry: d?.position.expiry,
    thesis: d?.answers[0]?.replace(/^__retry:/, "") ?? "",
    status: "holding",
    lastUpdateText: "just started",
    createdAt: new Date().toISOString(),
  };
  watches = [w, ...watches];
  if (!watchItems[id]) {
    const s = await fxSynthesis(id);
    watchItems[id] = s.items;
  }
  feeds[id] = [
    { id: `${id}-f1`, watchId: id, timestamp: "now", weight: "quiet", text: "Watching. First pass on your five within 30 minutes." },
  ];
  delete drafts[id];
  return w;
}

// ---------- reads ----------

export async function fxListWatches(): Promise<Watch[]> {
  await delay(250);
  return watches;
}

export async function fxGetWatch(id: string): Promise<{ watch: Watch; items: WatchItem[] } | null> {
  await delay(250);
  const watch = watches.find((w) => w.id === id);
  return watch ? { watch, items: watchItems[id] ?? [] } : null;
}

export async function fxGetFeed(id: string): Promise<FeedEntry[]> {
  await delay(250);
  return feeds[id] ?? [];
}

export async function fxAsk(id: string, _question: string): Promise<AskTurn> {
  await delay(900);
  const w = watches.find((x) => x.id === id);
  if (w?.id === "w1") {
    return {
      role: "agent",
      text:
        "Here's the trade-off as I see it. Exiting here costs you about ₹4,100 and closes the book — no more decisions, no gap risk into expiry. Holding keeps your original read alive: the divergence hasn't resolved and the 24,700 wall is still standing, which is the structure you said this trade rests on. But your own hard line — a close above 24,500 — is gone, and you set that line when you were calmer than you are now. You told me you'd respect it regardless of what I say. Is this the exception, or is this exactly the moment you made that rule for?",
      historyNote:
        "For what it's worth: you've held through a broken hard line 3 times since May. All three cost more than the first exit would have. That's the record, not a verdict.",
    };
  }
  return {
    role: "agent",
    text: `On ${w?.symbol ?? "this one"}: nothing in your five has moved, so the honest answer is that any urge to act right now is coming from you, not the position. Your thesis — ${w?.thesis ?? "as stated"} — is intact. What specifically feels different since you set it?`,
  };
}

export async function fxDigest(_date?: string): Promise<DigestEntry[]> {
  await delay(300);
  return [
    {
      watchId: "w1",
      symbol: "NIFTY 24700 CE",
      date: "19 Aug",
      headline: "Bent, didn't break",
      paragraph:
        "The afternoon went against you: a close above 24,500 took out your hard line, and the premium ran to ₹241. But the read you actually built this trade on — the divergence, the writers at 24,700 — is still standing, which is why it's bending and not gone. You asked to be told when price and thesis disagree: today they did.",
      prompts: ["Your out-level was 24,500 on a close. It closed there.", "Expiry is tomorrow — theta is now doing most of the arguing."],
    },
    {
      watchId: "w2",
      symbol: "NIFTY 24000 PE",
      date: "19 Aug",
      headline: "",
      quietLine: "Quiet day. Nothing on your five moved.",
      prompts: [],
    },
  ];
}

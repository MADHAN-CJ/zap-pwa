import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Screen } from "@/components/Screen";
import { PromptBar } from "@/components/PromptBar";
import { StatusPill } from "@/components/StatusPill";
import { ChatBubble, MessageActions, TypingBubble } from "@/components/ChatBubble";
import { askAgent, getWatch } from "@/api/watch";
import { spring, springSoft, pressScale } from "@/lib/motion";
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import type { AskTurn, WatchStatus } from "@/types";

const SEED: AskTurn = {
  role: "agent",
  text: "Ask me anything about this one. I'll give you the trade-offs. The call stays yours.",
};

/** /watch/:id/ask — conversational drill-down. Trade-offs, not answers. */
export default function WatchAsk() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [symbol, setSymbol] = useState("");
  const [missing, setMissing] = useState(false);
  const [turns, setTurns] = useState<AskTurn[]>([SEED]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [failed, setFailed] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    getWatch(id).then((d) => {
      if (!live) return;
      if (!d) setMissing(true);
      else {
        setStatus(d.watch.status);
        setSymbol(d.watch.symbol);
      }
    });
    return () => {
      live = false;
    };
  }, [id]);

  // Auto-scroll to newest, smooth.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, typing]);

  // A question handed over from the Flipped screen's prompt bar.
  const handoff = (useLocation().state as { ask?: string } | null)?.ask;
  useEffect(() => {
    if (handoff && turns.length === 1 && !typing) send(handoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff]);

  if (missing) return <Navigate to="/watch" replace />;

  async function send(preset?: string) {
    const question = (preset ?? input).trim();
    if (!question || typing) return;
    tapHaptic();
    setFailed(false);
    // History from prior turns: trader → user, agent → assistant.
    const history = turns.map((t) => ({
      role: t.role === "trader" ? ("user" as const) : ("assistant" as const),
      content: t.text,
    }));
    setTurns((t) => [...t, { role: "trader", text: question }]);
    setInput("");
    setTyping(true);
    try {
      const reply = await askAgent(id, question, history);
      setTurns((t) => [...t, reply]);
    } catch {
      setFailed(true);
    } finally {
      setTyping(false);
    }
  }

  /** Re-run the last question: drop the last agent turn, ask again with the
   *  history that preceded it. */
  async function retryLast() {
    if (typing) return;
    const lastAgent = turns.length - 1;
    if (turns[lastAgent]?.role !== "agent" || lastAgent === 0) return;
    const question = turns[lastAgent - 1]?.text;
    if (!question) return;
    const prior = turns.slice(0, lastAgent - 1).map((t) => ({
      role: t.role === "trader" ? ("user" as const) : ("assistant" as const),
      content: t.text,
    }));
    setTurns((t) => t.slice(0, -1));
    setTyping(true);
    try {
      const reply = await askAgent(id, question, prior);
      setTurns((t) => [...t, reply]);
    } catch {
      setFailed(true);
    } finally {
      setTyping(false);
    }
  }

  const exit = (to: string) => {
    selectHaptic();
    nav(to);
  };

  return (
    <Screen back={`/watch/${id}`} tag={status && <StatusPill status={status} size="sm" />} padBottom={false}>
      {/* Thread — the only thing that scrolls. */}
      <div
        ref={threadRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingBottom: 12,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {turns.map((t, i) => (
          <div
            key={i}
            style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: t.role === "agent" ? "flex-start" : "flex-end" }}
          >
            <ChatBubble role={t.role}>{t.text}</ChatBubble>
            {/* Actions only under the newest agent message (older text stays
                selectable) — one action row per thread, not per bubble. */}
            {t.role === "agent" && i > 0 && !typing && i === turns.length - 1 && (
              <MessageActions text={t.text} onRetry={retryLast} />
            )}
            {/* Only ever rendered when the API returned it — never placeholder copy. */}
            {t.role === "agent" && t.historyNote && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springSoft}
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "82%",
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: "var(--ink-2)",
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: "var(--ink-3)",
                    marginBottom: 4,
                  }}
                >
                  From your own record
                </span>
                {t.historyNote}
              </motion.div>
            )}
          </div>
        ))}
        <AnimatePresence>{typing && (
          <TypingBubble
            state="solving"
            label={[
              "Weighing the trade-offs",
              symbol ? `Checking your five on ${symbol}` : "Checking your five",
              "Putting it plainly",
            ]}
          />
        )}</AnimatePresence>
        {failed && (
          <button
            onClick={() => setFailed(false)}
            style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center", padding: 4 }}
          >
            Couldn't reach it. Ask again.
          </button>
        )}
      </div>

      {/* Two quiet exits — equal weight, neither is "primary". */}
      <div style={{ display: "flex", gap: 10, paddingTop: 10 }}>
        {[
          ["Leave it watching", "/watch"],
          ["See me after close", "/watch"],
        ].map(([label, to]) => (
          <motion.button
            key={label}
            whileTap={{ scale: pressScale }}
            transition={spring}
            onClick={() => exit(to)}
            style={{
              flex: 1,
              padding: "12px 10px",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
              color: "var(--ink-2)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {label}
          </motion.button>
        ))}
      </div>

      <div style={{ padding: "10px 0 8px" }}>
        <PromptBar value={input} onChange={setInput} onSend={() => send()} disabled={typing} />
      </div>

    </Screen>
  );
}

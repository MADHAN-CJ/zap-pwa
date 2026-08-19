import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { IconArrowUp } from "@tabler/icons-react";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { ChatBubble, TypingBubble } from "@/components/ChatBubble";
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
      else setStatus(d.watch.status);
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

  if (missing) return <Navigate to="/watch" replace />;

  async function send() {
    const question = input.trim();
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
                  borderLeft: "3px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                }}
              >
                From your own record: {t.historyNote}
              </motion.div>
            )}
          </div>
        ))}
        <AnimatePresence>{typing && <TypingBubble />}</AnimatePresence>
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
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {label}
          </motion.button>
        ))}
      </div>

      {/* Input bar — end of the flex column. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0 8px" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the position…"
          enterKeyHint="send"
          style={{
            flex: 1,
            fontSize: 16, // >= 16 — prevents iOS zoom
            padding: "12px 16px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: pressScale }}
          transition={spring}
          disabled={!input.trim() || typing}
          aria-label="Send"
          style={{
            width: 44,
            height: 44,
            borderRadius: "var(--radius-full)",
            background: "var(--brand)",
            color: "var(--brand-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: !input.trim() || typing ? 0.4 : 1,
          }}
        >
          <IconArrowUp size={20} stroke={2.4} />
        </motion.button>
      </form>
    </Screen>
  );
}

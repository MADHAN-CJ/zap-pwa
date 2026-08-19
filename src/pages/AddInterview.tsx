import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { IconArrowUp } from "@tabler/icons-react";
import { Screen } from "@/components/Screen";
import { ChatBubble, MessageActions, TypingBubble } from "@/components/ChatBubble";
import { interviewTurn, retryInterviewTurn } from "@/api/watch";
import { pressScale, spring, springSoft } from "@/lib/motion";
import { selectHaptic, tapHaptic } from "@/lib/haptics";
import * as addFlow from "@/store/addFlow";
import type { InterviewTurn, Mood } from "@/types";

const MOODS: Mood[] = ["Uneasy", "Comfortable", "Confident", "A bit greedy"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function AddInterview() {
  const nav = useNavigate();
  const watchId = addFlow.getWatchId();
  const position = addFlow.getPosition();

  const [thread, setThread] = useState<InterviewTurn[]>(addFlow.getTranscript());
  const [typing, setTyping] = useState(false);
  const [expectsMood, setExpectsMood] = useState(!!addFlow.getLastStep()?.expectsMood);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, typing]);

  // Deep-link / refresh with no flow in progress → back to Pick.
  if (!watchId || !position) return <Navigate to="/watch/new" replace />;

  function push(turn: InterviewTurn) {
    setThread((prev) => {
      const next = [...prev, turn];
      addFlow.setTranscript(next);
      return next;
    });
  }

  async function send(text: string) {
    const answer = text.trim();
    if (!answer || typing || !watchId) return;
    tapHaptic();
    setDraft("");
    push({ role: "trader", text: answer });
    setTyping(true);
    try {
      const step = await interviewTurn(watchId, answer);
      addFlow.setLastStep(step);
      setTyping(false);
      // Multiple agent turns per question (PRD edge case) — each its own bubble.
      for (let i = 0; i < step.agentMessages.length; i++) {
        if (i > 0) await sleep(450);
        push({ role: "agent", text: step.agentMessages[i] });
      }
      if (step.expectsMood) setExpectsMood(true);
      if (step.done) setTimeout(() => nav("/watch/new/confirm"), 700);
    } catch {
      setTyping(false);
      push({ role: "agent", text: "That didn't go through. Mind saying it again?" });
    }
  }

  /** Regenerate the agent's last reply: strip trailing agent bubbles back to
   *  the trader's last answer, then re-run that exchange. */
  async function retryLast() {
    if (typing || !watchId) return;
    let cut = thread.length;
    while (cut > 0 && thread[cut - 1].role === "agent") cut--;
    if (cut === 0 || cut === thread.length) return; // nothing to retry
    const answer = thread[cut - 1].text;
    const next = thread.slice(0, cut);
    setThread(next);
    addFlow.setTranscript(next);
    setTyping(true);
    try {
      const step = await retryInterviewTurn(watchId, answer);
      addFlow.setLastStep(step);
      setTyping(false);
      for (let i = 0; i < step.agentMessages.length; i++) {
        if (i > 0) await sleep(450);
        push({ role: "agent", text: step.agentMessages[i] });
      }
      setExpectsMood(!!step.expectsMood);
      if (step.done) setTimeout(() => nav("/watch/new/confirm"), 700);
    } catch {
      setTyping(false);
      push({ role: "agent", text: "That didn't go through. Mind saying it again?" });
    }
  }

  const lastAgentIdx = (() => {
    let cut = thread.length;
    while (cut > 0 && thread[cut - 1].role === "agent") cut--;
    return cut < thread.length && cut > 0 ? thread.length - 1 : -1;
  })();

  return (
    <Screen back="/watch/new" tag={position.symbol} padBottom={false}>
      {/* Screen's header is fixed-height (10px top pad + 56px header); capping the
          column at the remaining viewport keeps the thread scrolling internally and
          the input bar pinned in normal flow (iOS keyboard pushes it up). */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100dvh - var(--safe-top) - var(--safe-bottom) - 66px)",
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "6px 0 10px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {thread.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                alignItems: t.role === "agent" ? "flex-start" : "flex-end",
              }}
            >
              <ChatBubble role={t.role}>{t.text}</ChatBubble>
              {t.role === "agent" && !typing && (
                <MessageActions
                  text={t.text}
                  onRetry={i === lastAgentIdx ? retryLast : undefined}
                />
              )}
            </div>
          ))}
          <AnimatePresence>{typing && (
            <TypingBubble
              state="listening"
              label={["Reading your answer", `Thinking about ${position.symbol}`, "Working out what to ask next"]}
            />
          )}</AnimatePresence>
          <div ref={endRef} />
        </div>

        {expectsMood ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "10px 0 8px" }}>
            {MOODS.map((m, i) => (
              <motion.button
                key={m}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...spring, delay: i * 0.06 }}
                whileTap={{ scale: pressScale }}
                disabled={typing}
                onClick={() => {
                  selectHaptic();
                  send(m);
                }}
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "11px 16px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--surface)",
                  boxShadow: "var(--shadow)",
                  color: "var(--ink)",
                }}
              >
                {m}
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSoft}
            style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0 8px" }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(draft)}
              enterKeyHint="send"
              placeholder="Type your answer…"
              style={{
                flex: 1,
                fontSize: 16, // >= 16px — prevents iOS focus zoom
                padding: "12px 16px",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
            <motion.button
              whileTap={{ scale: pressScale }}
              transition={spring}
              onClick={() => send(draft)}
              disabled={!draft.trim() || typing}
              aria-label="Send"
              animate={{ opacity: !draft.trim() || typing ? 0.45 : 1 }}
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
              }}
            >
              <IconArrowUp size={20} stroke={2.4} />
            </motion.button>
          </motion.div>
        )}
      </div>
    </Screen>
  );
}

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { IconCopy, IconCheck, IconRefresh } from "@tabler/icons-react";
import { ThinkingOrb } from "thinking-orbs";
import { spring, springSoft, pressScale } from "@/lib/motion";
import { selectHaptic } from "@/lib/haptics";

/** The one chat message — Interview and Ask both use this.
 *  AI-chatbot convention: the trader gets a bubble; the agent's reply is
 *  plain full-width text on the page, no speech-bubble chrome. */
export function ChatBubble({
  role,
  children,
}: {
  role: "agent" | "trader";
  children: ReactNode;
}) {
  const isAgent = role === "agent";
  if (isAgent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSoft}
        style={{
          alignSelf: "stretch",
          padding: "2px 4px",
          color: "var(--ink)",
          fontSize: 15,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          userSelect: "text",
          WebkitUserSelect: "text",
        }}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springSoft}
      style={{
        alignSelf: "flex-end",
        maxWidth: "82%",
        padding: "10px 14px",
        borderRadius: 18,
        borderBottomRightRadius: 6,
        background: "var(--brand)",
        color: "var(--brand-ink)",
        fontSize: 15,
        lineHeight: 1.45,
        whiteSpace: "pre-wrap",
        transformOrigin: "bottom right",
        userSelect: "text",
        WebkitUserSelect: "text",
      }}
    >
      {children}
    </motion.div>
  );
}

/** Claude-style actions under an agent bubble: copy, and optionally retry. */
export function MessageActions({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    selectHaptic();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // iOS fallback: clipboard API can fail outside a secure context.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const btn: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 500,
    color: "var(--ink-3)",
    padding: "4px 8px",
    borderRadius: "var(--radius-full)",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...springSoft, delay: 0.25 }}
      style={{ display: "flex", gap: 2, alignSelf: "flex-start", marginTop: -2, marginLeft: -4 }}
    >
      <motion.button whileTap={{ scale: pressScale }} transition={spring} onClick={copy} aria-label="Copy" style={btn}>
        <AnimatePresence mode="popLayout" initial={false}>
          {copied ? (
            <motion.span
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={spring}
              style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--brand)" }}
            >
              <IconCheck size={14} stroke={2.2} /> Copied
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={spring}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <IconCopy size={14} stroke={2} /> Copy
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      {onRetry && (
        <motion.button
          whileTap={{ scale: pressScale }}
          transition={spring}
          onClick={() => {
            selectHaptic();
            onRetry();
          }}
          aria-label="Retry"
          style={btn}
        >
          <IconRefresh size={14} stroke={2} /> Retry
        </motion.button>
      )}
    </motion.div>
  );
}

/** AI-primitive thinking indicator: bare orb + shimmer label + elapsed time.
 *  Deliberately NO bubble chrome — thinking is a process, not a message. */
export function TypingBubble({
  state = "working",
  label = "Thinking",
}: {
  state?: "working" | "listening" | "solving" | "weaving" | "composing";
  /** Contextual status line(s). An array cycles every ~2.4s ("Reading your
   *  answer" → "Working out what to ask next") so long waits stay honest. */
  label?: string | string[];
}) {
  const labels = Array.isArray(label) ? label : [label];
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const t = setInterval(() => setElapsed((performance.now() - started) / 1000), 100);
    return () => clearInterval(t);
  }, []);
  const current = labels[Math.min(Math.floor(elapsed / 2.4), labels.length - 1)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={springSoft}
      style={{
        alignSelf: "flex-start",
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "6px 4px",
      }}
    >
      <ThinkingOrb state={state} size={20} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={current}
          className="shimmer"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={springSoft}
          style={{ fontSize: 13, fontWeight: 500 }}
        >
          {current}
        </motion.span>
      </AnimatePresence>
      <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
        {elapsed.toFixed(1)}s
      </span>
    </motion.div>
  );
}

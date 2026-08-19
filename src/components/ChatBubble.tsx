import { motion, AnimatePresence } from "motion/react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { IconCopy, IconCheck, IconRefresh } from "@tabler/icons-react";
import { ThinkingOrb } from "thinking-orbs";
import { spring, springSoft, pressScale } from "@/lib/motion";
import { selectHaptic } from "@/lib/haptics";

/** The one chat bubble — Interview and Ask both use this. */
export function ChatBubble({
  role,
  children,
}: {
  role: "agent" | "trader";
  children: ReactNode;
}) {
  const isAgent = role === "agent";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springSoft}
      style={{
        alignSelf: isAgent ? "flex-start" : "flex-end",
        maxWidth: "82%",
        padding: "10px 14px",
        borderRadius: 18,
        borderBottomLeftRadius: isAgent ? 6 : 18,
        borderBottomRightRadius: isAgent ? 18 : 6,
        background: isAgent ? "var(--surface)" : "var(--brand)",
        color: isAgent ? "var(--ink)" : "var(--brand-ink)",
        boxShadow: isAgent ? "var(--shadow)" : "none",
        fontSize: 15,
        lineHeight: 1.45,
        whiteSpace: "pre-wrap",
        transformOrigin: isAgent ? "bottom left" : "bottom right",
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
    fontSize: 12,
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
      style={{ display: "flex", gap: 2, alignSelf: "flex-start", marginTop: -2, marginLeft: 6 }}
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

/** Thinking indicator: a thought-orb in the agent's bubble chrome.
 *  state maps to what the agent is actually doing (thinking-orbs verbs). */
export function TypingBubble({
  state = "working",
}: {
  state?: "working" | "listening" | "solving" | "weaving" | "composing";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={springSoft}
      style={{
        alignSelf: "flex-start",
        padding: "10px 14px",
        borderRadius: 18,
        borderBottomLeftRadius: 6,
        background: "var(--surface)",
        boxShadow: "var(--shadow)",
        display: "flex",
        alignItems: "center",
        transformOrigin: "bottom left",
      }}
    >
      <ThinkingOrb state={state} size={20} />
    </motion.div>
  );
}

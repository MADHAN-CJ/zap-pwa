import { motion } from "motion/react";
import { springSoft } from "@/lib/motion";
import type { ReactNode } from "react";

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
      }}
    >
      {children}
    </motion.div>
  );
}

/** Three-dot typing indicator, same bubble chrome as the agent. */
export function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={springSoft}
      style={{
        alignSelf: "flex-start",
        padding: "14px 16px",
        borderRadius: 18,
        borderBottomLeftRadius: 6,
        background: "var(--surface)",
        boxShadow: "var(--shadow)",
        display: "flex",
        gap: 4,
        transformOrigin: "bottom left",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          style={{ width: 6, height: 6, borderRadius: 999, background: "var(--ink-3)" }}
        />
      ))}
    </motion.div>
  );
}

import { motion, AnimatePresence } from "motion/react";
import { spring } from "@/lib/motion";
import type { WatchStatus } from "@/types";

const LABEL: Record<WatchStatus, string> = {
  holding: "holding",
  bending: "bending",
  flipped: "flipped",
};

/** The one status pill. Animates (scale-pop + crossfade) when status changes. */
export function StatusPill({ status, size = "md" }: { status: WatchStatus; size?: "sm" | "md" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: size === "sm" ? "3px 9px" : "4px 11px",
        borderRadius: "var(--radius-full)",
        background: `var(--${status}-soft)`,
        color: `var(--${status})`,
        fontSize: size === "sm" ? 12 : 13,
        fontWeight: 600,
        letterSpacing: 0.2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ y: 10, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -10, opacity: 0, scale: 0.9 }}
          transition={spring}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: "currentColor",
              flexShrink: 0,
            }}
          />
          {LABEL[status]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

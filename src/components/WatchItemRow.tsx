import { motion } from "motion/react";
import { IconBolt, IconCircleHalf2 } from "@tabler/icons-react";
import { springSoft } from "@/lib/motion";
import type { WatchItem } from "@/types";

/** Hard line vs signal — the two mechanisms, visibly different, everywhere
 *  (PRD §3.4). Tabler icons, not emoji. */
export function KindTag({ kind }: { kind: WatchItem["kind"] }) {
  const hard = kind === "hard";
  const Icon = hard ? IconBolt : IconCircleHalf2;
  return (
    <span
      title={hard ? "Hard line: checked tick-by-tick" : "Signal: checked on a 30-min pass"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.3,
        color: "var(--ink-2)",
        background: "var(--surface-2)",
        padding: "2px 8px",
        borderRadius: "var(--radius-full)",
        flexShrink: 0,
      }}
    >
      <Icon size={12} stroke={2.2} />
      {hard ? "hard line" : "signal"}
    </span>
  );
}

/** The one watch-item row — Confirm and Flipped both use this.
 *  showState renders the holding/gone chip (Flipped screen). */
export function WatchItemRow({
  item,
  showState = false,
  index = 0,
}: {
  item: WatchItem;
  showState?: boolean;
  index?: number;
}) {
  const gone = item.state === "gone";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay: index * 0.05 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        background: "var(--surface)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.35,
            color: showState && gone ? "var(--flipped)" : "var(--ink)",
            fontWeight: showState && gone ? 600 : 400,
          }}
        >
          {item.label}
        </div>
        <div style={{ marginTop: 4 }}>
          <KindTag kind={item.kind} />
        </div>
      </div>
      {showState && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: gone ? "var(--flipped)" : "var(--holding)",
            background: gone ? "var(--flipped-soft)" : "var(--holding-soft)",
            padding: "3px 9px",
            borderRadius: "var(--radius-full)",
            flexShrink: 0,
          }}
        >
          {gone ? "gone" : "holding"}
        </span>
      )}
    </motion.div>
  );
}

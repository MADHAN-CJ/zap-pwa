import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { IconPlus } from "@tabler/icons-react";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { listWatches } from "@/api/watch";
import { spring, springSoft, pressScale } from "@/lib/motion";
import { confirmHaptic, tapHaptic } from "@/lib/haptics";
import type { Watch, WatchStatus } from "@/types";

const URGENCY: Record<WatchStatus, number> = { flipped: 0, bending: 1, holding: 2 };

function sortWatches(ws: Watch[]): Watch[] {
  return [...ws].sort(
    (a, b) =>
      URGENCY[a.status] - URGENCY[b.status] ||
      Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

function SkeletonRow({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0.35 }}
      animate={{ opacity: [0.35, 0.7, 0.35] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay }}
      style={{
        background: "var(--surface)",
        borderRadius: "var(--radius)",
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ width: 110, height: 16, borderRadius: 6, background: "var(--surface-2)" }} />
        <div style={{ width: 64, height: 22, borderRadius: 999, background: "var(--surface-2)" }} />
      </div>
      <div style={{ width: 160, height: 12, borderRadius: 6, background: "var(--surface-2)" }} />
    </motion.div>
  );
}

export default function Home() {
  const nav = useNavigate();
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setWatches(null);
    listWatches()
      .then((ws) => setWatches(sortWatches(ws)))
      .catch(() => setError(true));
  }, []);

  useEffect(load, [load]);

  const empty = watches !== null && watches.length === 0;

  return (
    <Screen title="Home">
      <motion.button
        whileTap={{ scale: pressScale }}
        transition={spring}
        onClick={() => {
          confirmHaptic();
          nav("/watch/new");
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          padding: "16px 20px",
          borderRadius: "var(--radius)",
          background: "var(--brand)",
          color: "var(--brand-ink)",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: -0.2,
          boxShadow: "var(--shadow)",
        }}
      >
        <IconPlus size={19} stroke={2.4} />
        Watch a new position
      </motion.button>

      {error && (
        <button
          onClick={load}
          style={{
            marginTop: 28,
            fontSize: 14,
            color: "var(--ink-2)",
            textAlign: "center",
            padding: 12,
          }}
        >
          Couldn't reach the watcher. Tap to retry.
        </button>
      )}

      {!error && empty && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSoft}
          style={{
            marginTop: 28,
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--ink-3)",
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          Nothing being watched yet. Pick the trade that's on your mind.
        </motion.p>
      )}

      {!error && !empty && (
        <>
          <div
            style={{
              margin: "28px 2px 12px",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.3,
              color: "var(--ink-3)",
              textTransform: "uppercase",
            }}
          >
            Watching{watches ? ` · ${watches.length}` : ""}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {watches === null
              ? [0, 1, 2].map((i) => <SkeletonRow key={i} delay={i * 0.15} />)
              : watches.map((w, i) => (
                  <motion.button
                    key={w.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springSoft, delay: i * 0.06 }}
                    whileTap={{ scale: pressScale }}
                    onClick={() => {
                      tapHaptic();
                      nav(`/watch/${w.id}`);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "stretch",
                      gap: 8,
                      textAlign: "left",
                      background: "var(--surface)",
                      borderRadius: "var(--radius)",
                      padding: "16px",
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 17,
                          fontWeight: 600,
                          letterSpacing: -0.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {w.symbol}
                      </span>
                      <StatusPill status={w.status} size="sm" />
                    </div>
                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{w.lastUpdateText}</span>
                  </motion.button>
                ))}
          </div>
        </>
      )}
    </Screen>
  );
}

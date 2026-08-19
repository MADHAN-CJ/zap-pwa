import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Screen } from "@/components/Screen";
import { getDigest } from "@/api/watch";
import { springSoft } from "@/lib/motion";
import type { DigestEntry } from "@/types";

const dateTag = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function Digest() {
  const [entries, setEntries] = useState<DigestEntry[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setEntries(null);
    getDigest()
      .then(setEntries)
      .catch(() => setError(true));
  }, []);

  useEffect(load, [load]);

  return (
    <Screen title="Digest" tag={dateTag}>
      {error && (
        <button
          onClick={load}
          style={{
            marginTop: 24,
            fontSize: 14,
            color: "var(--ink-2)",
            textAlign: "center",
            padding: 12,
          }}
        >
          Couldn't reach the watcher. Tap to retry.
        </button>
      )}

      {!error && entries !== null && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {entries.map((e, i) =>
              e.paragraph ? (
                <motion.article
                  key={e.watchId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springSoft, delay: i * 0.08 }}
                  style={{
                    background: "var(--surface)",
                    borderRadius: "var(--radius)",
                    boxShadow: "var(--shadow)",
                    padding: "18px 18px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ink-2)",
                        background: "var(--surface-2)",
                        padding: "3px 9px",
                        borderRadius: "var(--radius-full)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.symbol}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>
                      {e.headline}
                    </span>
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}>
                    {e.paragraph}
                  </p>
                  {e.prompts.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          letterSpacing: 0.3,
                          color: "var(--ink-3)",
                        }}
                      >
                        worth thinking about tonight
                      </span>
                      {e.prompts.map((p, j) => (
                        <div
                          key={j}
                          style={{
                            display: "flex",
                            gap: 9,
                            alignItems: "baseline",
                            fontSize: 14,
                            lineHeight: 1.5,
                            color: "var(--ink-2)",
                          }}
                        >
                          <span
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: 999,
                              background: "var(--ink-3)",
                              flexShrink: 0,
                              alignSelf: "center",
                            }}
                          />
                          <span style={{ flex: 1 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.article>
              ) : (
                <motion.p
                  key={e.watchId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springSoft, delay: i * 0.08 }}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "var(--ink-2)",
                    padding: "4px 4px",
                  }}
                >
                  {e.symbol} — {e.quietLine ?? "Quiet day. Nothing on your five moved."}
                </motion.p>
              )
            )}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...springSoft, delay: entries.length * 0.08 + 0.15 }}
            style={{
              marginTop: 56,
              textAlign: "center",
              fontSize: 14,
              color: "var(--ink-3)",
            }}
          >
            Nothing else needs you tonight.
          </motion.p>
        </>
      )}
    </Screen>
  );
}

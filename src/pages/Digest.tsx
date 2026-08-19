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
                    padding: "20px 20px 18px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Overline: symbol, quiet and technical */}
                  <span
                    className="mono"
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      color: "var(--ink-3)",
                    }}
                  >
                    {e.symbol}
                  </span>
                  {/* Headline: the scannable takeaway */}
                  <h2
                    style={{
                      fontSize: 19,
                      fontWeight: 700,
                      letterSpacing: -0.4,
                      lineHeight: 1.25,
                      marginTop: 6,
                      color: "var(--ink)",
                    }}
                  >
                    {e.headline}
                  </h2>
                  {/* The evening read: serif, loose leading, editorial */}
                  <p
                    style={{
                      fontFamily: "ui-serif, 'New York', Georgia, serif",
                      fontSize: 16,
                      lineHeight: 1.7,
                      marginTop: 10,
                      color: "var(--ink)",
                    }}
                  >
                    {e.paragraph}
                  </p>
                  {e.prompts.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        marginTop: 16,
                        paddingTop: 14,
                        borderTop: "1px solid var(--line)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          color: "var(--ink-3)",
                        }}
                      >
                        Worth thinking about tonight
                      </span>
                      {e.prompts.map((p, j) => (
                        <div
                          key={j}
                          style={{
                            display: "flex",
                            gap: 10,
                            fontSize: 14,
                            lineHeight: 1.55,
                            color: "var(--ink-2)",
                          }}
                        >
                          <span
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: 999,
                              background: "var(--bending)",
                              flexShrink: 0,
                              marginTop: 8,
                            }}
                          />
                          <span style={{ flex: 1 }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.article>
              ) : (
                <motion.div
                  key={e.watchId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springSoft, delay: i * 0.08 }}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    padding: "6px 4px",
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      color: "var(--ink-3)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.symbol}
                  </span>
                  <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink-3)" }}>
                    {e.quietLine ?? "Quiet day. Nothing on your five moved."}
                  </span>
                </motion.div>
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

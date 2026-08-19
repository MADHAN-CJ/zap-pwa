import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { getFeed, getWatch } from "@/api/watch";
import { springSoft, spring, pressScale } from "@/lib/motion";
import { tapHaptic } from "@/lib/haptics";
import type { FeedEntry, Watch, WatchItem } from "@/types";

type Data = { watch: Watch; items: WatchItem[]; feed: FeedEntry[] };

/** /watch/:id — Timeline normally; Flipped state when status === "flipped". */
export default function WatchDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "error" | "missing" | "ready">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [d, feed] = await Promise.all([getWatch(id), getFeed(id)]);
      if (!d) {
        setState("missing");
        return;
      }
      setData({ watch: d.watch, items: d.items, feed });
      setState("ready");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "missing") return <Navigate to="/watch" replace />;

  if (state === "loading" || state === "error" || !data) {
    return (
      <Screen back="/watch">
        {state === "error" ? (
          <button
            onClick={load}
            style={{
              marginTop: 32,
              fontSize: 13,
              color: "var(--ink-3)",
              textAlign: "center",
            }}
          >
            Couldn't reach it. Tap to retry.
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            {[64, 44, 44].map((h, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                style={{ height: h, borderRadius: "var(--radius-sm)", background: "var(--surface-2)" }}
              />
            ))}
          </div>
        )}
      </Screen>
    );
  }

  const { watch, items, feed } = data;

  // ---------- Flipped state ----------
  if (watch.status === "flipped") {
    const gone = items.filter((i) => i.state === "gone").length;
    return (
      <Screen back="/watch" tag={`${gone} of ${items.length} flipped`}>
        {watch.priceLine && (
          <div
            className="mono"
            style={{ fontSize: 13, color: "var(--ink-2)", padding: "0 2px 14px" }}
          >
            {watch.priceLine}
          </div>
        )}

        {watch.changeSummary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSoft}
            style={{ marginBottom: 20 }}
          >
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow)",
                padding: "16px 18px",
              }}
            >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: "var(--flipped)",
                marginBottom: 8,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--flipped)" }} />
              What changed
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}>
              {watch.changeSummary}
            </p>
            </div>
          </motion.div>
        )}

        {/* All five — what's gone AND what still holds (PRD §5).
            One grouped record card, hairline dividers, no per-item boxes. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSoft, delay: 0.08 }}
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow)",
            overflow: "hidden",
          }}
        >
          {items.map((item, i) => {
            const gone = item.state === "gone";
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 16px",
                  borderTop: i > 0 ? "1px solid var(--line)" : "none",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    flexShrink: 0,
                    background: gone ? "var(--flipped)" : "transparent",
                    border: gone ? "none" : "2px solid var(--holding)",
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 15,
                    lineHeight: 1.35,
                    fontWeight: gone ? 600 : 400,
                    color: gone ? "var(--flipped)" : "var(--ink)",
                  }}
                >
                  {item.label}{" "}
                  <span style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                    {item.kind === "hard" ? "⚡" : "◐"}
                  </span>
                </span>
                <span
                  style={{
                    textAlign: "right",
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: gone ? "var(--flipped)" : "var(--holding)",
                    }}
                  >
                    {gone ? "gone" : "holding"}
                  </span>
                  {item.lastCheckedAt && (
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {item.lastCheckedAt}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </motion.div>

        <motion.button
          whileTap={{ scale: pressScale }}
          transition={spring}
          onClick={() => {
            tapHaptic();
            nav(`/watch/${id}/ask`);
          }}
          style={{
            marginTop: 24,
            padding: "14px 18px",
            borderRadius: "var(--radius-full)",
            background: "var(--surface-2)",
            border: "1px solid var(--line-strong)",
            color: "var(--ink-3)",
            fontSize: 15,
            textAlign: "left",
          }}
        >
          Ask it anything about the position…
        </motion.button>
      </Screen>
    );
  }

  // ---------- Timeline state ----------
  return (
    <Screen
      back="/watch"
      tag={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {watch.symbol}
          <StatusPill status={watch.status} size="sm" />
        </span>
      }
    >
      {/* Timeline: continuous rail, a node per entry, time on the node. */}
      <div style={{ display: "flex", flexDirection: "column", paddingTop: 4 }}>
        {feed.map((e, i) => {
          const real = e.weight === "real";
          const last = i === feed.length - 1;
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSoft, delay: i * 0.05 }}
              style={{ display: "flex", gap: 14 }}
            >
              {/* Rail column */}
              <div style={{ width: 12, position: "relative", flexShrink: 0 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 5,
                    top: i === 0 ? 8 : 0,
                    bottom: last ? "auto" : 0,
                    height: last ? 8 : undefined,
                    width: 2,
                    background: "var(--line-strong)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: real ? 1 : 2,
                    top: real ? 3 : 4,
                    width: real ? 10 : 8,
                    height: real ? 10 : 8,
                    borderRadius: 999,
                    background: real ? "var(--bending)" : "var(--bg)",
                    border: real ? "2px solid var(--bg)" : "2px solid var(--line-strong)",
                    boxShadow: real ? "0 0 0 1px var(--bending)" : "none",
                  }}
                />
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 20 }}>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5, marginTop: 1 }}
                >
                  {e.timestamp}
                </div>
                {real ? (
                  <div
                    style={{
                      background: "var(--surface)",
                      borderRadius: "var(--radius-sm)",
                      boxShadow: "var(--shadow)",
                      padding: "11px 13px",
                      fontSize: 15,
                      lineHeight: 1.5,
                      color: "var(--ink)",
                    }}
                  >
                    {e.text}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink-3)" }}>
                    {e.text}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p
        style={{
          marginTop: 28,
          fontSize: 13,
          lineHeight: 1.4,
          color: "var(--ink-3)",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        It stays quiet. You'll hear from it when one of your five flips.
      </p>
    </Screen>
  );
}

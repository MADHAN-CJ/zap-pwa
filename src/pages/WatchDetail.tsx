import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Screen } from "@/components/Screen";
import { StatusPill } from "@/components/StatusPill";
import { WatchItemRow } from "@/components/WatchItemRow";
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
              fontSize: 14,
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
            style={{ fontSize: 13.5, color: "var(--ink-2)", padding: "0 2px 14px" }}
          >
            {watch.priceLine}
          </div>
        )}

        {watch.changeSummary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSoft}
            style={{
              background: "var(--surface)",
              borderLeft: "3px solid var(--flipped)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow)",
              padding: "14px 16px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: "var(--ink-3)",
                marginBottom: 6,
              }}
            >
              What changed
            </div>
            <p style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ink)" }}>
              {watch.changeSummary}
            </p>
          </motion.div>
        )}

        {/* All five — what's gone AND what still holds (PRD §5). */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, i) => (
            <WatchItemRow key={item.id} item={item} showState index={i} />
          ))}
        </div>

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
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {feed.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: i * 0.05 }}
            style={
              e.weight === "real"
                ? {
                    background: "var(--surface)",
                    borderRadius: "var(--radius-sm)",
                    boxShadow: "var(--shadow)",
                    padding: "12px 14px",
                  }
                : { padding: "8px 14px" }
            }
          >
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                marginBottom: e.weight === "real" ? 5 : 3,
              }}
            >
              {e.timestamp}
            </div>
            <div
              style={
                e.weight === "real"
                  ? { fontSize: 15, lineHeight: 1.45, color: "var(--ink)" }
                  : { fontSize: 13, lineHeight: 1.4, color: "var(--ink-3)" }
              }
            >
              {e.text}
            </div>
          </motion.div>
        ))}
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

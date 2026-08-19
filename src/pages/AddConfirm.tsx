import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { Screen } from "@/components/Screen";
import { ThinkingOrb } from "thinking-orbs";
import { WatchItemRow } from "@/components/WatchItemRow";
import { getSynthesis, patchWatchItems, startWatch } from "@/api/watch";
import { pressScale, spring, springSoft } from "@/lib/motion";
import { confirmHaptic, tapHaptic } from "@/lib/haptics";
import * as addFlow from "@/store/addFlow";
import type { WatchItem } from "@/types";

const editInputStyle: CSSProperties = {
  width: "100%",
  fontSize: 16, // >= 16px — prevents iOS focus zoom
  padding: "14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--brand)",
  background: "var(--surface)",
  color: "var(--ink)",
  outline: "none",
  boxShadow: "var(--shadow)",
};

export default function AddConfirm() {
  const nav = useNavigate();
  const watchId = addFlow.getWatchId();

  const [thesis, setThesis] = useState<string | null>(null);
  const [items, setItems] = useState<WatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState("");
  const [ready, setReady] = useState(false); // CTA gated on the five rows landing
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!watchId) return;
    let live = true;
    (async () => {
      try {
        const s = addFlow.getSynthesisDraft() ?? (await getSynthesis(watchId));
        if (!live) return;
        addFlow.setSynthesisDraft(s);
        setThesis(s.thesisLine);
        setItems(s.items);
        // Rows stagger in at index*0.05 with springSoft; enable once the 5th settles.
        setTimeout(() => live && setReady(true), 1100);
      } catch {
        if (live) setError("Couldn't build the watch-list. Go back and try again.");
      }
    })();
    return () => {
      live = false;
    };
  }, [watchId]);

  if (!watchId) return <Navigate to="/watch/new" replace />;

  function commit(next: WatchItem[]) {
    setItems(next);
    const s = addFlow.getSynthesisDraft();
    if (s) addFlow.setSynthesisDraft({ ...s, items: next });
    patchWatchItems(watchId!, next).catch(() => {
      /* edit stays local; retried on next patch */
    });
  }

  function commitLabel(id: string, label: string) {
    setEditingId(null);
    const clean = label.trim();
    if (!clean) return; // empty edit → keep the old label
    commit(items.map((it) => (it.id === id ? { ...it, label: clean } : it)));
  }

  function addItem() {
    const label = addDraft.trim();
    if (!label) return;
    tapHaptic();
    setAddDraft("");
    setAddOpen(false);
    // TODO(PRD §5 open question): auto-classify ⚡/◐ vs trader picks — defaulting
    // new freeform items to "signal" until that's decided.
    commit([
      ...items,
      { id: `local-${Date.now()}`, watchId: watchId!, kind: "signal", label, state: "holding" },
    ]);
  }

  async function onStart() {
    if (!ready || starting) return;
    confirmHaptic();
    setStarting(true);
    try {
      await startWatch(watchId!);
      addFlow.clearAddFlow();
      nav("/watch"); // Home is the hub — never the detail screen (PRD §5)
    } catch {
      setStarting(false);
      setError("Couldn't start watching. Try again.");
    }
  }

  const loading = !thesis && !error;

  return (
    <Screen back="/watch/new/interview" tag="confirm">
      {loading && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            paddingTop: 64,
          }}
        >
          <ThinkingOrb state="weaving" size={64} />
          <p className="shimmer" style={{ fontSize: 13, fontWeight: 500, textAlign: "center" }}>
            Turning that into five things it can watch…
          </p>
        </div>
      )}

      {error && <p style={{ fontSize: 13, color: "var(--flipped)", paddingTop: 8 }}>{error}</p>}

      {thesis && (
        <>
          <motion.blockquote
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSoft}
            style={{
              fontSize: 15,
              lineHeight: 1.5,
              color: "var(--ink-2)",
              fontStyle: "italic",
              background: "var(--surface-2)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 14px",
              margin: "4px 0 18px",
            }}
          >
            “{thesis}”
          </motion.blockquote>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((it, i) =>
              editingId === it.id ? (
                <input
                  key={it.id}
                  autoFocus
                  defaultValue={it.label}
                  onBlur={(e) => commitLabel(it.id, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  enterKeyHint="done"
                  style={editInputStyle}
                />
              ) : (
                <button
                  key={it.id}
                  onClick={() => {
                    tapHaptic();
                    setEditingId(it.id);
                  }}
                  style={{ display: "block", width: "100%", textAlign: "left" }}
                >
                  <WatchItemRow item={it} index={i} />
                </button>
              )
            )}
          </div>

          {addOpen ? (
            <motion.input
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springSoft}
              autoFocus
              value={addDraft}
              onChange={(e) => setAddDraft(e.target.value)}
              onBlur={() => (addDraft.trim() ? addItem() : setAddOpen(false))}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              enterKeyHint="done"
              placeholder="What else should it watch?"
              style={{ ...editInputStyle, borderColor: "var(--line)", marginTop: 10 }}
            />
          ) : (
            <motion.button
              whileTap={{ scale: pressScale }}
              transition={spring}
              onClick={() => {
                tapHaptic();
                setAddOpen(true);
              }}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-2)",
                padding: "12px 2px",
                textAlign: "left",
              }}
            >
              + Add something else to watch
            </motion.button>
          )}

          <div style={{ flex: 1 }} />

          <motion.button
            whileTap={ready && !starting ? { scale: pressScale } : undefined}
            transition={spring}
            animate={{ opacity: ready ? 1 : 0.4 }}
            disabled={!ready || starting}
            onClick={onStart}
            style={{
              width: "100%",
              padding: "16px 0",
              marginTop: 18,
              borderRadius: "var(--radius)",
              background: "var(--brand)",
              color: "var(--brand-ink)",
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            {starting ? "Starting…" : "Start watching"}
          </motion.button>
        </>
      )}
    </Screen>
  );
}

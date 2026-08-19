import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import type { CSSProperties } from "react";
import { IconSearch } from "@tabler/icons-react";
import { Screen } from "@/components/Screen";
import { createWatch, searchInstruments } from "@/api/watch";
import { pressScale, spring, springSoft } from "@/lib/motion";
import { tapHaptic } from "@/lib/haptics";
import * as addFlow from "@/store/addFlow";
import type { PositionRef } from "@/types";

const inputStyle: CSSProperties = {
  width: "100%",
  fontSize: 16, // >= 16px — prevents iOS focus zoom
  padding: "12px 14px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--surface)",
  color: "var(--ink)",
  outline: "none",
};

type Instrument = { symbol: string; name: string };

/** /watch/new — pick from the whole market (search or browse), then state
 *  your trade (side/qty/entry). Backend: GET /instruments/search?q=. */
export default function AddPick() {
  const nav = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Instrument[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Trade details, asked once an instrument is chosen.
  const [chosen, setChosen] = useState<string | null>(null);
  const [mSide, setMSide] = useState<"long" | "short">("long");
  const [mQty, setMQty] = useState("");
  const [mEntry, setMEntry] = useState("");
  const [mExpiry, setMExpiry] = useState("");

  // Market search, debounced. Empty query browses the default list.
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInstruments(query.trim())
        .then(setResults)
        .catch(() => setError("Couldn't load the market list."));
    }, query.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query]);

  async function start(pos: PositionRef) {
    if (busy) return;
    tapHaptic();
    setError(null);
    setBusy(true);
    addFlow.setPosition(pos);
    try {
      const { id, step } = await createWatch(pos);
      addFlow.setWatchId(id);
      addFlow.setTranscript(step.agentMessages.map((text) => ({ role: "agent" as const, text })));
      addFlow.setLastStep(step);
      nav("/watch/new/interview");
    } catch {
      setError("Couldn't start. Try again.");
      setBusy(false);
    }
  }

  const detailsValid = Number(mQty) > 0 && Number(mEntry) > 0;

  return (
    <Screen back="/watch" tag="market">
      <p style={{ fontSize: 17, lineHeight: 1.4, color: "var(--ink)", padding: "4px 0 18px" }}>
        Which one is on your mind?{" "}
        <span style={{ color: "var(--ink-2)" }}>Start with one. Add the others later.</span>
      </p>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <IconSearch
          size={17}
          stroke={2.2}
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-3)",
            pointerEvents: "none",
          }}
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setChosen(null);
          }}
          placeholder="Search any position in the market…"
          style={{ ...inputStyle, background: "var(--surface-2)", paddingLeft: 40 }}
        />
      </div>

      {error && <p style={{ fontSize: 13, color: "var(--flipped)", paddingBottom: 10 }}>{error}</p>}

      {!results && !error && (
        <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Loading the market…</p>
      )}

      {results?.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--ink-3)", padding: "4px 2px" }}>
          Nothing matches. Try the symbol name.
        </p>
      )}

      {/* Plain market rows — no pricing, no side. Those are stated after picking. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {results?.map((r, i) => (
          <div key={r.symbol}>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSoft, delay: i * 0.03 }}
              whileTap={{ scale: pressScale }}
              onClick={() => {
                tapHaptic();
                setChosen(chosen === r.symbol ? null : r.symbol);
              }}
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
                width: "100%",
                textAlign: "left",
                padding: "14px 16px",
                background: "var(--surface)",
                borderRadius: "var(--radius-sm)",
                boxShadow: chosen === r.symbol ? "0 0 0 1px var(--brand)" : "var(--shadow)",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600 }}>{r.symbol}</span>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--ink-3)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.name}
              </span>
            </motion.button>

            {/* Chosen → state the trade inline, right under the row. */}
            <AnimatePresence>
              {chosen === r.symbol && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springSoft}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      padding: "12px 2px 6px",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["long", "short"] as const).map((s) => (
                        <motion.button
                          key={s}
                          whileTap={{ scale: pressScale }}
                          transition={spring}
                          onClick={() => setMSide(s)}
                          style={{
                            flex: 1,
                            padding: "11px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 15,
                            fontWeight: 600,
                            background: mSide === s ? "var(--brand)" : "var(--surface)",
                            color: mSide === s ? "var(--brand-ink)" : "var(--ink-2)",
                            boxShadow: mSide === s ? "none" : "var(--shadow)",
                          }}
                        >
                          {s}
                        </motion.button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={mQty}
                        onChange={(e) => setMQty(e.target.value)}
                        inputMode="numeric"
                        placeholder="Qty"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input
                        value={mEntry}
                        onChange={(e) => setMEntry(e.target.value)}
                        inputMode="decimal"
                        placeholder="Entry price"
                        style={{ ...inputStyle, flex: 1.4 }}
                      />
                    </div>
                    <input
                      value={mExpiry}
                      onChange={(e) => setMExpiry(e.target.value)}
                      placeholder="Expiry (freeform is fine)"
                      style={inputStyle}
                    />
                    <motion.button
                      whileTap={detailsValid && !busy ? { scale: pressScale } : undefined}
                      transition={spring}
                      disabled={!detailsValid || busy}
                      animate={{ opacity: detailsValid && !busy ? 1 : 0.45 }}
                      onClick={() =>
                        start({
                          symbol: r.symbol,
                          side: mSide,
                          qty: Number(mQty),
                          entryPrice: Number(mEntry),
                          expiry: mExpiry.trim() || undefined,
                        })
                      }
                      style={{
                        padding: "13px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--brand)",
                        color: "var(--brand-ink)",
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      {busy ? "Starting…" : "Watch this"}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </Screen>
  );
}

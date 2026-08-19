import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import type { CSSProperties } from "react";
import { Screen } from "@/components/Screen";
import { IconSearch } from "@tabler/icons-react";
import { createWatch, listOpenPositions, searchInstruments } from "@/api/watch";
import { pressScale, spring, springSoft } from "@/lib/motion";
import { tapHaptic } from "@/lib/haptics";
import * as addFlow from "@/store/addFlow";
import type { PositionRef } from "@/types";

const fmtPnl = (pnl: number) =>
  `${pnl >= 0 ? "+" : "−"}₹${Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

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

export default function AddPick() {
  const nav = useNavigate();
  const [positions, setPositions] = useState<PositionRef[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // symbol of the card being started
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [mSymbol, setMSymbol] = useState("");
  const [mSide, setMSide] = useState<"long" | "short">("long");
  const [mQty, setMQty] = useState("");
  const [mEntry, setMEntry] = useState("");
  const [mExpiry, setMExpiry] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ symbol: string; name: string }[] | null>(null);

  // Market-wide instrument search, debounced. Backend: GET /instruments/search.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      searchInstruments(q)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let live = true;
    listOpenPositions()
      .then((p) => live && setPositions(p))
      .catch(() => live && setError("Couldn't load positions."));
    return () => {
      live = false;
    };
  }, []);

  async function start(pos: PositionRef) {
    if (busy) return;
    tapHaptic();
    setError(null);
    setBusy(pos.symbol);
    addFlow.setPosition(pos);
    try {
      const { id, step } = await createWatch(pos);
      addFlow.setWatchId(id);
      addFlow.setTranscript(step.agentMessages.map((text) => ({ role: "agent" as const, text })));
      addFlow.setLastStep(step);
      nav("/watch/new/interview");
    } catch {
      setError("Couldn't start. Try again.");
      setBusy(null);
    }
  }

  const manualValid = mSymbol.trim() && Number(mQty) > 0 && Number(mEntry) > 0;

  return (
    <Screen back="/watch" tag={positions ? `${positions.length} open` : "…"}>
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any position in the market…"
          style={{ ...inputStyle, background: "var(--surface-2)", paddingLeft: 40 }}
        />
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "var(--flipped)", paddingBottom: 10 }}>{error}</p>
      )}

      {/* Search results: market instruments. Picking one prefills manual entry
          (side/qty/entry are the trader's to state — it isn't a held position). */}
      {results !== null && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {results.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--ink-3)", padding: "4px 2px" }}>
              Nothing matches. Try the symbol name.
            </p>
          )}
          {results.map((r, i) => (
            <motion.button
              key={r.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSoft, delay: i * 0.03 }}
              whileTap={{ scale: pressScale }}
              onClick={() => {
                tapHaptic();
                setMSymbol(r.symbol);
                setManualOpen(true);
                setQuery("");
              }}
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
                textAlign: "left",
                padding: "12px 14px",
                background: "var(--surface)",
                borderRadius: "var(--radius-sm)",
                boxShadow: "var(--shadow)",
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
          ))}
        </div>
      )}

      {!positions && !error && results === null && (
        <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Loading positions…</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {results === null && positions?.map((p, i) => {
          const pressed = busy === p.symbol;
          return (
            <motion.button
              key={`${p.symbol}-${i}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: busy && !pressed ? 0.45 : 1, y: 0, scale: pressed ? 0.97 : 1 }}
              transition={{ ...springSoft, delay: busy ? 0 : i * 0.05 }}
              whileTap={{ scale: pressScale }}
              disabled={!!busy}
              onClick={() => start(p)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                padding: "14px 16px",
                background: "var(--surface)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
                  {p.symbol}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 3 }}>
                  {p.side} · {p.qty}
                  {p.expiry ? ` · ${p.expiry}` : ""}
                </div>
              </div>
              {pressed ? (
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  style={{ fontSize: 13, color: "var(--ink-2)", flexShrink: 0 }}
                >
                  starting…
                </motion.span>
              ) : (
                p.pnl !== undefined && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: p.pnl >= 0 ? "var(--buy)" : "var(--sell)",
                      flexShrink: 0,
                    }}
                  >
                    {fmtPnl(p.pnl)}
                  </span>
                )
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Secondary path: manual entry */}
      <div style={{ marginTop: 22 }}>
        <motion.button
          whileTap={{ scale: pressScale }}
          transition={spring}
          onClick={() => {
            tapHaptic();
            setManualOpen((v) => !v);
          }}
          style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", padding: "6px 2px" }}
        >
          {manualOpen ? "Never mind" : "Tell it about this trade"}
        </motion.button>

        <AnimatePresence initial={false}>
          {manualOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={springSoft}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "12px 2px 4px",
                }}
              >
                <input
                  value={mSymbol}
                  onChange={(e) => setMSymbol(e.target.value)}
                  placeholder="Symbol, e.g. NIFTY 24700 CE"
                  style={inputStyle}
                />
                {/* long / short segmented */}
                <div
                  style={{
                    display: "flex",
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-sm)",
                    padding: 3,
                    gap: 3,
                  }}
                >
                  {(["long", "short"] as const).map((s) => (
                    <motion.button
                      key={s}
                      whileTap={{ scale: pressScale }}
                      transition={spring}
                      onClick={() => {
                        tapHaptic();
                        setMSide(s);
                      }}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "9px 0",
                        borderRadius: 8,
                        color: mSide === s ? "var(--ink)" : "var(--ink-2)",
                        background: mSide === s ? "var(--surface)" : "transparent",
                        boxShadow: mSide === s ? "var(--shadow)" : "none",
                      }}
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={mQty}
                    onChange={(e) => setMQty(e.target.value)}
                    placeholder="Qty"
                    inputMode="numeric"
                    style={inputStyle}
                  />
                  <input
                    value={mEntry}
                    onChange={(e) => setMEntry(e.target.value)}
                    placeholder="Entry price"
                    inputMode="decimal"
                    style={inputStyle}
                  />
                </div>
                <input
                  value={mExpiry}
                  onChange={(e) => setMExpiry(e.target.value)}
                  placeholder="Expiry (freeform is fine)"
                  style={inputStyle}
                />
                <motion.button
                  whileTap={manualValid ? { scale: pressScale } : undefined}
                  transition={spring}
                  disabled={!manualValid || !!busy}
                  onClick={() =>
                    start({
                      symbol: mSymbol.trim(),
                      side: mSide,
                      qty: Number(mQty),
                      entryPrice: Number(mEntry),
                      expiry: mExpiry.trim() || undefined,
                    })
                  }
                  animate={{ opacity: manualValid && !busy ? 1 : 0.45 }}
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    padding: "13px 0",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface)",
                    boxShadow: "var(--shadow)",
                    color: "var(--ink)",
                  }}
                >
                  {busy === mSymbol.trim() ? "Starting…" : "Watch this trade"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Screen>
  );
}

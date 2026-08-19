import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { IconSearch } from "@tabler/icons-react";
import { Screen } from "@/components/Screen";
import { createWatch, searchInstruments } from "@/api/watch";
import { pressScale, springSoft } from "@/lib/motion";
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
          onChange={(e) => setQuery(e.target.value)}
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
              animate={{ opacity: busy ? 0.5 : 1, y: 0 }}
              transition={{ ...springSoft, delay: i * 0.03 }}
              whileTap={{ scale: pressScale }}
              onClick={() => start({ symbol: r.symbol })}
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


          </div>
        ))}
      </div>
    </Screen>
  );
}

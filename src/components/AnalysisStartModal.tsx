import { useEffect, useState } from "react";
import {
  AnalysisRun,
  PositionAnalysis,
  createAnalysis,
  listAnalyses,
  priorAnalysisRuns,
} from "@/api/analysis";
import { Spinner, useUI } from "@/components/ui";

// Start-analysis modal: shown from a position row. Loads previous analysis
// logs for the same security (if any), takes the user's instruction, and
// starts the tracker (first AI iteration runs server-side in the background).
export default function AnalysisStartModal({
  position,
  onClose,
  onStarted,
}: {
  position: { securityId: string; exchangeSegment: string; tradingSymbol: string };
  onClose: () => void;
  onStarted: () => void;
}) {
  const { toast } = useUI();
  const [instruction, setInstruction] = useState("");
  const [prior, setPrior] = useState<AnalysisRun[] | null>(null);
  const [loadingPrior, setLoadingPrior] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // An analysis already tracking this position (ACTIVE/PAUSED/ERROR) — blocks
  // the form up front instead of failing on submit.
  const [existing, setExisting] = useState<PositionAnalysis | null>(null);

  useEffect(() => {
    let alive = true;
    priorAnalysisRuns(position.securityId, position.exchangeSegment).then((res) => {
      if (!alive) return;
      setPrior(res.ok ? res.data.runs : []);
      setLoadingPrior(false);
    });
    listAnalyses().then((res) => {
      if (!alive || !res.ok) return;
      const live = res.data.analyses.find(
        (a) =>
          a.securityId === position.securityId &&
          a.exchangeSegment === position.exchangeSegment &&
          (a.status === "ACTIVE" || a.status === "PAUSED" || a.status === "ERROR")
      );
      if (live) setExisting(live);
    });
    return () => {
      alive = false;
    };
  }, [position.securityId, position.exchangeSegment]);

  const start = async () => {
    if (instruction.trim().length < 3) {
      toast("error", "Instruction needed", "Tell the AI what to watch for on this position.");
      return;
    }
    setSubmitting(true);
    const res = await createAnalysis({
      securityId: position.securityId,
      exchangeSegment: position.exchangeSegment,
      symbol: position.tradingSymbol,
      instruction: instruction.trim(),
    });
    setSubmitting(false);
    if (res.ok) {
      toast("success", "Analysis started", "First iteration is running — check the Analysis tab.");
      onStarted();
    } else {
      toast("error", "Could not start", res.description || res.error);
    }
  };

  // Already tracked → direct alert, no form.
  if (existing) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3 style={{ marginBottom: 14 }}>Already being analysed</h3>
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 10,
              border: "1px solid var(--red)",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            <strong style={{ color: "var(--red)", display: "block" }}>
              ⚠ {position.tradingSymbol} already has an {existing.status} analysis.
            </strong>
            <div className="dim" style={{ marginTop: 10 }}>
              <span style={{ fontWeight: 600 }}>Instruction:</span> {existing.instruction}
            </div>
          </div>
          <p className="dim" style={{ fontSize: 13, margin: "14px 2px 4px", lineHeight: 1.55 }}>
            Edit or stop it from the Analysis tab instead of starting a second one.
          </p>
          <div className="modal-actions" style={{ marginTop: 18 }}>
            <button className="btn secondary" onClick={onClose}>
              Close
            </button>
            <button className="btn" onClick={onStarted}>
              View analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "80vh", overflowY: "auto" }}>
        <h3>Analyse {position.tradingSymbol}</h3>
        <p className="dim" style={{ fontSize: 13 }}>
          The AI re-analyses this position every 30 minutes during market hours and emails you
          when it thinks you should act. It never places orders itself.
        </p>

        <textarea
          className="input"
          rows={4}
          placeholder='What should the AI analyse? e.g. "Watch theta decay and momentum — tell me when I should exit or book profit."'
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          style={{ resize: "vertical", minHeight: 90, width: "100%", marginTop: 8 }}
        />

        <div style={{ marginTop: 14 }}>
          <p className="card-title" style={{ marginBottom: 6 }}>
            Previous analysis logs
          </p>
          {loadingPrior ? (
            <Spinner />
          ) : !prior || prior.length === 0 ? (
            <p className="dim" style={{ fontSize: 13, margin: 0 }}>
              No previous analysis for this instrument.
            </p>
          ) : (
            prior.slice(0, 8).map((r) => (
              <div key={r.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border, #333)" }}>
                <div className="dim" style={{ fontSize: 12 }}>
                  {new Date(r.startedAt).toLocaleString()} · {r.actionType ?? r.status}
                  {r.actionRequired ? " · ⚠ action was flagged" : ""}
                </div>
                <div style={{ fontSize: 13, marginTop: 2, whiteSpace: "pre-wrap" }}>
                  {r.summary ?? r.error ?? "—"}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn" onClick={start} disabled={submitting}>
            {submitting ? <Spinner /> : "Start analysis"}
          </button>
        </div>
      </div>
    </div>
  );
}

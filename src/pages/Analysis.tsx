import { useCallback, useEffect, useState } from "react";
import {
  AnalysisRun,
  PositionAnalysis,
  getAnalysisRuns,
  listAnalyses,
  pauseAnalysis,
  resumeAnalysis,
  runAnalysisNow,
  stopAnalysis,
  updateAnalysisInstruction,
} from "@/api/analysis";
import { Spinner, useUI } from "@/components/ui";

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "ACTIVE", color: "var(--green)" },
  PAUSED: { label: "PAUSED", color: "var(--dim, #9ca3af)" },
  STOPPED: { label: "STOPPED", color: "var(--dim, #9ca3af)" },
  POSITION_CLOSED: { label: "POSITION CLOSED", color: "var(--dim, #9ca3af)" },
  ERROR: { label: "NEEDS ATTENTION", color: "var(--red)" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { label: status, color: "var(--dim, #9ca3af)" };
  return (
    <span className="badge" style={{ color: s.color, borderColor: s.color }}>
      {s.label}
    </span>
  );
}

function RunItem({ run }: { run: AnalysisRun }) {
  const flagged = !!run.actionRequired && run.actionType !== "HOLD";
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--border, #2a2a2a)" }}>
      <div className="row-between">
        <span className="dim" style={{ fontSize: 12 }}>
          {new Date(run.startedAt).toLocaleString()}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color:
              run.status === "FAILED"
                ? "var(--red)"
                : flagged
                  ? "var(--red)"
                  : "var(--green)",
          }}
        >
          {run.status === "RUNNING"
            ? "RUNNING…"
            : run.status === "FAILED"
              ? "FAILED"
              : `${run.actionType ?? "—"}${run.confidence ? ` · ${run.confidence}` : ""}`}
        </span>
      </div>
      {flagged && run.actionReason && (
        <div
          style={{
            marginTop: 6,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--red)",
            fontSize: 13,
          }}
        >
          <strong style={{ color: "var(--red)" }}>⚠ {run.actionType}:</strong> {run.actionReason}
          {run.alertSentAt ? (
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
              Email alert sent
            </div>
          ) : null}
        </div>
      )}
      <div style={{ fontSize: 13, marginTop: 6, whiteSpace: "pre-wrap" }}>
        {run.summary ?? run.error ?? (run.status === "RUNNING" ? "Analysing…" : "—")}
      </div>
      {run.notes && (
        <details style={{ marginTop: 4 }}>
          <summary className="dim" style={{ fontSize: 12, cursor: "pointer" }}>
            Details
          </summary>
          <div className="dim" style={{ fontSize: 12, marginTop: 4, whiteSpace: "pre-wrap" }}>
            {run.notes}
          </div>
        </details>
      )}
    </div>
  );
}

function AnalysisCard({
  analysis,
  onChanged,
}: {
  analysis: PositionAnalysis;
  onChanged: () => void;
}) {
  const { toast, confirm } = useUI();
  const [expanded, setExpanded] = useState(false);
  const [runs, setRuns] = useState<AnalysisRun[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftInstruction, setDraftInstruction] = useState(analysis.instruction);

  const loadRuns = useCallback(async () => {
    const res = await getAnalysisRuns(analysis.id);
    if (res.ok) setRuns(res.data.runs);
  }, [analysis.id]);

  // While the log is open, keep it live — a run in progress flips to its
  // verdict without collapsing/reopening or reloading the page.
  useEffect(() => {
    if (!expanded) return;
    loadRuns();
    const t = setInterval(loadRuns, 5000);
    return () => clearInterval(t);
  }, [expanded, loadRuns]);

  const act = async (label: string, fn: () => Promise<{ ok: boolean; [k: string]: any }>) => {
    setBusy(label);
    const res: any = await fn();
    setBusy(null);
    if (res.ok) {
      onChanged();
      if (expanded) loadRuns();
    } else {
      toast("error", `Could not ${label}`, res.description || res.error);
    }
  };

  const onStop = async () => {
    const ok = await confirm({
      title: `Stop analysing ${analysis.symbol}?`,
      message: "This ends the tracker. You can start a new analysis later.",
      confirmText: "Stop",
      destructive: true,
    });
    if (ok) act("stop", () => stopAnalysis(analysis.id));
  };

  const saveInstruction = async () => {
    if (draftInstruction.trim().length < 3) return;
    setBusy("save");
    const res = await updateAnalysisInstruction(analysis.id, draftInstruction.trim());
    setBusy(null);
    if (res.ok) {
      setEditing(false);
      onChanged();
      toast("success", "Instruction updated", "Applies from the next run.");
    } else {
      toast("error", "Could not update", res.description || res.error);
    }
  };

  const latest = analysis.latestRun;
  const flagged = latest && !!latest.actionRequired && latest.actionType !== "HOLD";
  const terminal = analysis.status === "STOPPED" || analysis.status === "POSITION_CLOSED";

  return (
    <div className="card" style={flagged ? { borderColor: "var(--red)" } : undefined}>
      <div className="row-between">
        <div className="sym-row">
          <span style={{ fontSize: 16, fontWeight: 700 }}>{analysis.symbol}</span>
          <StatusPill status={analysis.status} />
        </div>
        <span className="dim" style={{ fontSize: 12 }}>
          {analysis.lastRunAt ? new Date(analysis.lastRunAt).toLocaleTimeString() : "queued"}
        </span>
      </div>

      {flagged && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--red)",
            fontSize: 13,
          }}
        >
          <strong style={{ color: "var(--red)" }}>⚠ Action suggested: {latest!.actionType}</strong>
          {latest!.actionReason ? <div style={{ marginTop: 4 }}>{latest!.actionReason}</div> : null}
        </div>
      )}

      {analysis.status === "ERROR" && analysis.lastError && (
        <p style={{ color: "var(--red)", fontSize: 13, marginTop: 8, marginBottom: 0 }}>
          {analysis.lastError}
        </p>
      )}

      {latest?.summary && !expanded && (
        <p className="dim" style={{ fontSize: 13, marginTop: 8, marginBottom: 0, whiteSpace: "pre-wrap" }}>
          {latest.summary.length > 220 ? `${latest.summary.slice(0, 220)}…` : latest.summary}
        </p>
      )}

      {editing ? (
        <div style={{ marginTop: 10 }}>
          <textarea
            className="input"
            rows={3}
            value={draftInstruction}
            onChange={(e) => setDraftInstruction(e.target.value)}
            style={{ resize: "vertical", width: "100%" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn secondary" style={{ flex: 1, padding: 8 }} onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="btn" style={{ flex: 1, padding: 8 }} onClick={saveInstruction} disabled={busy === "save"}>
              {busy === "save" ? <Spinner /> : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p className="dim" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          Instruction: {analysis.instruction}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {!terminal && (
          <>
            <button
              className="btn secondary"
              style={{ flex: 1, padding: 8, minWidth: 90 }}
              onClick={() => act("run now", () => runAnalysisNow(analysis.id))}
              disabled={!!busy}
            >
              {busy === "run now" ? <Spinner dark /> : "Run now"}
            </button>
            {analysis.status === "ACTIVE" ? (
              <button
                className="btn secondary"
                style={{ flex: 1, padding: 8, minWidth: 90 }}
                onClick={() => act("pause", () => pauseAnalysis(analysis.id))}
                disabled={!!busy}
              >
                {busy === "pause" ? <Spinner dark /> : "Pause"}
              </button>
            ) : (
              <button
                className="btn secondary"
                style={{ flex: 1, padding: 8, minWidth: 90 }}
                onClick={() => act("resume", () => resumeAnalysis(analysis.id))}
                disabled={!!busy}
              >
                {busy === "resume" ? <Spinner dark /> : "Resume"}
              </button>
            )}
            <button
              className="btn secondary"
              style={{ flex: 1, padding: 8, minWidth: 90 }}
              onClick={() => {
                setDraftInstruction(analysis.instruction);
                setEditing(true);
              }}
              disabled={!!busy}
            >
              Edit
            </button>
            <button
              className="btn ghost-danger"
              style={{ flex: 1, padding: 8, minWidth: 90 }}
              onClick={onStop}
              disabled={!!busy}
            >
              {busy === "stop" ? <Spinner /> : "Stop"}
            </button>
          </>
        )}
        <button
          className="btn secondary"
          style={{ flex: 1, padding: 8, minWidth: 90 }}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Hide log" : "Show log"}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {runs === null ? (
            <Spinner />
          ) : runs.length === 0 ? (
            <p className="dim" style={{ fontSize: 13 }}>
              No runs yet — the first iteration is on its way.
            </p>
          ) : (
            runs.map((r) => <RunItem key={r.id} run={r} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function Analysis() {
  const [analyses, setAnalyses] = useState<PositionAnalysis[] | null>(null);

  const load = useCallback(async () => {
    const res = await listAnalyses();
    if (res.ok) setAnalyses(res.data.analyses);
    else if (analyses === null) setAnalyses([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // Poll so background runs (first run, cron, run-now) show up live.
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (analyses === null) {
    return (
      <div className="screen">
        <div className="center-fill">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-header" />
      <h3 className="section">Position analysis</h3>
      {analyses.length === 0 ? (
        <div className="card">
          <p className="card-title">Nothing tracked yet</p>
          <p className="dim" style={{ marginBottom: 0 }}>
            Open the Portfolio tab and tap <strong>Analyse</strong> on a position. The AI will
            re-check it every 30 minutes during market hours and email you when action is needed —
            it never trades on its own.
          </p>
        </div>
      ) : (
        analyses.map((a) => <AnalysisCard key={a.id} analysis={a} onChanged={load} />)
      )}
    </div>
  );
}

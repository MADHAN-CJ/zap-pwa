import { useCallback, useEffect, useState } from "react";
import {
  AnalysisRun,
  AnalysisTrigger,
  PositionAnalysis,
  WatcherStatus,
  getAnalysisRuns,
  getAnalysisTriggers,
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
      {run.runReason === "TRIGGER" && (
        <div style={{ fontSize: 11, marginTop: 2, color: "var(--red)", fontWeight: 700 }}>
          ⚡ Triggered — a watched price level was crossed; analysed early
        </div>
      )}
      {run.runReason === "MANUAL" && (
        <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>
          Manual run
        </div>
      )}
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

// The levels the AI is watching between runs, with the poller's latest LTP.
// Only rendered when the server-side price watcher is enabled.
function WatchingRow({
  symbol,
  triggers,
  watcher,
}: {
  symbol: string;
  triggers: AnalysisTrigger[] | null;
  watcher: WatcherStatus;
}) {
  const armed = (triggers ?? []).filter((t) => t.status === "ARMED");
  const fmt = (n: number | null) =>
    n === null || n === undefined ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  // Compact one-line state for the collapsed summary — the user sees this at
  // a glance and opens the disclosure only if they want the levels.
  const stateColor =
    watcher.phase === "watching"
      ? "var(--green)"
      : watcher.phase === "prices_unavailable"
        ? "var(--red)"
        : "var(--dim, #9ca3af)";
  const stateText =
    watcher.phase === "watching"
      ? "● live"
      : watcher.phase === "market_closed"
        ? "○ market closed"
        : watcher.phase === "prices_unavailable"
          ? "⚠ prices unavailable"
          : "○ off";
  const countText =
    triggers === null
      ? "…"
      : armed.length === 0
        ? "no levels armed"
        : `${armed.length} level${armed.length === 1 ? "" : "s"}`;

  return (
    <details style={{ marginTop: 8 }}>
      <summary
        className="dim"
        style={{ fontSize: 12, cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}
        title={
          watcher.phase === "prices_unavailable" && watcher.lastFetchError
            ? watcher.lastFetchError.message
            : watcher.lastTickAt
              ? `last check ${new Date(watcher.lastTickAt).toLocaleTimeString()}`
              : ""
        }
      >
        <span aria-hidden>▸</span>
        <span>⚡ Watching · {countText}</span>
        <span style={{ marginLeft: "auto", color: stateColor, fontWeight: watcher.phase === "prices_unavailable" ? 700 : 400 }}>
          {stateText}
        </span>
      </summary>
      <div
        style={{
          marginTop: 6,
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid var(--border, #2a2a2a)",
          fontSize: 12,
        }}
      >
        <div className="dim" style={{ marginBottom: 4 }}>
          Live price levels the AI is watching between runs (checked every{" "}
          {Math.round(watcher.intervalMs / 1000)}s
          {watcher.phase === "market_closed" ? " — resumes 09:15 IST" : ""}). Crossing one wakes the
          analysis early; you're emailed only if it then says action is required.
        </div>
        {triggers === null ? (
          <span className="dim">Loading…</span>
        ) : armed.length === 0 ? (
          <span className="dim">
            No price levels armed — the AI arms them only when your instruction (or its analysis) has
            a numeric line worth watching.
          </span>
        ) : (
          armed.map((t) => (
            <div key={t.id} className="row-between" style={{ marginTop: 4 }}>
              <span>
                {t.scope === "underlying" ? "Underlying" : symbol}{" "}
                <strong>{t.condition === "below" ? "<" : ">"} {fmt(t.price)}</strong>
                {t.reason ? <span className="dim"> · {t.reason}</span> : null}
              </span>
              <span className="dim">
                now <strong style={{ color: "inherit" }}>{fmt(t.lastPrice)}</strong>
              </span>
            </div>
          ))
        )}
      </div>
    </details>
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
  const [triggers, setTriggers] = useState<AnalysisTrigger[] | null>(null);
  const [watcher, setWatcher] = useState<WatcherStatus | null>(null);

  const loadRuns = useCallback(async () => {
    const res = await getAnalysisRuns(analysis.id);
    if (res.ok) setRuns(res.data.runs);
  }, [analysis.id]);

  const loadTriggers = useCallback(async () => {
    const res = await getAnalysisTriggers(analysis.id);
    if (res.ok) {
      setTriggers(res.data.triggers);
      setWatcher(res.data.watcher);
    }
  }, [analysis.id]);

  // The "Watching" row is live: refresh armed levels + observed LTP every 10s
  // while the analysis is ACTIVE (that's when the poller is watching them).
  useEffect(() => {
    if (analysis.status !== "ACTIVE") {
      setTriggers(null);
      return;
    }
    loadTriggers();
    const t = setInterval(loadTriggers, 10000);
    return () => clearInterval(t);
  }, [analysis.status, analysis.lastRunAt, loadTriggers]);

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
    } else if (res.code === "ANALYSIS_RUN_IN_PROGRESS") {
      toast("info", "Already analysing", "A run is finishing right now — it'll show up in the log in a moment.");
      onChanged();
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
  // A run in flight — surfaced on the card itself so the user always knows
  // the AI is working (the first run especially: 30–60s of otherwise-silent
  // card right after "Start analysis" reads as broken).
  const running =
    latest?.status === "RUNNING" || (analysis.status === "ACTIVE" && !latest && !analysis.lastRunAt);
  const isFirstRun = running && !analysis.lastRunAt;
  const runningLabel = isFirstRun
    ? "Analysing your position for the first time — usually 30–60s"
    : latest?.runReason === "TRIGGER"
      ? "Analysing… ⚡ woken early by a price level you were watching"
      : latest?.runReason === "MANUAL"
        ? "Analysing… (manual run)"
        : "Analysing… (scheduled 30-min check)";
  const terminal = analysis.status === "STOPPED" || analysis.status === "POSITION_CLOSED";

  return (
    <div className="card" style={flagged ? { borderColor: "var(--red)" } : undefined}>
      <div className="row-between">
        <div className="sym-row">
          <span style={{ fontSize: 16, fontWeight: 700 }}>{analysis.symbol}</span>
          <StatusPill status={analysis.status} />
        </div>
        <span className="dim" style={{ fontSize: 12 }}>
          {analysis.lastRunAt
            ? new Date(analysis.lastRunAt).toLocaleTimeString()
            : running
              ? "analysing…"
              : analysis.status === "ACTIVE"
                ? "starting…"
                : "no runs yet"}
        </span>
      </div>

      {running && (
        <div
          className="analysing-banner"
          role="status"
          aria-live="polite"
          style={{
            marginTop: 8,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--green)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Spinner />
          <span>{runningLabel}</span>
        </div>
      )}

      {flagged && !running && (
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

      {analysis.status === "ACTIVE" && watcher?.enabled && (
        <WatchingRow symbol={analysis.symbol} triggers={triggers} watcher={watcher} />
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

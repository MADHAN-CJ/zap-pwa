import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconBolt, IconBrain, IconRefresh } from "@tabler/icons-react";
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
import PageHeader from "@/components/PageHeader";
import LogoTile from "@/components/LogoTile";
import { haptics } from "@/lib/haptics";

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "ACTIVE", color: "var(--buy)" },
  PAUSED: { label: "PAUSED", color: "var(--muted)" },
  STOPPED: { label: "STOPPED", color: "var(--muted)" },
  POSITION_CLOSED: { label: "POSITION CLOSED", color: "var(--muted)" },
  ERROR: { label: "NEEDS ATTENTION", color: "var(--sell)" },
};

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { label: status, color: "var(--muted)" };
  return (
    <span className="badge" style={{ color: s.color, borderColor: s.color }}>
      {s.label}
    </span>
  );
}

const noteBox = (kind: "buy" | "sell" | "neutral"): React.CSSProperties => ({
  marginTop: 8,
  padding: "9px 11px",
  borderRadius: 11,
  fontSize: 13,
  lineHeight: 1.5,
  border: `1px solid ${kind === "sell" ? "var(--sell)" : kind === "buy" ? "var(--buy)" : "var(--line)"}`,
  background: kind === "sell" ? "var(--sell-bg)" : kind === "buy" ? "var(--buy-bg)" : "var(--card-alt)",
});

function RunItem({ run }: { run: AnalysisRun }) {
  const flagged = !!run.actionRequired && run.actionType !== "HOLD";
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--hairline)" }}>
      <div className="row-between">
        <span className="dim" style={{ fontSize: 12 }}>
          {new Date(run.startedAt).toLocaleString()}
        </span>
        <span
          className="num"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: run.status === "FAILED" ? "var(--sell)" : flagged ? "var(--sell)" : "var(--buy)",
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
        <div style={{ fontSize: 11, marginTop: 2, color: "var(--sell)", fontWeight: 700, display: "flex", gap: 4, alignItems: "center" }}>
          <IconBolt size={12} stroke={2.4} /> Triggered — a watched price level was crossed; analysed early
        </div>
      )}
      {run.runReason === "MANUAL" && (
        <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>
          Manual run
        </div>
      )}
      {flagged && run.actionReason && (
        <div style={noteBox("sell")}>
          <strong style={{ color: "var(--sell)" }}>⚠ {run.actionType}:</strong> {run.actionReason}
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

  const stateColor =
    watcher.phase === "watching"
      ? "var(--buy)"
      : watcher.phase === "prices_unavailable"
        ? "var(--sell)"
        : "var(--muted)";
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
        <IconBolt size={13} stroke={2.2} />
        <span>Watching · {countText}</span>
        <span style={{ marginLeft: "auto", color: stateColor, fontWeight: watcher.phase === "prices_unavailable" ? 700 : 500 }}>
          {stateText}
        </span>
      </summary>
      <div style={{ ...noteBox("neutral"), fontSize: 12 }}>
        <div className="dim" style={{ marginBottom: 4 }}>
          Live price levels the AI is watching between runs (checked every {Math.round(watcher.intervalMs / 1000)}s
          {watcher.phase === "market_closed" ? " — resumes 09:15 IST" : ""}). Crossing one wakes the analysis early;
          you're emailed only if it then says action is required.
        </div>
        {triggers === null ? (
          <span className="dim">Loading…</span>
        ) : armed.length === 0 ? (
          <span className="dim">
            No price levels armed — the AI arms them only when your instruction (or its analysis) has a numeric line
            worth watching.
          </span>
        ) : (
          armed.map((t) => (
            <div key={t.id} className="row-between" style={{ marginTop: 4 }}>
              <span>
                {t.scope === "underlying" ? "Underlying" : symbol}{" "}
                <strong className="num">
                  {t.condition === "below" ? "<" : ">"} {fmt(t.price)}
                </strong>
                {t.reason ? <span className="dim"> · {t.reason}</span> : null}
              </span>
              <span className="dim">
                now{" "}
                <strong className="num" style={{ color: "var(--ink)" }}>
                  {fmt(t.lastPrice)}
                </strong>
              </span>
            </div>
          ))
        )}
      </div>
    </details>
  );
}

// "NSE_EQ" → "NSE", "NSE_FNO" → "NSE F&O"
const prettySegment = (seg: string) => {
  const [exch, kind] = (seg || "").split("_");
  return kind === "FNO" ? `${exch} F&O` : exch || seg;
};

const smallBtn: React.CSSProperties = { flex: 1, padding: "9px 8px", minWidth: 90, fontSize: 13 };

function AnalysisCard({ analysis, onChanged }: { analysis: PositionAnalysis; onChanged: () => void }) {
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
      haptics.light();
      onChanged();
      if (expanded) loadRuns();
    } else if (res.code === "ANALYSIS_RUN_IN_PROGRESS") {
      toast("info", "Already analysing", "A run is finishing right now — it'll show up in the log in a moment.");
      onChanged();
    } else {
      haptics.error();
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
    <div className="card" style={flagged ? { borderColor: "var(--sell)" } : undefined}>
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <LogoTile sym={analysis.symbol} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{analysis.symbol}</span>
              <StatusPill status={analysis.status} />
            </div>
            <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>
              {prettySegment(analysis.exchangeSegment)}
              {analysis.positionType ? ` · ${analysis.positionType}` : ""}
              {analysis.productType ? ` · ${analysis.productType}` : ""}
            </div>
          </div>
        </div>
        <span className="dim num" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
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
        <div role="status" aria-live="polite" style={{ ...noteBox("buy"), display: "flex", alignItems: "center", gap: 8 }}>
          <Spinner />
          <span>{runningLabel}</span>
        </div>
      )}

      {flagged && !running && (
        <div style={noteBox("sell")}>
          <strong style={{ color: "var(--sell)" }}>⚠ Action suggested: {latest!.actionType}</strong>
          {latest!.actionReason ? <div style={{ marginTop: 4 }}>{latest!.actionReason}</div> : null}
        </div>
      )}

      {analysis.status === "ERROR" && analysis.lastError && (
        <p style={{ color: "var(--sell)", fontSize: 13, marginTop: 8, marginBottom: 0 }}>{analysis.lastError}</p>
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
            <button className="btn secondary" style={{ flex: 1, padding: 9 }} onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="btn" style={{ flex: 1, padding: 9 }} onClick={saveInstruction} disabled={busy === "save"}>
              {busy === "save" ? <Spinner dark /> : "Save"}
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
              style={smallBtn}
              onClick={() => act("run now", () => runAnalysisNow(analysis.id))}
              disabled={!!busy}
            >
              {busy === "run now" ? <Spinner /> : "Run now"}
            </button>
            {analysis.status === "ACTIVE" ? (
              <button className="btn secondary" style={smallBtn} onClick={() => act("pause", () => pauseAnalysis(analysis.id))} disabled={!!busy}>
                {busy === "pause" ? <Spinner /> : "Pause"}
              </button>
            ) : (
              <button className="btn secondary" style={smallBtn} onClick={() => act("resume", () => resumeAnalysis(analysis.id))} disabled={!!busy}>
                {busy === "resume" ? <Spinner /> : "Resume"}
              </button>
            )}
            <button
              className="btn secondary"
              style={smallBtn}
              onClick={() => {
                setDraftInstruction(analysis.instruction);
                setEditing(true);
              }}
              disabled={!!busy}
            >
              Edit
            </button>
            <button className="btn ghost-danger" style={smallBtn} onClick={onStop} disabled={!!busy}>
              {busy === "stop" ? <Spinner /> : "Stop"}
            </button>
          </>
        )}
        <button className="btn secondary" style={smallBtn} onClick={() => setExpanded((e) => !e)}>
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
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<PositionAnalysis[] | null>(null);

  const load = useCallback(async () => {
    const res = await listAnalyses();
    if (res.ok) setAnalyses(res.data.analyses);
    else setAnalyses((prev) => prev ?? []);
  }, []);

  useEffect(() => {
    load();
    // Poll so background runs (first run, cron, run-now, triggers) show up live.
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const refreshBtn = (
    <button className="ph-action" onClick={load} aria-label="Refresh analyses">
      <IconRefresh size={17} stroke={2} />
    </button>
  );

  return (
    <div className="page">
      <PageHeader title="Analysis" action={refreshBtn} />
      <div className="screen">
        {analyses === null ? (
          <>
            {[0, 1].map((i) => (
              <div key={i} className="card">
                <div className="skeleton" style={{ width: 160, height: 18, marginBottom: 10 }} />
                <div className="skeleton" style={{ width: "90%", height: 12, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: "70%", height: 12 }} />
              </div>
            ))}
          </>
        ) : analyses.length === 0 ? (
          <div className="card">
            <p className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconBrain size={18} stroke={1.9} /> Nothing tracked yet
            </p>
            <p className="dim" style={{ marginBottom: 12 }}>
              Open the Portfolio tab and tap <strong>Analyse</strong> on a position. The AI will re-check it every
              30 minutes during market hours and email you when action is needed — it never trades on its own.
            </p>
            <button className="btn secondary" style={{ padding: 10 }} onClick={() => navigate("/portfolio")}>
              Go to Portfolio
            </button>
          </div>
        ) : (
          analyses.map((a) => <AnalysisCard key={a.id} analysis={a} onChanged={load} />)
        )}
      </div>
    </div>
  );
}

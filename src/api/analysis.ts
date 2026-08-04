import { apiRequest } from "./client";

// AI position analysis (§12 step 12). All endpoints are human-only
// (/dashboard/*): the analysis agent itself is read-only server-side and can
// never trade — these calls just manage the tracker.

export type AnalysisRun = {
  id: string;
  analysisId: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  summary: string | null; // short human digest (3–4 lines)
  notes: string | null; // detailed numeric handoff (context for the next run)
  actionRequired: number; // 0 | 1
  actionType: "BUY" | "SELL" | "EXIT" | "MODIFY" | "HOLD" | null;
  actionReason: string | null;
  confidence: "LOW" | "MEDIUM" | "HIGH" | null;
  alertSentAt: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  toolCalls: number | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type AnalysisStatus =
  | "ACTIVE"
  | "PAUSED"
  | "STOPPED"
  | "POSITION_CLOSED"
  | "ERROR";

export type PositionAnalysis = {
  id: string;
  securityId: string;
  exchangeSegment: string;
  symbol: string;
  positionType: string | null;
  productType: string | null;
  instruction: string;
  status: AnalysisStatus;
  lastRunAt: string | null;
  lastAlertAt: string | null;
  lastActionType: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  latestRun?: AnalysisRun | null;
};

export const listAnalyses = () =>
  apiRequest<{ success: boolean; analyses: PositionAnalysis[] }>("/dashboard/analysis");

export const priorAnalysisRuns = (securityId: string, exchangeSegment: string) =>
  apiRequest<{
    success: boolean;
    analyses: { id: string; instruction: string; status: string; createdAt: string }[];
    runs: AnalysisRun[];
  }>(
    `/dashboard/analysis/prior?securityId=${encodeURIComponent(securityId)}&exchangeSegment=${encodeURIComponent(exchangeSegment)}`
  );

export const createAnalysis = (body: {
  securityId: string;
  exchangeSegment: string;
  symbol: string;
  instruction: string;
}) =>
  apiRequest<{ success: boolean; message: string; analysis: PositionAnalysis }>(
    "/dashboard/analysis",
    { method: "POST", body }
  );

export const getAnalysisRuns = (id: string) =>
  apiRequest<{ success: boolean; runs: AnalysisRun[] }>(
    `/dashboard/analysis/${id}/runs`
  );

export const runAnalysisNow = (id: string) =>
  apiRequest<{ success: boolean; analysis: PositionAnalysis }>(
    `/dashboard/analysis/${id}/run`,
    { method: "POST", body: {} }
  );

export const updateAnalysisInstruction = (id: string, instruction: string) =>
  apiRequest<{ success: boolean; analysis: PositionAnalysis }>(
    `/dashboard/analysis/${id}`,
    { method: "PUT", body: { instruction } }
  );

export const pauseAnalysis = (id: string) =>
  apiRequest<{ success: boolean; analysis: PositionAnalysis }>(
    `/dashboard/analysis/${id}/pause`,
    { method: "POST", body: {} }
  );

export const resumeAnalysis = (id: string) =>
  apiRequest<{ success: boolean; analysis: PositionAnalysis }>(
    `/dashboard/analysis/${id}/resume`,
    { method: "POST", body: {} }
  );

export const stopAnalysis = (id: string) =>
  apiRequest<{ success: boolean; analysis: PositionAnalysis }>(
    `/dashboard/analysis/${id}`,
    { method: "DELETE" }
  );

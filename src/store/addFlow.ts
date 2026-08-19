// Tiny module-level store for the Add-position flow (Pick → Interview → Confirm).
// Deliberately not context/library: the three pages are one continuous flow and
// a refresh/deep-link simply restarts it (pages redirect to /watch/new when empty).
import type { InterviewStep, InterviewTurn, PositionRef, Synthesis } from "@/types";

let position: PositionRef | null = null;
let watchId: string | null = null;
let transcript: InterviewTurn[] = [];
let lastStep: InterviewStep | null = null;
let synthesis: Synthesis | null = null;

export const getPosition = () => position;
export const setPosition = (p: PositionRef) => {
  position = p;
};

export const getWatchId = () => watchId;
export const setWatchId = (id: string) => {
  watchId = id;
};

export const getTranscript = () => transcript;
export const setTranscript = (t: InterviewTurn[]) => {
  transcript = t;
};

/** The most recent InterviewStep — Interview reads expectsMood/done from it. */
export const getLastStep = () => lastStep;
export const setLastStep = (s: InterviewStep) => {
  lastStep = s;
};

export const getSynthesisDraft = () => synthesis;
export const setSynthesisDraft = (s: Synthesis) => {
  synthesis = s;
};

export function clearAddFlow() {
  position = null;
  watchId = null;
  transcript = [];
  lastStep = null;
  synthesis = null;
}

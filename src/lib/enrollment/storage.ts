// Saves funnel progress in this browser so a refresh does not lose answers.
//
// Before submission the full draft (including contact details) is kept so the
// student can finish later. After a successful submission the draft is wiped
// and only what is needed to resume the test stays: the access token, the
// phase, and test progress. After completion the test progress is wiped too,
// leaving only the token so the results page can be reloaded. "Remove my data
// from this device" (and "Start over") clear everything.

import type { OptionId } from "@/lib/assessment/questions";
import { emptyDraft, type EnrollmentDraft } from "./schema";

import { ENROLLMENT_STORAGE_KEY as KEY } from "./storageKey";

export type Phase = "details" | "review" | "test" | "results";

export type SavedFunnel = {
  draft: EnrollmentDraft;
  phase: Phase;
  step: number;
  /** Secret that links this browser to its application; generated before submission. */
  token: string | null;
  submitted: boolean;
  answers: Record<string, OptionId | null>;
  questionIndex: number;
  writing: string;
};

export const initialFunnel = (): SavedFunnel => ({
  draft: emptyDraft(),
  phase: "details",
  step: 0,
  token: null,
  submitted: false,
  answers: {},
  questionIndex: 0,
  writing: "",
});

/** The subset of state written to storage for the current phase. */
export const persistable = (state: SavedFunnel): Partial<SavedFunnel> => {
  if (!state.submitted) return state;
  const base = { phase: state.phase, token: state.token, submitted: true };
  if (state.phase === "results") return base;
  return { ...base, answers: state.answers, questionIndex: state.questionIndex, writing: state.writing };
};

export const loadFunnel = (): SavedFunnel => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialFunnel();
    const saved = JSON.parse(raw) as Partial<SavedFunnel>;
    return { ...initialFunnel(), ...saved, draft: { ...emptyDraft(), ...saved.draft } };
  } catch {
    return initialFunnel();
  }
};

export const saveFunnel = (state: SavedFunnel) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(persistable(state)));
  } catch {
    /* storage unavailable (private mode); progress just won't survive a refresh */
  }
};

export const clearFunnel = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

// Placement test scoring (server-authoritative). See docs/placement-scoring.md.
//
// Method "fb-objective-v1":
// 1. Each multiple-choice item is worth 1 point. Unanswered items score 0.
// 2. Items are grouped into CEFR bands (A1–C2, five items each).
// 3. A band is "met" when at least 60% of its items are correct (3 of 5).
// 4. The estimated level is the highest band L such that:
//    a. band L itself is met,
//    b. accuracy across all items in bands A1..L is at least 60%, and
//    c. at most one band below L is unmet, and none below L falls under 40% (2 of 5).
//    If no band qualifies, the estimate is Pre-A1.
//    Rule (a) stops a few correct easy answers from producing an advanced level;
//    rules (b) and (c) stop lucky guesses on hard items from skipping weak lower bands,
//    while allowing one slightly weaker band so a single slip does not cap the result.
// 5. The writing task is not scored automatically. An instructor scores it with a
//    5-criterion rubric (0–4 each). When present, overall score =
//    80% objective + 20% writing ("fb-objective-v1+instructor-writing").
//    The CEFR estimate always comes from objective evidence; the instructor may
//    record a separate adjusted level.

import {
  CATEGORY_LABELS,
  CEFR_BANDS,
  QUESTIONS,
  RUBRIC_MAX_PER_CRITERION,
  TEST_VERSION,
  WRITING_PROMPTS,
  WRITING_RUBRIC,
  type Category,
  type CefrBand,
  type CefrLevel,
  type OptionId,
  type RubricCriterion,
  type WritingTier,
} from "../../src/lib/assessment/questions";
import type { LearningGoal } from "../../src/lib/enrollment/options";
import { ANSWER_KEY } from "./answerKey";

export const SCORING_METHOD = "fb-objective-v1";
export const SCORING_METHOD_WITH_WRITING = "fb-objective-v1+instructor-writing";
export const BAND_PASS_RATIO = 0.6;
export const BAND_FLOOR_RATIO = 0.4;
export const CUMULATIVE_MIN_RATIO = 0.6;
export const OBJECTIVE_WEIGHT = 0.8;
export const WRITING_WEIGHT = 0.2;
/** Below this share of answered items, the result is flagged as limited evidence. */
export const STANDARD_CONFIDENCE_ANSWERED_RATIO = 0.9;

export type Answers = Record<string, OptionId | null>;

export type ScoredResponse = {
  question_id: string;
  selected_answer: OptionId | null;
  awarded_score: number;
  maximum_score: number;
};

export type CategoryScore = { correct: number; total: number; percent: number };
export type BandEvidence = { band: CefrBand; correct: number; total: number; met: boolean };

export type ObjectiveResult = {
  test_version: string;
  scoring_method: string;
  responses: ScoredResponse[];
  objective_score: { points: number; max: number; percent: number };
  answered: number;
  unanswered: number;
  category_scores: Record<Category, CategoryScore>;
  level_evidence: BandEvidence[];
  estimated_cefr_level: CefrLevel;
  confidence: "standard" | "limited";
};

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

/** Only accept answers for known questions with valid option ids. */
export const sanitizeAnswers = (raw: unknown): Answers => {
  const out: Answers = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  for (const q of QUESTIONS) {
    const v = (raw as Record<string, unknown>)[q.id];
    if (v === null) out[q.id] = null;
    else if (typeof v === "string" && q.options.some((o) => o.id === v)) out[q.id] = v as OptionId;
  }
  return out;
};

export const estimateLevel = (evidence: BandEvidence[]): CefrLevel => {
  let level: CefrLevel = "Pre-A1";
  for (let i = 0; i < evidence.length; i++) {
    const band = evidence[i];
    if (!band.met) continue;
    const upTo = evidence.slice(0, i + 1);
    const correct = upTo.reduce((s, b) => s + b.correct, 0);
    const total = upTo.reduce((s, b) => s + b.total, 0);
    const below = evidence.slice(0, i);
    const unmetBelow = below.filter((b) => !b.met).length;
    const anyBelowFloor = below.some((b) => b.correct < Math.ceil(b.total * BAND_FLOOR_RATIO));
    if (correct / total >= CUMULATIVE_MIN_RATIO && unmetBelow <= 1 && !anyBelowFloor) level = band.band;
  }
  return level;
};

export const scoreObjective = (answers: Answers): ObjectiveResult => {
  const responses: ScoredResponse[] = QUESTIONS.map((q) => {
    const selected = answers[q.id] ?? null;
    const key = ANSWER_KEY[q.id];
    if (!key) throw new Error(`Missing answer key for ${q.id}`);
    return { question_id: q.id, selected_answer: selected, awarded_score: selected === key.correct ? 1 : 0, maximum_score: 1 };
  });
  const byId = new Map(responses.map((r) => [r.question_id, r]));

  const categories: Category[] = ["grammar", "vocabulary", "reading", "usage"];
  const category_scores = Object.fromEntries(
    categories.map((c) => {
      const items = QUESTIONS.filter((q) => q.category === c).map((q) => byId.get(q.id)!);
      const correct = items.reduce((s, r) => s + r.awarded_score, 0);
      return [c, { correct, total: items.length, percent: pct(correct, items.length) }];
    }),
  ) as Record<Category, CategoryScore>;

  const level_evidence: BandEvidence[] = CEFR_BANDS.map((band) => {
    const items = QUESTIONS.filter((q) => q.band === band).map((q) => byId.get(q.id)!);
    const correct = items.reduce((s, r) => s + r.awarded_score, 0);
    return { band, correct, total: items.length, met: correct >= Math.ceil(items.length * BAND_PASS_RATIO) };
  });

  const points = responses.reduce((s, r) => s + r.awarded_score, 0);
  const max = responses.reduce((s, r) => s + r.maximum_score, 0);
  const answered = responses.filter((r) => r.selected_answer !== null).length;

  return {
    test_version: TEST_VERSION,
    scoring_method: SCORING_METHOD,
    responses,
    objective_score: { points, max, percent: pct(points, max) },
    answered,
    unanswered: responses.length - answered,
    category_scores,
    level_evidence,
    estimated_cefr_level: estimateLevel(level_evidence),
    confidence: answered / responses.length >= STANDARD_CONFIDENCE_ANSWERED_RATIO ? "standard" : "limited",
  };
};

export const writingTierFor = (level: CefrLevel): WritingTier => {
  if (level === "C1" || level === "C2") return "advanced";
  if (level === "B1" || level === "B2") return "intermediate";
  return "foundation";
};

export const writingPromptFor = (level: CefrLevel) => WRITING_PROMPTS[writingTierFor(level)];

// ── Writing rubric (instructor-scored) ──

export type RubricScores = Record<RubricCriterion, number>;

export const isValidRubric = (raw: unknown): raw is RubricScores =>
  typeof raw === "object" &&
  raw !== null &&
  WRITING_RUBRIC.every((c) => {
    const v = (raw as Record<string, unknown>)[c.id];
    return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= RUBRIC_MAX_PER_CRITERION;
  });

export const rubricPercent = (r: RubricScores) => {
  const total = WRITING_RUBRIC.reduce((s, c) => s + r[c.id], 0);
  return pct(total, WRITING_RUBRIC.length * RUBRIC_MAX_PER_CRITERION);
};

export const overallScore = (objectivePercent: number, writingPercent: number | null) =>
  writingPercent === null
    ? { overall: objectivePercent, method: SCORING_METHOD }
    : {
        overall: Math.round(objectivePercent * OBJECTIVE_WEIGHT + writingPercent * WRITING_WEIGHT),
        method: SCORING_METHOD_WITH_WRITING,
      };

// ── Feedback (derived only from the student's actual responses) ──

const LEVEL_PRIORITIES: Record<CefrLevel, string> = {
  "Pre-A1": "Build core everyday vocabulary and simple sentence patterns for introductions, routines, and basic needs.",
  A1: "Build core everyday vocabulary and simple sentence patterns for introductions, routines, and basic needs.",
  A2: "Strengthen past and present tenses and practise short, everyday conversations with confidence.",
  B1: "Develop fluency in longer conversations and accuracy with perfect tenses, conditionals, and linking words.",
  B2: "Expand precise vocabulary and practise explaining and defending opinions in detail.",
  C1: "Refine nuance, register, and natural phrasing for professional and academic situations.",
  C2: "Polish advanced style and idiomatic range, and practise spontaneous high-level discussion.",
};

const GOAL_PRIORITIES: Partial<Record<LearningGoal, string>> = {
  general: "Practise everyday conversation on familiar topics so speaking feels natural.",
  fluency: "Regular speaking practice to build fluency and confidence, with feedback on common errors.",
  academic: "Academic reading and writing skills: summarising, paraphrasing, and structuring arguments.",
  business: "Business communication: emails, meetings, and negotiating language.",
  career: "Interview practice: answering common questions clearly and talking about your experience.",
  exam: "Exam strategies and timed practice for your target test, alongside core language work.",
  travel: "Practical language for travel and study abroad: arrangements, conversations, and problem-solving.",
  meetings: "Language for meetings and presentations: structuring a talk, agreeing, disagreeing, and asking questions.",
};

export type Feedback = {
  strengths: string[];
  improvement_areas: string[];
  recommended_learning_priorities: string[];
};

export const buildFeedback = (
  result: ObjectiveResult,
  goals: { primary: LearningGoal; additional: LearningGoal[] },
): Feedback => {
  const byId = new Map(result.responses.map((r) => [r.question_id, r]));
  const levelIndex = result.estimated_cefr_level === "Pre-A1" ? -1 : CEFR_BANDS.indexOf(result.estimated_cefr_level);

  // Strengths
  const strengths: string[] = [];
  let perfectThrough = -1;
  for (const b of result.level_evidence) {
    if (b.correct === b.total) perfectThrough++;
    else break;
  }
  if (perfectThrough >= 0) {
    strengths.push(
      perfectThrough === 0
        ? "You answered every A1 question correctly."
        : `You answered every question from A1 to ${CEFR_BANDS[perfectThrough]} correctly.`,
    );
  }
  for (const [c, s] of Object.entries(result.category_scores) as [Category, CategoryScore][]) {
    if (s.percent >= 75) strengths.push(`Strong ${CATEGORY_LABELS[c].toLowerCase()} (${s.correct} of ${s.total} correct).`);
  }
  // Only cite skills at or one band above the estimate: isolated correct answers far above it are likely guesses.
  const hardestCorrect = QUESTIONS.filter((q) => {
    const bi = CEFR_BANDS.indexOf(q.band);
    return byId.get(q.id)!.awarded_score > 0 && bi >= Math.max(levelIndex, 0) && bi <= levelIndex + 1;
  })
    .sort((a, b) => CEFR_BANDS.indexOf(b.band) - CEFR_BANDS.indexOf(a.band))
    .slice(0, 3);
  for (const q of hardestCorrect) strengths.push(`Used ${q.skill} correctly (${q.band} item).`);
  if (strengths.length === 0) {
    strengths.push("You completed the assessment, which gives your instructor a clear starting point for your lessons.");
  }

  // Improvement areas: missed items at or just above the estimated level are the most useful next steps.
  const improvement_areas: string[] = [];
  const reachable = QUESTIONS.filter((q) => byId.get(q.id)!.awarded_score === 0 && CEFR_BANDS.indexOf(q.band) <= levelIndex + 1)
    .sort((a, b) => CEFR_BANDS.indexOf(a.band) - CEFR_BANDS.indexOf(b.band));
  const seen = new Set<string>();
  for (const q of reachable) {
    if (seen.has(q.skill)) continue;
    seen.add(q.skill);
    improvement_areas.push(`Review ${q.skill} (${q.band}).`);
    if (improvement_areas.length >= 4) break;
  }
  for (const [c, s] of Object.entries(result.category_scores) as [Category, CategoryScore][]) {
    if (s.percent < 50) improvement_areas.push(`${CATEGORY_LABELS[c]}: ${s.correct} of ${s.total} correct.`);
  }
  if (result.unanswered > 0) {
    improvement_areas.push(
      `${result.unanswered} question${result.unanswered === 1 ? " was" : "s were"} left unanswered, so your instructor may check these skills with you.`,
    );
  }

  // Recommendations (not measured results)
  const priorities: string[] = [LEVEL_PRIORITIES[result.estimated_cefr_level]];
  for (const g of [goals.primary, ...goals.additional]) {
    const p = GOAL_PRIORITIES[g];
    if (p && !priorities.includes(p)) priorities.push(p);
    if (priorities.length >= 3) break;
  }
  const weakest = (Object.entries(result.category_scores) as [Category, CategoryScore][]).sort((a, b) => a[1].percent - b[1].percent)[0];
  if (weakest && weakest[1].percent < 75) priorities.push(`Focused practice on ${CATEGORY_LABELS[weakest[0]].toLowerCase()}.`);
  priorities.push("Speaking and listening practice with your instructor, since this test does not measure speaking.");

  return { strengths: strengths.slice(0, 5), improvement_areas: improvement_areas.slice(0, 6), recommended_learning_priorities: priorities };
};

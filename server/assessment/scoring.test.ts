// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CEFR_BANDS, QUESTIONS, type OptionId } from "../../src/lib/assessment/questions";
import { ANSWER_KEY } from "./answerKey";
import {
  buildFeedback,
  estimateLevel,
  overallScore,
  rubricPercent,
  sanitizeAnswers,
  scoreObjective,
  writingTierFor,
  type Answers,
} from "./scoring";

const wrong = (id: string): OptionId => (["a", "b", "c", "d"] as OptionId[]).find((o) => o !== ANSWER_KEY[id].correct)!;

/** Answers with `n` correct items in each band (the rest wrong), in band order A1..C2. */
const answersWith = (perBand: number[]): Answers => {
  const out: Answers = {};
  CEFR_BANDS.forEach((band, i) => {
    QUESTIONS.filter((q) => q.band === band).forEach((q, j) => {
      out[q.id] = j < perBand[i] ? ANSWER_KEY[q.id].correct : wrong(q.id);
    });
  });
  return out;
};

describe("question bank", () => {
  it("has 25–35 questions, five per CEFR band, all with an answer key", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(25);
    expect(QUESTIONS.length).toBeLessThanOrEqual(35);
    for (const band of CEFR_BANDS) expect(QUESTIONS.filter((q) => q.band === band)).toHaveLength(5);
    for (const q of QUESTIONS) {
      const key = ANSWER_KEY[q.id];
      expect(key, q.id).toBeDefined();
      expect(q.options.map((o) => o.id)).toContain(key.correct);
      expect(key.explanation.length).toBeGreaterThan(10);
    }
    expect(Object.keys(ANSWER_KEY).sort()).toEqual(QUESTIONS.map((q) => q.id).sort());
  });

  it("has unique ids, unique prompts per passage, and four distinct options each", () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    for (const q of QUESTIONS) expect(new Set(q.options.map((o) => o.text)).size).toBe(4);
  });

  it("covers every category", () => {
    for (const c of ["grammar", "vocabulary", "reading", "usage"]) {
      expect(QUESTIONS.some((q) => q.category === c)).toBe(true);
    }
  });

  it("does not put the correct answer in the same position every time", () => {
    const positions = new Set(Object.values(ANSWER_KEY).map((k) => k.correct));
    expect(positions.size).toBe(4);
  });
});

describe("scoreObjective", () => {
  it("awards one point per correct answer and zero for wrong or unanswered", () => {
    const answers: Answers = { [QUESTIONS[0].id]: ANSWER_KEY[QUESTIONS[0].id].correct, [QUESTIONS[1].id]: wrong(QUESTIONS[1].id) };
    const r = scoreObjective(answers);
    expect(r.objective_score).toEqual({ points: 1, max: QUESTIONS.length, percent: 3 });
    expect(r.responses.find((x) => x.question_id === QUESTIONS[0].id)?.awarded_score).toBe(1);
    expect(r.responses.find((x) => x.question_id === QUESTIONS[1].id)?.awarded_score).toBe(0);
    expect(r.answered).toBe(2);
    expect(r.unanswered).toBe(QUESTIONS.length - 2);
  });

  it("scores all correct as C2 and all wrong as Pre-A1", () => {
    expect(scoreObjective(answersWith([5, 5, 5, 5, 5, 5])).estimated_cefr_level).toBe("C2");
    expect(scoreObjective(answersWith([0, 0, 0, 0, 0, 0])).estimated_cefr_level).toBe("Pre-A1");
    expect(scoreObjective({}).estimated_cefr_level).toBe("Pre-A1");
  });

  it("separates category scores", () => {
    const r = scoreObjective(answersWith([5, 5, 5, 5, 5, 5]));
    for (const c of Object.values(r.category_scores)) expect(c.percent).toBe(100);
    const total = Object.values(r.category_scores).reduce((s, c) => s + c.total, 0);
    expect(total).toBe(QUESTIONS.length);
  });

  it("flags limited confidence when many questions are unanswered", () => {
    const answers = answersWith([5, 5, 5, 0, 0, 0]);
    for (const q of QUESTIONS.filter((x) => x.band === "C2" || x.band === "C1")) answers[q.id] = null;
    const r = scoreObjective(answers);
    expect(r.unanswered).toBe(10);
    expect(r.confidence).toBe("limited");
    expect(r.estimated_cefr_level).toBe("B1");
  });
});

describe("estimateLevel (via band evidence)", () => {
  const level = (perBand: number[]) => scoreObjective(answersWith(perBand)).estimated_cefr_level;

  it("assigns the highest consistently demonstrated band", () => {
    expect(level([5, 4, 3, 1, 0, 0])).toBe("B1");
    expect(level([5, 5, 4, 3, 1, 1])).toBe("B2");
    expect(level([3, 0, 0, 0, 0, 0])).toBe("A1");
    expect(level([2, 0, 0, 0, 0, 0])).toBe("Pre-A1");
  });

  it("does not award an advanced level for answering only easy questions", () => {
    expect(level([5, 5, 0, 0, 0, 0])).toBe("A2");
  });

  it("ignores lucky correct answers on hard items when lower bands are weak", () => {
    expect(level([2, 1, 1, 3, 3, 3])).toBe("Pre-A1");
    expect(level([5, 1, 1, 3, 3, 3])).toBe("A1");
  });

  it("tolerates one slightly weaker band below the estimate", () => {
    expect(level([5, 2, 5, 4, 1, 0])).toBe("B2");
    // Two unmet bands below is not tolerated.
    expect(level([5, 2, 2, 4, 0, 0])).toBe("A1");
  });

  it("requires cumulative accuracy of at least 60%", () => {
    expect(
      estimateLevel([
        { band: "A1", correct: 3, total: 5, met: true },
        { band: "A2", correct: 2, total: 5, met: false },
        { band: "B1", correct: 3, total: 5, met: true },
        { band: "B2", correct: 0, total: 5, met: false },
        { band: "C1", correct: 0, total: 5, met: false },
        { band: "C2", correct: 0, total: 5, met: false },
      ]),
    ).toBe("A1"); // B1 cumulative = 8/15 = 53%
  });
});

describe("writing", () => {
  it("chooses a writing tier appropriate to the objective level", () => {
    expect(writingTierFor("Pre-A1")).toBe("foundation");
    expect(writingTierFor("A2")).toBe("foundation");
    expect(writingTierFor("B1")).toBe("intermediate");
    expect(writingTierFor("B2")).toBe("intermediate");
    expect(writingTierFor("C1")).toBe("advanced");
  });

  it("combines writing with objective score only when an instructor has scored it", () => {
    expect(overallScore(70, null)).toEqual({ overall: 70, method: "fb-objective-v1" });
    expect(overallScore(70, 50)).toEqual({ overall: 66, method: "fb-objective-v1+instructor-writing" });
    expect(rubricPercent({ grammar: 4, vocabulary: 4, structure: 2, coherence: 2, task: 3 })).toBe(75);
  });
});

describe("sanitizeAnswers", () => {
  it("drops unknown questions and invalid options", () => {
    const id = QUESTIONS[0].id;
    expect(sanitizeAnswers({ [id]: "z", nope: "a", [QUESTIONS[1].id]: "b", [QUESTIONS[2].id]: null })).toEqual({
      [QUESTIONS[1].id]: "b",
      [QUESTIONS[2].id]: null,
    });
    expect(sanitizeAnswers("bad")).toEqual({});
  });
});

describe("buildFeedback", () => {
  it("derives strengths and improvements from actual responses", () => {
    const r = scoreObjective(answersWith([5, 5, 2, 1, 0, 0]));
    const f = buildFeedback(r, { primary: "business", additional: [] });
    expect(r.estimated_cefr_level).toBe("A2");
    expect(f.strengths[0]).toBe("You answered every question from A1 to A2 correctly.");
    // Missed B1 items (one band above A2) appear as next steps; C2 items do not.
    expect(f.improvement_areas.some((s) => s.includes("(B1)"))).toBe(true);
    expect(f.improvement_areas.some((s) => s.includes("(C2)"))).toBe(false);
    expect(f.recommended_learning_priorities.some((s) => s.includes("Business communication"))).toBe(true);
    expect(f.recommended_learning_priorities.at(-1)).toMatch(/does not measure speaking/);
  });

  it("does not cite lucky correct answers far above the estimated level as strengths", () => {
    const r = scoreObjective(answersWith([1, 1, 0, 1, 3, 1]));
    expect(r.estimated_cefr_level).toBe("Pre-A1");
    const f = buildFeedback(r, { primary: "general", additional: [] });
    expect(f.strengths.join(" ")).not.toMatch(/\((B2|C1|C2) item\)/);
  });

  it("always gives a beginner at least one encouraging strength", () => {
    const f = buildFeedback(scoreObjective({}), { primary: "general", additional: [] });
    expect(f.strengths.length).toBeGreaterThan(0);
  });
});

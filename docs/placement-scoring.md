# Placement test scoring (fb-placement-v1)

The Fluent Bridges placement test is an informal placement tool written for this site. It is **not** an official or validated CEFR examination. Results are labelled "Estimated English Level" and are confirmed by the instructor.

- Questions: `src/lib/assessment/questions.ts` (shipped to the browser, no answers)
- Answer key + explanations: `server/assessment/answerKey.ts` (server only)
- Scoring: `server/assessment/scoring.ts`
- Tests: `server/assessment/scoring.test.ts`

Each stored assessment records `test_version` and `scoring_method`. If you change questions, thresholds, or weights, bump the version (for example `fb-placement-v2` / `fb-objective-v2`) so that older results are still interpreted correctly.

## Structure

| Part | Content | Items |
|---|---|---|
| 1 | Grammar, vocabulary, sentence construction & practical use, in order of difficulty | 24 |
| 2 | Reading: 3 passages (A2 message, B1/B2 workplace email, C1/C2 opinion text) | 6 |
| 3 | Writing: one prompt chosen from the objective result | 1 |

There are 5 multiple-choice items per CEFR band (A1–C2). By category: grammar 11, vocabulary 8, reading 6, usage 5. Band tags are the author's judgement of each item's target difficulty.

## Objective scoring

New submissions are scored with **`fb-objective-v2`**. Assessments scored earlier keep `fb-objective-v1`: their stored level is never recomputed, and scoring their writing later keeps the v1 label (`fb-objective-v1+instructor-writing`). A missing method is read as v1. The admin shows the method under "Scoring" and marks v1 records.

### `fb-objective-v1` (until October 2026)

1. Each item is worth 1 point. Unanswered items (including "I'm not sure") score 0.
2. **Band met:** at least 60% of a band's items are correct (3 of 5).
3. **Estimated level:** the highest band *L* where:
   - band *L* is met;
   - accuracy across all items from A1 to *L* is at least 60%;
   - at most one band below *L* is unmet, and no band below *L* is under 40% (2 of 5).

   If no band qualifies, the result is **Pre-A1**.
4. **Confidence** is "limited" when fewer than 90% of items were answered. The student and the instructor both see this.

### `fb-objective-v2` (current)

The same as v1, except the "one unmet band below *L*" allowance applies only when band *L* itself is at least 80% correct (4 of 5). Without that, no band below *L* may be unmet.

Why: under v1 a student who is solid to A2 and weak at B1 can guess 3 of 5 at B2 and be placed at B2. Guessing 3 of 5 on four-option items happens about 10% of the time; guessing 4 of 5 about 1.6%. In a simulation of that profile (200,000 runs), v1 placed 8.8% at B2 or above and v2 4.9%. Results with no unmet band below the estimate are identical under both. See `docs/proposals/quick-check.md`.

Why these rules: rule (a) stops a few easy answers from producing an advanced level. Rules (b) and (c) stop lucky guesses on hard items from skipping weak lower bands, while one slip doesn't cap the result. Unanswered items can only lower the estimate, never raise it.

Category scores (grammar, vocabulary, reading, usage) are reported separately and do not affect the level.

## Writing

- The prompt tier comes from the objective level: Pre-A1–A2 → *Introduce yourself* (40–100 words); B1–B2 → *Describe a challenge* (80–150); C1–C2 → *Give your opinion* (150–220).
- Writing is **not scored automatically**. It is saved for the instructor, who scores it in `/instructor` on 5 criteria (grammar, vocabulary, sentence structure, coherence and clarity, task completion), each 0–4, giving a total of 20.
- Once scored: **overall score = 80% objective + 20% writing** (`scoring_method = fb-objective-v2+instructor-writing`, or `v1+` for v1 records). Until then the overall score equals the objective score.
- Writing never changes the objective CEFR estimate. The instructor records their own judgement in a separate `instructor_level` field.

## Feedback

Strengths, improvement areas and priorities are generated deterministically from the student's actual responses:

- **Strengths:** perfect bands from A1 upwards, categories at 75% or above, and correctly answered skills at or one band above the estimate. Isolated correct answers far above the estimate are treated as likely guesses and are not cited.
- **Improvement areas:** missed skills up to one band above the estimate, categories under 50%, and the number of unanswered items.
- **Recommendations:** a level-based priority, up to two goal-based priorities, the weakest category, and a speaking/listening note. The results page labels these as recommendations, not measurements.

Speaking and listening are not assessed. The results page says so and points to the trial lesson.

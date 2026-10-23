# Proposal: a shorter front door (quick check)

Status: **design only, not implemented.** Needs approval on the scoring rule, the consent wording and the data model before any code changes.

## Flow

1. **Step 1: name and WhatsApp number**, plus the consent checkbox. Consent has to move here, because we now store personal data before the test.
2. **Step 2: a 12-question quick check**, 2 items per CEFR band (A1 to C2), taken from the existing bank.
3. **Step 3: a provisional level range** with the WhatsApp CTA ("Ask Abdul on WhatsApp"), then two optional next steps:
   - "Take the full test (18 more questions)". The 12 quick answers carry over, so nothing is asked twice.
   - "Tell us your goals and schedule". This is the rest of today's intake: email, city, goals, format, frequency, package, payment, days and times.

The lead appears in the admin after step 1, so the waiting badge and Message 1 work from the first minute.

## Quick-check items

Flag these with `quick: true` in `src/lib/assessment/questions.ts`. None of them uses a reading passage, so the check stays short. The four A1 and A2 items map directly onto the follow-up tip dictionary.

| Band | Items |
|---|---|
| A1 | `a1-g2` present simple questions, `a1-v2` everyday vocabulary |
| A2 | `a2-g1` past simple, `a2-g2` present continuous |
| B1 | `b1-g2` first conditional, `b1-u1` linking words |
| B2 | `b2-g2` third conditional, `b2-v1` professional collocations |
| C1 | `c1-g1` inversion for emphasis, `c1-u1` indirect requests |
| C2 | `c2-g1` conditional inversion with "should", `c2-v1` academic vocabulary |

## Scoring

### Review of the current rule (`fb-objective-v1`, 30 items)

A level L needs:
- band L met (3 of 5);
- 60% across A1 to L;
- at most one unmet band below L, and none under 2 of 5.

**An isolated hit can't raise the level.** A lucky band surrounded by failed bands fails the floor and cumulative checks.

**Lucky streaks can.** The one allowed weak band below L is the gap. Example: a student who is solid to A2 and weak at B1 (2 of 5) can guess 3 of 5 at B2 and be placed at B2. On four-option items, the chance of guessing at least 3 of 5 is about 10%.

Simulated over 200,000 runs, with an illustrative profile of 95% accuracy at A1 and A2, 45% at B1, and guessing above that:

| Rule | Placed at B2 or above |
|---|---|
| v1 (current) | 8.8% |
| v2: an unmet band below L is allowed only if L itself is at least 4 of 5 | 4.9% |

The chance of guessing 4 of 5 is 1.6%. **Approved and shipped** as `fb-objective-v2` for new submissions. Existing records keep v1.

### Proposed quick-check rule (`fb-quick-v1`, 12 items)

The provisional level is the highest band L where:
1. band L is 2 of 2;
2. every band below L has at least 1 of 2;
3. at most one band below L is 1 of 2; and
4. the band directly below L is 2 of 2.

Rule 4 is the guard against guessing. Rules 2 and 4 together mean a hit has to be part of an unbroken run. A single band of lucky answers (2 of 2 by chance is 6.25%) above a failed band never counts.

Shown to the student as a range from the provisional level to the next band, labelled provisional.

Simulated with the same weak A2 profile:

| Rule | Placed at B2 or above | True B2 placed at B2 or above |
|---|---|---|
| As first suggested (one partial band anywhere) | 4.2% | 72% |
| With rule 4 | 1.4% | 61% |
| Strict ladder (no partial bands) | 1.1% | 50% |

I recommend rule 4. It reaches near-ladder protection against guessing without punishing one slip as hard.

Two items per band can't be precise, which is why this is a range and a "provisional" label. The full test stays the level of record, and only the full test's result is used for the writing tier.

## Data model changes

Blobs documents have no fixed schema, so these are additive fields. Records without them are treated as today's full intake.

- **Question bank:**
  - Add `quick?: true` to the 12 items above.
  - Add `QUICK_TEST_VERSION = "fb-quick-v1"`.
- **Application:**
  - Add `intake_stage: "quick" | "full"`; missing means `"full"`.
  - Until the full intake, these fields are `null`: email, city, goals, self-reported level, format, frequency, package, payment, days, times and time zone. Their validators move to a second endpoint.
  - Country comes from the WhatsApp dial code, for example +20 is Egypt. City, and so Cairo versus elsewhere in Egypt, is asked in the full intake.
  - The price snapshot is taken only once a package is chosen.
- **Assessment:**
  - Add `quick: { answers, completed_at, provisional_level, scoring_method: "fb-quick-v1" } | null`.
  - The full test starts with those answers filled in.
- **API:**
  - `POST /api/applications/quick` (name, WhatsApp, consent).
  - `POST /api/assessment/quick` (12 answers).
  - `PUT /api/applications/intake` (the rest of the form).
  - All three sit behind `FEATURE_QUICK_CHECK`.
- **Events:** `quick_check_started` and `quick_check_completed`, plus `full_test_started` with `from: "quick"`.
- **Admin:**
  - A "Quick check only" badge.
  - The provisional range is shown next to the full result when there is one.
  - Follow-up templates already drop sentences with missing variables, so Message 1 works with only a name and a level.
- **Consent:**
  - New wording for the step 1 checkbox, because data is stored before the test. The version goes to `2026-11-enrollment-v3`, or v4 if attribution's v3 lands first.
  - The privacy page needs a line saying a quick-check lead may have only a name and a WhatsApp number.

## Migration plan

1. **Readers first.** The server, admin and results page tolerate `intake_stage`, the nullable intake fields and `assessment.quick`. Existing records are untouched and read as `"full"`. No backfill.
2. **Endpoints behind `FEATURE_QUICK_CHECK=false`.** Ship and test on a deploy preview with made-up leads.
3. **Approvals:** the consent and privacy wording, the scoring rule, and the retention for quick-only leads. I suggest 90 days instead of 12 months if they never finish the intake.
4. **Turn the flag on in production.**
   - Watch the Funnel view (quick started, then completed, then WhatsApp click, then full test).
   - Watch the waiting badge.
5. **Rollback:** set the flag off. Quick-only leads stay readable in the admin, and the retention job handles them like any other lead.
6. **Afterwards:** update `TEST_DURATION_COPY` (for example "Free. About 5 minutes to your level range.").

## Decisions needed

1. Recommended quick-check rule (rule 4), or another variant.
2. ~~Whether to also adopt `fb-objective-v2` for the full test.~~ Adopted.
3. Consent and privacy wording for step 1.
4. Retention for quick-only leads.
5. Whether email is still required before the full results, or WhatsApp alone is enough.

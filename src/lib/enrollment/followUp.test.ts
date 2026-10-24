import { describe, expect, it } from "vitest";
import {
  FALLBACK_TIP,
  renderFollowUp,
  renderSentences,
  strongestSkill,
  tipFor,
  topGap,
  upcomingDays,
  waitingLabel,
  waitingMinutes,
  NO_TEST_GRACE_MINUTES,
  WAITING_ALERT_MINUTES,
  whatsappUrl,
  type FollowUpInput,
} from "./followUp";

// Monday 19 October 2026, 10:00 in Cairo.
const NOW = new Date("2026-10-19T07:00:00Z");

const input = (over: Partial<FollowUpInput> = {}): FollowUpInput => ({
  full_name: "Sara Ali Hassan",
  primary_learning_goal: "career",
  other_goal_text: null,
  preferred_days: ["thu", "sat", "tue"],
  preferred_time_of_day: ["evening", "morning"],
  timezone: "Africa/Cairo",
  access_expires_at: "2026-11-18T09:00:00Z",
  access_revoked_at: null,
  category_scores: {
    grammar: { correct: 6, total: 12, percent: 50 },
    vocabulary: { correct: 4, total: 8, percent: 50 },
    reading: { correct: 4, total: 6, percent: 67 },
    usage: { correct: 1, total: 4, percent: 25 },
  },
  improvement_areas: ["Review the past simple (A2).", "Review first conditional (B1).", "Sentence construction & practical use: 1 of 4 correct."],
  trial_price: "100 EGP",
  test_completed: true,
  ...over,
});
const opts = { now: NOW, trialRefundCopy: false };

describe("follow-up messages", () => {
  it("renders message 1 with every variable", () => {
    expect(renderFollowUp(1, input(), opts)).toBe(
      "Hi Sara, it's Abdul from FluentBridges. I just looked at your placement test. Your reading comprehension is solid, and the fastest gain is the past simple. For job interviews and career development, I'd like to hear you speak and then send you a written plan. Does Tuesday at 17:00 work for a 30 minute trial? Reply YES and I'll send the link.",
    );
  });

  it("renders the tip for the top gap in message 2, with the next two preferred days", () => {
    expect(renderFollowUp(2, input(), opts)).toBe(
      "Hi Sara, one quick tip while you decide. Regular verbs add -ed. Irregular verbs change, so learn them in pairs. Example: I go to work today. I went to work yesterday. If you want a plan built around job interviews and career development, I have Tuesday at 17:00 or Thursday at 17:00 open this week.",
    );
  });

  it("adds the refund line to message 3 only when the flag is on", () => {
    expect(renderFollowUp(3, input(), opts)).toBe(
      "Sara, no pressure. The trial is 100 EGP and it's credited to your first package. Want me to hold Tuesday at 17:00 for you?",
    );
    expect(renderFollowUp(3, input(), { ...opts, trialRefundCopy: true })).toContain(
      "credited to your first package. If you don't leave with a clear plan, I refund it. Want me to hold",
    );
  });

  it("formats the access expiry date in message 4", () => {
    expect(renderFollowUp(4, input(), opts)).toBe(
      "Last message from me, Sara. Your results stay saved until 18 November 2026. If now isn't the right time, reply LATER and I'll check in next month.",
    );
  });

  it("keeps the top gap but drops the strength clause in message 1 when no skill reaches 50% and 4 correct", () => {
    const weak = { grammar: { correct: 4, total: 11, percent: 36 }, vocabulary: { correct: 2, total: 8, percent: 25 }, reading: { correct: 3, total: 6, percent: 50 }, usage: { correct: 1, total: 4, percent: 25 } };
    expect(renderFollowUp(1, input({ category_scores: weak }), opts)).toBe(
      "Hi Sara, it's Abdul from FluentBridges. I just looked at your placement test. The fastest gain is the past simple. For job interviews and career development, I'd like to hear you speak and then send you a written plan. Does Tuesday at 17:00 work for a 30 minute trial? Reply YES and I'll send the link.",
    );
    // With neither a strength nor a gap, the sentence goes entirely.
    expect(renderFollowUp(1, input({ category_scores: weak, improvement_areas: [] }), opts)).not.toMatch(/fastest gain|solid/);
    expect(renderSentences([["Use {a}.", "Use {b}."], "End."], { b: "B" })).toBe("Use B. End.");
  });

  it("drops sentences whose variables are missing and never sends braces", () => {
    const sparse = input({ preferred_days: [], trial_price: null, category_scores: null, improvement_areas: [], access_revoked_at: "2026-10-19T00:00:00Z" });
    const m1 = renderFollowUp(1, sparse, opts);
    expect(m1).not.toMatch(/solid|Does .* work/);
    expect(m1).toContain("For job interviews and career development");
    expect(renderFollowUp(3, sparse, opts)).toBe("Sara, no pressure.");
    expect(renderFollowUp(4, sparse, opts)).not.toContain("saved until");
    expect(renderFollowUp(2, input({ preferred_days: ["thu"] }), opts)).not.toContain("open this week");
    for (const n of [1, 2, 3, 4] as const) expect(renderFollowUp(n, sparse, opts)).not.toMatch(/[{}]/);
    expect(renderSentences(["Hi {nobody}.", "Plain {text}."], { text: "words {x}" })).toBe("Plain words x.");
  });

  it("uses the other-goal text, with only the first letter lowercased, when the goal is Other", () => {
    expect(renderFollowUp(1, input({ primary_learning_goal: "other", other_goal_text: "Medical English" }), opts)).toContain("For medical English,");
  });
});

describe("message 1 by test status", () => {
  const NO_TEST =
    "Hi Sara, it's Abdul from FluentBridges. Thanks for signing up. For job interviews and career development, the best way to start is a 30 minute video trial where I hear you speak and then send you a written plan. Does Tuesday at 17:00 work? Reply YES and I'll send the link.";

  it("test completed: talks about the placement test and the result", () => {
    const m1 = renderFollowUp(1, input(), opts);
    expect(m1).toContain("I just looked at your placement test.");
    expect(m1).toContain("Your reading comprehension is solid, and the fastest gain is the past simple.");
  });

  it("test not started: never mentions the test or a result", () => {
    const lead = input({ test_completed: false, category_scores: null, improvement_areas: [] });
    expect(renderFollowUp(1, lead, opts)).toBe(NO_TEST);
  });

  it("test started but not finished: ignores the partial scores", () => {
    // After the multiple-choice part, category scores exist even though the test isn't complete.
    const lead = input({ test_completed: false, improvement_areas: [] });
    const m1 = renderFollowUp(1, lead, opts);
    expect(m1).toBe(NO_TEST);
    expect(m1).not.toMatch(/placement test|result|solid|fastest gain|reading/i);
    // Message 2's tip falls back to the general one instead of using a gap from the unfinished test.
    expect(renderFollowUp(2, input({ test_completed: false }), opts)).toContain(FALLBACK_TIP.tip);
  });

  it("keeps each location's trial price behaviour in message 3, including no published price", () => {
    expect(renderFollowUp(3, input({ test_completed: false }), opts)).toContain("The trial is 100 EGP");
    expect(renderFollowUp(3, input({ test_completed: false, trial_price: null }), opts)).not.toContain("The trial is");
  });

  it("drops the slot sentence of the no-test message when there are no preferred days", () => {
    expect(renderFollowUp(1, input({ test_completed: false, preferred_days: [] }), opts)).not.toContain("Does");
  });
});

describe("template variables", () => {
  it("orders preferred days from tomorrow in the lead's time zone", () => {
    expect(upcomingDays(["mon", "thu", "sat", "tue"], NOW, "Africa/Cairo")).toEqual(["tue", "thu", "sat", "mon"]);
    // 23:30 Monday in UTC is already Tuesday in Tokyo.
    expect(upcomingDays(["tue", "wed"], new Date("2026-10-19T23:30:00Z"), "Asia/Tokyo")).toEqual(["wed", "tue"]);
    expect(upcomingDays(["tue"], NOW, "Not/AZone")).toEqual(["tue"]);
  });

  it("picks the strongest skill by percentage in plain words", () => {
    expect(strongestSkill(input().category_scores)).toMatchObject({ label: "reading comprehension", correct: 4, total: 6 });
    expect(strongestSkill({ ...input().category_scores!, usage: { correct: 4, total: 4, percent: 100 } })?.label).toBe(
      "sentence construction and practical use",
    );
    expect(strongestSkill(null)).toBeNull();
    // At least 50% and at least 4 correct.
    expect(strongestSkill({ ...input().category_scores!, reading: { correct: 3, total: 6, percent: 50 } })?.label).toBe("grammar");
    expect(
      strongestSkill({
        grammar: { correct: 4, total: 11, percent: 36 },
        vocabulary: { correct: 4, total: 9, percent: 44 },
        reading: { correct: 3, total: 4, percent: 75 },
        usage: { correct: 2, total: 4, percent: 50 },
      }),
    ).toBeNull();
  });

  it("reads the top gap from the first skill item and maps it to a tip", () => {
    expect(topGap(["2 questions were left unanswered, so your instructor may check these skills with you.", "Grammar: 2 of 12 correct."])).toBe("grammar");
    expect(topGap(["Review present simple questions (A1)."])).toBe("present simple questions");
    expect(tipFor("present simple questions").example).toBe("Where does she work? Do you live in Cairo?");
    expect(tipFor("the present continuous").tip).toMatch(/^Use am, is or are/);
    expect(tipFor("third conditional")).toEqual(FALLBACK_TIP);
    expect(tipFor(null)).toEqual(FALLBACK_TIP);
  });
});

describe("links and badges", () => {
  it("builds a wa.me link with digits only and an encoded message", () => {
    expect(whatsappUrl("+20 101 234 5678", "Hi Sara? Yes & no")).toBe("https://wa.me/201012345678?text=Hi%20Sara%3F%20Yes%20%26%20no");
  });

  it("counts waiting minutes only for completed tests with no follow-up", () => {
    // Completed test: from completion, whenever the lead signed up.
    const done = { completedAt: "2026-10-19T06:52:30Z", createdAt: "2026-10-19T06:00:00Z" };
    expect(waitingMinutes(done, 0, NOW)).toBe(7);
    expect(waitingMinutes({ ...done, createdAt: "2026-10-19T06:50:00Z" }, 0, NOW)).toBe(7);
    expect(waitingMinutes(done, 1, NOW)).toBeNull();
    // No completed test: nothing for 20 minutes after sign-up, then counted from there.
    const signedUp = (minutesAgo: number) => ({ completedAt: null, createdAt: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString() });
    expect(waitingMinutes(signedUp(19), 0, NOW)).toBeNull();
    expect(waitingMinutes(signedUp(20), 0, NOW)).toBe(0);
    expect(waitingMinutes(signedUp(24), 0, NOW)).toBe(4);
    expect(waitingMinutes(signedUp(25), 0, NOW)).toBe(WAITING_ALERT_MINUTES);
    expect(waitingMinutes(signedUp(90), 1, NOW)).toBeNull();
    expect(NO_TEST_GRACE_MINUTES).toBe(20);
    expect(waitingLabel(4)).toBe("waiting 4 min");
    expect(waitingLabel(125)).toBe("waiting 2 h 5 min");
    expect(waitingLabel(3000)).toBe("waiting 2 d");
  });
});

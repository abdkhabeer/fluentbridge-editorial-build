import { describe, expect, it } from "vitest";
import { buildPriceSnapshot, findPlan, perLessonPrice, tracks, trialLesson } from "./pricing";

// Published prices on fluentbridges.com (verified against the live site, Oct 2026).
const PUBLISHED: Record<string, number> = {
  "student-single": 200,
  "student-8": 1500,
  "student-12": 2200,
  "group-single": 150,
  "group-8": 1100,
  "group-12": 1500,
  "professional-single": 500,
  "professional-8": 3600,
  "professional-12": 5100,
  "business-single": 900,
  "business-8": 6800,
  "business-12": 9600,
};

describe("pricing data", () => {
  it("matches the published prices", () => {
    const all = tracks.flatMap((t) => t.plans);
    expect(Object.fromEntries(all.map((p) => [p.id, p.priceEgp]))).toEqual(PUBLISHED);
    expect(trialLesson.priceEgp).toBe(100);
    expect(trialLesson.minutes).toBe(30);
  });

  it("keeps display prices consistent with numeric prices", () => {
    for (const plan of tracks.flatMap((t) => t.plans)) {
      expect(Number(plan.price.replace(/,/g, "")), plan.id).toBe(plan.priceEgp);
      expect(Number(plan.title.match(/^(\d+) Lessons$/)?.[1] ?? 1), plan.id).toBe(plan.lessons);
    }
  });

  it("marks only small-group prices as per student", () => {
    for (const t of tracks) for (const p of t.plans) expect(p.perStudent).toBe(t.id === "group");
  });

  it("builds snapshots from the source data", () => {
    expect(buildPriceSnapshot("group-12")).toMatchObject({ price_egp: 1500, lessons: 12, per_lesson_egp: 125, per_student: true, validity_days: 30 });
    expect(buildPriceSnapshot("student-single")).toMatchObject({ price_egp: 200, validity_days: null });
    expect(buildPriceSnapshot("trial")).toMatchObject({ price_egp: 100, duration_minutes: 30 });
    expect(buildPriceSnapshot("help")).toBeNull();
    expect(perLessonPrice(findPlan("student-12")!.plan)).toBe(183.33);
  });
});

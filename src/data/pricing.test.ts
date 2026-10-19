import { describe, expect, it } from "vitest";
import {
  HARD_CURRENCY_LIST_PRICE,
  PLAN_DISCOUNTS,
  TRIAL_PRICES,
  allTracks,
  buildPriceSnapshot,
  describeSnapshot,
  displayAmount,
  findPlan,
  formatMoney,
  getRegion,
  inquiryFor,
  isKnownPackageId,
  packageLocationError,
  perLessonPrice,
  pricingRegions,
  regionForLocation,
  formatPerClass,
  planPrice,
  savingsAmount,
  trialLesson,
  trialPriceFor,
  type PriceSnapshot,
  type RegionId,
} from "./pricing";

const amounts = (region: RegionId) =>
  Object.fromEntries(getRegion(region).tracks.flatMap((t) => t.plans).map((p) => [p.id, `${p.amount} ${p.currency}`]));

describe("published prices", () => {
  it("Cairo prices are exactly 200, 1,500 and 2,200 EGP, and the other Cairo tracks are unchanged", () => {
    expect(amounts("cairo")).toEqual({
      "student-single": "200 EGP",
      "student-8": "1500 EGP",
      "student-12": "2200 EGP",
      "group-single": "150 EGP",
      "group-8": "1100 EGP",
      "group-12": "1500 EGP",
      "professional-single": "500 EGP",
      "professional-8": "3600 EGP",
      "professional-12": "5100 EGP",
      "business-single": "900 EGP",
      "business-8": "6800 EGP",
      "business-12": "9600 EGP",
    });
    expect(getRegion("cairo").heading).toBe("Special Pricing for Students in Cairo");
    expect(trialLesson).toMatchObject({ id: "trial", amount: 100, currency: "EGP", minutes: 30, price: "100 EGP / 30 minutes" });
  });

  it("hard-currency grid: USD 20 / 228 / 360, SAR 75 / 855 / 1,350, GBP 15 / 170 / 265", () => {
    expect(amounts("us")).toEqual({ "us-single": "20 USD", "us-monthly-3": "228 USD", "us-monthly-5": "360 USD" });
    expect(amounts("ksa")).toEqual({ "ksa-single": "75 SAR", "ksa-monthly-3": "855 SAR", "ksa-monthly-5": "1350 SAR" });
    expect(amounts("uk")).toEqual({ "uk-single": "15 GBP", "uk-monthly-3": "170 GBP", "uk-monthly-5": "265 GBP" });
    expect(getRegion("us").tracks[0].plans.map(displayAmount)).toEqual(["$20", "$228", "$360"]);
  });

  it("derives plan prices from one list price per currency", () => {
    expect(HARD_CURRENCY_LIST_PRICE).toEqual({ USD: 20, SAR: 75, GBP: 15 });
    expect(PLAN_DISCOUNTS).toEqual({ 12: 0.05, 20: 0.1 });
    expect(planPrice("USD", 12)).toBe(Math.round(20 * 12 * 0.95));
    expect(planPrice("SAR", 20)).toBe(Math.round(75 * 20 * 0.9));
    // GBP is a placeholder override; the rule alone would give 171 and 270.
    expect([planPrice("GBP", 12), planPrice("GBP", 20)]).toEqual([170, 265]);
  });

  it("4-week plans are 12 or 20 classes, clearly labelled, with computed per-class prices and savings", () => {
    const [single, twelve, twenty] = getRegion("us").tracks[0].plans;
    expect(single).toMatchObject({ billing: "package", lessons: 1, unit: "USD" });
    expect(twelve).toMatchObject({ billing: "monthly", classesPerWeek: 3, lessons: 12, label: "4-Week Plan", title: "12 Classes per 4 Weeks", unit: "USD per 4 weeks" });
    expect(twenty).toMatchObject({ classesPerWeek: 5, lessons: 20, title: "20 Classes per 4 Weeks" });
    expect(twelve.duration).toBe("$19 USD per class · 60 minutes each");
    expect(twelve.features[0]).toBe("Save $12 USD");
    expect(twenty.features[0]).toBe("Save $40 USD");
    const [, sar12, sar20] = getRegion("ksa").tracks[0].plans;
    expect([sar12.features[0], sar20.features[0]]).toEqual(["Save 45 SAR", "Save 150 SAR"]);
    const [, gbp12, gbp20] = getRegion("uk").tracks[0].plans;
    expect([gbp12.duration, gbp20.features[0]]).toEqual(["≈ 14.17 GBP per class · 60 minutes each", "Save 35 GBP"]);
  });

  it("computes Cairo per-lesson prices and savings instead of hardcoding them", () => {
    const cairo = Object.fromEntries(getRegion("cairo").tracks.flatMap((t) => t.plans).map((p) => [p.id, p]));
    expect(cairo["student-8"].duration).toBe("187.50 EGP per lesson");
    expect(cairo["student-12"].duration).toBe("≈ 183.33 EGP per lesson");
    expect(cairo["group-12"].duration).toBe("125 EGP per lesson, per student");
    expect(cairo["group-single"].features[0]).toBe("150 EGP per student");
    const saves = Object.fromEntries(Object.values(cairo).filter((p) => p.lessons > 1).map((p) => [p.id, p.features[0]]));
    expect(saves).toEqual({
      "business-8": "Save 400 EGP", "business-12": "Save 1,200 EGP",
      "professional-8": "Save 400 EGP", "professional-12": "Save 900 EGP",
      "group-8": "Save 100 EGP per student", "group-12": "Save 300 EGP per student",
      "student-8": "Save 100 EGP", "student-12": "Save 200 EGP",
    });
    expect(savingsAmount(200, { amount: 2200, lessons: 12 })).toBe(200);
    expect(formatPerClass(1500, 8, "EGP")).toBe("187.50 EGP");
    expect(formatPerClass(228, 12, "USD")).toBe("$19 USD");
  });

  it("orders Cairo tracks Business, Professional, Small Group, Student, and renames the student tier", () => {
    const tracks = getRegion("cairo").tracks;
    expect(tracks.map((t) => t.heading)).toEqual(["Business English", "Professional English", "Small Group English", "Student English"]);
    expect(tracks[3].blurb).toBe("Reduced rate for school and university students. Student ID required. Limited places each month.");
    expect(JSON.stringify(tracks)).not.toContain("anyone building everyday fluency");
    expect(getRegion("cairo").paymentMethods).toContain("InstaPay");
  });

  it("offers a 30-minute trial in each currency, credited to the first package", () => {
    expect(TRIAL_PRICES).toEqual({ EGP: 100, USD: 10, SAR: 38, GBP: 8 });
    expect(pricingRegions.map((r) => [r.id, r.trial && `${r.trial.id} ${r.trial.amount} ${r.trial.currency}`])).toEqual([
      ["cairo", "trial 100 EGP"], ["egypt-other", null], ["ksa", "ksa-trial 38 SAR"], ["us", "us-trial 10 USD"], ["uk", "uk-trial 8 GBP"], ["other", null],
    ]);
    expect(getRegion("uk").trial!.description).toMatch(/credited toward your first package/);
    expect(trialPriceFor("United States", "Boston")).toBe("$10 USD");
    expect(trialPriceFor("Egypt", "Giza")).toBeNull();
  });

  it("keeps card titles consistent with lesson counts", () => {
    for (const plan of allTracks.flatMap((t) => t.plans).filter((p) => p.billing === "package")) {
      expect(Number(plan.title.match(/^(\d+) Lessons$/)?.[1] ?? 1), plan.id).toBe(plan.lessons);
    }
  });

  it("marks only small-group prices as per student", () => {
    for (const t of allTracks) for (const p of t.plans) expect(p.perStudent).toBe(t.id === "group");
  });

  it("never shows a location another currency's prices", () => {
    for (const r of pricingRegions) {
      for (const p of r.tracks.flatMap((t) => t.plans)) expect(p.currency, `${r.id}/${p.id}`).toBe(r.currency);
    }
    const ids = allTracks.flatMap((t) => t.plans.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("locations without published prices", () => {
  it("other locations in Egypt get the pricing inquiry, not Cairo prices", () => {
    const r = getRegion("egypt-other");
    expect(r.tracks).toEqual([]);
    expect(r.trial).toBeNull();
    expect(`${r.inquiry.heading} ${r.inquiry.body}`).toBe(
      "Looking for English lessons outside Cairo? Contact us for pricing based on your location and learning goals.",
    );
    expect(r.inquiry).toMatchObject({ cta: "Request Pricing", type: "egypt-pricing", country: "Egypt" });
  });

  it("the UK has published GBP plans instead of an inquiry", () => {
    expect(getRegion("uk").currency).toBe("GBP");
    expect(isKnownPackageId("uk-single")).toBe(true);
    expect(inquiryFor("uk-pricing")).toBeNull();
  });

  it("other countries get the consultation", () => {
    const r = getRegion("other");
    expect(r.tracks).toEqual([]);
    expect(r.inquiry.heading).toBe("Studying from another country? Let's find the right plan and currency for you.");
    expect(r.inquiry.body).toBe(
      "Tell us where you're based and what you want to achieve. We'll assess your needs and provide suitable pricing in your currency.",
    );
    expect(r.inquiry.cta).toBe("Request a Consultation");
  });

  it("maps contact-form request types only to locations without prices", () => {
    expect(inquiryFor("egypt-pricing")?.country).toBe("Egypt");
    expect(inquiryFor("consultation")?.country).toBe("");
    expect(inquiryFor("bogus")).toBeNull();
  });
});

describe("location matching", () => {
  it.each([
    ["Egypt", "Cairo", "cairo"],
    ["Egypt", "New Cairo", "cairo"],
    ["Egypt", "  cairo, egypt ", "cairo"],
    ["Egypt", "القاهرة", "cairo"],
    ["Egypt", "Maadi", "cairo"],
    ["Egypt", "Nasr City", "cairo"],
    ["Egypt", "Giza", "egypt-other"],
    ["Egypt", "6th of October", "egypt-other"],
    ["Egypt", "Alexandria", "egypt-other"],
    ["Egypt", "", "egypt-other"],
    ["Saudi Arabia", "Riyadh", "ksa"],
    ["United States", "Boston", "us"],
    ["USA", "", "us"],
    ["United Kingdom", "London", "uk"],
    ["England", "", "uk"],
    ["Germany", "Berlin", "other"],
    ["Monaco", "", "other"],
    ["", "", "other"],
  ])("%s / %s → %s", (country, city, region) => {
    expect(regionForLocation(country, city)).toBe(region);
  });

  it("allows a package only for its own location", () => {
    expect(packageLocationError("student-8", "Egypt", "Cairo")).toBeNull();
    expect(packageLocationError("student-8", "Egypt", "Giza")).toMatch(/Cairo prices are for students in Cairo/);
    expect(packageLocationError("student-8", "Germany", "Berlin")).toMatch(/priced for students in Cairo/);
    expect(packageLocationError("trial", "Saudi Arabia", "Riyadh")).toMatch(/in Cairo/);
    expect(packageLocationError("ksa-monthly-3", "Saudi Arabia", "Jeddah")).toBeNull();
    expect(packageLocationError("ksa-monthly-3", "United States", "Boston")).toMatch(/in Saudi Arabia/);
    expect(packageLocationError("us-single", "United Kingdom", "London")).toMatch(/in the United States/);
    expect(packageLocationError("help", "Monaco", "")).toBeNull();
  });
});

describe("snapshots and formatting", () => {
  it("builds snapshots from the source data", () => {
    expect(buildPriceSnapshot("group-12")).toMatchObject({
      price_egp: 1500, price: 1500, currency: "EGP", lessons: 12, per_lesson_egp: 125, per_student: true, validity_days: 30, region_id: "cairo",
    });
    expect(buildPriceSnapshot("student-single")).toMatchObject({ price_egp: 200, validity_days: null });
    expect(buildPriceSnapshot("trial")).toMatchObject({ price_egp: 100, duration_minutes: 30 });
    expect(buildPriceSnapshot("help")).toBeNull();
    expect(perLessonPrice(findPlan("student-12")!.plan)).toBe(183.33);
  });

  it("snapshots store the plan id and currency for SAR, USD and GBP plans, with no EGP price", () => {
    expect(buildPriceSnapshot("ksa-monthly-5")).toMatchObject({
      package_id: "ksa-monthly-5", currency: "SAR", price: 1350, per_lesson_price: 67.5, price_egp: null, billing: "monthly", classes_per_week: 5, lessons: 20, region_id: "ksa",
    });
    expect(buildPriceSnapshot("uk-monthly-3")).toMatchObject({ package_id: "uk-monthly-3", currency: "GBP", price: 170, lessons: 12, region_id: "uk" });
    expect(buildPriceSnapshot("us-trial")).toMatchObject({ package_id: "us-trial", currency: "USD", price: 10, price_egp: null, duration_minutes: 30, region_id: "us" });
    expect(describeSnapshot(buildPriceSnapshot("us-monthly-3")!)).toBe("One-on-One English, United States (USD), 12 Classes per 4 Weeks: $228 USD per 4 weeks");
    expect(describeSnapshot(buildPriceSnapshot("ksa-single")!)).toBe("One-on-One English, Saudi Arabia (SAR), Single Lesson: 75 SAR");
    expect(describeSnapshot(buildPriceSnapshot("uk-trial")!)).toBe("Trial Lesson: 8 GBP for 30 minutes");
  });

  it("reads snapshots saved before multi-currency pricing as EGP", () => {
    const legacy: PriceSnapshot = {
      package_id: "student-8", track_id: "student", track_heading: "Egyptian Student & General English", title: "8 Lessons", lessons: 8,
      price_egp: 1500, per_lesson_egp: 187.5, per_student: false, validity_days: 30, duration_minutes: 60,
    };
    expect(describeSnapshot(legacy)).toBe("Egyptian Student & General English, 8 Lessons: 1,500 EGP (187.5 EGP per lesson, valid 30 days)");
  });

  it("always shows the currency code", () => {
    expect(formatMoney(1500, "EGP")).toBe("1,500 EGP");
    expect(formatMoney(450, "SAR")).toBe("450 SAR");
    expect(formatMoney(120, "USD")).toBe("$120 USD");
  });
});

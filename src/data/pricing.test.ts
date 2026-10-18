import { describe, expect, it } from "vitest";
import {
  UK_GBP_PRICING,
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
  trialLesson,
  ukTracksFor,
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
    expect(trialLesson).toMatchObject({ amount: 100, currency: "EGP", minutes: 30 });
  });

  it("Saudi Arabia prices are exactly 40, 450 and 680 SAR", () => {
    expect(amounts("ksa")).toEqual({ "ksa-single": "40 SAR", "ksa-monthly-3": "450 SAR", "ksa-monthly-5": "680 SAR" });
  });

  it("United States prices are exactly $10, $120 and $180 USD", () => {
    expect(amounts("us")).toEqual({ "us-single": "10 USD", "us-monthly-3": "120 USD", "us-monthly-5": "180 USD" });
    expect(getRegion("us").tracks[0].plans.map(displayAmount)).toEqual(["$10", "$120", "$180"]);
  });

  it("monthly plans are 3 or 5 classes per week, 12 or 20 classes per 4-week billing period, and clearly labelled", () => {
    for (const region of ["ksa", "us"] as const) {
      const [single, three, five] = getRegion(region).tracks[0].plans;
      expect(single).toMatchObject({ billing: "package", lessons: 1 });
      expect(three).toMatchObject({ billing: "monthly", classesPerWeek: 3, lessons: 12, label: "Monthly Plan" });
      expect(five).toMatchObject({ billing: "monthly", classesPerWeek: 5, lessons: 20, label: "Monthly Plan" });
      expect(three.unit).toMatch(/per month$/);
      expect(three.features).toContain("12 classes per 4-week billing period");
      expect(five.features).toContain("20 classes per 4-week billing period");
    }
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
    expect(r.trial).toBe(false);
    expect(`${r.inquiry.heading} ${r.inquiry.body}`).toBe(
      "Looking for English lessons outside Cairo? Contact us for pricing based on your location and learning goals.",
    );
    expect(r.inquiry).toMatchObject({ cta: "Request Pricing", type: "egypt-pricing", country: "Egypt" });
  });

  it("the UK shows the GBP inquiry until GBP prices are approved", () => {
    expect(UK_GBP_PRICING.approved).toBe(false);
    const r = getRegion("uk");
    expect(r.tracks).toEqual([]);
    expect(r.currency).toBeNull();
    expect(`${r.inquiry.heading} ${r.inquiry.body}`).toBe("Based in the UK? Contact us for English lesson pricing in GBP.");
    expect(r.inquiry).toMatchObject({ cta: "Request UK Pricing", type: "uk-pricing", country: "United Kingdom", currency: "GBP" });
    expect(isKnownPackageId("uk-single")).toBe(false);
  });

  it("GBP prices publish only when approved and complete", () => {
    expect(ukTracksFor({ approved: false, prices: { single: 20, threePerWeek: 200, fivePerWeek: 300 } })).toEqual([]);
    expect(ukTracksFor({ approved: true, prices: { single: 20, threePerWeek: null, fivePerWeek: 300 } })).toEqual([]);
    const [track] = ukTracksFor({ approved: true, prices: { single: 20, threePerWeek: 200, fivePerWeek: 300 } });
    expect(track.plans.map((p) => `${p.id} ${p.amount} ${p.currency}`)).toEqual(["uk-single 20 GBP", "uk-monthly-3 200 GBP", "uk-monthly-5 300 GBP"]);
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
    expect(inquiryFor("uk-pricing")?.currency).toBe("GBP");
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

  it("records the currency and plan type for SAR and USD plans, with no EGP price", () => {
    expect(buildPriceSnapshot("ksa-monthly-5")).toMatchObject({
      currency: "SAR", price: 680, price_egp: null, billing: "monthly", classes_per_week: 5, lessons: 20, validity_days: null, region_id: "ksa",
    });
    expect(describeSnapshot(buildPriceSnapshot("us-monthly-3")!)).toBe(
      "One-on-One English, United States (USD), Monthly plan, 3 Classes per Week: $120 USD per month (12 classes per 4-week billing period)",
    );
    expect(describeSnapshot(buildPriceSnapshot("ksa-single")!)).toBe("One-on-One English, Saudi Arabia (SAR), Single Lesson: 40 SAR");
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

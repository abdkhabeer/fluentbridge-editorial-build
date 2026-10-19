// Single source of truth for published lesson pricing, by student location.
// Rendered by PricingSection and the FAQ, offered in the enrollment funnel,
// and snapshotted server-side when an application is saved. Which prices a
// student may choose is decided here too (packageLocationError), so the funnel
// and the server apply the same rule. src/data/pricing.test.ts pins every
// published amount.
//
// Prices are never converted between currencies. Per-class prices and "Save"
// amounts are computed here, never typed in by hand. A location without approved
// prices shows a request-pricing or consultation option instead.

export type Currency = "EGP" | "SAR" | "USD" | "GBP";
export type RegionId = "cairo" | "egypt-other" | "ksa" | "us" | "uk" | "other";
export type TrackId = "student" | "group" | "professional" | "business" | "ksa" | "us" | "uk";
/** "package": a fixed number of lessons. "monthly": a recurring plan billed every 4 weeks. */
export type Billing = "package" | "monthly";
export type InquiryType = "egypt-pricing" | "uk-pricing" | "consultation";

export type Plan = {
  id: string;
  /** Lessons in the package, or classes in one billing period for monthly plans. */
  lessons: number;
  amount: number;
  currency: Currency;
  billing: Billing;
  /** Monthly plans only. */
  classesPerWeek: number | null;
  perStudent: boolean;
  label: string;
  title: string;
  unit: string;
  duration: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

export type Track = {
  id: TrackId;
  heading: string;
  blurb: string;
  plans: Plan[];
};

export type Inquiry = {
  type: InquiryType;
  heading: string;
  body: string;
  cta: string;
  /** Short description of the request, shown on the contact form and sent with it. */
  requestLabel: string;
  /** Contact-form prefills. */
  country: string;
  currency: Currency | "";
};

export type PricingRegion = {
  id: RegionId;
  /** Location selector label. */
  label: string;
  /** The enrollment form's country for this location ("" for other countries). */
  country: string;
  heading: string;
  intro: string;
  /** Currency of the published prices, or null when prices are given on request. */
  currency: Currency | null;
  /** Published prices. Empty means the region shows `inquiry` instead. */
  tracks: Track[];
  inquiry: Inquiry;
  /** The trial lesson offered here, or null. */
  trial: TrialLesson | null;
  /** Payment methods listed on the pricing section. */
  paymentMethods: string[];
  notes: string[];
};

export const PACKAGE_VALIDITY_DAYS = 30;
/** A 4-week plan's billing period: classes per week × 4 weeks. */
export const BILLING_PERIOD_WEEKS = 4;
const LESSON_MINUTES = 60;
const TRIAL_MINUTES = 30;
const CTA = "Choose & Start Enrollment";

const formatNumber = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** "1,500 EGP", "450 SAR", "$120 USD". Always shows the currency code. */
export const formatMoney = (n: number, currency: Currency) =>
  currency === "USD" ? `$${formatNumber(n)} USD` : `${formatNumber(n)} ${currency}`;

/** Price per class, to two decimals, marked "≈" when rounded ("187.50 EGP", "≈ 183.33 EGP", "$19 USD"). */
export const formatPerClass = (amount: number, classes: number, currency: Currency) => {
  const exact = amount / classes;
  const rounded = Math.round(exact * 100) / 100;
  const text = Number.isInteger(rounded)
    ? formatNumber(rounded)
    : rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = currency === "USD" ? `$${text} USD` : `${text} ${currency}`;
  return rounded === exact ? money : `≈ ${money}`;
};

/** What a package saves compared with buying the same number of single lessons. */
export const savingsAmount = (singleAmount: number, plan: Pick<Plan, "amount" | "lessons">) => singleAmount * plan.lessons - plan.amount;

const savingsLabel = (singleAmount: number, plan: Plan) => {
  const saved = savingsAmount(singleAmount, plan);
  return saved > 0 ? `Save ${formatMoney(saved, plan.currency)}${plan.perStudent ? " per student" : ""}` : null;
};

// ── Cairo, Egypt (EGP) ──
// Do not change these amounts without the owner's approval. Per-lesson prices
// and "Save" amounts are computed from them.

type CairoPlanCopy = Pick<Plan, "label" | "description" | "features" | "highlight">;

const cairoTrack = (t: {
  id: TrackId;
  heading: string;
  blurb: string;
  perStudent: boolean;
  prices: { single: number; eight: number; twelve: number };
  singleDuration: string;
  copy: [CairoPlanCopy, CairoPlanCopy, CairoPlanCopy];
}): Track => {
  const unit = t.perStudent ? "EGP per student" : "EGP";
  const base = { currency: "EGP" as const, billing: "package" as const, classesPerWeek: null, perStudent: t.perStudent, unit, cta: CTA };
  const single: Plan = {
    ...base,
    ...t.copy[0],
    id: `${t.id}-single`,
    lessons: 1,
    amount: t.prices.single,
    title: "Single Lesson",
    duration: t.singleDuration,
    features: t.perStudent ? [`${formatMoney(t.prices.single, "EGP")} per student`, ...t.copy[0].features] : t.copy[0].features,
  };
  const pack = (lessons: 8 | 12, amount: number, copy: CairoPlanCopy): Plan => {
    const plan: Plan = { ...base, ...copy, id: `${t.id}-${lessons}`, lessons, amount, title: `${lessons} Lessons`, duration: "" };
    plan.duration = `${formatPerClass(amount, lessons, "EGP")} per lesson${t.perStudent ? ", per student" : ""}`;
    const saved = savingsLabel(t.prices.single, plan);
    plan.features = saved ? [saved, ...copy.features] : copy.features;
    return plan;
  };
  return { id: t.id, heading: t.heading, blurb: t.blurb, plans: [single, pack(8, t.prices.eight, t.copy[1]), pack(12, t.prices.twelve, t.copy[2])] };
};

const cairoTracks: Track[] = [
  cairoTrack({
    id: "business",
    heading: "Business English",
    blurb: "The premium offering, for executives, entrepreneurs, managers, and teams who need advanced English for business.",
    perStudent: false,
    prices: { single: 900, eight: 6800, twelve: 9600 },
    singleDuration: "60 minutes",
    copy: [
      {
        label: "Premium",
        description: "Advanced business communication, negotiation, and executive presence.",
        features: ["Tailored to your company", "Feedback after each session"],
        highlight: false,
      },
      {
        label: "Most Popular",
        description: "High-intensity coaching for meetings, pitches, and negotiations.",
        features: ["Priority scheduling", "Monthly progress review"],
        highlight: true,
      },
      {
        label: "Best Value",
        description: "A full programme for sustained executive-level communication.",
        features: ["Fully customized curriculum", "One free make-up lesson"],
        highlight: false,
      },
    ],
  }),
  cairoTrack({
    id: "professional",
    heading: "Professional English",
    blurb: "For career development, workplace communication, interviews, presentations, and meetings.",
    perStudent: false,
    prices: { single: 500, eight: 3600, twelve: 5100 },
    singleDuration: "60 minutes",
    copy: [
      {
        label: "Professional",
        description: "Focused coaching built around your role and your career goals.",
        features: ["Industry-specific vocabulary", "Real materials from your work"],
        highlight: false,
      },
      {
        label: "Most Popular",
        description: "A focused block to sharpen how you speak and write at work.",
        features: ["Interview & presentation prep", "Priority scheduling"],
        highlight: true,
      },
      {
        label: "Best Value",
        description: "Built around a specific role, deadline, or promotion.",
        features: ["Fully customized curriculum", "One free make-up lesson"],
        highlight: false,
      },
    ],
  }),
  cairoTrack({
    id: "group",
    heading: "Small Group English",
    blurb: "Groups of 2–4 students. All prices below are per student, not per group. Each student pays their own rate.",
    perStudent: true,
    prices: { single: 150, eight: 1100, twelve: 1500 },
    singleDuration: "60 minutes · 2–4 students per group",
    copy: [
      {
        label: "2–4 Students",
        description: "Practice English in a social setting at the most affordable rate.",
        features: ["Shared speaking practice"],
        highlight: false,
      },
      {
        label: "Most Popular",
        description: "A steady weekly rhythm for a study group, colleagues, or friends.",
        features: ["Priority scheduling", "Monthly progress review"],
        highlight: true,
      },
      {
        label: "Best Value",
        description: "The lowest per-lesson rate offered by FluentBridges.",
        features: ["Priority scheduling", "One free make-up lesson"],
        highlight: false,
      },
    ],
  }),
  cairoTrack({
    id: "student",
    heading: "Student English",
    blurb: "Reduced rate for school and university students. Student ID required. Limited places each month.",
    perStudent: false,
    prices: { single: 200, eight: 1500, twelve: 2200 },
    singleDuration: "60 minutes",
    copy: [
      {
        label: "Student Rate",
        description: "One-on-one instruction tailored to your goals. No package required.",
        features: ["Fully personalized lesson", "Feedback after each session"],
        highlight: false,
      },
      {
        label: "Most Popular",
        description: "Consistent weekly practice for real, measurable progress.",
        features: ["Priority scheduling", "Monthly progress review"],
        highlight: true,
      },
      {
        label: "Best Value",
        description: "Long-term practice at the lowest per-lesson rate.",
        features: ["Priority scheduling", "One free make-up lesson"],
        highlight: false,
      },
    ],
  }),
];

// ── Trial lessons ──

export type TrialLesson = {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  minutes: number;
  /** "100 EGP / 30 minutes" */
  price: string;
  description: string;
};

/** 30-minute trial lesson prices. The fee is credited to the student's first package. */
export const TRIAL_PRICES: Record<Currency, number> = { EGP: 100, USD: 10, SAR: 38, GBP: 8 };

const trialFor = (id: string, currency: Currency, credit: string): TrialLesson => ({
  id,
  title: "Trial Lesson",
  amount: TRIAL_PRICES[currency],
  currency,
  minutes: TRIAL_MINUTES,
  price: `${formatMoney(TRIAL_PRICES[currency], currency)} / ${TRIAL_MINUTES} minutes`,
  description: `A relaxed ${TRIAL_MINUTES}-minute first session to assess your level and discuss your goals, not a full ${LESSON_MINUTES}-minute lesson. The ${formatMoney(TRIAL_PRICES[currency], currency)} fee is credited toward ${credit} if you enroll.`,
});

/** The Cairo (EGP) trial. Its id stays "trial" so existing applications keep their meaning. */
export const trialLesson = trialFor("trial", "EGP", "your first 8- or 12-lesson package");

// ── Saudi Arabia (SAR), United States (USD), United Kingdom (GBP) ──

export type HardCurrency = Exclude<Currency, "EGP">;
type InternationalTrackId = "ksa" | "us" | "uk";
/** Classes in each 4-week plan (3 or 5 classes per week). */
export type PlanSize = 12 | 20;

/**
 * List price of one class in each hard currency. Single lessons cost this, and
 * 4-week plans are discounted from it (PLAN_DISCOUNTS), so changing USD from
 * 20 to 28 is this one edit.
 */
export const HARD_CURRENCY_LIST_PRICE: Record<HardCurrency, number> = { USD: 20, SAR: 75, GBP: 15 };

/** Discount on the list price for each 4-week plan. */
export const PLAN_DISCOUNTS: Record<PlanSize, number> = { 12: 0.05, 20: 0.1 };

/**
 * Plan prices that don't follow the discount rule. GBP is a placeholder until
 * the owner confirms it (the rule would give 171 and 270).
 */
const PLAN_PRICE_OVERRIDES: Partial<Record<HardCurrency, Record<PlanSize, number>>> = { GBP: { 12: 170, 20: 265 } };

export const planPrice = (currency: HardCurrency, classes: PlanSize) =>
  PLAN_PRICE_OVERRIDES[currency]?.[classes] ?? Math.round(HARD_CURRENCY_LIST_PRICE[currency] * classes * (1 - PLAN_DISCOUNTS[classes]));

const singleLesson = (id: InternationalTrackId, currency: HardCurrency): Plan => ({
  id: `${id}-single`,
  lessons: 1,
  amount: HARD_CURRENCY_LIST_PRICE[currency],
  currency,
  billing: "package",
  classesPerWeek: null,
  perStudent: false,
  label: "Pay as You Go",
  title: "Single Lesson",
  unit: currency,
  duration: `${LESSON_MINUTES} minutes`,
  description: "One-on-one instruction tailored to your goals. No plan required.",
  features: ["Fully personalized lesson", "Feedback after each session"],
  cta: CTA,
  highlight: false,
});

const fourWeekPlan = (id: InternationalTrackId, currency: HardCurrency, classesPerWeek: 3 | 5): Plan => {
  const lessons = (classesPerWeek * BILLING_PERIOD_WEEKS) as PlanSize;
  const plan: Plan = {
    // Ids keep "monthly" so earlier applications still match.
    id: `${id}-monthly-${classesPerWeek}`,
    lessons,
    amount: planPrice(currency, lessons),
    currency,
    billing: "monthly",
    classesPerWeek,
    perStudent: false,
    label: "4-Week Plan",
    title: `${lessons} Classes per 4 Weeks`,
    unit: `${currency} per 4 weeks`,
    duration: "",
    description: `${classesPerWeek} one-on-one lessons every week, billed every ${BILLING_PERIOD_WEEKS} weeks.`,
    features: [],
    cta: CTA,
    highlight: false,
  };
  plan.duration = `${formatPerClass(plan.amount, lessons, currency)} per class · ${LESSON_MINUTES} minutes each`;
  const saved = savingsLabel(HARD_CURRENCY_LIST_PRICE[currency], plan);
  plan.features = [...(saved ? [saved] : []), `${classesPerWeek} classes per week`, `Billed every ${BILLING_PERIOD_WEEKS} weeks`];
  return plan;
};

const internationalTrack = (id: InternationalTrackId, place: string, currency: HardCurrency): Track => ({
  id,
  heading: `One-on-One English, ${place} (${currency})`,
  blurb: `Single lessons, or a 4-week plan of 12 or 20 classes.`,
  plans: [singleLesson(id, currency), fourWeekPlan(id, currency, 3), fourWeekPlan(id, currency, 5)],
});

// ── Locations ──

const ONLINE_NOTES = ["Lessons conducted via Zoom or Google Meet", "All levels welcome, from beginner to advanced"];

const internationalNotes = (currency: HardCurrency) => [
  `All prices are in ${currency}`,
  `4-week plans include 12 classes (3 per week) or 20 classes (5 per week)`,
  `Lessons are ${LESSON_MINUTES} minutes`,
  `Trial lessons are ${TRIAL_MINUTES} minutes, and the ${formatMoney(TRIAL_PRICES[currency], currency)} fee is credited to your first package`,
  "24-hour cancellation policy",
  ...ONLINE_NOTES,
];

const inquiryNotes = ["Asking for pricing is free, and nothing is booked until you confirm", ...ONLINE_NOTES];

const INTERNATIONAL_PAYMENT = ["PayPal", "Stripe", "Wise"];

const internationalRegion = (id: InternationalTrackId, label: string, country: string, place: string, currency: HardCurrency, currencyName: string, inquiry: Inquiry): PricingRegion => ({
  id,
  label,
  country,
  heading: `Pricing for Students in ${place}`,
  intro: `Live one-on-one lessons priced in ${currencyName} (${currency}). Choose single lessons or a 4-week plan.`,
  currency,
  tracks: [internationalTrack(id, label, currency)],
  inquiry,
  trial: trialFor(`${id}-trial`, currency, "your first package"),
  paymentMethods: INTERNATIONAL_PAYMENT,
  notes: internationalNotes(currency),
});

export const pricingRegions: PricingRegion[] = [
  {
    id: "cairo",
    label: "Cairo, Egypt",
    country: "Egypt",
    heading: "Special Pricing for Students in Cairo",
    intro:
      "Rates depend on the kind of coaching you need: Business English, Professional English, Small Group English, or Student English. Packages are valid for 30 days from purchase.",
    currency: "EGP",
    tracks: cairoTracks,
    inquiry: {
      type: "egypt-pricing",
      heading: "Looking for English lessons outside Cairo?",
      body: "Contact us for pricing based on your location and learning goals.",
      cta: "Request Pricing",
      requestLabel: "Pricing for students outside Cairo",
      country: "Egypt",
      currency: "EGP",
    },
    trial: trialLesson,
    paymentMethods: ["Vodafone Cash", "InstaPay", "PayPal", "Stripe", "Wise (international students)"],
    notes: [
      "Packages are valid for 30 days from purchase",
      "Trial lessons are 30 minutes, not a full 60-minute lesson",
      `The ${formatMoney(trialLesson.amount, "EGP")} trial fee is credited toward your first 8- or 12-lesson package`,
      "Small group rates are per student, for groups of 2–4",
      "24-hour cancellation policy",
      ...ONLINE_NOTES,
    ],
  },
  {
    id: "egypt-other",
    label: "Other locations in Egypt",
    country: "Egypt",
    heading: "English Lessons Elsewhere in Egypt",
    intro: "Our Cairo rates apply to students in Cairo. For other cities and governorates, we'll confirm pricing with you individually.",
    currency: null,
    tracks: [],
    inquiry: {
      type: "egypt-pricing",
      heading: "Looking for English lessons outside Cairo?",
      body: "Contact us for pricing based on your location and learning goals.",
      cta: "Request Pricing",
      requestLabel: "Pricing for students outside Cairo",
      country: "Egypt",
      currency: "EGP",
    },
    trial: null,
    paymentMethods: [],
    notes: inquiryNotes,
  },
  internationalRegion("ksa", "Saudi Arabia", "Saudi Arabia", "Saudi Arabia", "SAR", "Saudi riyals", consultation("Saudi Arabia", "SAR")),
  internationalRegion("us", "United States", "United States", "the United States", "USD", "US dollars", consultation("United States", "USD")),
  internationalRegion("uk", "United Kingdom", "United Kingdom", "the United Kingdom", "GBP", "British pounds", {
    type: "uk-pricing",
    heading: "Based in the UK?",
    body: "Contact us for English lesson pricing in GBP.",
    cta: "Request UK Pricing",
    requestLabel: "UK pricing in GBP",
    country: "United Kingdom",
    currency: "GBP",
  }),
  {
    id: "other",
    label: "Other countries",
    country: "",
    heading: "Studying from Another Country",
    intro: "We don't publish prices for every country. We'll recommend a plan and quote it in your currency.",
    currency: null,
    tracks: [],
    inquiry: consultation("", ""),
    trial: null,
    paymentMethods: [],
    notes: inquiryNotes,
  },
];

function consultation(country: string, currency: Currency | ""): Inquiry {
  return {
    type: "consultation",
    heading: "Studying from another country? Let's find the right plan and currency for you.",
    body: "Tell us where you're based and what you want to achieve. We'll assess your needs and provide suitable pricing in your currency.",
    cta: "Request a Consultation",
    requestLabel: "Pricing consultation",
    country,
    currency,
  };
}

export const DEFAULT_REGION: RegionId = "cairo";

export const getRegion = (id: RegionId): PricingRegion => pricingRegions.find((r) => r.id === id)!;

export const isRegionId = (v: unknown): v is RegionId => pricingRegions.some((r) => r.id === v);

/** Every published track, in every location. */
export const allTracks: Track[] = pricingRegions.flatMap((r) => r.tracks);

/** Contact-form request types, keyed by the `?inquiry=` value a pricing CTA links to. */
export const inquiryFor = (type: string): Inquiry | null => {
  const r = pricingRegions.find((x) => x.inquiry.type === type && !x.tracks.length);
  return r?.inquiry ?? null;
};

/** Currencies a student can ask to be quoted in. */
export const QUOTE_CURRENCIES = ["EGP", "SAR", "USD", "GBP", "EUR", "AED", "Other / not sure"] as const;

// ── Location matching ──

const normalizePlace = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Spellings of Cairo itself, matched anywhere in the city field ("New Cairo", "Cairo, Egypt"). */
const CAIRO_NAMES = ["cairo", "kairo", "caire", "qahira", "القاهر"];

/**
 * Districts and new cities in Cairo Governorate, matched as whole words.
 * Giza (including 6th of October and Sheikh Zayed) and Qalyubia are separate
 * governorates, so they get "Other locations in Egypt".
 */
const CAIRO_DISTRICTS = [
  "nasr city", "madinet nasr", "heliopolis", "masr el gedida", "maadi", "zamalek", "garden city", "mokattam",
  "ain shams", "helwan", "abbasia", "abbassia", "fifth settlement", "5th settlement", "tagamoa", "rehab", "madinaty",
  "shorouk", "badr city", "el marg",
];

export const isCairoCity = (city: string) => {
  const n = normalizePlace(city);
  if (!n) return false;
  return CAIRO_NAMES.some((x) => n.includes(x)) || CAIRO_DISTRICTS.some((d) => ` ${n} `.includes(` ${d} `));
};

const COUNTRY_REGIONS: Record<string, RegionId> = {
  "saudi arabia": "ksa",
  "kingdom of saudi arabia": "ksa",
  ksa: "ksa",
  "united states": "us",
  "united states of america": "us",
  usa: "us",
  us: "us",
  "united kingdom": "uk",
  uk: "uk",
  "great britain": "uk",
  britain: "uk",
  england: "uk",
  scotland: "uk",
  wales: "uk",
  "northern ireland": "uk",
};

/** Pricing location for a student's country and city (from the enrollment form). Never guessed from IP. */
export const regionForLocation = (country: string, city = ""): RegionId => {
  const c = normalizePlace(country);
  if (c === "egypt" || c === "مصر") return isCairoCity(city) ? "cairo" : "egypt-other";
  return COUNTRY_REGIONS[c] ?? "other";
};

// ── Packages ──

/** Package choices in the funnel that are not a priced plan. */
export const HELP_CHOOSING_PACKAGE = "help";

export const findPlan = (id: string): { track: Track; plan: Plan } | null => {
  for (const track of allTracks) {
    const plan = track.plans.find((p) => p.id === id);
    if (plan) return { track, plan };
  }
  return null;
};

/** The trial lesson with this package id, and the location that offers it. */
export const findTrial = (id: string): { region: PricingRegion; trial: TrialLesson } | null => {
  const region = pricingRegions.find((r) => r.trial?.id === id);
  return region ? { region, trial: region.trial! } : null;
};

export const isTrialPackage = (id: string) => findTrial(id) !== null;

export const isKnownPackageId = (id: string) => id === HELP_CHOOSING_PACKAGE || isTrialPackage(id) || findPlan(id) !== null;

/** The location whose prices a package belongs to, or null for "help" and unknown ids. */
export const regionOfPackage = (id: string): RegionId | null => {
  const trial = findTrial(id);
  if (trial) return trial.region.id;
  return pricingRegions.find((r) => r.tracks.some((t) => t.plans.some((p) => p.id === id)))?.id ?? null;
};

/** "in Cairo", "in Saudi Arabia", … for sentences about a location. */
export const REGION_WHERE: Record<RegionId, string> = {
  cairo: "in Cairo",
  "egypt-other": "elsewhere in Egypt",
  ksa: "in Saudi Arabia",
  us: "in the United States",
  uk: "in the United Kingdom",
  other: "in other countries",
};

/** Why a student in this location can't choose a package, or null when they can. */
export const packageLocationError = (packageId: string, country: string, city: string): string | null => {
  const owner = regionOfPackage(packageId);
  const here = regionForLocation(country, city);
  if (!owner || owner === here) return null;
  if (owner === "cairo" && here === "egypt-other") {
    return "Cairo prices are for students in Cairo. If you live in Cairo, enter “Cairo” as your city on the first step. Otherwise, choose “I need help choosing” and your instructor will send pricing for your area.";
  }
  return `This option is priced for students ${REGION_WHERE[owner]}. Please choose an option for your location, or “I need help choosing”.`;
};

export const perLessonPrice = (plan: Plan) => Math.round((plan.amount / plan.lessons) * 100) / 100;

// ── Snapshots and formatting ──

export type PriceSnapshot = {
  package_id: string;
  track_id: TrackId | null;
  track_heading: string | null;
  title: string;
  lessons: number | null;
  /** Records saved before location-based pricing have none of the optional fields and are EGP. */
  region_id?: RegionId | null;
  currency?: Currency;
  price?: number;
  per_lesson_price?: number;
  billing?: Billing;
  classes_per_week?: number | null;
  /** EGP prices only (null for other currencies). */
  price_egp: number | null;
  per_lesson_egp: number | null;
  per_student: boolean;
  validity_days: number | null;
  duration_minutes: number | null;
};

/** Builds the price record stored with an application. Returns null for "help". */
export const buildPriceSnapshot = (packageId: string): PriceSnapshot | null => {
  const foundTrial = findTrial(packageId);
  if (foundTrial) {
    const { trial, region } = foundTrial;
    const egp = trial.currency === "EGP";
    return {
      package_id: trial.id,
      track_id: null,
      track_heading: null,
      title: trial.title,
      lessons: 1,
      region_id: region.id,
      currency: trial.currency,
      price: trial.amount,
      per_lesson_price: trial.amount,
      billing: "package",
      classes_per_week: null,
      price_egp: egp ? trial.amount : null,
      per_lesson_egp: egp ? trial.amount : null,
      per_student: false,
      validity_days: null,
      duration_minutes: trial.minutes,
    };
  }
  const found = findPlan(packageId);
  if (!found) return null;
  const { track, plan } = found;
  const egp = plan.currency === "EGP";
  return {
    package_id: plan.id,
    track_id: track.id,
    track_heading: track.heading,
    title: plan.title,
    lessons: plan.lessons,
    region_id: regionOfPackage(plan.id),
    currency: plan.currency,
    price: plan.amount,
    per_lesson_price: perLessonPrice(plan),
    billing: plan.billing,
    classes_per_week: plan.classesPerWeek,
    price_egp: egp ? plan.amount : null,
    per_lesson_egp: egp ? perLessonPrice(plan) : null,
    per_student: plan.perStudent,
    validity_days: plan.billing === "package" && plan.lessons > 1 ? PACKAGE_VALIDITY_DAYS : null,
    duration_minutes: LESSON_MINUTES,
  };
};

/** The large figure on a pricing card ("1,500", "$120"); the currency code is shown beside it. */
export const displayAmount = (plan: Plan) =>
  plan.currency === "USD" ? `$${formatNumber(plan.amount)}` : formatNumber(plan.amount);

/** Price and currency of a stored snapshot, including records saved before multi-currency pricing. */
export const snapshotPrice = (s: PriceSnapshot): { amount: number; currency: Currency; perLesson: number | null } | null => {
  const amount = s.price ?? s.price_egp;
  if (amount == null) return null;
  return { amount, currency: s.currency ?? "EGP", perLesson: s.per_lesson_price ?? s.per_lesson_egp };
};

/** One-line description of a stored package choice. */
export const describeSnapshot = (s: PriceSnapshot): string => {
  const p = snapshotPrice(s);
  const money = p ? formatMoney(p.amount, p.currency) : "";
  if (!s.track_heading) return `${s.title}: ${money} for ${s.duration_minutes} minutes`;
  if (s.billing === "monthly") {
    return `${s.track_heading}, ${s.title}: ${money} per ${BILLING_PERIOD_WEEKS} weeks`;
  }
  const per =
    s.lessons! > 1 && p?.perLesson != null ? ` (${formatMoney(p.perLesson, p.currency)} per lesson, valid ${s.validity_days} days)` : "";
  return `${s.track_heading}, ${s.title}: ${money}${s.per_student ? " per student" : ""}${per}`;
};

/** The trial lesson price for a student's location ("100 EGP"), or null where no trial price is published. */
export const trialPriceFor = (country: string, city: string): string | null => {
  const trial = getRegion(regionForLocation(country, city)).trial;
  return trial ? formatMoney(trial.amount, trial.currency) : null;
};

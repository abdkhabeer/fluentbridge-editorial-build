// Single source of truth for published lesson pricing, by student location.
// Rendered by PricingSection and the FAQ, offered in the enrollment funnel,
// and snapshotted server-side when an application is saved. Which prices a
// student may choose is decided here too (packageLocationError), so the funnel
// and the server apply the same rule. src/data/pricing.test.ts pins every
// published amount.
//
// Prices are never converted between currencies. A location without approved
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
  /** Whether the 100 EGP trial lesson is offered. */
  trial: boolean;
  /** Payment methods listed on the pricing section. */
  paymentMethods: string[];
  notes: string[];
};

export const PACKAGE_VALIDITY_DAYS = 30;
/** A monthly plan's billing period: classes per week × 4 weeks. */
export const BILLING_PERIOD_WEEKS = 4;
const LESSON_MINUTES = 60;
const CTA = "Choose & Start Enrollment";

// ── Cairo, Egypt (EGP) ──
// Do not change these amounts without the owner's approval.

const cairoTracks: Track[] = [
  {
    id: "student",
    heading: "Egyptian Student & General English",
    blurb:
      "Affordable one-on-one coaching for Egyptian students and anyone building everyday fluency and confidence.",
    plans: [
      {
        id: "student-single",
        lessons: 1,
        amount: 200,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: false,
        label: "Student Rate",
        title: "Single Lesson",
        unit: "EGP",
        duration: "60 minutes",
        description: "One-on-one instruction tailored to your goals. No package required.",
        features: ["Fully personalized lesson", "Feedback after each session"],
        cta: CTA,
        highlight: false,
      },
      {
        id: "student-8",
        lessons: 8,
        amount: 1500,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: false,
        label: "Most Popular",
        title: "8 Lessons",
        unit: "EGP",
        duration: "187.50 EGP per lesson",
        description: "Consistent weekly practice for real, measurable progress.",
        features: ["Save 100 EGP", "Priority scheduling", "Monthly progress review"],
        cta: CTA,
        highlight: true,
      },
      {
        id: "student-12",
        lessons: 12,
        amount: 2200,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: false,
        label: "Best Value",
        title: "12 Lessons",
        unit: "EGP",
        duration: "≈ 183.33 EGP per lesson",
        description: "Long-term practice at the lowest per-lesson rate.",
        features: ["Save 200 EGP", "Priority scheduling", "One free make-up lesson"],
        cta: CTA,
        highlight: false,
      },
    ],
  },
  {
    id: "group",
    heading: "Small Group English",
    blurb:
      "Groups of 2–4 students. All prices below are per student, not per group. Each student pays their own rate.",
    plans: [
      {
        id: "group-single",
        lessons: 1,
        amount: 150,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: true,
        label: "2–4 Students",
        title: "Single Lesson",
        unit: "EGP per student",
        duration: "60 minutes · 2–4 students per group",
        description: "Practice English in a social setting at the most affordable rate.",
        features: ["150 EGP per student", "Shared speaking practice"],
        cta: CTA,
        highlight: false,
      },
      {
        id: "group-8",
        lessons: 8,
        amount: 1100,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: true,
        label: "Most Popular",
        title: "8 Lessons",
        unit: "EGP per student",
        duration: "137.50 EGP per lesson, per student",
        description: "A steady weekly rhythm for a study group, colleagues, or friends.",
        features: ["Save 100 EGP per student", "Priority scheduling", "Monthly progress review"],
        cta: CTA,
        highlight: true,
      },
      {
        id: "group-12",
        lessons: 12,
        amount: 1500,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: true,
        label: "Best Value",
        title: "12 Lessons",
        unit: "EGP per student",
        duration: "125 EGP per lesson, per student",
        description: "The lowest per-lesson rate offered by Fluent Bridges.",
        features: ["Save 300 EGP per student", "Priority scheduling", "One free make-up lesson"],
        cta: CTA,
        highlight: false,
      },
    ],
  },
  {
    id: "professional",
    heading: "Professional English",
    blurb:
      "For career development, workplace communication, interviews, presentations, and meetings.",
    plans: [
      {
        id: "professional-single",
        lessons: 1,
        amount: 500,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: false,
        label: "Professional",
        title: "Single Lesson",
        unit: "EGP",
        duration: "60 minutes",
        description: "Focused coaching built around your role and your career goals.",
        features: ["Industry-specific vocabulary", "Real materials from your work"],
        cta: CTA,
        highlight: false,
      },
      {
        id: "professional-8",
        lessons: 8,
        amount: 3600,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: false,
        label: "Most Popular",
        title: "8 Lessons",
        unit: "EGP",
        duration: "450 EGP per lesson",
        description: "A focused block to sharpen how you speak and write at work.",
        features: ["Save 400 EGP", "Interview & presentation prep", "Priority scheduling"],
        cta: CTA,
        highlight: true,
      },
      {
        id: "professional-12",
        lessons: 12,
        amount: 5100,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: false,
        label: "Best Value",
        title: "12 Lessons",
        unit: "EGP",
        duration: "425 EGP per lesson",
        description: "Built around a specific role, deadline, or promotion.",
        features: ["Save 900 EGP", "Fully customized curriculum", "One free make-up lesson"],
        cta: CTA,
        highlight: false,
      },
    ],
  },
  {
    id: "business",
    heading: "Business English",
    blurb:
      "The premium offering, for executives, entrepreneurs, managers, and teams who need advanced English for business.",
    plans: [
      {
        id: "business-single",
        lessons: 1,
        amount: 900,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: false,
        label: "Premium",
        title: "Single Lesson",
        unit: "EGP",
        duration: "60 minutes",
        description: "Advanced business communication, negotiation, and executive presence.",
        features: ["Tailored to your company", "Feedback after each session"],
        cta: CTA,
        highlight: false,
      },
      {
        id: "business-8",
        lessons: 8,
        amount: 6800,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: false,
        label: "Most Popular",
        title: "8 Lessons",
        unit: "EGP",
        duration: "850 EGP per lesson",
        description: "High-intensity coaching for meetings, pitches, and negotiations.",
        features: ["Save 400 EGP", "Priority scheduling", "Monthly progress review"],
        cta: CTA,
        highlight: true,
      },
      {
        id: "business-12",
        lessons: 12,
        amount: 9600,
        currency: "EGP",
        billing: "package",
        classesPerWeek: null,
        perStudent: false,
        label: "Best Value",
        title: "12 Lessons",
        unit: "EGP",
        duration: "800 EGP per lesson",
        description: "A full programme for sustained executive-level communication.",
        features: ["Save 1,200 EGP", "Fully customized curriculum", "One free make-up lesson"],
        cta: CTA,
        highlight: false,
      },
    ],
  },
];

export const trialLesson = {
  id: "trial",
  title: "Trial Lesson",
  amount: 100,
  currency: "EGP" as Currency,
  minutes: 30,
  price: "100 EGP / 30 minutes",
  description:
    "A relaxed 30-minute first session to assess your level and discuss your goals, not a full 60-minute lesson. The 100 EGP fee is credited toward your first 8- or 12-lesson package if you enroll.",
};

// ── Saudi Arabia (SAR), United States (USD), United Kingdom (GBP) ──

type InternationalPrices = { single: number; threePerWeek: number; fivePerWeek: number };
type InternationalTrackId = "ksa" | "us" | "uk";

const singleLesson = (id: InternationalTrackId, currency: Currency, amount: number): Plan => ({
  id: `${id}-single`,
  lessons: 1,
  amount,
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

const monthlyPlan = (id: InternationalTrackId, currency: Currency, classesPerWeek: number, amount: number): Plan => {
  const lessons = classesPerWeek * BILLING_PERIOD_WEEKS;
  return {
    id: `${id}-monthly-${classesPerWeek}`,
    lessons,
    amount,
    currency,
    billing: "monthly",
    classesPerWeek,
    perStudent: false,
    label: "Monthly Plan",
    title: `${classesPerWeek} Classes per Week`,
    unit: `${currency} per month`,
    duration: `${lessons} classes per month · ${LESSON_MINUTES} minutes each`,
    description: `${classesPerWeek} one-on-one lessons every week, billed monthly.`,
    features: [`${classesPerWeek} classes per week`, `${lessons} classes per ${BILLING_PERIOD_WEEKS}-week billing period`],
    cta: CTA,
    highlight: false,
  };
};

const internationalTrack = (id: InternationalTrackId, place: string, currency: Currency, p: InternationalPrices): Track => ({
  id,
  heading: `One-on-One English, ${place} (${currency})`,
  blurb: `Single lessons, or a monthly plan of 3 or 5 classes per week billed every ${BILLING_PERIOD_WEEKS} weeks.`,
  plans: [singleLesson(id, currency, p.single), monthlyPlan(id, currency, 3, p.threePerWeek), monthlyPlan(id, currency, 5, p.fivePerWeek)],
});

// Do not change these amounts without the owner's approval.
const ksaTracks = [internationalTrack("ksa", "Saudi Arabia", "SAR", { single: 35, threePerWeek: 450, fivePerWeek: 680 })];
const usTracks = [internationalTrack("us", "United States", "USD", { single: 10, threePerWeek: 120, fivePerWeek: 180 })];

export type PendingPrices = {
  approved: boolean;
  prices: { [K in keyof InternationalPrices]: number | null };
};

/**
 * UK prices in GBP, not yet approved. To publish them, fill in all three
 * amounts and set `approved: true`. The pricing section, the enrollment funnel
 * and the server then offer them with no other changes.
 */
export const UK_GBP_PRICING: PendingPrices = {
  approved: false,
  prices: { single: null, threePerWeek: null, fivePerWeek: null },
};

/** UK tracks for a pricing config: none until it is approved and complete. */
export const ukTracksFor = ({ approved, prices: { single, threePerWeek, fivePerWeek } }: PendingPrices): Track[] =>
  approved && single != null && threePerWeek != null && fivePerWeek != null
    ? [internationalTrack("uk", "United Kingdom", "GBP", { single, threePerWeek, fivePerWeek })]
    : [];

// ── Locations ──

const ONLINE_NOTES = ["Lessons conducted via Zoom or Google Meet", "All levels welcome, from beginner to advanced"];

const internationalNotes = (currency: Currency) => [
  `All prices are in ${currency}`,
  `Monthly plans include 12 classes (3 per week) or 20 classes (5 per week) in each ${BILLING_PERIOD_WEEKS}-week billing period`,
  `Lessons are ${LESSON_MINUTES} minutes`,
  "24-hour cancellation policy",
  ...ONLINE_NOTES,
];

const inquiryNotes = ["Asking for pricing is free, and nothing is booked until you confirm", ...ONLINE_NOTES];

const INTERNATIONAL_PAYMENT = ["PayPal", "Stripe", "Wise"];

const ukTracks = ukTracksFor(UK_GBP_PRICING);

export const pricingRegions: PricingRegion[] = [
  {
    id: "cairo",
    label: "Cairo, Egypt",
    country: "Egypt",
    heading: "Special Pricing for Students in Cairo",
    intro:
      "Rates depend on the kind of coaching you need: small group, Egyptian student and General English, Professional, or Business English. Packages are valid for 30 days from purchase.",
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
    trial: true,
    paymentMethods: ["Vodafone Cash", "PayPal", "Stripe", "Wise (international students)"],
    notes: [
      "Packages are valid for 30 days from purchase",
      "Trial lessons are 30 minutes, not a full 60-minute lesson",
      "The 100 EGP trial fee is credited toward your first 8- or 12-lesson package",
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
    trial: false,
    paymentMethods: [],
    notes: inquiryNotes,
  },
  {
    id: "ksa",
    label: "Saudi Arabia",
    country: "Saudi Arabia",
    heading: "Pricing for Students in Saudi Arabia",
    intro: "Live one-on-one lessons priced in Saudi riyals (SAR). Choose single lessons or a monthly plan.",
    currency: "SAR",
    tracks: ksaTracks,
    inquiry: consultation("Saudi Arabia", "SAR"),
    trial: false,
    paymentMethods: INTERNATIONAL_PAYMENT,
    notes: internationalNotes("SAR"),
  },
  {
    id: "us",
    label: "United States",
    country: "United States",
    heading: "Pricing for Students in the United States",
    intro: "Live one-on-one lessons priced in US dollars (USD). Choose single lessons or a monthly plan.",
    currency: "USD",
    tracks: usTracks,
    inquiry: consultation("United States", "USD"),
    trial: false,
    paymentMethods: INTERNATIONAL_PAYMENT,
    notes: internationalNotes("USD"),
  },
  {
    id: "uk",
    label: "United Kingdom",
    country: "United Kingdom",
    heading: "Pricing for Students in the United Kingdom",
    intro: ukTracks.length
      ? "Live one-on-one lessons priced in British pounds (GBP). Choose single lessons or a monthly plan."
      : "We're finalising our UK prices in British pounds (GBP).",
    currency: ukTracks.length ? "GBP" : null,
    tracks: ukTracks,
    inquiry: {
      type: "uk-pricing",
      heading: "Based in the UK?",
      body: "Contact us for English lesson pricing in GBP.",
      cta: "Request UK Pricing",
      requestLabel: "UK pricing in GBP",
      country: "United Kingdom",
      currency: "GBP",
    },
    trial: false,
    paymentMethods: ukTracks.length ? INTERNATIONAL_PAYMENT : [],
    notes: ukTracks.length ? internationalNotes("GBP") : inquiryNotes,
  },
  {
    id: "other",
    label: "Other countries",
    country: "",
    heading: "Studying from Another Country",
    intro: "We don't publish prices for every country. We'll recommend a plan and quote it in your currency.",
    currency: null,
    tracks: [],
    inquiry: consultation("", ""),
    trial: false,
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

export const isKnownPackageId = (id: string) =>
  id === trialLesson.id || id === HELP_CHOOSING_PACKAGE || findPlan(id) !== null;

/** The location whose prices a package belongs to, or null for "help" and unknown ids. */
export const regionOfPackage = (id: string): RegionId | null => {
  if (id === trialLesson.id) return pricingRegions.find((r) => r.trial)?.id ?? null;
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
  if (packageId === trialLesson.id) {
    return {
      package_id: trialLesson.id,
      track_id: null,
      track_heading: null,
      title: trialLesson.title,
      lessons: 1,
      region_id: regionOfPackage(trialLesson.id),
      currency: trialLesson.currency,
      price: trialLesson.amount,
      per_lesson_price: trialLesson.amount,
      billing: "package",
      classes_per_week: null,
      price_egp: trialLesson.amount,
      per_lesson_egp: trialLesson.amount,
      per_student: false,
      validity_days: null,
      duration_minutes: trialLesson.minutes,
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

const formatNumber = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** "1,500 EGP", "450 SAR", "$120 USD". Always shows the currency code. */
export const formatMoney = (n: number, currency: Currency) =>
  currency === "USD" ? `$${formatNumber(n)} USD` : `${formatNumber(n)} ${currency}`;

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
    return `${s.track_heading}, Monthly plan, ${s.title}: ${money} per month (${s.lessons} classes per ${BILLING_PERIOD_WEEKS}-week billing period)`;
  }
  const per =
    s.lessons! > 1 && p?.perLesson != null ? ` (${formatMoney(p.perLesson, p.currency)} per lesson, valid ${s.validity_days} days)` : "";
  return `${s.track_heading}, ${s.title}: ${money}${s.per_student ? " per student" : ""}${per}`;
};

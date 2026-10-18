// Single source of truth for published lesson pricing.
// Rendered by PricingSection, offered in the enrollment funnel, and snapshotted
// server-side when an application is saved. Keep display strings and numeric
// fields in sync (src/data/pricing.test.ts checks this).

export type TrackId = "student" | "group" | "professional" | "business";

export type Plan = {
  id: string;
  lessons: number;
  priceEgp: number;
  perStudent: boolean;
  label: string;
  title: string;
  price: string;
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

export const PACKAGE_VALIDITY_DAYS = 30;

export const tracks: Track[] = [
  {
    id: "student",
    heading: "Egyptian Student & General English",
    blurb:
      "Affordable one-on-one coaching for Egyptian students and anyone building everyday fluency and confidence.",
    plans: [
      {
        id: "student-single",
        lessons: 1,
        priceEgp: 200,
        perStudent: false,
        label: "Student Rate",
        title: "Single Lesson",
        price: "200",
        unit: "EGP",
        duration: "60 minutes",
        description: "One-on-one instruction tailored to your goals. No package required.",
        features: ["Fully personalized lesson", "Feedback after each session"],
        cta: "Choose & Start Enrollment",
        highlight: false,
      },
      {
        id: "student-8",
        lessons: 8,
        priceEgp: 1500,
        perStudent: false,
        label: "Most Popular",
        title: "8 Lessons",
        price: "1,500",
        unit: "EGP",
        duration: "187.50 EGP per lesson",
        description: "Consistent weekly practice for real, measurable progress.",
        features: ["Save 100 EGP", "Priority scheduling", "Monthly progress review"],
        cta: "Choose & Start Enrollment",
        highlight: true,
      },
      {
        id: "student-12",
        lessons: 12,
        priceEgp: 2200,
        perStudent: false,
        label: "Best Value",
        title: "12 Lessons",
        price: "2,200",
        unit: "EGP",
        duration: "≈ 183.33 EGP per lesson",
        description: "Long-term practice at the lowest per-lesson rate.",
        features: ["Save 200 EGP", "Priority scheduling", "One free make-up lesson"],
        cta: "Choose & Start Enrollment",
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
        priceEgp: 150,
        perStudent: true,
        label: "2–4 Students",
        title: "Single Lesson",
        price: "150",
        unit: "EGP per student",
        duration: "60 minutes · 2–4 students per group",
        description: "Practice English in a social setting at the most affordable rate.",
        features: ["150 EGP per student", "Shared speaking practice"],
        cta: "Choose & Start Enrollment",
        highlight: false,
      },
      {
        id: "group-8",
        lessons: 8,
        priceEgp: 1100,
        perStudent: true,
        label: "Most Popular",
        title: "8 Lessons",
        price: "1,100",
        unit: "EGP per student",
        duration: "137.50 EGP per lesson, per student",
        description: "A steady weekly rhythm for a study group, colleagues, or friends.",
        features: ["Save 100 EGP per student", "Priority scheduling", "Monthly progress review"],
        cta: "Choose & Start Enrollment",
        highlight: true,
      },
      {
        id: "group-12",
        lessons: 12,
        priceEgp: 1500,
        perStudent: true,
        label: "Best Value",
        title: "12 Lessons",
        price: "1,500",
        unit: "EGP per student",
        duration: "125 EGP per lesson, per student",
        description: "The lowest per-lesson rate offered by Fluent Bridges.",
        features: ["Save 300 EGP per student", "Priority scheduling", "One free make-up lesson"],
        cta: "Choose & Start Enrollment",
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
        priceEgp: 500,
        perStudent: false,
        label: "Professional",
        title: "Single Lesson",
        price: "500",
        unit: "EGP",
        duration: "60 minutes",
        description: "Focused coaching built around your role and your career goals.",
        features: ["Industry-specific vocabulary", "Real materials from your work"],
        cta: "Choose & Start Enrollment",
        highlight: false,
      },
      {
        id: "professional-8",
        lessons: 8,
        priceEgp: 3600,
        perStudent: false,
        label: "Most Popular",
        title: "8 Lessons",
        price: "3,600",
        unit: "EGP",
        duration: "450 EGP per lesson",
        description: "A focused block to sharpen how you speak and write at work.",
        features: ["Save 400 EGP", "Interview & presentation prep", "Priority scheduling"],
        cta: "Choose & Start Enrollment",
        highlight: true,
      },
      {
        id: "professional-12",
        lessons: 12,
        priceEgp: 5100,
        perStudent: false,
        label: "Best Value",
        title: "12 Lessons",
        price: "5,100",
        unit: "EGP",
        duration: "425 EGP per lesson",
        description: "Built around a specific role, deadline, or promotion.",
        features: ["Save 900 EGP", "Fully customized curriculum", "One free make-up lesson"],
        cta: "Choose & Start Enrollment",
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
        priceEgp: 900,
        perStudent: false,
        label: "Premium",
        title: "Single Lesson",
        price: "900",
        unit: "EGP",
        duration: "60 minutes",
        description: "Advanced business communication, negotiation, and executive presence.",
        features: ["Tailored to your company", "Feedback after each session"],
        cta: "Choose & Start Enrollment",
        highlight: false,
      },
      {
        id: "business-8",
        lessons: 8,
        priceEgp: 6800,
        perStudent: false,
        label: "Most Popular",
        title: "8 Lessons",
        price: "6,800",
        unit: "EGP",
        duration: "850 EGP per lesson",
        description: "High-intensity coaching for meetings, pitches, and negotiations.",
        features: ["Save 400 EGP", "Priority scheduling", "Monthly progress review"],
        cta: "Choose & Start Enrollment",
        highlight: true,
      },
      {
        id: "business-12",
        lessons: 12,
        priceEgp: 9600,
        perStudent: false,
        label: "Best Value",
        title: "12 Lessons",
        price: "9,600",
        unit: "EGP",
        duration: "800 EGP per lesson",
        description: "A full programme for sustained executive-level communication.",
        features: ["Save 1,200 EGP", "Fully customized curriculum", "One free make-up lesson"],
        cta: "Choose & Start Enrollment",
        highlight: false,
      },
    ],
  },
];

export const trialLesson = {
  id: "trial",
  title: "Trial Lesson",
  priceEgp: 100,
  minutes: 30,
  price: "100 EGP / 30 minutes",
  description:
    "A relaxed 30-minute first session to assess your level and discuss your goals, not a full 60-minute lesson. The 100 EGP fee is credited toward your first 8- or 12-lesson package if you enroll.",
};

export const paymentMethodsDisplay = [
  "Vodafone Cash",
  "PayPal",
  "Stripe",
  "Wise (international students)",
];

/** Package choices in the funnel that are not a priced plan. */
export const HELP_CHOOSING_PACKAGE = "help";

export type PriceSnapshot = {
  package_id: string;
  track_id: TrackId | null;
  track_heading: string | null;
  title: string;
  lessons: number | null;
  price_egp: number | null;
  per_lesson_egp: number | null;
  per_student: boolean;
  validity_days: number | null;
  duration_minutes: number | null;
};

export const findPlan = (id: string): { track: Track; plan: Plan } | null => {
  for (const track of tracks) {
    const plan = track.plans.find((p) => p.id === id);
    if (plan) return { track, plan };
  }
  return null;
};

export const isKnownPackageId = (id: string) =>
  id === trialLesson.id || id === HELP_CHOOSING_PACKAGE || findPlan(id) !== null;

export const perLessonPrice = (plan: Plan) =>
  Math.round((plan.priceEgp / plan.lessons) * 100) / 100;

/** Builds the price record stored with an application. Returns null for "help". */
export const buildPriceSnapshot = (packageId: string): PriceSnapshot | null => {
  if (packageId === trialLesson.id) {
    return {
      package_id: trialLesson.id,
      track_id: null,
      track_heading: null,
      title: trialLesson.title,
      lessons: 1,
      price_egp: trialLesson.priceEgp,
      per_lesson_egp: trialLesson.priceEgp,
      per_student: false,
      validity_days: null,
      duration_minutes: trialLesson.minutes,
    };
  }
  const found = findPlan(packageId);
  if (!found) return null;
  const { track, plan } = found;
  return {
    package_id: plan.id,
    track_id: track.id,
    track_heading: track.heading,
    title: plan.title,
    lessons: plan.lessons,
    price_egp: plan.priceEgp,
    per_lesson_egp: perLessonPrice(plan),
    per_student: plan.perStudent,
    validity_days: plan.lessons > 1 ? PACKAGE_VALIDITY_DAYS : null,
    duration_minutes: 60,
  };
};

export const formatEgp = (n: number) =>
  `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} EGP`;

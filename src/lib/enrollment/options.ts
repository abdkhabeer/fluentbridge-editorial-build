// Option lists for the enrollment funnel. Shared by the client and the server
// (validation), so this file must only use relative imports.

import type { TrackId } from "../../data/pricing";

export const LEARNING_GOALS = [
  { value: "general", label: "General English and everyday conversation" },
  { value: "fluency", label: "Improving speaking fluency and confidence" },
  { value: "academic", label: "English for university or academic study" },
  { value: "business", label: "Business English and workplace communication" },
  { value: "career", label: "Job interviews and career development" },
  { value: "exam", label: "IELTS or other exam preparation" },
  { value: "travel", label: "Travel or studying abroad" },
  { value: "meetings", label: "English for meetings, presentations, and professional situations" },
  { value: "other", label: "Other" },
] as const;

export const SELF_REPORTED_LEVELS = [
  { value: "complete_beginner", label: "Complete beginner" },
  { value: "beginner", label: "Beginner" },
  { value: "elementary", label: "Elementary" },
  { value: "intermediate", label: "Intermediate" },
  { value: "upper_intermediate", label: "Upper-intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "not_sure", label: "I'm not sure" },
] as const;

export const LESSON_FORMATS = [
  { value: "one_on_one", label: "One-on-one lessons" },
  { value: "small_group", label: "Small-group lessons with 2–4 students" },
  { value: "not_sure", label: "I'm not sure yet" },
] as const;

export const GROUP_STATUSES = [
  { value: "has_group", label: "Yes, I already have a group of 2–4 people" },
  { value: "needs_group", label: "No, I'd like help forming or joining a group" },
] as const;

export const WEEKLY_FREQUENCIES = [
  { value: "1", label: "Once per week", perWeek: 1 },
  { value: "2", label: "Twice per week", perWeek: 2 },
  { value: "3", label: "Three times per week", perWeek: 3 },
  { value: "4_plus", label: "Four or more times per week", perWeek: 4 },
  { value: "flexible", label: "Flexible / not sure yet", perWeek: null },
] as const;

export const PAYMENT_METHODS = [
  { value: "vodafone_cash", label: "Vodafone Cash", egyptOnly: true },
  { value: "paypal", label: "PayPal", egyptOnly: false },
  { value: "card", label: "Stripe / card payment", egyptOnly: false },
  { value: "wise", label: "Wise", egyptOnly: false },
  { value: "help", label: "I need help choosing a payment method", egyptOnly: false },
] as const;

export const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
] as const;

// `startsAt` is the time used when suggesting a lesson slot. Morning has no stated
// start in its label, so 09:00 is an assumption.
export const TIMES_OF_DAY = [
  { value: "morning", label: "Morning (before 12:00)", startsAt: "09:00" },
  { value: "afternoon", label: "Afternoon (12:00–17:00)", startsAt: "12:00" },
  { value: "evening", label: "Evening (17:00–21:00)", startsAt: "17:00" },
  { value: "late_evening", label: "Late evening (after 21:00)", startsAt: "21:00" },
] as const;

export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "assessment_completed", label: "Assessment completed" },
  { value: "follow_up_needed", label: "Follow-up needed" },
  { value: "contacted", label: "Contacted" },
  { value: "trial_scheduled", label: "Trial scheduled" },
  { value: "enrolled", label: "Enrolled" },
  { value: "not_proceeding", label: "Not proceeding" },
] as const;

type Values<T extends readonly { value: string }[]> = T[number]["value"];
export type LearningGoal = Values<typeof LEARNING_GOALS>;
export type SelfReportedLevel = Values<typeof SELF_REPORTED_LEVELS>;
export type LessonFormat = Values<typeof LESSON_FORMATS>;
export type GroupStatus = Values<typeof GROUP_STATUSES>;
export type WeeklyFrequency = Values<typeof WEEKLY_FREQUENCIES>;
export type PaymentMethod = Values<typeof PAYMENT_METHODS>;
export type Day = Values<typeof DAYS>;
export type TimeOfDay = Values<typeof TIMES_OF_DAY>;
export type LeadStatus = Values<typeof LEAD_STATUSES>;

export const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((o) => o.value) as unknown as [Values<T>, ...Values<T>[]];

export const labelFor = (list: readonly { value: string; label: string }[], value: string | null | undefined) =>
  list.find((o) => o.value === value)?.label ?? value ?? "";

/** Track suggested for a goal. Used for a "suggested" hint only; students choose freely. */
export const suggestedTrackForGoal = (goal: LearningGoal | "" | undefined): TrackId => {
  switch (goal) {
    case "business":
      return "business";
    case "career":
    case "meetings":
      return "professional";
    default:
      return "student";
  }
};

export const isEgypt = (country: string) => country.trim().toLowerCase() === "egypt";

/** Vodafone Cash is an Egyptian mobile wallet, so only offer it to students in Egypt or with a +20 number. */
export const paymentMethodsFor = (country: string, whatsappE164: string | null) =>
  PAYMENT_METHODS.filter(
    (m) => !m.egyptOnly || isEgypt(country) || (whatsappE164?.startsWith("+20") ?? false),
  );

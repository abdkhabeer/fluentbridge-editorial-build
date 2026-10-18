// Validation for the enrollment application. The same schemas run in the
// browser (per-step field errors) and on the server (authoritative check).
// Relative imports only: this file is bundled into Netlify Functions.

import { z } from "zod";
import { isKnownPackageId, findPlan, trialLesson, HELP_CHOOSING_PACKAGE } from "../../data/pricing";
import { COUNTRIES } from "./countries";
import {
  DAYS,
  LEARNING_GOALS,
  GROUP_STATUSES,
  LESSON_FORMATS,
  PAYMENT_METHODS,
  SELF_REPORTED_LEVELS,
  TIMES_OF_DAY,
  WEEKLY_FREQUENCIES,
  isEgypt,
  values,
} from "./options";
import { checkPhone } from "./phone";

/** Removes control characters (keeping newlines when allowed) and trims. */
export const cleanText = (s: string, { multiline = false } = {}) => {
  const stripped = s.replace(multiline ? /[^\P{C}\n]/gu : /\p{C}/gu, "");
  return (multiline ? stripped.replace(/\n{3,}/g, "\n\n") : stripped.replace(/\s+/g, " ")).trim();
};

const line = (max: number) => z.string().transform((s) => cleanText(s)).pipe(z.string().max(max));
const paragraph = (max: number) =>
  z.string().transform((s) => cleanText(s, { multiline: true })).pipe(z.string().max(max));

/** Raw form state kept in the browser while the student fills in the funnel. */
export type EnrollmentDraft = {
  full_name: string;
  country: string;
  country_other: string;
  city: string;
  email: string;
  whatsapp_number: string;
  alternative_phone: string;
  primary_learning_goal: string;
  additional_learning_goals: string[];
  other_goal_text: string;
  learning_goal_details: string;
  self_reported_level: string;
  lesson_format: string;
  /** Only asked for small-group lessons. */
  group_status: string;
  preferred_classes_per_week: string;
  selected_package: string;
  preferred_payment_method: string;
  preferred_days: string[];
  preferred_time_of_day: string[];
  timezone: string;
  consent: boolean;
};

export const emptyDraft = (): EnrollmentDraft => ({
  full_name: "",
  country: "",
  country_other: "",
  city: "",
  email: "",
  whatsapp_number: "",
  alternative_phone: "",
  primary_learning_goal: "",
  additional_learning_goals: [],
  other_goal_text: "",
  learning_goal_details: "",
  self_reported_level: "",
  lesson_format: "",
  group_status: "",
  preferred_classes_per_week: "",
  selected_package: "",
  preferred_payment_method: "",
  preferred_days: [],
  preferred_time_of_day: [],
  timezone: "",
  consent: false,
});

const required = (msg: string) => ({ errorMap: () => ({ message: msg }) });

export const personalSchema = z
  .object({
    full_name: line(100).pipe(z.string().min(2, "Please enter your full name.")),
    country: z.string().refine((c) => COUNTRIES.includes(c), "Please choose your country."),
    country_other: line(80),
    city: line(80).pipe(z.string().min(1, "Please enter your city.")),
    email: line(254).pipe(z.string().min(1, "Please enter your email address.").email("Please enter a valid email address.")),
    whatsapp_number: z.string().max(40),
    alternative_phone: z.string().max(40),
  })
  .superRefine((d, ctx) => {
    const country = d.country === "Other" ? d.country_other : d.country;
    if (d.country === "Other" && d.country_other.length < 2) {
      ctx.addIssue({ code: "custom", path: ["country_other"], message: "Please enter your country." });
    }
    if (!d.whatsapp_number.trim()) {
      ctx.addIssue({ code: "custom", path: ["whatsapp_number"], message: "Please enter your WhatsApp number." });
    } else {
      const wa = checkPhone(d.whatsapp_number, country, { mobile: true });
      if (!wa.ok) ctx.addIssue({ code: "custom", path: ["whatsapp_number"], message: wa.message });
    }
    if (d.alternative_phone.trim()) {
      const alt = checkPhone(d.alternative_phone, country, { mobile: false });
      if (!alt.ok) ctx.addIssue({ code: "custom", path: ["alternative_phone"], message: alt.message });
    }
  });

export const goalsSchema = z
  .object({
    primary_learning_goal: z.enum(values(LEARNING_GOALS), required("Please choose your main reason.")),
    additional_learning_goals: z.array(z.enum(values(LEARNING_GOALS))).max(LEARNING_GOALS.length),
    other_goal_text: line(200),
    learning_goal_details: paragraph(1000),
    self_reported_level: z.enum(values(SELF_REPORTED_LEVELS), required("Please choose the option closest to your level.")),
  })
  .superRefine((d, ctx) => {
    const all = [d.primary_learning_goal, ...d.additional_learning_goals];
    if (all.includes("other") && !d.other_goal_text) {
      ctx.addIssue({ code: "custom", path: ["other_goal_text"], message: "Please tell us your reason." });
    }
  })
  .transform((d) => ({
    ...d,
    additional_learning_goals: [...new Set(d.additional_learning_goals)].filter((g) => g !== d.primary_learning_goal),
    other_goal_text: [d.primary_learning_goal, ...d.additional_learning_goals].includes("other") ? d.other_goal_text : "",
  }));

/** Whether a package fits a lesson format (group packages are only for small groups). */
export const packageFitsFormat = (packageId: string, format: string) => {
  if (packageId === trialLesson.id || packageId === HELP_CHOOSING_PACKAGE) return true;
  const found = findPlan(packageId);
  if (!found) return false;
  if (format === "small_group") return found.track.id === "group";
  if (format === "one_on_one") return found.track.id !== "group";
  return true;
};

export const lessonsSchema = z
  .object({
    lesson_format: z.enum(values(LESSON_FORMATS), required("Please choose how you would like to study.")),
    group_status: z.union([z.enum(values(GROUP_STATUSES)), z.literal("")]).catch(""),
    preferred_classes_per_week: z.enum(values(WEEKLY_FREQUENCIES), required("Please choose how often you would like lessons.")),
    selected_package: z.string().refine(isKnownPackageId, "Please choose a package, or select “I need help choosing”."),
  })
  .superRefine((d, ctx) => {
    if (d.lesson_format === "small_group" && !d.group_status) {
      ctx.addIssue({ code: "custom", path: ["group_status"], message: "Please tell us whether you already have a group." });
    }
    if (isKnownPackageId(d.selected_package) && !packageFitsFormat(d.selected_package, d.lesson_format)) {
      ctx.addIssue({
        code: "custom",
        path: ["selected_package"],
        message: "This package does not match the lesson format you chose.",
      });
    }
  });

export const paymentScheduleSchema = z.object({
  preferred_payment_method: z.enum(values(PAYMENT_METHODS), required("Please choose a payment method.")),
  preferred_days: z.array(z.enum(values(DAYS))).max(7),
  preferred_time_of_day: z.array(z.enum(values(TIMES_OF_DAY))).max(4),
  timezone: line(64),
});

export const consentSchema = z.object({
  consent: z.literal(true, required("Please confirm you agree before continuing.")),
});

export const STEP_SCHEMAS = [personalSchema, goalsSchema, lessonsSchema, paymentScheduleSchema] as const;

export type FieldErrors = Partial<Record<keyof EnrollmentDraft, string>>;

const issuesToErrors = (issues: z.ZodIssue[]): FieldErrors => {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0] as keyof EnrollmentDraft | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
};

export const validateStep = (step: number, draft: EnrollmentDraft): FieldErrors => {
  const schema = STEP_SCHEMAS[step];
  if (!schema) return {};
  const r = schema.safeParse(draft);
  return r.success ? {} : issuesToErrors(r.error.issues);
};

export type NormalizedApplication = {
  full_name: string;
  country: string;
  city: string;
  email: string;
  whatsapp_number: string;
  alternative_phone: string | null;
  primary_learning_goal: z.infer<typeof goalsSchema>["primary_learning_goal"];
  additional_learning_goals: z.infer<typeof goalsSchema>["additional_learning_goals"];
  other_goal_text: string | null;
  learning_goal_details: string | null;
  self_reported_level: z.infer<typeof goalsSchema>["self_reported_level"];
  lesson_format: z.infer<typeof lessonsSchema>["lesson_format"];
  group_status: "has_group" | "needs_group" | null;
  preferred_classes_per_week: z.infer<typeof lessonsSchema>["preferred_classes_per_week"];
  selected_package: string;
  preferred_payment_method: z.infer<typeof paymentScheduleSchema>["preferred_payment_method"];
  preferred_days: z.infer<typeof paymentScheduleSchema>["preferred_days"];
  preferred_time_of_day: z.infer<typeof paymentScheduleSchema>["preferred_time_of_day"];
  timezone: string | null;
};

export type ParseResult =
  | { ok: true; data: NormalizedApplication; errors?: undefined }
  | { ok: false; data?: undefined; errors: FieldErrors };

/** Validates a complete application and normalises it (E.164 phones, resolved country). */
export const parseApplication = (input: unknown): ParseResult => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: { full_name: "Invalid application." } };
  }
  const personal = personalSchema.safeParse(input);
  const goals = goalsSchema.safeParse(input);
  const lessons = lessonsSchema.safeParse(input);
  const payment = paymentScheduleSchema.safeParse(input);
  const consent = consentSchema.safeParse(input);
  const issues = [personal, goals, lessons, payment, consent].flatMap((r) => (r.success ? [] : r.error.issues));
  if (!personal.success || !goals.success || !lessons.success || !payment.success || !consent.success) {
    return { ok: false, errors: issuesToErrors(issues) };
  }

  const p = personal.data;
  const country = p.country === "Other" ? p.country_other : p.country;
  const wa = checkPhone(p.whatsapp_number, country, { mobile: true });
  const alt = p.alternative_phone.trim() ? checkPhone(p.alternative_phone, country, { mobile: false }) : null;
  if (!wa.ok || (alt && !alt.ok)) return { ok: false, errors: { whatsapp_number: "Please check your phone numbers." } };

  if (payment.data.preferred_payment_method === "vodafone_cash" && !isEgypt(country) && !wa.e164.startsWith("+20")) {
    return { ok: false, errors: { preferred_payment_method: "Vodafone Cash is only available for students in Egypt." } };
  }

  return {
    ok: true,
    data: {
      full_name: p.full_name,
      country,
      city: p.city,
      email: p.email.toLowerCase(),
      whatsapp_number: wa.e164,
      alternative_phone: alt && alt.ok ? alt.e164 : null,
      primary_learning_goal: goals.data.primary_learning_goal,
      additional_learning_goals: goals.data.additional_learning_goals,
      other_goal_text: goals.data.other_goal_text || null,
      learning_goal_details: goals.data.learning_goal_details || null,
      self_reported_level: goals.data.self_reported_level,
      lesson_format: lessons.data.lesson_format,
      group_status: lessons.data.lesson_format === "small_group" && lessons.data.group_status ? lessons.data.group_status : null,
      preferred_classes_per_week: lessons.data.preferred_classes_per_week,
      selected_package: lessons.data.selected_package,
      preferred_payment_method: payment.data.preferred_payment_method,
      preferred_days: [...new Set(payment.data.preferred_days)],
      preferred_time_of_day: [...new Set(payment.data.preferred_time_of_day)],
      timezone: payment.data.timezone || null,
    },
  };
};

export type ContactCorrection = Pick<NormalizedApplication, "full_name" | "country" | "city" | "email" | "whatsapp_number" | "alternative_phone">;

/** Validates an instructor's correction of a student's contact details (country is free text here). */
export const parseContactCorrection = (input: unknown): { ok: true; data: ContactCorrection; errors?: undefined } | { ok: false; data?: undefined; errors: FieldErrors } => {
  const r = z
    .object({
      full_name: line(100).pipe(z.string().min(2, "Please enter the full name.")),
      country: line(80).pipe(z.string().min(2, "Please enter the country.")),
      city: line(80).pipe(z.string().min(1, "Please enter the city.")),
      email: line(254).pipe(z.string().email("Please enter a valid email address.")),
      whatsapp_number: z.string().max(40),
      alternative_phone: z.string().max(40).nullable().optional(),
    })
    .safeParse(input);
  if (!r.success) return { ok: false, errors: issuesToErrors(r.error.issues) };
  const wa = checkPhone(r.data.whatsapp_number, r.data.country, { mobile: true });
  if (!wa.ok) return { ok: false, errors: { whatsapp_number: wa.message } };
  const altRaw = r.data.alternative_phone?.trim() ?? "";
  const alt = altRaw ? checkPhone(altRaw, r.data.country, { mobile: false }) : null;
  if (alt && !alt.ok) return { ok: false, errors: { alternative_phone: alt.message } };
  return {
    ok: true,
    data: {
      full_name: r.data.full_name,
      country: r.data.country,
      city: r.data.city,
      email: r.data.email.toLowerCase(),
      whatsapp_number: wa.e164,
      alternative_phone: alt ? alt.e164! : null,
    },
  };
};

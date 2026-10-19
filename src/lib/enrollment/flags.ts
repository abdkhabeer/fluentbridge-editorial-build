import { findPlan, getRegion, HELP_CHOOSING_PACKAGE, PACKAGE_VALIDITY_DAYS, regionForLocation } from "../../data/pricing";
import { WEEKLY_FREQUENCIES } from "./options";

const WEEKS_PER_VALIDITY = PACKAGE_VALIDITY_DAYS / 7;

/** Lessons per week needed to use a package within its validity period (or a monthly plan's schedule), or null for single lessons. */
export const lessonsPerWeekNeeded = (packageId: string): number | null => {
  const found = findPlan(packageId);
  if (!found || found.plan.lessons <= 1) return null;
  if (found.plan.billing === "monthly") return found.plan.classesPerWeek;
  return Math.ceil(found.plan.lessons / WEEKS_PER_VALIDITY);
};

/**
 * Explains when the chosen weekly frequency is too low to use a package
 * before it expires, or lower than a monthly plan's schedule. Returns null
 * when there is nothing to point out.
 */
export const frequencyPackageNote = (packageId: string, frequency: string): string | null => {
  const needed = lessonsPerWeekNeeded(packageId);
  const choice = WEEKLY_FREQUENCIES.find((f) => f.value === frequency);
  const perWeek = choice?.perWeek ?? null;
  // "Four or more times per week" fits any schedule of four or more.
  if (needed === null || perWeek === null || perWeek >= needed || (choice?.value === "4_plus" && needed >= 4)) return null;
  const plan = findPlan(packageId)!.plan;
  if (plan.billing === "monthly") {
    return `This 4-week plan includes ${needed} classes per week (${plan.lessons} in 4 weeks), more than the ${choice!.label.toLowerCase()} you chose. Your instructor can help you choose a plan that fits your schedule.`;
  }
  return `A ${plan.lessons}-lesson package is valid for ${PACKAGE_VALIDITY_DAYS} days, which usually means about ${needed} lessons per week. Your instructor can help you choose a package that fits your schedule.`;
};

export type ReviewFlag =
  | "package_help_requested"
  | "payment_help_requested"
  | "format_undecided"
  | "frequency_package_mismatch"
  | "group_formation_needed"
  | "goal_other"
  | "exam_preparation"
  | "pricing_quote_needed";

export const REVIEW_FLAG_LABELS: Record<ReviewFlag, string> = {
  package_help_requested: "Needs help choosing a package",
  payment_help_requested: "Needs help choosing a payment method",
  format_undecided: "Lesson format not decided",
  frequency_package_mismatch: "Weekly frequency is lower than the package or plan needs",
  group_formation_needed: "Small-group student needs help forming or joining a group",
  goal_other: "Custom learning goal (no matching track)",
  exam_preparation: "Exam preparation goal: confirm track and materials",
  pricing_quote_needed: "No published prices for this location: send a price quote",
};

export const reviewFlagsFor = (a: {
  selected_package: string;
  preferred_payment_method: string;
  lesson_format: string;
  group_status?: string | null;
  preferred_classes_per_week: string;
  primary_learning_goal: string;
  additional_learning_goals: string[];
  country?: string;
  city?: string;
}): ReviewFlag[] => {
  const goals = [a.primary_learning_goal, ...a.additional_learning_goals];
  const flags: ReviewFlag[] = [];
  if (a.selected_package === HELP_CHOOSING_PACKAGE) flags.push("package_help_requested");
  if (a.preferred_payment_method === "help") flags.push("payment_help_requested");
  if (a.lesson_format === "not_sure") flags.push("format_undecided");
  if (a.lesson_format === "small_group" && a.group_status === "needs_group") flags.push("group_formation_needed");
  if (frequencyPackageNote(a.selected_package, a.preferred_classes_per_week)) flags.push("frequency_package_mismatch");
  if (goals.includes("other")) flags.push("goal_other");
  if (goals.includes("exam")) flags.push("exam_preparation");
  if (a.country !== undefined && !getRegion(regionForLocation(a.country, a.city)).tracks.length) flags.push("pricing_quote_needed");
  return flags;
};

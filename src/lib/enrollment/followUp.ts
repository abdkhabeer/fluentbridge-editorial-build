// WhatsApp follow-up messages for the lead admin. Pure functions only, so the
// same rendering can run in the browser and on the server (for email alerts).
//
// Each message is a list of sentences. A sentence that needs a variable we
// don't have is dropped, so a message never contains literal {braces}. A list
// of alternatives uses the first one whose variables are all present.

import { CATEGORY_LABELS, type Category } from "../assessment/questions";
import type { CategoryScore } from "./apiTypes";
import { DAYS, LEARNING_GOALS, TIMES_OF_DAY, labelFor, type Day, type LearningGoal, type TimeOfDay } from "./options";

export const FOLLOW_UP_MESSAGES = [1, 2, 3, 4] as const;
export type FollowUpMessage = (typeof FOLLOW_UP_MESSAGES)[number];
export type FollowUpEventType = `follow_up_${FollowUpMessage}_sent`;
export type FollowUpEvent = { type: FollowUpEventType; at: string };

export const followUpEventType = (n: FollowUpMessage): FollowUpEventType => `follow_up_${n}_sent`;

type Sentence = string | string[];

const TEMPLATES: Record<FollowUpMessage, Sentence[]> = {
  1: [
    "Hi {first_name}, it's Abdul from FluentBridges.",
    "I just looked at your placement test.",
    ["Your {strength} is solid, and the fastest gain is {top_gap}.", "The fastest gain is {top_gap}."],
    "For {goal}, I'd like to hear you speak and then send you a written plan.",
    "Does {slot} work for a 30 minute trial?",
    "Reply YES and I'll send the link.",
  ],
  2: [
    "Hi {first_name}, one quick tip while you decide.",
    "{tip}.",
    "Example: {example}",
    "If you want a plan built around {goal}, I have {slot_1} or {slot_2} open this week.",
  ],
  3: [
    "{first_name}, no pressure.",
    "The trial is {trial_price} and it's credited to your first package.",
    "{refund_line}",
    "Want me to hold {slot} for you?",
  ],
  4: [
    "Last message from me, {first_name}.",
    "Your results stay saved until {expiry_date}.",
    "If now isn't the right time, reply LATER and I'll check in next month.",
  ],
};

/**
 * Message 1 for a lead who signed up but hasn't completed the placement test
 * (not started, or started and not finished). It never mentions the test or a result.
 */
const MESSAGE_1_NO_TEST: Sentence[] = [
  "Hi {first_name}, it's Abdul from FluentBridges.",
  "Thanks for signing up.",
  "For {goal}, the best way to start is a 30 minute video trial where I hear you speak and then send you a written plan.",
  "Does {slot} work?",
  "Reply YES and I'll send the link.",
];

export const REFUND_LINE = "If you don't leave with a clear plan, I refund it.";

/** Tips keyed by the scoring code's skill tags (without a leading "the"). */
export const TIPS: Record<string, { tip: string; example: string }> = {
  "present simple questions": {
    tip: "Questions use do or does before the subject, then the base verb",
    example: "Where does she work? Do you live in Cairo?",
  },
  "everyday vocabulary": {
    tip: "Learn new words inside full sentences, not in lists",
    example: "I take the bus to work every day.",
  },
  "past simple": {
    tip: "Regular verbs add -ed. Irregular verbs change, so learn them in pairs",
    example: "I go to work today. I went to work yesterday.",
  },
  "present continuous": {
    tip: "Use am, is or are plus the verb with -ing for things happening now",
    example: "I am writing this message now.",
  },
};
export const FALLBACK_TIP = {
  tip: "Say your answers out loud for five minutes a day, in full sentences",
  example: "I want to improve my English for my job.",
};

export type FollowUpInput = {
  full_name: string;
  primary_learning_goal: LearningGoal;
  other_goal_text: string | null;
  preferred_days: Day[];
  preferred_time_of_day: TimeOfDay[];
  timezone: string | null;
  access_expires_at: string | null;
  access_revoked_at: string | null;
  category_scores: Record<Category, CategoryScore> | null;
  improvement_areas: string[];
  /** Formatted trial price for the lead's location, or null when none is published. */
  trial_price: string | null;
  /** True only when the placement test is completed. Scores from an unfinished test are never quoted. */
  test_completed: boolean;
};

export type FollowUpOptions = { now: Date; trialRefundCopy: boolean };

export type Vars = Partial<Record<string, string>>;

export const DAY_NAMES: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const validZone = (tz: string | null) => {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
};

/** Today's weekday in the lead's time zone, as a DAYS value. */
const weekdayIn = (now: Date, tz: string): Day => {
  const short = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: tz }).format(now).toLowerCase().slice(0, 3);
  return (DAYS.find((d) => d.value === short)?.value ?? "mon") as Day;
};

/** The lead's preferred days in the order they next come up, starting tomorrow in their time zone. */
export const upcomingDays = (days: Day[], now: Date, timezone: string | null): Day[] => {
  const order = DAYS.map((d) => d.value as Day);
  const today = order.indexOf(weekdayIn(now, validZone(timezone)));
  const wanted = new Set(days);
  return Array.from({ length: 7 }, (_, k) => order[(today + 1 + k) % 7]).filter((d) => wanted.has(d));
};

/** "Thursday at 17:00": a preferred day at the start of the first preferred time window. */
export const slotLabel = (day: Day | undefined, times: TimeOfDay[]): string | undefined => {
  const start = TIMES_OF_DAY.find((t) => t.value === times[0])?.startsAt;
  return day && start ? `${DAY_NAMES[day]} at ${start}` : undefined;
};

/** A skill is called a strength only with at least this share correct... */
export const STRONGEST_MIN_PERCENT = 50;
/** ...and at least this many items correct, so 2 of 4 or 1 of 1 never counts. */
export const STRONGEST_MIN_CORRECT = 4;

/**
 * Strongest skill by percentage, in plain words ("reading comprehension"), among skills with at least
 * 50% and 4 items correct. Null when none qualifies. Ties go to the skill with more items.
 */
export const strongestSkill = (scores: Record<Category, CategoryScore> | null) => {
  if (!scores) return null;
  const [best] = (Object.entries(scores) as [Category, CategoryScore][])
    .filter(([, s]) => s.total > 0 && s.percent >= STRONGEST_MIN_PERCENT && s.correct >= STRONGEST_MIN_CORRECT)
    .sort((a, b) => b[1].percent - a[1].percent || b[1].total - a[1].total);
  return best ? { category: best[0], label: plainSkill(CATEGORY_LABELS[best[0]]), ...best[1] } : null;
};

const plainSkill = (label: string) => label.toLowerCase().replace(/ & /g, " and ");

/** The first skill-based item in "areas to work on", in plain words ("the past simple"). */
export const topGap = (areas: string[]): string | null => {
  for (const area of areas) {
    const review = /^Review (.+) \((?:A|B|C)[12]\)\.$/.exec(area);
    if (review) return review[1];
    const category = /^(.+): \d+ of \d+ correct\.$/.exec(area);
    if (category && Object.values(CATEGORY_LABELS).includes(category[1])) return plainSkill(category[1]);
  }
  return null;
};

export const tipFor = (gap: string | null) => (gap && TIPS[gap.replace(/^the /, "")]) || FALLBACK_TIP;

/** The goal for use mid-sentence: first letter lowercased only, so "English" keeps its capital. */
export const goalText = (input: Pick<FollowUpInput, "primary_learning_goal" | "other_goal_text">) => {
  const goal =
    input.primary_learning_goal === "other" && input.other_goal_text
      ? input.other_goal_text
      : labelFor(LEARNING_GOALS, input.primary_learning_goal);
  return goal.charAt(0).toLowerCase() + goal.slice(1);
};

export const followUpVars = (input: FollowUpInput, { now, trialRefundCopy }: FollowUpOptions): Vars => {
  const days = upcomingDays(input.preferred_days, now, input.timezone);
  const gap = input.test_completed ? topGap(input.improvement_areas) : null;
  const { tip, example } = tipFor(gap);
  const expiry =
    input.access_expires_at && !input.access_revoked_at && new Date(input.access_expires_at) > now
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: validZone(input.timezone) }).format(
          new Date(input.access_expires_at),
        )
      : undefined;
  return {
    first_name: input.full_name.trim().split(/\s+/)[0] || undefined,
    strength: input.test_completed ? strongestSkill(input.category_scores)?.label : undefined,
    top_gap: gap ?? undefined,
    goal: goalText(input) || undefined,
    slot: slotLabel(days[0], input.preferred_time_of_day),
    slot_1: slotLabel(days[0], input.preferred_time_of_day),
    slot_2: slotLabel(days[1], input.preferred_time_of_day),
    trial_price: input.trial_price ?? undefined,
    expiry_date: expiry,
    tip,
    example,
    refund_line: trialRefundCopy ? REFUND_LINE : undefined,
  };
};

const fill = (sentence: string, vars: Vars): string | null => {
  let missing = false;
  const out = sentence.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    if (!v) missing = true;
    return v ?? "";
  });
  return missing ? null : out.replace(/[{}]/g, "");
};

/** Fills a list of sentences, dropping any sentence that needs a missing variable. Alternatives fall back in order. */
export const renderSentences = (sentences: Sentence[], vars: Vars): string =>
  sentences
    .flatMap((sentence) => {
      for (const option of typeof sentence === "string" ? [sentence] : sentence) {
        const out = fill(option, vars);
        if (out !== null) return [out];
      }
      return [];
    })
    .join(" ");

export const renderFollowUp = (n: FollowUpMessage, input: FollowUpInput, options: FollowUpOptions) =>
  renderSentences(n === 1 && !input.test_completed ? MESSAGE_1_NO_TEST : TEMPLATES[n], followUpVars(input, options));

/** wa.me link: digits only, with the country code (from the stored E.164 number). */
export const whatsappUrl = (e164: string, text: string) =>
  `https://wa.me/${e164.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

/** Minutes a lead has waited since finishing the test with no follow-up, or null when not waiting. */
export const waitingMinutes = (completedAt: string | null, followUps: number, now: Date): number | null => {
  if (!completedAt || followUps > 0) return null;
  return Math.max(0, Math.floor((now.getTime() - new Date(completedAt).getTime()) / 60_000));
};

export const WAITING_ALERT_MINUTES = 5;

export const waitingLabel = (minutes: number) => {
  if (minutes < 60) return `waiting ${minutes} min`;
  if (minutes < 24 * 60) return `waiting ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `waiting ${Math.floor(minutes / (24 * 60))} d`;
};

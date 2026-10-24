// New-lead alert email, sent through Resend's HTTPS API with plain fetch.
// Sending is best effort: a failure is logged without personal data and never
// changes the student's response.

import { levelRange } from "../src/lib/assessment/levels";
import type { CefrLevel } from "../src/lib/assessment/questions";
import type { AssessmentStatus } from "../src/lib/enrollment/apiTypes";
import { sourceOf, type Attribution } from "../src/lib/analytics/events";
import { DAY_NAMES, goalText, renderFollowUp, whatsappUrl, type FollowUpInput } from "../src/lib/enrollment/followUp";
import { DAYS, TIMES_OF_DAY, labelFor } from "../src/lib/enrollment/options";

export const RESEND_ENDPOINT = "https://api.resend.com/emails";
/** Resend's shared test sender. It only delivers to the email address of the Resend account. */
export const DEFAULT_EMAIL_FROM = "onboarding@resend.dev";
export const EMAIL_TIMEOUT_MS = 5000;

export type EmailConfig = {
  apiKey?: string;
  to?: string;
  from?: string;
  /** For tests. Defaults to the global fetch. */
  fetch?: typeof fetch;
};

export type Email = { subject: string; text: string };

export type NewLeadInput = Omit<FollowUpInput, "test_completed"> & {
  id: string;
  whatsapp_number: string;
  attribution?: Attribution | null;
  /** Where the lead is in the placement test. Only "completed" has a level to report. */
  test_status: AssessmentStatus;
};

export type AlertOptions = { level: CefrLevel | null; now: Date; trialRefundCopy: boolean; siteOrigin: string };

const list = (labels: string[]) => (labels.length ? labels.join(", ") : "Not set");

const TEST_LINE: Record<AssessmentStatus, string> = {
  completed: "Placement test: completed",
  in_progress: "Placement test: started, not finished",
  writing: "Placement test: started, not finished",
  not_started: "Placement test: not taken yet",
};

/** The alert for a new lead. It says whether the test was taken, and shows a level only for a completed test. Pure, so it can be tested without sending. */
export const newLeadAlert = (lead: NewLeadInput, { level, now, trialRefundCopy, siteOrigin }: AlertOptions): Email => {
  const completed = lead.test_status === "completed" && level !== null;
  const range = completed ? levelRange(level) : null;
  const message1 = renderFollowUp(1, { ...lead, test_completed: completed }, { now, trialRefundCopy });
  const source = sourceOf(lead.attribution);
  const lines = [
    completed ? "A new lead finished the placement test." : "A new lead signed up.",
    "",
    `Name: ${lead.full_name}`,
    TEST_LINE[lead.test_status],
    ...(range ? [`Level: ${range}`] : []),
    `Goal: ${goalText(lead) || "Not set"}`,
    `Preferred days: ${list(DAYS.filter((d) => lead.preferred_days.includes(d.value)).map((d) => DAY_NAMES[d.value]))}`,
    `Preferred time: ${list(lead.preferred_time_of_day.map((t) => labelFor(TIMES_OF_DAY, t)))}`,
    ...(source ? [`Source: ${source}`] : []),
    "",
    "Send Message 1 on WhatsApp:",
    whatsappUrl(lead.whatsapp_number, message1),
    "",
    "Open the lead:",
    `${siteOrigin}/instructor/${lead.id}`,
  ];
  const firstName = lead.full_name.trim().split(/\s+/)[0] || "student";
  const progress = range ?? (lead.test_status === "not_started" ? "test not taken" : "test not finished");
  return { subject: `New lead: ${firstName}, ${progress}`, text: lines.join("\n") };
};

/** True when an API key and a recipient are set. */
export const emailEnabled = (config: EmailConfig | undefined): config is EmailConfig & { apiKey: string; to: string } =>
  !!config?.apiKey && !!config.to;

/** Sends one email through Resend. Throws on a network error, a timeout or a non-2xx status. */
export const sendEmail = async (config: EmailConfig & { apiKey: string; to: string }, email: Email) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);
  try {
    const res = await (config.fetch ?? fetch)(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from || DEFAULT_EMAIL_FROM, to: [config.to], subject: email.subject, text: email.text }),
      signal: controller.signal,
    });
    if (!res.ok) throw new EmailError(`status ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
};

class EmailError extends Error {}

/** Sends and swallows any failure. The log line has the reason only: no names, addresses or response body. */
export const sendAlertSafely = async (config: EmailConfig | undefined, email: Email) => {
  if (!emailEnabled(config)) return;
  try {
    await sendEmail(config, email);
  } catch (e) {
    const reason = e instanceof EmailError ? e.message : e instanceof Error && e.name === "AbortError" ? "timeout" : "network error";
    console.error(`[email] new-lead alert failed: ${reason}`);
  }
};

// Build-time feature flags and settings, read from Netlify environment
// variables (scope: Builds). Flags default to off; set the variable to "true".

const env = import.meta.env as Record<string, string | undefined>;
const on = (name: string) => env[name] === "true";

export const featureFlags = {
  /** Adds the trial refund promise to follow-up message 3 and the results page. */
  trialRefundCopy: on("FEATURE_TRIAL_REFUND_COPY"),
  /** Promises a writing review within 24 hours on the results page. */
  reviewSlaCopy: on("FEATURE_REVIEW_SLA_COPY"),
  /**
   * Sends first-touch attribution and the anonymous analytics session id with
   * new applications. Off until the consent wording that covers it is approved.
   * The server checks FEATURE_LEAD_ATTRIBUTION too.
   */
  leadAttribution: on("FEATURE_LEAD_ATTRIBUTION"),
};

/** Booking page for trial lessons. When unset, booking falls back to WhatsApp. */
export const BOOKING_URL = /^https:\/\//.test(env.BOOKING_URL ?? "") ? env.BOOKING_URL! : null;

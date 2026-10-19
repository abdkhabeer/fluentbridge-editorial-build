// First-party funnel events and first-touch attribution, shared by the browser
// and the server. No third-party analytics. Events carry an anonymous session
// id and a few whitelisted properties, never names, emails or phone numbers.

export const EVENT_NAMES = [
  "intake_started",
  "intake_step_completed",
  "test_started",
  "test_progress",
  "test_completed",
  "results_viewed",
  "whatsapp_clicked",
  "trial_cta_clicked",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** Where a WhatsApp or trial link was clicked. */
export const CLICK_LOCATIONS = ["results", "contact", "footer", "header", "cta_section", "hero", "pricing"] as const;
export type ClickLocation = (typeof CLICK_LOCATIONS)[number];

export const INTAKE_STEPS = [1, 2, 3, 4] as const;
/** test_progress fires after every 10 answered items. */
export const PROGRESS_MARKS = [10, 20, 30] as const;

export type EventProps = { step?: number; answered?: number; location?: ClickLocation };
export type AnalyticsEvent = { name: EventName; session_id: string; props: EventProps };

export const SESSION_ID = /^[a-f0-9]{32}$/;

/** Validates an event from the browser. Returns null for anything unexpected. */
export const parseEvent = (raw: unknown): AnalyticsEvent | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const { name, session_id, props } = raw as Record<string, unknown>;
  if (!EVENT_NAMES.includes(name as EventName) || typeof session_id !== "string" || !SESSION_ID.test(session_id)) return null;
  const p = (typeof props === "object" && props !== null ? props : {}) as Record<string, unknown>;
  const out: EventProps = {};
  if (name === "intake_step_completed") {
    if (!INTAKE_STEPS.includes(p.step as never)) return null;
    out.step = p.step as number;
  }
  if (name === "test_progress") {
    if (!PROGRESS_MARKS.includes(p.answered as never)) return null;
    out.answered = p.answered as number;
  }
  if (name === "whatsapp_clicked" || name === "trial_cta_clicked") {
    if (!CLICK_LOCATIONS.includes(p.location as ClickLocation)) return null;
    out.location = p.location as ClickLocation;
  }
  return { name: name as EventName, session_id, props: out };
};

/** Funnel steps in order, for the admin Funnel view. */
export const FUNNEL_STEPS: { label: string; match: (e: { name: string; props: EventProps }) => boolean }[] = [
  { label: "Started the intake form", match: (e) => e.name === "intake_started" },
  ...INTAKE_STEPS.map((step) => ({
    label: `Completed intake step ${step}`,
    match: (e: { name: string; props: EventProps }) => e.name === "intake_step_completed" && e.props.step === step,
  })),
  { label: "Started the test", match: (e) => e.name === "test_started" },
  ...PROGRESS_MARKS.map((n) => ({
    label: `Answered ${n} questions`,
    match: (e: { name: string; props: EventProps }) => e.name === "test_progress" && e.props.answered === n,
  })),
  { label: "Completed the test", match: (e) => e.name === "test_completed" },
  { label: "Viewed results", match: (e) => e.name === "results_viewed" },
  { label: "Clicked the trial button", match: (e) => e.name === "trial_cta_clicked" },
  { label: "Clicked WhatsApp", match: (e) => e.name === "whatsapp_clicked" },
];

// ── First-touch attribution ──

export const ATTRIBUTION_TTL_DAYS = 30;
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

export type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  /** Referring site as origin and path only (no query string), or null for direct visits. */
  referrer: string | null;
  landing_path: string;
  captured_at: string;
};

const withoutControlChars = (s: string) => [...s].filter((c) => c.charCodeAt(0) > 31 && c.charCodeAt(0) !== 127).join("");

const clip = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? withoutControlChars(v.trim()).slice(0, max) || null : null);

/** Builds first-touch attribution from a landing URL and document.referrer. Same-site referrers count as direct. */
export const attributionFrom = (landing: URL, referrer: string, now: Date): Attribution => {
  let ref: string | null = null;
  try {
    const r = new URL(referrer);
    if (r.origin !== landing.origin && /^https?:$/.test(r.protocol)) ref = `${r.origin}${r.pathname}`.slice(0, 200);
  } catch {
    ref = null;
  }
  return {
    utm_source: clip(landing.searchParams.get("utm_source"), 100),
    utm_medium: clip(landing.searchParams.get("utm_medium"), 100),
    utm_campaign: clip(landing.searchParams.get("utm_campaign"), 100),
    utm_content: clip(landing.searchParams.get("utm_content"), 100),
    referrer: ref,
    landing_path: landing.pathname.slice(0, 200),
    captured_at: now.toISOString(),
  };
};

/** Validates attribution sent with an application. */
export const parseAttribution = (raw: unknown): Attribution | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const captured = typeof r.captured_at === "string" && !Number.isNaN(Date.parse(r.captured_at)) ? new Date(r.captured_at).toISOString() : null;
  const landing = clip(r.landing_path, 200);
  if (!captured || !landing?.startsWith("/")) return null;
  const referrer = clip(r.referrer, 200);
  return {
    utm_source: clip(r.utm_source, 100),
    utm_medium: clip(r.utm_medium, 100),
    utm_campaign: clip(r.utm_campaign, 100),
    utm_content: clip(r.utm_content, 100),
    referrer: referrer && /^https?:\/\//.test(referrer) ? referrer : null,
    landing_path: landing,
    captured_at: captured,
  };
};

/** One-word source for the lead list: the utm_source, else the referring host, else "direct". */
export const sourceOf = (a: Attribution | null | undefined): string | null => {
  if (!a) return null;
  if (a.utm_source) return a.utm_source.toLowerCase();
  if (a.referrer) {
    try {
      return new URL(a.referrer).hostname.replace(/^www\./, "");
    } catch {
      return "referral";
    }
  }
  return "direct";
};

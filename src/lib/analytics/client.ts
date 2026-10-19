// Browser side of first-party analytics. Everything here is fire-and-forget:
// a failed or blocked request must never affect the page.

import { ATTRIBUTION_TTL_DAYS, attributionFrom, type Attribution, type EventName, type EventProps } from "./events";

const SESSION_KEY = "fb-analytics-session-v1";
const ATTRIBUTION_KEY = "fb-attribution-v1";
const ONCE_KEY = "fb-analytics-once-v1";
const TTL_MS = ATTRIBUTION_TTL_DAYS * 24 * 60 * 60 * 1000;

const read = <T>(storage: () => Storage, key: string): T | null => {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const write = (storage: () => Storage, key: string, value: unknown) => {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};
const local = () => window.localStorage;
const session = () => window.sessionStorage;

const fresh = (createdAt: string | undefined, now: Date) => !!createdAt && now.getTime() - Date.parse(createdAt) < TTL_MS;

const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

/** Anonymous id for this browser, renewed after 30 days. Linked to a lead only when lead attribution is on. */
export const analyticsSessionId = (now = new Date()): string => {
  const saved = read<{ id: string; created_at: string }>(local, SESSION_KEY);
  if (saved && fresh(saved.created_at, now)) return saved.id;
  const id = randomId();
  write(local, SESSION_KEY, { id, created_at: now.toISOString() });
  return id;
};

/** Saves first-touch attribution on the first visit, and keeps it for 30 days. */
export const captureAttribution = (now = new Date()) => {
  if (fresh(read<Attribution>(local, ATTRIBUTION_KEY)?.captured_at, now)) return;
  try {
    write(local, ATTRIBUTION_KEY, attributionFrom(new URL(window.location.href), document.referrer, now));
  } catch {
    /* ignore */
  }
};

/** First-touch attribution, or null when none was captured or it has expired. */
export const storedAttribution = (now = new Date()): Attribution | null => {
  const a = read<Attribution>(local, ATTRIBUTION_KEY);
  return a && fresh(a.captured_at, now) ? a : null;
};

export const track = (name: EventName, props: EventProps = {}) => {
  try {
    void fetch("/api/events", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, session_id: analyticsSessionId(), props }),
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
};

/** Tracks an event at most once per browser tab session (for "started" and "viewed" events). */
export const trackOnce = (name: EventName, props: EventProps = {}) => {
  const key = `${name}:${JSON.stringify(props)}`;
  const seen = read<string[]>(session, ONCE_KEY) ?? [];
  if (seen.includes(key)) return;
  write(session, ONCE_KEY, [...seen, key]);
  track(name, props);
};

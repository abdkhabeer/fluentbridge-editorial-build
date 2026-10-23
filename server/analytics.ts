// Stores first-party funnel events and builds the admin Funnel report.
// Events are keyed by UTC day so a date range only lists the days it needs.

import { FUNNEL_STEPS, type AnalyticsEvent, type EventProps } from "../src/lib/analytics/events";
import { randomBytes } from "node:crypto";
import { keys, mapLimit, type Store } from "./store";

export type StoredEvent = { name: string; session_id: string; props: EventProps; at: string };

export type FunnelRow = { label: string; sessions: number; conversion: number | null };
export type FunnelReport = { from: string; to: string; total_events: number; steps: FunnelRow[] };

export const MAX_FUNNEL_DAYS = 92;
const DAY_MS = 24 * 60 * 60 * 1000;

export const recordEvent = async (store: Store, event: AnalyticsEvent, now: Date) => {
  const at = now.toISOString();
  const key = keys.event(at.slice(0, 10), `${at}-${randomBytes(6).toString("hex")}`);
  const stored: StoredEvent = { ...event, at };
  await store.create(key, stored);
};

/** Each UTC day from `from` to `to`, inclusive (YYYY-MM-DD). */
export const daysBetween = (from: string, to: string): string[] => {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const out: string[] = [];
  for (let t = start; t <= end && out.length < MAX_FUNNEL_DAYS; t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
};

/** Distinct sessions reaching each funnel step, and the conversion from the step before. */
export const buildFunnel = (events: StoredEvent[]): FunnelRow[] => {
  let previous: number | null = null;
  return FUNNEL_STEPS.map((step) => {
    const sessions = new Set(events.filter(step.match).map((e) => e.session_id)).size;
    const conversion = previous ? Math.round((sessions / previous) * 1000) / 10 : null;
    previous = sessions;
    return { label: step.label, sessions, conversion };
  });
};

export const funnelReport = async (store: Store, from: string, to: string): Promise<FunnelReport> => {
  const days = daysBetween(from, to);
  const eventKeys = (await Promise.all(days.map((d) => store.list(keys.eventsDayPrefix(d))))).flat();
  const events = (await mapLimit(eventKeys, 16, async (k) => (await store.get<StoredEvent>(k))?.value ?? null)).filter(
    (e): e is StoredEvent => e !== null,
  );
  return { from, to, total_events: events.length, steps: buildFunnel(events) };
};

import { describe, expect, it } from "vitest";
import { attributionFrom, parseAttribution, parseEvent, sourceOf } from "./events";
import { buildFunnel, daysBetween } from "../../../server/analytics";

const sid = "a".repeat(32);

describe("events", () => {
  it("accepts only whitelisted events and properties", () => {
    expect(parseEvent({ name: "test_progress", session_id: sid, props: { answered: 20, email: "x@y.z" } })).toEqual({
      name: "test_progress", session_id: sid, props: { answered: 20 },
    });
    expect(parseEvent({ name: "whatsapp_clicked", session_id: sid, props: { location: "results" } })?.props).toEqual({ location: "results" });
    expect(parseEvent({ name: "intake_started", session_id: sid, props: { name: "Sara" } })?.props).toEqual({});
    expect(parseEvent({ name: "test_progress", session_id: sid, props: { answered: 7 } })).toBeNull();
    expect(parseEvent({ name: "whatsapp_clicked", session_id: sid, props: { location: "evil.com" } })).toBeNull();
    expect(parseEvent({ name: "page_view", session_id: sid })).toBeNull();
    expect(parseEvent({ name: "intake_started", session_id: "sara@example.com" })).toBeNull();
  });

  it("counts distinct visitors per funnel step and step-to-step conversion", () => {
    const e = (name: string, session_id: string, props = {}) => ({ name, session_id, props, at: "" });
    const rows = buildFunnel([
      e("intake_started", "1"), e("intake_started", "2"), e("intake_started", "2"), e("intake_started", "3"), e("intake_started", "4"),
      e("intake_step_completed", "1", { step: 1 }), e("intake_step_completed", "2", { step: 1 }),
      e("intake_step_completed", "1", { step: 2 }),
    ]);
    expect(rows.slice(0, 3)).toEqual([
      { label: "Started the intake form", sessions: 4, conversion: null },
      { label: "Completed intake step 1", sessions: 2, conversion: 50 },
      { label: "Completed intake step 2", sessions: 1, conversion: 50 },
    ]);
    expect(rows[3]).toMatchObject({ sessions: 0, conversion: 0 });
    expect(rows[4]).toMatchObject({ sessions: 0, conversion: null });
    expect(daysBetween("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(daysBetween("2026-11-02", "2026-10-30")).toEqual([]);
  });
});

describe("first-touch attribution", () => {
  const now = new Date("2026-10-19T10:00:00Z");

  it("keeps UTM tags, the landing path and the referring page without its query string", () => {
    const a = attributionFrom(
      new URL("https://fluentbridges.com/enroll?utm_source=Instagram&utm_medium=social&utm_campaign=oct&utm_content=reel1&x=1"),
      "https://l.instagram.com/some/path?u=private",
      now,
    );
    expect(a).toEqual({
      utm_source: "Instagram", utm_medium: "social", utm_campaign: "oct", utm_content: "reel1",
      referrer: "https://l.instagram.com/some/path", landing_path: "/enroll", captured_at: now.toISOString(),
    });
    expect(sourceOf(a)).toBe("instagram");
  });

  it("treats same-site and missing referrers as direct", () => {
    expect(attributionFrom(new URL("https://fluentbridges.com/"), "https://fluentbridges.com/privacy", now).referrer).toBeNull();
    const direct = attributionFrom(new URL("https://fluentbridges.com/"), "", now);
    expect(sourceOf(direct)).toBe("direct");
    expect(sourceOf({ ...direct, referrer: "https://www.google.com/" })).toBe("google.com");
    expect(sourceOf(null)).toBeNull();
  });

  it("validates attribution sent by the browser", () => {
    expect(parseAttribution({ landing_path: "/", captured_at: now.toISOString(), utm_source: "x".repeat(500), referrer: "javascript:alert(1)" })).toMatchObject({
      utm_source: "x".repeat(100), referrer: null, landing_path: "/",
    });
    expect(parseAttribution({ landing_path: "https://evil.com", captured_at: now.toISOString() })).toBeNull();
    expect(parseAttribution("nope")).toBeNull();
  });
});

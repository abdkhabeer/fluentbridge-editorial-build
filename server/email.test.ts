// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_EMAIL_FROM, RESEND_ENDPOINT, newLeadAlert, sendAlertSafely, signupAlert, type NewLeadInput } from "./email";

const lead = (over: Partial<NewLeadInput> = {}): NewLeadInput => ({
  id: "app_123",
  full_name: "Sara Ali",
  whatsapp_number: "+201012345678",
  country: "Egypt",
  city: "Cairo",
  primary_learning_goal: "career",
  other_goal_text: null,
  preferred_days: ["thu", "tue"],
  preferred_time_of_day: ["evening"],
  timezone: "Africa/Cairo",
  access_expires_at: null,
  access_revoked_at: null,
  category_scores: {
    grammar: { correct: 6, total: 12, percent: 50 },
    vocabulary: { correct: 4, total: 8, percent: 50 },
    reading: { correct: 4, total: 6, percent: 67 },
    usage: { correct: 1, total: 4, percent: 25 },
  },
  improvement_areas: ["Review the past simple (A2)."],
  trial_price: "100 EGP",
  test_status: "completed",
  attribution: { utm_source: "Instagram", utm_medium: null, utm_campaign: null, utm_content: null, referrer: null, landing_path: "/", captured_at: "2026-10-18T10:00:00.000Z" },
  ...over,
});
const opts = { level: "A2" as const, now: new Date("2026-10-19T07:00:00Z"), trialRefundCopy: false, siteOrigin: "https://fluentbridges.com" };

afterEach(() => vi.restoreAllMocks());

describe("new-lead alert", () => {
  it("lists the lead's details and links Message 1 on WhatsApp", () => {
    const { subject, text } = newLeadAlert(lead(), opts);
    expect(subject).toBe("New lead: Sara, A2 to B1");
    expect(text).toContain("Name: Sara Ali\nPlacement test: completed\nLevel: A2 to B1\nGoal: job interviews and career development\nPreferred days: Tuesday, Thursday\nPreferred time: Evening (17:00–21:00)");
    expect(text).toContain("Source: instagram");
    const link = text.split("\n").find((l) => l.startsWith("https://wa.me/"))!;
    expect(link.startsWith("https://wa.me/201012345678?text=Hi%20Sara%2C%20it's%20Abdul%20from%20FluentBridges.")).toBe(true);
    expect(text).toContain("https://fluentbridges.com/instructor/app_123");
    expect(text).not.toMatch(/\u2014/);
  });

  it("says whether the test was taken, with a level only when it was completed", () => {
    const done = newLeadAlert(lead(), opts);
    expect(done.text).toContain("Placement test: completed\nLevel: A2 to B1");
    expect(done.text).toContain("I%20just%20looked%20at%20your%20placement%20test");

    const notStarted = newLeadAlert(lead({ test_status: "not_started", category_scores: null, improvement_areas: [] }), { ...opts, level: null });
    expect(notStarted.subject).toBe("New lead: Sara, test not taken");
    expect(notStarted.text).toMatch(/^A new lead signed up\./);
    expect(notStarted.text).toContain("Placement test: not taken yet");
    expect(notStarted.text).not.toContain("Level:");
    expect(decodeURIComponent(notStarted.text)).toContain("Thanks for signing up.");
    expect(decodeURIComponent(notStarted.text)).not.toContain("placement test.");

    for (const status of ["in_progress", "writing"] as const) {
      const started = newLeadAlert(lead({ test_status: status }), opts);
      expect(started.subject).toBe("New lead: Sara, test not finished");
      expect(started.text).toContain("Placement test: started, not finished");
      expect(started.text).not.toContain("Level:");
      expect(decodeURIComponent(started.text)).not.toMatch(/solid|fastest gain|looked at your placement test/);
    }
  });

  it("builds the sign-up alert with location, source and the no-test Message 1", () => {
    const { subject, text } = signupAlert(lead({ category_scores: null, improvement_areas: [] }), opts);
    expect(subject).toBe("New lead: Sara Ali, test not taken yet");
    expect(text).toBe(
      [
        "A new lead signed up.",
        "",
        "Name: Sara Ali",
        "Placement test: not taken yet",
        "Goal: job interviews and career development",
        "Location: Cairo, Egypt",
        "Preferred days: Tuesday, Thursday",
        "Preferred time: Evening (17:00–21:00)",
        "Source: instagram",
        "",
        "Send Message 1 on WhatsApp:",
        `https://wa.me/201012345678?text=${encodeURIComponent("Hi Sara, it's Abdul from FluentBridges. Thanks for signing up. For job interviews and career development, the best way to start is a 30 minute video trial where I hear you speak and then send you a written plan. Does Tuesday at 17:00 work? Reply YES and I'll send the link.")}`,
        "",
        "Open the lead:",
        "https://fluentbridges.com/instructor/app_123",
      ].join("\n"),
    );
    expect(signupAlert(lead({ attribution: null }), opts).text).not.toContain("Source:");
  });

  it("leaves out the source line when there is no attribution", () => {
    expect(newLeadAlert(lead({ attribution: null }), opts).text).not.toContain("Source:");
    expect(newLeadAlert(lead({ preferred_days: [] }), opts).text).toContain("Preferred days: Not set");
  });

  it("posts to Resend with the key, the default sender and plain text", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendAlertSafely({ apiKey: "re_test", to: "me@example.com", fetch }, { subject: "s", text: "t" });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(RESEND_ENDPOINT);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body as string)).toEqual({ from: DEFAULT_EMAIL_FROM, to: ["me@example.com"], subject: "s", text: "t" });
  });

  it("does nothing without a key or a recipient", async () => {
    const fetch = vi.fn();
    await sendAlertSafely({ to: "me@example.com", fetch }, { subject: "s", text: "t" });
    await sendAlertSafely({ apiKey: "re_test", fetch }, { subject: "s", text: "t" });
    await sendAlertSafely(undefined, { subject: "s", text: "t" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("logs failures without personal data and never throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const email = newLeadAlert(lead(), opts);
    const cfg = { apiKey: "re_test", to: "me@example.com" };
    await sendAlertSafely({ ...cfg, fetch: async () => new Response("bad sender me@example.com", { status: 422 }) }, email);
    await sendAlertSafely({ ...cfg, fetch: async () => Promise.reject(new TypeError("getaddrinfo Sara")) }, email);
    expect(log.mock.calls.map((c) => c.join(" "))).toEqual([
      "[email] new-lead alert failed: status 422",
      "[email] new-lead alert failed: network error",
    ]);
  });
});

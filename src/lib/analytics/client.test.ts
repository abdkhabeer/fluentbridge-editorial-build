import { beforeEach, describe, expect, it, vi } from "vitest";
import { analyticsSessionId, captureAttribution, storedAttribution, trackOnce } from "./client";

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("analytics client", () => {
  it("keeps the first touch for 30 days, then captures a new one", () => {
    const t0 = new Date("2026-10-01T00:00:00Z");
    window.history.replaceState(null, "", "/?utm_source=newsletter");
    captureAttribution(t0);
    window.history.replaceState(null, "", "/?utm_source=instagram");
    captureAttribution(new Date(t0.getTime() + 29 * DAY));
    expect(storedAttribution(new Date(t0.getTime() + 29 * DAY))?.utm_source).toBe("newsletter");
    expect(storedAttribution(new Date(t0.getTime() + 31 * DAY))).toBeNull();
    captureAttribution(new Date(t0.getTime() + 31 * DAY));
    expect(storedAttribution(new Date(t0.getTime() + 31 * DAY))?.utm_source).toBe("instagram");
    window.history.replaceState(null, "", "/");
  });

  it("uses one anonymous session id per browser", () => {
    const id = analyticsSessionId();
    expect(id).toMatch(/^[a-f0-9]{32}$/);
    expect(analyticsSessionId()).toBe(id);
  });

  it("sends 'once' events once per tab, with no personal data", () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    trackOnce("results_viewed");
    trackOnce("results_viewed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/events");
    expect(Object.keys(JSON.parse(String(init.body))).sort()).toEqual(["name", "props", "session_id"]);
    vi.unstubAllGlobals();
  });
});

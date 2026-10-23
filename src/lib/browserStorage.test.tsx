import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LOCAL_STORAGE_KEYS, SESSION_STORAGE_KEYS, clearSiteStorage } from "./browserStorage";
import { analyticsSessionId, captureAttribution, storedAttribution, trackOnce } from "./analytics/client";
import { initialFunnel, saveFunnel } from "./enrollment/storage";
import PricingSection from "@/components/PricingSection";

const LOCAL = Object.values(LOCAL_STORAGE_KEYS) as string[];
const SESSION = Object.values(SESSION_STORAGE_KEYS) as string[];

// Every source file except tests, as text.
const SOURCES = import.meta.glob(["/src/**/*.{ts,tsx}", "!/src/**/*.test.{ts,tsx}", "!/src/test/**"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 202 })));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("browser storage registry", () => {
  it("lists every key this site writes, and clearSiteStorage removes them all", () => {
    const written = { local: new Set<string>(), session: new Set<string>() };
    const record = vi.spyOn(Storage.prototype, "setItem");

    // Run every writer on the site.
    saveFunnel({ ...initialFunnel(), draft: { ...initialFunnel().draft, full_name: "Test Person" } });
    analyticsSessionId();
    captureAttribution();
    trackOnce("intake_started");
    render(
      <MemoryRouter>
        <PricingSection />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Saudi Arabia" }));

    for (const [key] of record.mock.calls.filter((_, i) => record.mock.contexts[i] === window.localStorage)) written.local.add(key);
    for (const [key] of record.mock.calls.filter((_, i) => record.mock.contexts[i] === window.sessionStorage)) written.session.add(key);
    record.mockRestore();

    expect([...written.local].sort()).toEqual([...LOCAL].sort());
    expect([...written.session].sort()).toEqual([...SESSION].sort());

    clearSiteStorage();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("fails when a source file writes storage with a key that isn't in the registry", () => {
    const registry = new Set([...LOCAL, ...SESSION]);
    const problems: string[] = [];
    for (const [file, text] of Object.entries(SOURCES)) {
      if (file.endsWith("/browserStorage.ts") || file.endsWith("/browserStorage.test.tsx")) continue;
      const touchesStorage = /\b(localStorage|sessionStorage|setItem)\b/.test(text);
      // Storage keys must come from the registry, never a literal at the call.
      for (const m of text.matchAll(/\.setItem\(\s*["'`]([^"'`]+)["'`]/g)) problems.push(`${file}: setItem("${m[1]}")`);
      if (touchesStorage) {
        for (const m of text.matchAll(/["'`](fb-[a-z0-9-]+)["'`]/g)) {
          if (!registry.has(m[1])) problems.push(`${file}: unregistered key "${m[1]}"`);
          else problems.push(`${file}: "${m[1]}" should be imported from browserStorage.ts`);
        }
      }
      // IndexedDB and Cache Storage aren't covered by clearSiteStorage.
      if (/\bindexedDB\b|\bcaches\.open\b/.test(text)) problems.push(`${file}: uses IndexedDB or Cache Storage`);
    }
    expect(problems).toEqual([]);
  });

  it("writes cookies only from the unused shadcn sidebar component", () => {
    const writers = Object.entries(SOURCES)
      .filter(([, text]) => /document\.cookie\s*=/.test(text))
      .map(([file]) => file);
    expect(writers).toEqual(["/src/components/ui/sidebar.tsx"]);
    const importers = Object.entries(SOURCES).filter(([file, text]) => file !== "/src/components/ui/sidebar.tsx" && /components\/ui\/sidebar/.test(text));
    expect(importers.map(([f]) => f)).toEqual([]);
  });
});

describe("saved attribution", () => {
  it("deletes attribution older than 30 days when it is read", () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(LOCAL_STORAGE_KEYS.attribution, JSON.stringify({ utm_source: "x", landing_path: "/", captured_at: old }));
    expect(storedAttribution()).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.attribution)).toBeNull();
  });
});

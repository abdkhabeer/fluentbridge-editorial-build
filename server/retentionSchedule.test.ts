// @vitest-environment node
import { describe, expect, it } from "vitest";
import cleanup, { config } from "../netlify/functions/retention-cleanup.mts";
import { memoryStore, keys } from "./store";
import { runRetention } from "./api";

const DAY = 24 * 60 * 60 * 1000;

describe("scheduled retention job", () => {
  it("is scheduled daily and runs only on the production deploy", async () => {
    expect(config.schedule).toBe("@daily");
    const res = await cleanup(new Request("https://example.test/"), { deploy: { context: "deploy-preview" } });
    expect(await res.text()).toBe("skipped: not production");
  });

  it("deletes events from more than 365 days ago and keeps the rest", async () => {
    const store = memoryStore();
    const now = new Date("2026-10-19T03:00:00Z");
    const day = (offset: number) => new Date(now.getTime() - offset * DAY).toISOString().slice(0, 10);
    await store.create(keys.event(day(366), "old"), { name: "intake_started" });
    await store.create(keys.event(day(365), "edge"), { name: "intake_started" });
    await store.create(keys.event(day(1), "new"), { name: "intake_started" });
    const report = await runRetention(store, now);
    expect(report.events).toBe(1);
    expect((await store.list(keys.eventsPrefix)).sort()).toEqual([keys.event(day(365), "edge"), keys.event(day(1), "new")].sort());
  });
});

// @vitest-environment node
import { describe, expect, it, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileStore, memoryStore, mapLimit, type Store } from "./store";

const dirs: string[] = [];
afterAll(async () => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))));

const stores: [string, () => Promise<Store>][] = [
  ["memory", async () => memoryStore()],
  [
    "file (dev)",
    async () => {
      const d = await mkdtemp(path.join(os.tmpdir(), "fb-store-test-"));
      dirs.push(d);
      return fileStore(d);
    },
  ],
];

describe.each(stores)("%s store conditional writes", (_name, make) => {
  it("create succeeds once and replace requires the current etag", async () => {
    const s = await make();
    expect(await s.create("a/1", { n: 1 })).toBe(true);
    expect(await s.create("a/1", { n: 2 })).toBe(false);
    const v1 = (await s.get<{ n: number }>("a/1"))!;
    expect(v1.value).toEqual({ n: 1 });
    expect(await s.replace("a/1", { n: 3 }, v1.etag)).toBe(true);
    expect(await s.replace("a/1", { n: 4 }, v1.etag)).toBe(false);
    expect((await s.get<{ n: number }>("a/1"))!.value).toEqual({ n: 3 });
    expect(await s.replace("missing", {}, v1.etag)).toBe(false);
  });

  it("only one of many concurrent conditional writes wins", async () => {
    const s = await make();
    await s.create("c", { n: 0 });
    const { etag } = (await s.get("c"))!;
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => s.replace("c", { n: i + 1 }, etag)));
    expect(results.filter(Boolean)).toHaveLength(1);
    const creates = await Promise.all(Array.from({ length: 10 }, () => s.create("d", {})));
    expect(creates.filter(Boolean)).toHaveLength(1);
  });

  it("lists by prefix and deletes", async () => {
    const s = await make();
    await s.create("x/1", 1);
    await s.create("x/2", 2);
    await s.create("y/1", 3);
    expect((await s.list("x/")).sort()).toEqual(["x/1", "x/2"]);
    await s.delete("x/1");
    expect(await s.get("x/1")).toBeNull();
  });
});

describe("mapLimit", () => {
  it("never runs more than the limit at once and preserves order", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([...Array(50).keys()], 16, async (i) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 1));
      active--;
      return i * 2;
    });
    expect(peak).toBeLessThanOrEqual(16);
    expect(out).toEqual([...Array(50).keys()].map((i) => i * 2));
  });
});

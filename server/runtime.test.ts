// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { adaptBlobs, buildContext, handleNetlifyRequest, openStore } from "./netlify";
import { DEV_STORE, PREVIEW_STORE, PRODUCTION_STORE, resolveRuntime } from "./runtime";

const env = {
  INSTRUCTOR_PASSWORD: "production-password-123",
  INSTRUCTOR_SESSION_SECRET: "p".repeat(40),
  PREVIEW_INSTRUCTOR_PASSWORD: "preview-password-456",
  PREVIEW_INSTRUCTOR_SESSION_SECRET: "q".repeat(40),
};

describe("deploy-context storage and credential selection", () => {
  it("production uses the site-wide production store and production credentials", () => {
    expect(resolveRuntime("production", env)).toEqual({
      storage: { scope: "site", name: PRODUCTION_STORE, context: "production" },
      instructorPassword: env.INSTRUCTOR_PASSWORD,
      sessionSecret: env.INSTRUCTOR_SESSION_SECRET,
    });
  });

  it.each(["deploy-preview", "branch-deploy", "preview-server"])("%s uses an isolated deploy-scoped store and preview credentials", (c) => {
    const r = resolveRuntime(c, env);
    expect(r.storage).toEqual({ scope: "deploy", name: PREVIEW_STORE, context: c });
    expect(r.instructorPassword).toBe(env.PREVIEW_INSTRUCTOR_PASSWORD);
    expect(r.sessionSecret).toBe(env.PREVIEW_INSTRUCTOR_SESSION_SECRET);
  });

  it("previews never use production credentials", () => {
    const onlyProd = { INSTRUCTOR_PASSWORD: env.INSTRUCTOR_PASSWORD, INSTRUCTOR_SESSION_SECRET: env.INSTRUCTOR_SESSION_SECRET };
    expect(resolveRuntime("deploy-preview", onlyProd)).toMatchObject({ instructorPassword: undefined, sessionSecret: undefined });
    const copied = { ...onlyProd, PREVIEW_INSTRUCTOR_PASSWORD: env.INSTRUCTOR_PASSWORD, PREVIEW_INSTRUCTOR_SESSION_SECRET: "z".repeat(40) };
    expect(resolveRuntime("deploy-preview", copied)).toMatchObject({ instructorPassword: undefined, sessionSecret: undefined });
  });

  it("netlify dev uses a separate local sandbox store", () => {
    expect(resolveRuntime("dev", env).storage).toEqual({ scope: "site", name: DEV_STORE, context: "dev" });
  });

  it.each([undefined, "", "staging", "Production"])("unknown context %s gets no storage and no instructor access", (c) => {
    const r = resolveRuntime(c, env);
    expect(r.storage.scope).toBe("none");
    expect(r.instructorPassword).toBeUndefined();
  });
});

describe("opening Netlify Blobs stores", () => {
  const fakes = () => ({ getStore: vi.fn(() => ({}) as never), getDeployStore: vi.fn(() => ({}) as never) });

  it("opens the site store only for production and the deploy store only for previews", () => {
    const f = fakes();
    openStore(resolveRuntime("production", env).storage, f);
    expect(f.getStore).toHaveBeenCalledWith({ name: PRODUCTION_STORE, consistency: "strong" });
    expect(f.getDeployStore).not.toHaveBeenCalled();

    const g = fakes();
    openStore(resolveRuntime("deploy-preview", env).storage, g);
    expect(g.getDeployStore).toHaveBeenCalledWith({ name: PREVIEW_STORE, consistency: "strong" });
    expect(g.getStore).not.toHaveBeenCalled();
  });

  it("throws instead of falling back when there is no storage", () => {
    const f = fakes();
    expect(() => openStore(resolveRuntime("staging", env).storage, f)).toThrow(/Unknown deploy context/);
    expect(f.getStore).not.toHaveBeenCalled();
    expect(f.getDeployStore).not.toHaveBeenCalled();
  });

  it("a preview whose deploy store can't be opened gets no context (503), never the production store", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const getStore = vi.fn();
    const getDeployStore = vi.fn(() => {
      throw new Error("missing deploy ID");
    });
    expect(buildContext({ deploy: { context: "deploy-preview" } }, { getStore, getDeployStore } as never)).toBeNull();
    expect(getStore).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("an unknown or missing context returns 503 without touching storage", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(buildContext({})).toBeNull();
    const res = await handleNetlifyRequest(new Request("https://x.test/api/assessment"), { deploy: { context: "staging" } });
    expect(res.status).toBe(503);
    spy.mockRestore();
  });

  it("maps conditional writes onto onlyIfNew / onlyIfMatch", async () => {
    const setJSON = vi.fn(async () => ({ modified: false }));
    const store = adaptBlobs({ setJSON } as never);
    expect(await store.create("k", { a: 1 })).toBe(false);
    expect(setJSON).toHaveBeenLastCalledWith("k", { a: 1 }, { onlyIfNew: true });
    expect(await store.replace("k", { a: 2 }, '"e1"')).toBe(false);
    expect(setJSON).toHaveBeenLastCalledWith("k", { a: 2 }, { onlyIfMatch: '"e1"' });
  });

  it("uses the read's ETag when Blobs provides one (production)", async () => {
    const list = vi.fn(async () => ({ blobs: [], directories: [] }));
    const store = adaptBlobs({ list, getWithMetadata: vi.fn(async () => ({ data: { a: 1 }, etag: '"live"', metadata: {} })) } as never);
    expect(await store.get("k")).toEqual({ value: { a: 1 }, etag: '"live"' });
  });

  it("falls back to a stable listed ETag (local sandbox) and refuses an unstable or missing one", async () => {
    const getWithMetadata = vi.fn(async () => ({ data: { a: 1 }, metadata: {} }));
    const listing = (etag?: string) => ({ blobs: etag ? [{ key: "k", etag }, { key: "k2", etag: '"other"' }] : [], directories: [] });

    const stable = adaptBlobs({ getWithMetadata, list: vi.fn(async () => listing('"s1"')) } as never);
    expect(await stable.get("k")).toEqual({ value: { a: 1 }, etag: '"s1"' });

    // A write lands between the two listings every time: never accept the pair.
    let n = 0;
    const moving = adaptBlobs({ getWithMetadata, list: vi.fn(async () => listing(`"m${n++}"`)) } as never);
    await expect(moving.get("k")).rejects.toThrow(/ETag/);

    const none = adaptBlobs({ getWithMetadata, list: vi.fn(async () => listing()) } as never);
    await expect(none.get("k")).rejects.toThrow(/ETag/);
  });
});

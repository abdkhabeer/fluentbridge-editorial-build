// Netlify runtime wiring: picks the Blobs store and credentials for the
// function's deploy context (see server/runtime.ts) and adapts Netlify Blobs
// to the Store interface with ETag-based conditional writes.

import { getDeployStore, getStore } from "@netlify/blobs";
import { handleApiRequest, unavailable, type ApiContext } from "./api";
import { resolveRuntime, type StorageSelection } from "./runtime";
import type { Store } from "./store";

type BlobsStore = ReturnType<typeof getStore>;

const listedEtag = async (store: BlobsStore, key: string) =>
  (await store.list({ prefix: key })).blobs.find((b) => b.key === key)?.etag;

export const adaptBlobs = (store: BlobsStore): Store => ({
  async get<T>(key: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      // The local Blobs sandbox (netlify dev / serve) doesn't send an ETag on reads, so read
      // the ETag from list() before and after the data and only accept a stable one: a write
      // in between changes it, so stale data can never be paired with a newer ETag.
      const before = await listedEtag(store, key);
      const r = await store.getWithMetadata(key, { type: "json" });
      if (!r) return null;
      if (r.etag) return { value: r.data as T, etag: r.etag };
      const after = await listedEtag(store, key);
      if (before && before === after) return { value: r.data as T, etag: after };
    }
    throw new Error("Blobs returned no stable ETag; refusing to continue without conditional writes.");
  },
  async create(key, value) {
    return (await store.setJSON(key, value, { onlyIfNew: true })).modified;
  },
  async replace(key, value, etag) {
    return (await store.setJSON(key, value, { onlyIfMatch: etag })).modified;
  },
  async delete(key) {
    await store.delete(key);
  },
  async list(prefix) {
    const { blobs } = await store.list({ prefix });
    return blobs.map((b) => b.key);
  },
});

/** Opens the store for a selection. Throws for "none" so misconfigured contexts never fall back to production. */
export const openStore = (
  selection: StorageSelection,
  impl: { getStore: typeof getStore; getDeployStore: typeof getDeployStore } = { getStore, getDeployStore },
): Store => {
  if (selection.scope === "site") return adaptBlobs(impl.getStore({ name: selection.name, consistency: "strong" }));
  if (selection.scope === "deploy") return adaptBlobs(impl.getDeployStore({ name: selection.name, consistency: "strong" }));
  throw new Error(selection.reason);
};

type NetlifyContext = { deploy?: { context?: string }; ip?: string; waitUntil?: (work: Promise<unknown>) => void };

export const buildContext = (
  context: NetlifyContext | undefined,
  impl?: Parameters<typeof openStore>[1],
): ApiContext | null => {
  const runtime = resolveRuntime(context?.deploy?.context, process.env);
  if (runtime.storage.scope === "none") {
    console.error(`[netlify] storage disabled: ${runtime.storage.reason}`);
    return null;
  }
  let store: Store;
  try {
    store = openStore(runtime.storage, impl);
  } catch (e) {
    // e.g. a deploy-scoped store without a deploy ID: fail closed rather than crash or fall back.
    console.error(`[netlify] storage unavailable: ${e instanceof Error ? e.message : "unknown error"}`);
    return null;
  }
  return {
    store,
    clientIp: context?.ip,
    waitUntil: context?.waitUntil?.bind(context),
    config: {
      instructorPassword: runtime.instructorPassword,
      sessionSecret: runtime.sessionSecret,
      secureCookies: true,
      leadAttribution: process.env.FEATURE_LEAD_ATTRIBUTION === "true",
      email: { apiKey: process.env.RESEND_API_KEY, to: process.env.ALERT_EMAIL_TO, from: process.env.EMAIL_FROM },
    },
  };
};

export const handleNetlifyRequest = (req: Request, context: NetlifyContext) => {
  const ctx = buildContext(context);
  return ctx ? handleApiRequest(req, ctx) : Promise.resolve(unavailable());
};

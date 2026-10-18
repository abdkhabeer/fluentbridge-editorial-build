// Key-value persistence used by the API, with ETag-based conditional writes.
// Production and previews use Netlify Blobs (server/netlify.ts); local
// development uses a JSON file per key; tests use the in-memory store.

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type Versioned<T> = { value: T; etag: string };

export interface Store {
  get<T>(key: string): Promise<Versioned<T> | null>;
  /** Writes only if the key does not exist. Returns false if it already exists. */
  create(key: string, value: unknown): Promise<boolean>;
  /** Writes only if the stored ETag still matches. Returns false on a conflict or a missing key. */
  replace(key: string, value: unknown, etag: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  /** Returns keys starting with prefix (all pages). */
  list(prefix: string): Promise<string[]>;
}

const etagOf = (serialized: string, n: number) => `"${createHash("sha256").update(`${n}:${serialized}`).digest("hex").slice(0, 16)}"`;

type MemoryHooks = {
  /** Called after a read resolves; tests use it to pause one request mid-flight. */
  afterGet?: (key: string) => Promise<void>;
  /** Return true to make a write fail, to simulate partial failures. */
  failWrite?: (key: string) => boolean;
};

export const memoryStore = (hooks: MemoryHooks = {}): Store & { data: Map<string, { json: string; etag: string }> } => {
  const data = new Map<string, { json: string; etag: string }>();
  let counter = 0;
  const write = (key: string, value: unknown) => {
    if (hooks.failWrite?.(key)) throw new Error(`simulated write failure for ${key.split("/")[0]}`);
    const json = JSON.stringify(value);
    data.set(key, { json, etag: etagOf(json, ++counter) });
  };
  return {
    data,
    async get<T>(key: string) {
      const v = data.get(key);
      const result = v ? { value: JSON.parse(v.json) as T, etag: v.etag } : null;
      await hooks.afterGet?.(key);
      return result;
    },
    // Check-and-set happens synchronously, so it is atomic in this single-threaded store.
    async create(key, value) {
      if (data.has(key)) return false;
      write(key, value);
      return true;
    },
    async replace(key, value, etag) {
      if (data.get(key)?.etag !== etag) return false;
      write(key, value);
      return true;
    },
    async delete(key) {
      data.delete(key);
    },
    async list(prefix) {
      return [...data.keys()].filter((k) => k.startsWith(prefix));
    },
  };
};

/** Development-only store: one JSON file per key in `dir` (gitignored). */
export const fileStore = (dir: string): Store => {
  const fileFor = (key: string) => path.join(dir, `${encodeURIComponent(key)}.json`);
  // Serialise conditional writes per key within this process (the dev server is a single process).
  const locks = new Map<string, Promise<unknown>>();
  const withLock = <R>(key: string, fn: () => Promise<R>): Promise<R> => {
    const prev = locks.get(key) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    locks.set(key, next.catch(() => undefined));
    return next;
  };
  const read = async (key: string) => {
    try {
      const json = await readFile(fileFor(key), "utf8");
      return { json, etag: etagOf(json, 0) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  };
  const write = async (key: string, value: unknown) => {
    await mkdir(dir, { recursive: true });
    const tmp = `${fileFor(key)}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2));
    await rename(tmp, fileFor(key));
  };
  return {
    async get<T>(key: string) {
      const r = await read(key);
      return r ? { value: JSON.parse(r.json) as T, etag: r.etag } : null;
    },
    create: (key, value) =>
      withLock(key, async () => {
        if (await read(key)) return false;
        await write(key, value);
        return true;
      }),
    replace: (key, value, etag) =>
      withLock(key, async () => {
        if ((await read(key))?.etag !== etag) return false;
        await write(key, value);
        return true;
      }),
    async delete(key) {
      await rm(fileFor(key), { force: true });
    },
    async list(prefix) {
      try {
        const files = await readdir(dir);
        return files
          .filter((f) => f.endsWith(".json"))
          .map((f) => decodeURIComponent(f.slice(0, -5)))
          .filter((k) => k.startsWith(prefix));
      } catch {
        return [];
      }
    },
  };
};

export const keys = {
  application: (id: string) => `applications/${id}`,
  assessment: (id: string) => `assessments/${id}`,
  token: (hash: string) => `tokens/${hash}`,
  sessionVersion: "instructor/session-version",
  applicationRateLimit: (day: string, ipHash: string) => `ratelimit/applications/${day}/${ipHash}`,
  applicationsPrefix: "applications/",
  tokensPrefix: "tokens/",
  rateLimitPrefix: "ratelimit/",
};

/** Runs `fn` over items with at most `limit` in flight. */
export const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
};

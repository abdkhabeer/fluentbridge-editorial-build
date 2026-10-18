import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/** Student access tokens are 32 random bytes, hex-encoded, generated in the browser. */
export const isValidAccessToken = (t: unknown): t is string => typeof t === "string" && /^[a-f0-9]{64}$/.test(t);

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const newId = () => randomUUID();

const safeEqual = (a: string, b: string) => {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
};

export const checkPassword = (input: unknown, expected: string) => typeof input === "string" && safeEqual(input, expected);

// ── Instructor session (HMAC-signed HttpOnly cookie, revocable via a server-side version) ──

export const SESSION_COOKIE = "fb_instructor_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

/**
 * Cookie value: v2.<expiresAtMs>.<sessionVersion>.<hmac>. The session version is
 * stored server-side; signing out increments it, which revokes every issued cookie.
 */
export const createSessionValue = (secret: string, nowMs: number, version: number) => {
  const exp = nowMs + SESSION_TTL_SECONDS * 1000;
  const payload = `v2.${exp}.${version}`;
  return `${payload}.${sign(payload, secret)}`;
};

/** Returns the session version embedded in a validly signed, unexpired cookie, or null. */
export const parseSessionValue = (value: string | null | undefined, secret: string, nowMs: number): number | null => {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v2") return null;
  if (!safeEqual(parts[3], sign(parts.slice(0, 3).join("."), secret))) return null;
  const exp = Number(parts[1]);
  const version = Number(parts[2]);
  if (!Number.isSafeInteger(exp) || exp < nowMs || !Number.isSafeInteger(version) || version < 1) return null;
  return version;
};

export const readCookie = (header: string | null, name: string) => {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
};

export const sessionCookie = (value: string, secure: boolean) =>
  `${SESSION_COOKIE}=${value}; Path=/api/instructor; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;

export const clearedSessionCookie = (secure: boolean) =>
  `${SESSION_COOKIE}=; Path=/api/instructor; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;

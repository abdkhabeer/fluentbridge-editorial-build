// HTTP API for the enrollment funnel and instructor dashboard.
// Framework-agnostic: takes a Fetch API Request and returns a Response, so the
// same code runs in Netlify Functions, the Vite dev server, and tests.
//
// Student endpoints are authorised by a secret access token (X-Assessment-Token
// header) generated in the student's browser; only its SHA-256 hash is stored,
// and it expires ACCESS_TTL_DAYS after the application is created.
// Instructor endpoints require a signed HttpOnly session cookie whose version
// matches the server-side session version (signing out revokes all sessions).
//
// Every read-modify-write uses ETag-conditional writes (Store.replace), so a
// stale request can never overwrite newer data.

import { buildPriceSnapshot, HELP_CHOOSING_PACKAGE, findPlan, findTrial, trialPriceFor } from "../src/data/pricing";
import {
  CEFR_LEVELS,
  PASSAGES,
  QUESTIONS,
  TEST_VERSION,
  WRITING_MAX_CHARS,
  WRITING_PROMPTS,
  countWords,
  type CefrLevel,
  type WritingTier,
} from "../src/lib/assessment/questions";
import type {
  ApplicationRecordPublic,
  AssessmentStatus,
  LeadDetail,
  LeadSummary,
  StudentAssessmentState,
  StudentResult,
  WritingStatus,
} from "../src/lib/enrollment/apiTypes";
import { reviewFlagsFor } from "../src/lib/enrollment/flags";
import { FOLLOW_UP_MESSAGES, followUpEventType, type FollowUpMessage } from "../src/lib/enrollment/followUp";
import { LEAD_STATUSES, type LeadStatus } from "../src/lib/enrollment/options";
import { cleanText, parseApplication, parseContactCorrection, type NormalizedApplication } from "../src/lib/enrollment/schema";
import { ANSWER_KEY } from "./assessment/answerKey";
import {
  buildFeedback,
  isValidRubric,
  overallScore,
  rubricPercent,
  sanitizeAnswers,
  scoreObjective,
  writingPromptFor,
  writingTierFor,
  type Answers,
  type ObjectiveResult,
  type RubricScores,
} from "./assessment/scoring";
import {
  SESSION_COOKIE,
  checkPassword,
  clearedSessionCookie,
  createSessionValue,
  isValidAccessToken,
  newId,
  parseSessionValue,
  readCookie,
  sessionCookie,
  sha256,
} from "./auth";
import { ACCESS_TTL_DAYS, PROSPECT_RETENTION_DAYS } from "../src/lib/enrollment/policy";
import { keys, mapLimit, type Store } from "./store";
import { MAX_FUNNEL_DAYS, funnelReport, recordEvent } from "./analytics";
import { parseAttribution, parseEvent, sourceOf, SESSION_ID, type Attribution } from "../src/lib/analytics/events";
import { emailEnabled, newLeadAlert, sendAlertSafely, type EmailConfig } from "./email";

export const CONSENT_VERSION = "2026-10-enrollment-v2";
export { ACCESS_TTL_DAYS, PROSPECT_RETENTION_DAYS };
/** New applications accepted per client IP per UTC day (in addition to Netlify's per-minute rule). */
export const APPLICATIONS_PER_IP_PER_DAY = 30;

const KB = 1024;
const LIMITS = {
  application: 16 * KB,
  answers: 8 * KB,
  writing: 16 * KB,
  login: 1 * KB,
  event: 1 * KB,
  instructor: 16 * KB,
  empty: 1 * KB,
};
const DAY_MS = 24 * 60 * 60 * 1000;
const CONFLICT_RETRIES = 5;

export type ApiConfig = {
  instructorPassword?: string;
  sessionSecret?: string;
  /** Set Secure on cookies (true everywhere except plain-http local dev). */
  secureCookies: boolean;
  now?: () => Date;
  /**
   * Store first-touch attribution and the analytics session id on new leads
   * (FEATURE_LEAD_ATTRIBUTION). Off until the consent wording that covers it is approved.
   */
  leadAttribution?: boolean;
  /** New-lead alert email through Resend (RESEND_API_KEY, ALERT_EMAIL_TO, EMAIL_FROM). Off when unset. */
  email?: EmailConfig;
};

export type ApiContext = {
  store: Store;
  config: ApiConfig;
  clientIp?: string;
  /** Keeps the function alive for work that finishes after the response (Netlify context.waitUntil). */
  waitUntil?: (work: Promise<unknown>) => void;
};

// ── Records ──

export type ApplicationRecord = ApplicationRecordPublic & { access_token_hash: string };

export type AssessmentRecord = {
  id: string;
  application_id: string;
  test_version: string;
  status: AssessmentStatus;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  answers: Answers;
  objective: Omit<ObjectiveResult, "test_version"> | null;
  writing_score: number | null;
  overall_score: number | null;
  instructor_level: CefrLevel | null;
  strengths: string[];
  improvement_areas: string[];
  recommended_learning_priorities: string[];
  writing: {
    prompt_id: string | null;
    tier: WritingTier | null;
    status: WritingStatus;
    response: string;
    word_count: number;
    submitted_at: string | null;
    rubric: RubricScores | null;
    scored_at: string | null;
  };
};

export type TokenIndex = { application_id: string; assessment_id: string; created_at: string; expires_at: string };

// ── Helpers ──

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });

const error = (status: number, message: string, extra: Record<string, unknown> = {}) => json(status, { error: message, ...extra });

/** Response used when the deploy context has no storage configured (fail closed). */
export const unavailable = () => error(503, "This service is not available on this deployment.");

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

const readJson = async (req: Request, maxBytes: number): Promise<Record<string, unknown>> => {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Expected application/json.");
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "Request too large.");
  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) throw new HttpError(413, "Request too large.");
  try {
    const parsed = JSON.parse(new TextDecoder().decode(buf));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
};

const nowDate = (ctx: ApiContext) => ctx.config.now?.() ?? new Date();
const nowIso = (ctx: ApiContext) => nowDate(ctx).toISOString();

const withoutSecrets = ({ access_token_hash: _omit, ...rest }: ApplicationRecord): ApplicationRecordPublic => rest;

const promptForTier = (tier: WritingTier | null) => (tier ? WRITING_PROMPTS[tier] : null);

const packageTitle = (id: string) => {
  if (id === HELP_CHOOSING_PACKAGE) return "Needs help choosing";
  const trial = findTrial(id);
  if (trial) return `${trial.trial.title} (${trial.region.label})`;
  const found = findPlan(id);
  return found ? `${found.track.heading}: ${found.plan.title}` : id;
};

/**
 * Applies `mutate` to the stored record with an ETag-conditional write, re-reading
 * and retrying on conflict. `mutate` may throw HttpError (e.g. a status check),
 * which is re-evaluated against the latest data on every attempt.
 */
const update = async <T>(store: Store, key: string, mutate: (current: T) => T): Promise<{ value: T; etag: string }> => {
  for (let attempt = 0; attempt < CONFLICT_RETRIES; attempt++) {
    const current = await store.get<T>(key);
    if (!current) throw new HttpError(404, "Record not found.");
    const next = mutate(structuredClone(current.value));
    if (await store.replace(key, next, current.etag)) {
      const fresh = await store.get<T>(key);
      return fresh ?? { value: next, etag: current.etag };
    }
  }
  throw new HttpError(409, "This record is being updated. Please try again.");
};

const newAssessment = (id: string, applicationId: string, now: string): AssessmentRecord => ({
  id,
  application_id: applicationId,
  test_version: TEST_VERSION,
  status: "not_started",
  created_at: now,
  updated_at: now,
  started_at: null,
  completed_at: null,
  answers: {},
  objective: null,
  writing_score: null,
  overall_score: null,
  instructor_level: null,
  strengths: [],
  improvement_areas: [],
  recommended_learning_priorities: [],
  writing: { prompt_id: null, tier: null, status: "not_started", response: "", word_count: 0, submitted_at: null, rubric: null, scored_at: null },
});

// ── Student: application ──

const utcDay = (d: Date) => d.toISOString().slice(0, 10);

/** Per-IP daily cap on new applications. Counts are keyed by a hash of day+IP (no raw IPs stored). */
const enforceDailyCap = async (ctx: ApiContext) => {
  if (!ctx.clientIp) return;
  const day = utcDay(nowDate(ctx));
  const key = keys.applicationRateLimit(day, sha256(`fb-app-cap:${day}:${ctx.clientIp}`));
  if (await ctx.store.create(key, { count: 1 })) return;
  await update<{ count: number }>(ctx.store, key, (c) => {
    if (c.count >= APPLICATIONS_PER_IP_PER_DAY) {
      throw new HttpError(429, "Too many applications from your network today. Please try again tomorrow or contact us on WhatsApp.");
    }
    return { count: c.count + 1 };
  });
};

type LeadTracking = { attribution: Attribution | null; analytics_session_id: string | null };

const buildApplication = (
  data: NormalizedApplication,
  index: TokenIndex,
  tokenHash: string,
  now: string,
  tracking: LeadTracking | null,
): ApplicationRecord => ({
  ...data,
  ...(tracking ?? {}),
  id: index.application_id,
  created_at: now,
  updated_at: now,
  selected_package_price_snapshot: buildPriceSnapshot(data.selected_package),
  consent_timestamp: now,
  consent_version: CONSENT_VERSION,
  lead_status: "new",
  review_flags: reviewFlagsFor(data),
  instructor_notes: "",
  assessment_id: index.assessment_id,
  access_expires_at: index.expires_at,
  access_revoked_at: null,
  access_token_hash: tokenHash,
});

/**
 * Creates an application. The token index is claimed first with onlyIfNew, so
 * concurrent or repeated requests with the same token always resolve to the
 * same application ids. Records are then created with onlyIfNew, which also
 * repairs a previous attempt that failed part-way.
 */
const createApplication = async (req: Request, ctx: ApiContext) => {
  const body = await readJson(req, LIMITS.application);
  // Honeypot: real users never see or fill this field.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return error(400, "We couldn't process this submission.");
  }
  if (!isValidAccessToken(body.access_token)) return error(400, "Missing or invalid access token.");
  const parsed = parseApplication(body.application);
  if (!parsed.ok) return error(422, "Please check the highlighted fields.", { fields: parsed.errors });

  const tokenHash = sha256(body.access_token);
  const tokenKey = keys.token(tokenHash);
  const now = nowDate(ctx);
  let created = false;
  let index = (await ctx.store.get<TokenIndex>(tokenKey))?.value ?? null;

  if (!index) {
    await enforceDailyCap(ctx);
    const candidate: TokenIndex = {
      application_id: newId(),
      assessment_id: newId(),
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ACCESS_TTL_DAYS * DAY_MS).toISOString(),
    };
    created = await ctx.store.create(tokenKey, candidate);
    index = created ? candidate : ((await ctx.store.get<TokenIndex>(tokenKey))?.value ?? null);
    if (!index) throw new HttpError(409, "Please try again.");
  }
  if (new Date(index.expires_at).getTime() < now.getTime()) {
    return error(410, "This application link has expired. Please start a new application.");
  }

  // Application first, so contact details survive even if the assessment write fails.
  const iso = now.toISOString();
  if (!(await ctx.store.get(keys.application(index.application_id)))) {
    const tracking = ctx.config.leadAttribution
      ? {
          attribution: parseAttribution(body.attribution),
          analytics_session_id: typeof body.analytics_session_id === "string" && SESSION_ID.test(body.analytics_session_id) ? body.analytics_session_id : null,
        }
      : null;
    await ctx.store.create(keys.application(index.application_id), buildApplication(parsed.data, index, tokenHash, iso, tracking));
  }
  let assessment = await ctx.store.get<AssessmentRecord>(keys.assessment(index.assessment_id));
  if (!assessment) {
    await ctx.store.create(keys.assessment(index.assessment_id), newAssessment(index.assessment_id, index.application_id, iso));
    assessment = await ctx.store.get<AssessmentRecord>(keys.assessment(index.assessment_id));
  }

  return json(created ? 201 : 200, {
    application_id: index.application_id,
    assessment_status: assessment?.value.status ?? "not_started",
  });
};

// ── Student: assessment ──

const tokenFrom = (req: Request) => {
  const token = req.headers.get("x-assessment-token");
  if (!isValidAccessToken(token)) throw new HttpError(401, "Missing or invalid access token.");
  return token;
};

const loadIndex = async (req: Request, ctx: ApiContext) => {
  const index = (await ctx.store.get<TokenIndex>(keys.token(sha256(tokenFrom(req)))))?.value;
  if (!index) throw new HttpError(404, "We couldn't find your application.");
  if (new Date(index.expires_at).getTime() < nowDate(ctx).getTime()) {
    throw new HttpError(410, "Access to this assessment has expired. Please contact us on WhatsApp if you need your results.");
  }
  return index;
};

/** Loads the student's records, recreating a missing assessment (repair after a partial failure). */
const loadForToken = async (req: Request, ctx: ApiContext) => {
  const index = await loadIndex(req, ctx);
  const application = await ctx.store.get<ApplicationRecord>(keys.application(index.application_id));
  if (!application) throw new HttpError(404, "We couldn't find your application.");
  let assessment = await ctx.store.get<AssessmentRecord>(keys.assessment(index.assessment_id));
  if (!assessment) {
    await ctx.store.create(keys.assessment(index.assessment_id), newAssessment(index.assessment_id, index.application_id, nowIso(ctx)));
    assessment = await ctx.store.get<AssessmentRecord>(keys.assessment(index.assessment_id));
    if (!assessment) throw new HttpError(503, "Please try again in a moment.");
  }
  return { index, application: application.value, assessment: assessment.value };
};

export const studentResult = (application: ApplicationRecord, a: AssessmentRecord): StudentResult | null => {
  if (a.status !== "completed" || !a.objective || !a.completed_at) return null;
  return {
    full_name: application.full_name,
    test_version: a.test_version,
    completed_at: a.completed_at,
    estimated_cefr_level: a.objective.estimated_cefr_level,
    // Exact scores stay in the lead admin; students see a level range.
    confidence: a.objective.confidence,
    unanswered: a.objective.unanswered,
    category_scores: a.objective.category_scores,
    writing_status: a.writing.status,
    strengths: a.strengths,
    improvement_areas: a.improvement_areas,
    recommended_learning_priorities: a.recommended_learning_priorities,
    primary_learning_goal: application.primary_learning_goal,
    additional_learning_goals: application.additional_learning_goals,
    other_goal_text: application.other_goal_text,
    lesson_format: application.lesson_format,
    preferred_classes_per_week: application.preferred_classes_per_week,
    selected_package: application.selected_package,
    selected_package_price_snapshot: application.selected_package_price_snapshot,
    preferred_payment_method: application.preferred_payment_method,
    trial_price: trialPriceFor(application.country, application.city),
  };
};

const studentState = (application: ApplicationRecord, a: AssessmentRecord): StudentAssessmentState => ({
  status: a.status,
  first_name: application.full_name.split(" ")[0],
  answers: a.answers,
  writing_prompt: promptForTier(a.writing.tier),
  writing_draft: a.writing.response,
  result: studentResult(application, a),
});

const getAssessment = async (req: Request, ctx: ApiContext) => {
  const { application, assessment } = await loadForToken(req, ctx);
  return json(200, studentState(application, assessment));
};

const SUBMITTED = (status: AssessmentStatus) =>
  new HttpError(409, "This part of the test has already been submitted.", { status });

const saveAnswers = async (req: Request, ctx: ApiContext) => {
  const body = await readJson(req, LIMITS.answers);
  const { index } = await loadForToken(req, ctx);
  const incoming = sanitizeAnswers(body.answers);
  const now = nowIso(ctx);
  await update<AssessmentRecord>(ctx.store, keys.assessment(index.assessment_id), (a) => {
    if (a.status !== "not_started" && a.status !== "in_progress") throw SUBMITTED(a.status);
    a.answers = { ...a.answers, ...incoming };
    a.status = "in_progress";
    a.started_at ??= now;
    a.updated_at = now;
    return a;
  });
  return json(200, { saved_at: now });
};

/** Locks the multiple-choice section, scores it, and returns the writing prompt for the estimated level. Idempotent. */
const submitObjective = async (req: Request, ctx: ApiContext) => {
  const body = await readJson(req, LIMITS.answers);
  const { index } = await loadForToken(req, ctx);
  const incoming = sanitizeAnswers(body.answers);
  const now = nowIso(ctx);
  const { value } = await update<AssessmentRecord>(ctx.store, keys.assessment(index.assessment_id), (a) => {
    if (a.status === "writing" || a.status === "completed") return a;
    a.answers = { ...a.answers, ...incoming };
    const { test_version: _v, ...objective } = scoreObjective(a.answers);
    a.objective = objective;
    a.status = "writing";
    a.started_at ??= now;
    a.updated_at = now;
    a.writing.prompt_id = writingPromptFor(objective.estimated_cefr_level).id;
    a.writing.tier = writingTierFor(objective.estimated_cefr_level);
    return a;
  });
  return json(200, { writing_prompt: promptForTier(value.writing.tier) });
};

const readWriting = (body: Record<string, unknown>) => {
  if (typeof body.text !== "string") return "";
  return cleanText(body.text, { multiline: true }).slice(0, WRITING_MAX_CHARS);
};

const saveWritingDraft = async (req: Request, ctx: ApiContext) => {
  const body = await readJson(req, LIMITS.writing);
  const { index } = await loadForToken(req, ctx);
  const text = readWriting(body);
  const now = nowIso(ctx);
  await update<AssessmentRecord>(ctx.store, keys.assessment(index.assessment_id), (a) => {
    if (a.status !== "writing") throw new HttpError(409, "The writing task is not open.", { status: a.status });
    a.writing.response = text;
    a.writing.word_count = countWords(text);
    a.writing.status = text ? "draft" : "not_started";
    a.updated_at = now;
    return a;
  });
  return json(200, { saved_at: now });
};

/** Finishes the test. Idempotent: completing again returns the stored result unchanged. */
const completeAssessment = async (req: Request, ctx: ApiContext) => {
  const body = await readJson(req, LIMITS.writing);
  const { index, application } = await loadForToken(req, ctx);
  const text = readWriting(body);
  const skipped = body.skipped === true || !text;
  const now = nowIso(ctx);

  let justCompleted = false;
  const { value: assessment } = await update<AssessmentRecord>(ctx.store, keys.assessment(index.assessment_id), (a) => {
    justCompleted = false;
    if (a.status === "completed") return a;
    if (a.status !== "writing" || !a.objective) {
      throw new HttpError(409, "Please finish the multiple-choice questions first.", { status: a.status });
    }
    a.writing.response = skipped ? "" : text;
    a.writing.word_count = skipped ? 0 : countWords(text);
    a.writing.status = skipped ? "skipped" : "submitted";
    a.writing.submitted_at = skipped ? null : now;
    const feedback = buildFeedback({ test_version: a.test_version, ...a.objective }, {
      primary: application.primary_learning_goal,
      additional: application.additional_learning_goals,
    });
    if (!skipped) {
      feedback.recommended_learning_priorities.splice(
        feedback.recommended_learning_priorities.length - 1,
        0,
        "Your instructor will review your writing and give you feedback on it.",
      );
    }
    const overall = overallScore(a.objective.objective_score.percent, null, a.objective.scoring_method);
    Object.assign(a, feedback, { status: "completed" as const, completed_at: now, updated_at: now, overall_score: overall.overall });
    a.objective.scoring_method = overall.method;
    justCompleted = true;
    return a;
  });

  // Move a brand-new lead to "assessment completed" without clobbering concurrent instructor edits.
  let latestApplication = application;
  if (application.lead_status === "new") {
    latestApplication = (
      await update<ApplicationRecord>(ctx.store, keys.application(application.id), (app) => {
        if (app.lead_status === "new") {
          app.lead_status = "assessment_completed";
          app.updated_at = now;
        }
        return app;
      })
    ).value;
  }
  if (justCompleted) await alertNewLead(req, ctx, latestApplication, assessment);
  return json(200, { result: studentResult(latestApplication, assessment) });
};

/** Emails the instructor about a lead who just finished the test. Never throws. With waitUntil it runs after the response. */
const alertNewLead = async (req: Request, ctx: ApiContext, application: ApplicationRecord, a: AssessmentRecord) => {
  if (!emailEnabled(ctx.config.email) || !a.objective) return;
  const email = newLeadAlert(
    {
      ...application,
      category_scores: a.objective.category_scores,
      improvement_areas: a.improvement_areas,
      trial_price: trialPriceFor(application.country, application.city),
    },
    { level: a.objective.estimated_cefr_level, now: nowDate(ctx), trialRefundCopy: false, siteOrigin: new URL(req.url).origin },
  );
  const work = sendAlertSafely(ctx.config.email, email);
  if (ctx.waitUntil) ctx.waitUntil(work);
  else await work;
};

/** "Remove my data from this device": revokes the access token so it can no longer read the records. */
const revokeAccess = async (req: Request, ctx: ApiContext) => {
  const token = tokenFrom(req);
  const tokenKey = keys.token(sha256(token));
  const index = (await ctx.store.get<TokenIndex>(tokenKey))?.value;
  if (index) {
    await ctx.store.delete(tokenKey);
    const now = nowIso(ctx);
    await update<ApplicationRecord>(ctx.store, keys.application(index.application_id), (app) => {
      app.access_revoked_at = now;
      app.updated_at = now;
      return app;
    }).catch((e) => {
      if (!(e instanceof HttpError && e.status === 404)) throw e;
    });
  }
  // Same response whether or not the token existed.
  return json(200, { revoked: true });
};

// ── Instructor ──

const instructorConfigured = (c: ApiConfig): c is ApiConfig & { instructorPassword: string; sessionSecret: string } =>
  (c.instructorPassword?.length ?? 0) >= 12 && (c.sessionSecret?.length ?? 0) >= 32;

type SessionVersion = { version: number };

const currentSessionVersion = async (ctx: ApiContext) => {
  const v = await ctx.store.get<SessionVersion>(keys.sessionVersion);
  if (v) return v.value.version;
  await ctx.store.create(keys.sessionVersion, { version: 1 } satisfies SessionVersion);
  return (await ctx.store.get<SessionVersion>(keys.sessionVersion))?.value.version ?? 1;
};

const requireInstructor = async (req: Request, ctx: ApiContext) => {
  if (!instructorConfigured(ctx.config)) throw new HttpError(503, "Instructor access is not configured.");
  const cookieVersion = parseSessionValue(
    readCookie(req.headers.get("cookie"), SESSION_COOKIE),
    ctx.config.sessionSecret,
    nowDate(ctx).getTime(),
  );
  if (cookieVersion === null || cookieVersion !== (await currentSessionVersion(ctx))) {
    throw new HttpError(401, "Please sign in.");
  }
};

const login = async (req: Request, ctx: ApiContext) => {
  if (!instructorConfigured(ctx.config)) return error(503, "Instructor access is not configured.");
  const body = await readJson(req, LIMITS.login);
  if (!checkPassword(body.password, ctx.config.instructorPassword)) return error(401, "Incorrect password.");
  const value = createSessionValue(ctx.config.sessionSecret, nowDate(ctx).getTime(), await currentSessionVersion(ctx));
  return json(200, { authenticated: true }, { "Set-Cookie": sessionCookie(value, ctx.config.secureCookies) });
};

const sessionStatus = async (req: Request, ctx: ApiContext) => {
  try {
    await requireInstructor(req, ctx);
    return json(200, { authenticated: true });
  } catch (e) {
    if (e instanceof HttpError && e.status === 503) return error(503, e.message);
    if (e instanceof HttpError && e.status === 401) return json(200, { authenticated: false });
    throw e;
  }
};

/** Signs out by incrementing the session version, which invalidates every issued session cookie. */
const logout = async (req: Request, ctx: ApiContext) => {
  const cleared = { "Set-Cookie": clearedSessionCookie(ctx.config.secureCookies) };
  try {
    await requireInstructor(req, ctx);
  } catch (e) {
    // Without a valid session there is nothing to revoke; just clear the cookie.
    if (e instanceof HttpError && (e.status === 401 || e.status === 503)) return json(200, { authenticated: false }, cleared);
    throw e;
  }
  await update<SessionVersion>(ctx.store, keys.sessionVersion, (v) => ({ version: v.version + 1 }));
  return json(200, { authenticated: false }, cleared);
};

const LEAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const loadLead = async (ctx: ApiContext, id: string) => {
  if (!LEAD_ID.test(id)) throw new HttpError(404, "Lead not found.");
  const application = await ctx.store.get<ApplicationRecord>(keys.application(id));
  if (!application) throw new HttpError(404, "Lead not found.");
  // The assessment may be missing after a partial failure; the lead must still be visible.
  const assessment = await ctx.store.get<AssessmentRecord>(keys.assessment(application.value.assessment_id));
  return { application, assessment };
};

const listLeads = async (ctx: ApiContext) => {
  const ids = (await ctx.store.list(keys.applicationsPrefix)).map((k) => k.slice(keys.applicationsPrefix.length));
  const rows = await mapLimit(ids, 16, async (id): Promise<LeadSummary | null> => {
    const application = (await ctx.store.get<ApplicationRecord>(keys.application(id)))?.value;
    if (!application) return null;
    const a = (await ctx.store.get<AssessmentRecord>(keys.assessment(application.assessment_id)))?.value;
    return {
      id: application.id,
      created_at: application.created_at,
      full_name: application.full_name,
      email: application.email,
      whatsapp_number: application.whatsapp_number,
      country: application.country,
      city: application.city,
      primary_learning_goal: application.primary_learning_goal,
      lesson_format: application.lesson_format,
      selected_package_title: packageTitle(application.selected_package),
      lead_status: application.lead_status,
      assessment_status: a?.status ?? "not_started",
      estimated_cefr_level: a?.status === "completed" ? (a.objective?.estimated_cefr_level ?? null) : null,
      instructor_level: a?.instructor_level ?? null,
      overall_score: a?.status === "completed" ? a.overall_score : null,
      review_flags: application.review_flags,
      assessment_completed_at: a?.status === "completed" ? a.completed_at : null,
      follow_up_count: application.follow_up_events?.length ?? 0,
      source: sourceOf(application.attribution),
    };
  });
  const leads = rows.filter((r): r is LeadSummary => r !== null).sort((x, y) => y.created_at.localeCompare(x.created_at));
  return json(200, { leads });
};

const leadDetail = (
  application: { value: ApplicationRecord; etag: string },
  assessment: { value: AssessmentRecord; etag: string } | null,
): LeadDetail => {
  const app = application.value;
  const a = assessment?.value ?? newAssessment(app.assessment_id, app.id, app.created_at);
  const responses =
    a.objective?.responses ??
    QUESTIONS.map((q) => ({ question_id: q.id, selected_answer: a.answers[q.id] ?? null, awarded_score: 0, maximum_score: 1 }));
  const scored = a.objective !== null;
  return {
    application: withoutSecrets(app),
    application_version: application.etag,
    assessment_version: assessment?.etag ?? null,
    assessment: {
      missing: assessment === null,
      id: a.id,
      test_version: a.test_version,
      status: a.status,
      started_at: a.started_at,
      completed_at: a.completed_at,
      scoring_method: a.objective?.scoring_method ?? null,
      objective_score: a.objective?.objective_score ?? null,
      writing_score: a.writing_score,
      overall_score: a.overall_score,
      estimated_cefr_level: a.objective?.estimated_cefr_level ?? null,
      instructor_level: a.instructor_level,
      confidence: a.objective?.confidence ?? null,
      unanswered: a.objective?.unanswered ?? null,
      category_scores: a.objective?.category_scores ?? null,
      level_evidence: a.objective?.level_evidence ?? null,
      strengths: a.strengths,
      improvement_areas: a.improvement_areas,
      recommended_learning_priorities: a.recommended_learning_priorities,
      responses: responses.map((r) => {
        const q = QUESTIONS.find((x) => x.id === r.question_id)!;
        const key = ANSWER_KEY[q.id];
        return {
          question_id: q.id,
          band: q.band,
          category: q.category,
          prompt: q.prompt,
          passage_title: PASSAGES.find((p) => p.id === q.passageId)?.title ?? null,
          selected_answer: r.selected_answer,
          selected_text: q.options.find((o) => o.id === r.selected_answer)?.text ?? null,
          correct_answer: key.correct,
          correct_text: q.options.find((o) => o.id === key.correct)!.text,
          explanation: key.explanation,
          awarded_score: scored ? r.awarded_score : r.selected_answer === key.correct ? 1 : 0,
          maximum_score: r.maximum_score,
        };
      }),
      writing: {
        status: a.writing.status,
        prompt: promptForTier(a.writing.tier),
        response: a.writing.response,
        word_count: a.writing.word_count,
        submitted_at: a.writing.submitted_at,
        rubric: a.writing.rubric,
        scored_at: a.writing.scored_at,
      },
    },
  };
};

const getLead = async (ctx: ApiContext, id: string) => {
  const { application, assessment } = await loadLead(ctx, id);
  return json(200, leadDetail(application, assessment));
};

const STALE = new HttpError(409, "This lead was changed elsewhere (by you in another tab, or by the student). Reload to see the latest version.");

const updateLead = async (req: Request, ctx: ApiContext, id: string) => {
  const body = await readJson(req, LIMITS.instructor);
  const { application, assessment } = await loadLead(ctx, id);
  const now = nowIso(ctx);

  // Validate everything before writing anything.
  const appChanges: Partial<ApplicationRecord> = {};
  if (body.lead_status !== undefined) {
    if (!LEAD_STATUSES.some((s) => s.value === body.lead_status)) return error(422, "Unknown lead status.");
    appChanges.lead_status = body.lead_status as LeadStatus;
  }
  if (body.instructor_notes !== undefined) {
    if (typeof body.instructor_notes !== "string") return error(422, "Notes must be text.");
    appChanges.instructor_notes = cleanText(body.instructor_notes, { multiline: true }).slice(0, 4000);
  }
  if (body.contact !== undefined) {
    const contact = parseContactCorrection(body.contact);
    if (!contact.ok) return error(422, "Please check the contact details.", { fields: contact.errors });
    Object.assign(appChanges, contact.data);
  }

  const assessChanges: Partial<AssessmentRecord> = {};
  let rubric: RubricScores | null = null;
  if (body.instructor_level !== undefined) {
    if (body.instructor_level !== null && !CEFR_LEVELS.includes(body.instructor_level as CefrLevel)) {
      return error(422, "Unknown CEFR level.");
    }
    assessChanges.instructor_level = body.instructor_level as CefrLevel | null;
  }
  if (body.writing_rubric !== undefined) {
    const a = assessment?.value;
    if (!a || a.status !== "completed" || a.writing.status === "skipped" || !a.objective) {
      return error(409, "There is no submitted writing to score.");
    }
    if (!isValidRubric(body.writing_rubric)) return error(422, "Each rubric score must be a whole number from 0 to 4.");
    rubric = body.writing_rubric;
  }
  const touchesApp = Object.keys(appChanges).length > 0;
  const touchesAssessment = Object.keys(assessChanges).length > 0 || rubric !== null;
  if (touchesAssessment && !assessment) return error(409, "This lead has no assessment record yet.");

  // Optimistic concurrency: the client must send the versions it last saw.
  if (touchesApp && body.application_version !== application.etag) throw STALE;
  if (touchesAssessment && body.assessment_version !== assessment!.etag) throw STALE;

  let nextApplication = application;
  if (touchesApp) {
    const next = { ...application.value, ...appChanges, updated_at: now };
    if (!(await ctx.store.replace(keys.application(id), next, application.etag))) throw STALE;
    nextApplication = (await ctx.store.get<ApplicationRecord>(keys.application(id)))!;
  }
  let nextAssessment = assessment;
  if (touchesAssessment && assessment) {
    const next = structuredClone({ ...assessment.value, ...assessChanges, updated_at: now });
    if (rubric && next.objective) {
      next.writing.rubric = rubric;
      next.writing.status = "scored";
      next.writing.scored_at = now;
      next.writing_score = rubricPercent(rubric);
      const overall = overallScore(next.objective.objective_score.percent, next.writing_score, next.objective.scoring_method);
      next.overall_score = overall.overall;
      next.objective.scoring_method = overall.method;
    }
    if (!(await ctx.store.replace(keys.assessment(assessment.value.id), next, assessment.etag))) throw STALE;
    nextAssessment = await ctx.store.get<AssessmentRecord>(keys.assessment(assessment.value.id));
  }
  return json(200, leadDetail(nextApplication, nextAssessment));
};

// ── Funnel events ──

const logEvent = async (req: Request, ctx: ApiContext) => {
  const event = parseEvent(await readJson(req, LIMITS.event));
  if (!event) return error(422, "Unknown event.");
  await recordEvent(ctx.store, event, nowDate(ctx));
  return json(202, { ok: true });
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const getFunnel = async (req: Request, ctx: ApiContext) => {
  const url = new URL(req.url);
  const today = utcDay(nowDate(ctx));
  const from = url.searchParams.get("from") ?? utcDay(new Date(nowDate(ctx).getTime() - 29 * DAY_MS));
  const to = url.searchParams.get("to") ?? today;
  if (!DAY.test(from) || !DAY.test(to) || from > to) return error(422, "Use dates as YYYY-MM-DD, with from on or before to.");
  if ((Date.parse(to) - Date.parse(from)) / DAY_MS >= MAX_FUNNEL_DAYS) return error(422, `Choose a range of ${MAX_FUNNEL_DAYS} days or less.`);
  return json(200, await funnelReport(ctx.store, from, to));
};

/** Statuses that "Message 1 sent" must not move a lead back from. */
const PAST_CONTACTED: LeadStatus[] = ["contacted", "trial_scheduled", "enrolled", "not_proceeding"];

/**
 * Records that the instructor opened WhatsApp follow-up message N for a lead.
 * Message 1 also moves the lead to "Contacted" unless it is already there or further along.
 */
const recordFollowUp = async (req: Request, ctx: ApiContext, id: string) => {
  const body = await readJson(req, LIMITS.empty);
  const n = body.message as FollowUpMessage;
  if (!FOLLOW_UP_MESSAGES.includes(n)) return error(422, "Unknown follow-up message.");
  await loadLead(ctx, id);
  const now = nowIso(ctx);
  await update<ApplicationRecord>(ctx.store, keys.application(id), (app) => {
    app.follow_up_events = [...(app.follow_up_events ?? []), { type: followUpEventType(n), at: now }].slice(-50);
    if (n === 1 && !PAST_CONTACTED.includes(app.lead_status)) app.lead_status = "contacted";
    app.updated_at = now;
    return app;
  });
  const { application, assessment } = await loadLead(ctx, id);
  return json(200, leadDetail(application, assessment));
};

/** Permanently deletes a lead: application, assessment, and access token. */
export const deleteLeadRecords = async (store: Store, application: ApplicationRecord) => {
  await store.delete(keys.token(application.access_token_hash));
  await store.delete(keys.assessment(application.assessment_id));
  await store.delete(keys.application(application.id));
};

const deleteLead = async (ctx: ApiContext, id: string) => {
  const { application } = await loadLead(ctx, id);
  await deleteLeadRecords(ctx.store, application.value);
  return json(200, { deleted: true });
};

// ── Retention (run daily by netlify/functions/retention-cleanup.mts) ──

export type RetentionReport = { deletedLeads: number; expiredTokens: number; rateLimitKeys: number; keptEnrolled: number; events: number };

/**
 * - Deletes leads that are not "enrolled" and have had no activity for PROSPECT_RETENTION_DAYS.
 * - Enrolled students are never deleted automatically (reviewed manually; see docs).
 * - Deletes expired access tokens (records are kept; the token just stops existing).
 * - Deletes daily rate-limit counters older than yesterday.
 * - Deletes anonymous funnel events older than PROSPECT_RETENTION_DAYS.
 */
export const runRetention = async (store: Store, now: Date): Promise<RetentionReport> => {
  const report: RetentionReport = { deletedLeads: 0, expiredTokens: 0, rateLimitKeys: 0, keptEnrolled: 0, events: 0 };
  const cutoff = now.getTime() - PROSPECT_RETENTION_DAYS * DAY_MS;

  const ids = (await store.list(keys.applicationsPrefix)).map((k) => k.slice(keys.applicationsPrefix.length));
  await mapLimit(ids, 16, async (id) => {
    const app = (await store.get<ApplicationRecord>(keys.application(id)))?.value;
    if (!app) return;
    if (app.lead_status === "enrolled") {
      report.keptEnrolled++;
      return;
    }
    const a = (await store.get<AssessmentRecord>(keys.assessment(app.assessment_id)))?.value;
    const lastActivity = Math.max(new Date(app.updated_at).getTime(), a ? new Date(a.updated_at).getTime() : 0);
    if (lastActivity < cutoff) {
      await deleteLeadRecords(store, app);
      report.deletedLeads++;
    }
  });

  const tokenKeys = await store.list(keys.tokensPrefix);
  await mapLimit(tokenKeys, 16, async (key) => {
    const t = (await store.get<TokenIndex>(key))?.value;
    if (t && new Date(t.expires_at).getTime() < now.getTime()) {
      await store.delete(key);
      report.expiredTokens++;
    }
  });

  const yesterday = utcDay(new Date(now.getTime() - DAY_MS));
  for (const key of await store.list(keys.rateLimitPrefix)) {
    const day = key.split("/")[2] ?? "";
    if (day < yesterday) {
      await store.delete(key);
      report.rateLimitKeys++;
    }
  }

  const eventCutoff = utcDay(new Date(cutoff));
  for (const key of await store.list(keys.eventsPrefix)) {
    if ((key.split("/")[1] ?? "") < eventCutoff) {
      await store.delete(key);
      report.events++;
    }
  }
  return report;
};

// ── Router ──

export const handleApiRequest = async (req: Request, ctx: ApiContext): Promise<Response> => {
  const { pathname } = new URL(req.url);
  const route = `${req.method} ${pathname.replace(/\/+$/, "")}`;
  try {
    switch (route) {
      case "POST /api/applications":
        return await createApplication(req, ctx);
      case "GET /api/assessment":
        return await getAssessment(req, ctx);
      case "PUT /api/assessment/answers":
        return await saveAnswers(req, ctx);
      case "POST /api/assessment/objective":
        return await submitObjective(req, ctx);
      case "PUT /api/assessment/writing":
        return await saveWritingDraft(req, ctx);
      case "POST /api/assessment/complete":
        return await completeAssessment(req, ctx);
      case "DELETE /api/assessment/access":
        return await revokeAccess(req, ctx);
      case "POST /api/instructor/login":
        return await login(req, ctx);
      case "GET /api/instructor/session":
        return await sessionStatus(req, ctx);
      case "DELETE /api/instructor/session":
        return await logout(req, ctx);
      case "GET /api/instructor/leads":
        await requireInstructor(req, ctx);
        return await listLeads(ctx);
      case "POST /api/events":
        return await logEvent(req, ctx);
      case "GET /api/instructor/funnel":
        await requireInstructor(req, ctx);
        return await getFunnel(req, ctx);
    }
    const followUp = /^POST \/api\/instructor\/leads\/([^/]+)\/follow-ups$/.exec(route);
    if (followUp) {
      await requireInstructor(req, ctx);
      return await recordFollowUp(req, ctx, followUp[1]);
    }
    const lead = /^(GET|PATCH|DELETE) \/api\/instructor\/leads\/([^/]+)$/.exec(route);
    if (lead) {
      await requireInstructor(req, ctx);
      if (lead[1] === "GET") return await getLead(ctx, lead[2]);
      if (lead[1] === "PATCH") return await updateLead(req, ctx, lead[2]);
      return await deleteLead(ctx, lead[2]);
    }
    return error(404, "Not found.");
  } catch (e) {
    if (e instanceof HttpError) return error(e.status, e.message, e.extra);
    // Never log request bodies: they contain student contact details.
    console.error(`[api] ${route} failed:`, e instanceof Error ? e.message : "unknown error");
    return error(500, "Something went wrong on our side. Please try again.");
  }
};

// @vitest-environment node
import { describe, expect, it, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";
import { QUESTIONS } from "../src/lib/assessment/questions";
import { emptyDraft, type EnrollmentDraft } from "../src/lib/enrollment/schema";
import { ANSWER_KEY } from "./assessment/answerKey";
import {
  APPLICATIONS_PER_IP_PER_DAY,
  handleApiRequest,
  runRetention,
  type ApiContext,
  type ApplicationRecord,
  type AssessmentRecord,
  type TokenIndex,
} from "./api";
import { createSessionValue } from "./auth";
import { keys, memoryStore } from "./store";

const PASSWORD = "correct horse battery";
const SECRET = "x".repeat(40);
const T0 = new Date("2026-10-18T10:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const validDraft = (over: Partial<EnrollmentDraft> = {}): EnrollmentDraft => ({
  ...emptyDraft(),
  full_name: "Mona Adel",
  country: "Egypt",
  city: "Cairo",
  email: "Mona@Example.com",
  whatsapp_number: "010 1234 5678",
  primary_learning_goal: "business",
  self_reported_level: "intermediate",
  lesson_format: "one_on_one",
  preferred_classes_per_week: "2",
  selected_package: "business-8",
  preferred_payment_method: "vodafone_cash",
  timezone: "Africa/Cairo",
  consent: true,
  ...over,
});

const allCorrect = Object.fromEntries(QUESTIONS.map((q) => [q.id, ANSWER_KEY[q.id].correct]));

/** Pauses the nth read of a key prefix until released, to reproduce a request caught mid read-modify-write. */
const pauser = () => {
  let armed: { prefix: string; remaining: number; reached: () => void; gate: Promise<void> } | null = null;
  let release: () => void = () => {};
  return {
    afterGet: async (key: string) => {
      if (armed && key.startsWith(armed.prefix) && --armed.remaining === 0) {
        const a = armed;
        armed = null;
        a.reached();
        await a.gate;
      }
    },
    /** Arms a pause; resolves once the paused request has reached it. */
    arm(prefix: string, nth: number) {
      let reached!: () => void;
      const reachedP = new Promise<void>((r) => (reached = r));
      const gate = new Promise<void>((r) => (release = r));
      armed = { prefix, remaining: nth, reached, gate };
      return reachedP;
    },
    release: () => release(),
  };
};

let now: Date;
let p: ReturnType<typeof pauser>;
let failNext: string | null;
let ctx: ApiContext & { store: ReturnType<typeof memoryStore> };

beforeEach(() => {
  now = T0;
  p = pauser();
  failNext = null;
  ctx = {
    store: memoryStore({
      afterGet: (k) => p.afterGet(k),
      failWrite: (k) => {
        if (failNext && k.startsWith(failNext)) {
          failNext = null;
          return true;
        }
        return false;
      },
    }),
    config: { instructorPassword: PASSWORD, sessionSecret: SECRET, secureCookies: true, now: () => now },
  };
});

const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const res = await handleApiRequest(
    new Request(`https://fluentbridges.com${path}`, {
      method,
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
    ctx,
  );
  return { status: res.status, body: await res.json(), headers: res.headers };
};

const token = () => randomBytes(32).toString("hex");
const asStudent = (t: string) => ({ "X-Assessment-Token": t });
const submit = async (t = token(), draft = validDraft()) => ({ t, res: await call("POST", "/api/applications", { application: draft, access_token: t }) });
const app = async (id: string) => (await ctx.store.get<ApplicationRecord>(keys.application(id)))?.value;
const assessmentOf = async (applicationId: string) => {
  const a = await app(applicationId);
  return (await ctx.store.get<AssessmentRecord>(keys.assessment(a!.assessment_id)))?.value;
};

const signIn = async () => {
  const res = await call("POST", "/api/instructor/login", { password: PASSWORD });
  return { Cookie: res.headers.get("set-cookie")!.split(";")[0] };
};

describe("POST /api/applications", () => {
  it("saves a valid application with normalised contact details and a server-side price snapshot", async () => {
    const { res } = await submit();
    expect(res.status).toBe(201);
    const a = await app(res.body.application_id);
    expect(a!.whatsapp_number).toBe("+201012345678");
    expect(a!.email).toBe("mona@example.com");
    expect(a!.selected_package_price_snapshot).toMatchObject({ price_egp: 6800, lessons: 8, per_lesson_egp: 850, validity_days: 30 });
    expect(a!.lead_status).toBe("new");
    expect(a!.access_expires_at).toBe(new Date(T0.getTime() + 30 * DAY).toISOString());
    // Storage keys never contain contact details.
    expect([...ctx.store.data.keys()].join(" ")).not.toMatch(/mona|example|\+20|0101/i);
  });

  it("ignores any client-supplied price", async () => {
    const draft = { ...validDraft(), selected_package_price_snapshot: { price_egp: 1 }, price: 1 };
    const { res } = await submit(token(), draft as EnrollmentDraft);
    expect((await app(res.body.application_id))!.selected_package_price_snapshot!.price_egp).toBe(6800);
  });

  it("snapshots SAR and USD plans in their own currency, priced from the server's data", async () => {
    const ksa = { country: "Saudi Arabia", city: "Riyadh", whatsapp_number: "+966 50 123 4567", preferred_payment_method: "paypal" } as const;
    const { res } = await submit(token(), validDraft({ ...ksa, selected_package: "ksa-monthly-3" }));
    expect(res.status).toBe(201);
    const a = await app(res.body.application_id);
    expect(a!.selected_package_price_snapshot).toMatchObject({ package_id: "ksa-monthly-3", currency: "SAR", price: 855, price_egp: null, billing: "monthly", classes_per_week: 3, lessons: 12 });
    expect(a!.review_flags).not.toContain("pricing_quote_needed");
  });

  it("refuses another location's prices, and flags locations that need a quote", async () => {
    const giza = await submit(token(), validDraft({ city: "Giza" }));
    expect(giza.res.status).toBe(422);
    expect(giza.res.body.fields.selected_package).toMatch(/Cairo prices are for students in Cairo/);
    const us = await submit(token(), validDraft({ city: "Riyadh", country: "Saudi Arabia", whatsapp_number: "+966 50 123 4567", preferred_payment_method: "wise", selected_package: "us-single" }));
    expect(us.res.status).toBe(422);
    expect(ctx.store.data.size).toBe(0);

    const { res } = await submit(token(), validDraft({ city: "Giza", selected_package: "help" }));
    expect(res.status).toBe(201);
    const a = await app(res.body.application_id);
    expect(a!.selected_package_price_snapshot).toBeNull();
    expect(a!.review_flags).toContain("pricing_quote_needed");
  });

  it("rejects invalid input before writing anything", async () => {
    const { res } = await submit(token(), validDraft({ full_name: "", email: "nope", whatsapp_number: "" }));
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(["full_name", "email", "whatsapp_number"]));
    expect((await submit(token(), validDraft({ consent: false }))).res.body.fields.consent).toBeTruthy();
    expect(ctx.store.data.size).toBe(0);
  });

  it("requires a small-group student to say whether they have a group, and flags help requests", async () => {
    const group = { lesson_format: "small_group", selected_package: "group-8" } as const;
    expect((await submit(token(), validDraft(group))).res.body.fields.group_status).toBeTruthy();
    const { res } = await submit(token(), validDraft({ ...group, group_status: "needs_group" }));
    const a = await app(res.body.application_id);
    expect(a!.group_status).toBe("needs_group");
    expect(a!.review_flags).toContain("group_formation_needed");
  });

  it("rejects Vodafone Cash outside Egypt, honeypot submissions, bad tokens, and non-JSON bodies", async () => {
    const uk = await submit(token(), validDraft({ country: "United Kingdom", whatsapp_number: "+44 7700 900123", selected_package: "help" }));
    expect(uk.res.status).toBe(422);
    expect(uk.res.body.fields.preferred_payment_method).toMatch(/Vodafone Cash/);
    expect((await call("POST", "/api/applications", { application: validDraft(), access_token: token(), website: "x" })).status).toBe(400);
    expect((await call("POST", "/api/applications", { application: validDraft(), access_token: "short" })).status).toBe(400);
    const form = await handleApiRequest(
      new Request("https://fluentbridges.com/api/applications", { method: "POST", body: "a=b", headers: { "Content-Type": "application/x-www-form-urlencoded" } }),
      ctx,
    );
    expect(form.status).toBe(415);
    expect(ctx.store.data.size).toBe(0);
  });

  it("enforces payload size limits even when Content-Length is missing or wrong", async () => {
    const big = { application: { ...validDraft(), learning_goal_details: "x".repeat(20_000) }, access_token: token() };
    expect((await call("POST", "/api/applications", big)).status).toBe(413);
    const lying = await handleApiRequest(
      new Request("https://fluentbridges.com/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": "10" },
        body: JSON.stringify(big),
      }),
      ctx,
    );
    expect(lying.status).toBe(413);
  });

  it("is idempotent for sequential retries", async () => {
    const t = token();
    const first = await submit(t);
    const second = await submit(t);
    expect([first.res.status, second.res.status]).toEqual([201, 200]);
    expect(second.res.body.application_id).toBe(first.res.body.application_id);
    expect(await ctx.store.list(keys.applicationsPrefix)).toHaveLength(1);
  });

  it("creates exactly one application when the same token is submitted concurrently", async () => {
    const t = token();
    const results = await Promise.all(Array.from({ length: 8 }, () => submit(t)));
    const ids = new Set(results.map((r) => r.res.body.application_id));
    expect(ids.size).toBe(1);
    expect(results.filter((r) => r.res.status === 201)).toHaveLength(1);
    expect(await ctx.store.list(keys.applicationsPrefix)).toHaveLength(1);
    expect(await ctx.store.list("assessments/")).toHaveLength(1);
  });

  it("caps new applications per IP per day without blocking retries of an existing one", async () => {
    ctx.clientIp = "203.0.113.7";
    for (let i = 0; i < APPLICATIONS_PER_IP_PER_DAY; i++) expect((await submit()).res.status).toBe(201);
    const blocked = await submit();
    expect(blocked.res.status).toBe(429);
    expect(await ctx.store.list(keys.applicationsPrefix)).toHaveLength(APPLICATIONS_PER_IP_PER_DAY);
    // Raw IPs are never stored.
    expect([...ctx.store.data.keys()].join(" ")).not.toContain("203.0.113.7");

    ctx.clientIp = "198.51.100.2";
    expect((await submit()).res.status).toBe(201);
    ctx.clientIp = "203.0.113.7";
    now = new Date(T0.getTime() + DAY);
    expect((await submit()).res.status).toBe(201);
  });
});

describe("partial failures", () => {
  it("keeps contact details visible to the instructor and repairs on retry when the assessment write fails", async () => {
    const t = token();
    failNext = "assessments/";
    expect((await submit(t)).res.status).toBe(500);

    const auth = await signIn();
    const list = await call("GET", "/api/instructor/leads", undefined, auth);
    expect(list.body.leads).toHaveLength(1);
    const detail = await call("GET", `/api/instructor/leads/${list.body.leads[0].id}`, undefined, auth);
    expect(detail.status).toBe(200);
    expect(detail.body.assessment.missing).toBe(true);
    expect(detail.body.application.whatsapp_number).toBe("+201012345678");

    const retry = await submit(t);
    expect(retry.res.status).toBe(200);
    expect(retry.res.body.application_id).toBe(list.body.leads[0].id);
    expect((await call("GET", "/api/assessment", undefined, asStudent(t))).body.status).toBe("not_started");
    expect(await ctx.store.list(keys.applicationsPrefix)).toHaveLength(1);
  });

  it("repairs a missing application when the student retries after the application write failed", async () => {
    const t = token();
    failNext = "applications/";
    expect((await submit(t)).res.status).toBe(500);
    expect(await ctx.store.list(keys.applicationsPrefix)).toHaveLength(0);
    const retry = await submit(t);
    expect(retry.res.status).toBe(200);
    expect(await app(retry.res.body.application_id)).toBeTruthy();
  });

  it("recreates a missing assessment when the student loads the test", async () => {
    const { t, res } = await submit();
    const a = await app(res.body.application_id);
    await ctx.store.delete(keys.assessment(a!.assessment_id));
    expect((await call("GET", "/api/assessment", undefined, asStudent(t))).body.status).toBe("not_started");
  });
});

describe("placement assessment", () => {
  it("saves progress, locks the objective section, and never sends answers or scores early", async () => {
    const { t } = await submit();
    const first = QUESTIONS[0].id;
    expect((await call("PUT", "/api/assessment/answers", { answers: { [first]: ANSWER_KEY[first].correct } }, asStudent(t))).status).toBe(200);
    const state = await call("GET", "/api/assessment", undefined, asStudent(t));
    expect(state.body).toMatchObject({ status: "in_progress", result: null });
    expect(JSON.stringify(state.body)).not.toContain("explanation");

    const obj = await call("POST", "/api/assessment/objective", { answers: allCorrect }, asStudent(t));
    expect(obj.body.writing_prompt.tier).toBe("advanced");
    expect(JSON.stringify(obj.body)).not.toMatch(/C2|percent|points/);
    expect((await call("PUT", "/api/assessment/answers", { answers: { [first]: "a" } }, asStudent(t))).status).toBe(409);
  });

  it("completes with a result, persists the writing, and is idempotent", async () => {
    const { t, res } = await submit();
    await call("POST", "/api/assessment/objective", { answers: allCorrect }, asStudent(t));
    const done = await call("POST", "/api/assessment/complete", { text: "I think remote work is productive.\u0000" }, asStudent(t));
    expect(done.body.result).toMatchObject({ full_name: "Mona Adel", estimated_cefr_level: "C2", writing_status: "submitted", trial_price: "100 EGP" });
    // Exact scores stay in the lead admin.
    expect(done.body.result.overall_score).toBeUndefined();
    expect(done.body.result.objective_score).toBeUndefined();
    const again = await call("POST", "/api/assessment/complete", { text: "Different" }, asStudent(t));
    expect(again.body).toEqual(done.body);
    const a = await assessmentOf(res.body.application_id);
    expect(a!.writing.response).toBe("I think remote work is productive.");
    expect(a!.objective!.responses).toHaveLength(QUESTIONS.length);
    expect((await app(res.body.application_id))!.lead_status).toBe("assessment_completed");
  });

  it("handles incomplete tests: unanswered items score zero and skipped writing is recorded", async () => {
    const { t } = await submit();
    await call("POST", "/api/assessment/objective", { answers: {} }, asStudent(t));
    const done = await call("POST", "/api/assessment/complete", { skipped: true }, asStudent(t));
    expect(done.body.result).toMatchObject({ estimated_cefr_level: "Pre-A1", unanswered: QUESTIONS.length, confidence: "limited", writing_status: "skipped" });
    expect((await call("POST", "/api/assessment/complete", { text: "x" }, asStudent((await submit()).t))).status).toBe(409);
  });

  it("does not let one student read another student's assessment", async () => {
    await submit();
    expect((await call("GET", "/api/assessment", undefined, asStudent(token()))).status).toBe(404);
    expect((await call("GET", "/api/assessment")).status).toBe(401);
    expect((await call("GET", "/api/assessment", undefined, asStudent("../applications/x"))).status).toBe(401);
  });
});

describe("races between autosave and submission", () => {
  it("an in-flight answer autosave cannot overwrite the submitted objective section", async () => {
    const { t, res } = await submit();
    await call("PUT", "/api/assessment/answers", { answers: { [QUESTIONS[0].id]: "a" } }, asStudent(t));

    // The autosave reads the assessment (2nd read: the one inside the conditional update) and pauses there.
    const reached = p.arm("assessments/", 2);
    const autosave = call("PUT", "/api/assessment/answers", { answers: { [QUESTIONS[1].id]: "b" } }, asStudent(t));
    await reached;
    // Meanwhile the student submits the section.
    expect((await call("POST", "/api/assessment/objective", { answers: allCorrect }, asStudent(t))).status).toBe(200);
    p.release();

    expect((await autosave).status).toBe(409);
    const a = await assessmentOf(res.body.application_id);
    expect(a!.status).toBe("writing");
    expect(a!.objective).not.toBeNull();
    expect(a!.objective!.estimated_cefr_level).toBe("C2");
  });

  it("an in-flight writing autosave cannot revert a completed assessment", async () => {
    const { t, res } = await submit();
    await call("POST", "/api/assessment/objective", { answers: allCorrect }, asStudent(t));

    const reached = p.arm("assessments/", 2);
    const draftSave = call("PUT", "/api/assessment/writing", { text: "old draft" }, asStudent(t));
    await reached;
    expect((await call("POST", "/api/assessment/complete", { text: "final answer" }, asStudent(t))).status).toBe(200);
    p.release();

    expect((await draftSave).status).toBe(409);
    const a = await assessmentOf(res.body.application_id);
    expect(a!.status).toBe("completed");
    expect(a!.writing.response).toBe("final answer");
    expect((await call("GET", "/api/assessment", undefined, asStudent(t))).body.result.writing_status).toBe("submitted");
  });

  it("completing the test does not overwrite an instructor's concurrent notes", async () => {
    const { t, res } = await submit();
    const id = res.body.application_id;
    await call("POST", "/api/assessment/objective", { answers: allCorrect }, asStudent(t));
    const auth = await signIn();
    const version = (await call("GET", `/api/instructor/leads/${id}`, undefined, auth)).body.application_version;

    // Completion pauses inside its update of the application (lead status), after reading it.
    const reached = p.arm("applications/", 2);
    const completion = call("POST", "/api/assessment/complete", { text: "done" }, asStudent(t));
    await reached;
    const patch = await call("PATCH", `/api/instructor/leads/${id}`, { instructor_notes: "Called her", application_version: version }, auth);
    expect(patch.status).toBe(200);
    p.release();
    expect((await completion).status).toBe(200);

    const a = await app(id);
    expect(a!.instructor_notes).toBe("Called her");
    expect(a!.lead_status).toBe("assessment_completed");
  });
});

describe("student access expiry and revocation", () => {
  it("rejects expired tokens for reads, writes, and re-submission", async () => {
    const { t } = await submit();
    now = new Date(T0.getTime() + 31 * DAY);
    expect((await call("GET", "/api/assessment", undefined, asStudent(t))).status).toBe(410);
    expect((await call("PUT", "/api/assessment/answers", { answers: {} }, asStudent(t))).status).toBe(410);
    expect((await call("POST", "/api/assessment/complete", { text: "x" }, asStudent(t))).status).toBe(410);
    expect((await submit(t)).res.status).toBe(410);
  });

  it("revokes access from a shared device; the record stays for the instructor", async () => {
    const { t, res } = await submit();
    expect((await call("DELETE", "/api/assessment/access", undefined, asStudent(t))).status).toBe(200);
    expect((await call("GET", "/api/assessment", undefined, asStudent(t))).status).toBe(404);
    expect((await app(res.body.application_id))!.access_revoked_at).toBe(T0.toISOString());
    // Same response for unknown tokens (no oracle).
    expect((await call("DELETE", "/api/assessment/access", undefined, asStudent(token()))).body).toEqual({ revoked: true });
  });
});

describe("instructor authentication", () => {
  it("is unavailable (fails closed) when not configured", async () => {
    ctx.config = { secureCookies: true, now: () => now };
    expect((await call("GET", "/api/instructor/leads")).status).toBe(503);
    expect((await call("POST", "/api/instructor/login", { password: "anything" })).status).toBe(503);
  });

  it("issues an HttpOnly, Secure, SameSite=Strict cookie and rejects wrong passwords", async () => {
    const res = await call("POST", "/api/instructor/login", { password: PASSWORD });
    expect(res.headers.get("set-cookie")).toMatch(/Path=\/api\/instructor; HttpOnly; SameSite=Strict; Max-Age=43200; Secure/);
    const bad = await call("POST", "/api/instructor/login", { password: "wrong password!" });
    expect(bad).toMatchObject({ status: 401, body: { error: "Incorrect password." } });
  });

  it("rejects missing, forged, tampered, wrongly signed, and expired cookies, and student tokens", async () => {
    await submit();
    const valid = (await signIn()).Cookie.split("=")[1];
    const [v, exp, ver, sig] = valid.split(".");
    const attempts = [
      undefined,
      "fb_instructor_session=v2.99999999999999.1.forged",
      `fb_instructor_session=${v}.${Number(exp) + 1}.${ver}.${sig}`, // extended expiry, old signature
      `fb_instructor_session=${v}.${exp}.${Number(ver) + 1}.${sig}`, // bumped version, old signature
      `fb_instructor_session=${createSessionValue("y".repeat(40), now.getTime(), 1)}`, // other secret
    ];
    for (const cookie of attempts) {
      expect((await call("GET", "/api/instructor/leads", undefined, cookie ? { Cookie: cookie } : {})).status).toBe(401);
    }
    expect((await call("GET", "/api/instructor/leads", undefined, asStudent(token()))).status).toBe(401);

    expect((await call("GET", "/api/instructor/leads", undefined, { Cookie: `fb_instructor_session=${valid}` })).status).toBe(200);
    now = new Date(T0.getTime() + 13 * 60 * 60 * 1000);
    expect((await call("GET", "/api/instructor/leads", undefined, { Cookie: `fb_instructor_session=${valid}` })).status).toBe(401);
  });

  it("signing out revokes the session server-side, even if the cookie is replayed", async () => {
    const a = await signIn();
    const b = await signIn(); // second device
    const out = await call("DELETE", "/api/instructor/session", undefined, a);
    expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    expect((await call("GET", "/api/instructor/leads", undefined, a)).status).toBe(401);
    expect((await call("GET", "/api/instructor/leads", undefined, b)).status).toBe(401);
    expect((await call("GET", "/api/instructor/session", undefined, a)).body).toEqual({ authenticated: false });
    expect((await call("GET", "/api/instructor/leads", undefined, await signIn())).status).toBe(200);
  });

  it("does not let an unauthenticated request revoke the instructor's sessions", async () => {
    const a = await signIn();
    await call("DELETE", "/api/instructor/session");
    expect((await call("GET", "/api/instructor/leads", undefined, a)).status).toBe(200);
  });
});

describe("instructor lead management", () => {
  const completeLead = async () => {
    const { t, res } = await submit();
    await call("POST", "/api/assessment/objective", { answers: allCorrect }, asStudent(t));
    await call("POST", "/api/assessment/complete", { text: "My writing sample." }, asStudent(t));
    return { t, id: res.body.application_id as string };
  };

  it("lists hundreds of leads and shows full detail without secrets", async () => {
    await Promise.all(Array.from({ length: 250 }, () => submit()));
    const { id } = await completeLead();
    const auth = await signIn();
    const list = await call("GET", "/api/instructor/leads", undefined, auth);
    expect(list.body.leads).toHaveLength(251);
    const detail = await call("GET", `/api/instructor/leads/${id}`, undefined, auth);
    expect(detail.body.application.access_token_hash).toBeUndefined();
    expect(JSON.stringify(list.body)).not.toContain("access_token_hash");
    expect(detail.body.assessment).toMatchObject({ missing: false, estimated_cefr_level: "C2" });
    expect(detail.body.assessment.writing.response).toBe("My writing sample.");
  });

  it("records WhatsApp follow-ups, marks Message 1 as Contacted, and clears the waiting badge data", async () => {
    const { id } = await completeLead();
    const auth = await signIn();
    let row = (await call("GET", "/api/instructor/leads", undefined, auth)).body.leads[0];
    expect(row).toMatchObject({ follow_up_count: 0, assessment_completed_at: now.toISOString() });

    const m1 = await call("POST", `/api/instructor/leads/${id}/follow-ups`, { message: 1 }, auth);
    expect(m1.status).toBe(200);
    expect(m1.body.application.lead_status).toBe("contacted");
    expect(m1.body.application.follow_up_events).toEqual([{ type: "follow_up_1_sent", at: now.toISOString() }]);
    row = (await call("GET", "/api/instructor/leads", undefined, auth)).body.leads[0];
    expect(row.follow_up_count).toBe(1);

    // Later messages are recorded but never move a lead backwards.
    await call("PATCH", `/api/instructor/leads/${id}`, { lead_status: "enrolled", application_version: m1.body.application_version }, auth);
    const again = await call("POST", `/api/instructor/leads/${id}/follow-ups`, { message: 1 }, auth);
    expect(again.body.application.lead_status).toBe("enrolled");
    const m3 = await call("POST", `/api/instructor/leads/${id}/follow-ups`, { message: 3 }, auth);
    expect(m3.body.application.follow_up_events.map((e: { type: string }) => e.type)).toEqual(["follow_up_1_sent", "follow_up_1_sent", "follow_up_3_sent"]);

    expect((await call("POST", `/api/instructor/leads/${id}/follow-ups`, { message: 5 }, auth)).status).toBe(422);
    expect((await call("POST", `/api/instructor/leads/${id}/follow-ups`, { message: 1 })).status).toBe(401);
  });

  it("rejects stale edits instead of silently overwriting newer changes", async () => {
    const { id } = await completeLead();
    const auth = await signIn();
    const seen = (await call("GET", `/api/instructor/leads/${id}`, undefined, auth)).body;
    const first = await call("PATCH", `/api/instructor/leads/${id}`, { lead_status: "contacted", application_version: seen.application_version }, auth);
    expect(first.status).toBe(200);
    const stale = await call("PATCH", `/api/instructor/leads/${id}`, { instructor_notes: "tab 2", application_version: seen.application_version }, auth);
    expect(stale.status).toBe(409);
    expect((await call("PATCH", `/api/instructor/leads/${id}`, { lead_status: "enrolled" }, auth)).status).toBe(409);
    expect((await app(id))!.lead_status).toBe("contacted");
    expect((await app(id))!.instructor_notes).toBe("");
  });

  it("detects two concurrent edits from the same starting version", async () => {
    const { id } = await completeLead();
    const auth = await signIn();
    const v = (await call("GET", `/api/instructor/leads/${id}`, undefined, auth)).body.application_version;
    const results = await Promise.all([
      call("PATCH", `/api/instructor/leads/${id}`, { instructor_notes: "A", application_version: v }, auth),
      call("PATCH", `/api/instructor/leads/${id}`, { instructor_notes: "B", application_version: v }, auth),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it("updates status, notes, adjusted level, and writing rubric with versions", async () => {
    const { t, id } = await completeLead();
    const auth = await signIn();
    const seen = (await call("GET", `/api/instructor/leads/${id}`, undefined, auth)).body;
    expect((await call("PATCH", `/api/instructor/leads/${id}`, { lead_status: "bogus", application_version: seen.application_version }, auth)).status).toBe(422);
    const upd = await call(
      "PATCH",
      `/api/instructor/leads/${id}`,
      {
        lead_status: "contacted",
        instructor_notes: "Called on WhatsApp",
        instructor_level: "C1",
        writing_rubric: { grammar: 2, vocabulary: 2, structure: 2, coherence: 2, task: 2 },
        application_version: seen.application_version,
        assessment_version: seen.assessment_version,
      },
      auth,
    );
    expect(upd.status).toBe(200);
    expect(upd.body.assessment).toMatchObject({ writing_score: 50, overall_score: 90, instructor_level: "C1", estimated_cefr_level: "C2" });
    expect((await call("GET", "/api/assessment", undefined, asStudent(t))).body.result).toMatchObject({ estimated_cefr_level: "C2", writing_status: "scored" });
  });

  it("corrects contact details with validation", async () => {
    const { id } = await completeLead();
    const auth = await signIn();
    let v = (await call("GET", `/api/instructor/leads/${id}`, undefined, auth)).body.application_version;
    const contact = { full_name: "Mona A. Adel", email: "MONA@new.example", whatsapp_number: "011 2345 6789", alternative_phone: null, country: "Egypt", city: "Giza" };
    expect((await call("PATCH", `/api/instructor/leads/${id}`, { contact: { ...contact, email: "bad" }, application_version: v }, auth)).status).toBe(422);
    const ok = await call("PATCH", `/api/instructor/leads/${id}`, { contact, application_version: v }, auth);
    expect(ok.body.application).toMatchObject({ full_name: "Mona A. Adel", email: "mona@new.example", whatsapp_number: "+201123456789", city: "Giza" });
    v = ok.body.application_version;
    expect(v).not.toBe(undefined);
  });

  it("deletes a lead completely, including the student's access", async () => {
    const { t, id } = await completeLead();
    const auth = await signIn();
    expect((await call("DELETE", `/api/instructor/leads/${id}`, undefined, auth)).status).toBe(200);
    expect(await app(id)).toBeUndefined();
    expect(await ctx.store.list("assessments/")).toHaveLength(0);
    expect(await ctx.store.list(keys.tokensPrefix)).toHaveLength(0);
    expect((await call("GET", "/api/assessment", undefined, asStudent(t))).status).toBe(404);
    expect((await call("DELETE", `/api/instructor/leads/${id}`)).status).toBe(401);
  });

  it("returns 404 for unknown or malformed lead ids", async () => {
    const auth = await signIn();
    expect((await call("GET", "/api/instructor/leads/00000000-0000-0000-0000-000000000000", undefined, auth)).status).toBe(404);
    expect((await call("GET", "/api/instructor/leads/..%2Ftokens", undefined, auth)).status).toBe(404);
  });
});

describe("retention", () => {
  it("deletes inactive prospects after 12 months, keeps enrolled students and recent leads, and prunes tokens and counters", async () => {
    ctx.clientIp = "203.0.113.9";
    const old = await submit();
    const enrolled = await submit();
    const enrolledId = enrolled.res.body.application_id;
    const auth = await signIn();
    const v = (await call("GET", `/api/instructor/leads/${enrolledId}`, undefined, auth)).body.application_version;
    await call("PATCH", `/api/instructor/leads/${enrolledId}`, { lead_status: "enrolled", application_version: v }, auth);

    now = new Date(T0.getTime() + 200 * DAY);
    const recent = await submit();

    const report = await runRetention(ctx.store, new Date(T0.getTime() + 366 * DAY));
    expect(report).toMatchObject({ deletedLeads: 1, keptEnrolled: 1 });
    expect(await app(old.res.body.application_id)).toBeUndefined();
    expect(await app(enrolledId)).toBeTruthy();
    expect(await app(recent.res.body.application_id)).toBeTruthy();
    // All remaining tokens are past their 30-day expiry and were removed; records stay.
    const remainingTokens = await ctx.store.list(keys.tokensPrefix);
    for (const k of remainingTokens) {
      const ti = (await ctx.store.get<TokenIndex>(k))!.value;
      expect(new Date(ti.expires_at).getTime()).toBeGreaterThan(T0.getTime() + 366 * DAY);
    }
    expect(await ctx.store.list(keys.rateLimitPrefix)).toHaveLength(0);
  });
});

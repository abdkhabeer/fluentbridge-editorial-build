import type { OptionId, WritingPrompt } from "@/lib/assessment/questions";
import type {
  CreateApplicationResponse,
  FunnelReport,
  LeadDetail,
  LeadSummary,
  LeadUpdate,
  StudentAssessmentState,
  StudentResult,
} from "./apiTypes";
import type { EnrollmentDraft, FieldErrors } from "./schema";
import type { Attribution } from "../analytics/events";

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields?: FieldErrors) {
    super(message);
  }
}

const request = async <T>(method: string, path: string, opts: { body?: unknown; token?: string } = {}): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(opts.token ? { "X-Assessment-Token": opts.token } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "We couldn't reach the server. Please check your connection and try again.");
  }
  let data: Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : res.status === 429
          ? "Too many requests from your network. Please wait a minute and try again."
          : "Something went wrong. Please try again.";
    throw new ApiError(res.status, message, data.fields as FieldErrors | undefined);
  }
  return data as T;
};

/** 32 random bytes, hex-encoded. Authorises this browser to access its own application and results. */
export const newAccessToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");

type Answers = Record<string, OptionId | null>;

export const studentApi = {
  createApplication: (
    application: EnrollmentDraft,
    accessToken: string,
    website: string,
    tracking?: { attribution: Attribution | null; analytics_session_id: string },
  ) =>
    request<CreateApplicationResponse>("POST", "/api/applications", {
      body: { application, access_token: accessToken, website, ...(tracking ?? {}) },
    }),
  getAssessment: (token: string) => request<StudentAssessmentState>("GET", "/api/assessment", { token }),
  saveAnswers: (token: string, answers: Answers) =>
    request<{ saved_at: string }>("PUT", "/api/assessment/answers", { token, body: { answers } }),
  submitObjective: (token: string, answers: Answers) =>
    request<{ writing_prompt: WritingPrompt }>("POST", "/api/assessment/objective", { token, body: { answers } }),
  saveWriting: (token: string, text: string) =>
    request<{ saved_at: string }>("PUT", "/api/assessment/writing", { token, body: { text } }),
  complete: (token: string, text: string, skipped: boolean) =>
    request<{ result: StudentResult }>("POST", "/api/assessment/complete", { token, body: { text, skipped } }),
  /** Revokes this device's access token on the server ("Remove my data from this device"). */
  revokeAccess: (token: string) => request<{ revoked: boolean }>("DELETE", "/api/assessment/access", { token }),
};

export const instructorApi = {
  session: () => request<{ authenticated: boolean }>("GET", "/api/instructor/session"),
  login: (password: string) => request<{ authenticated: boolean }>("POST", "/api/instructor/login", { body: { password } }),
  logout: () => request<{ authenticated: boolean }>("DELETE", "/api/instructor/session"),
  leads: () => request<{ leads: LeadSummary[] }>("GET", "/api/instructor/leads"),
  lead: (id: string) => request<LeadDetail>("GET", `/api/instructor/leads/${encodeURIComponent(id)}`),
  updateLead: (id: string, update: LeadUpdate) =>
    request<LeadDetail>("PATCH", `/api/instructor/leads/${encodeURIComponent(id)}`, { body: update }),
  recordFollowUp: (id: string, message: number) =>
    request<LeadDetail>("POST", `/api/instructor/leads/${encodeURIComponent(id)}/follow-ups`, { body: { message } }),
  funnel: (from: string, to: string) =>
    request<FunnelReport>("GET", `/api/instructor/funnel?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  deleteLead: (id: string) => request<{ deleted: boolean }>("DELETE", `/api/instructor/leads/${encodeURIComponent(id)}`),
};

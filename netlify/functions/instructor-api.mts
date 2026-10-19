// Instructor dashboard endpoints. Every request needs a valid, unrevoked session
// (checked in server/api.ts before any lead data is read). No rate-limit rule
// here: the plan's two rules are used by public-strict and enrollment-api.
import { handleNetlifyRequest } from "../../server/netlify";

export default (req: Request, context: { deploy?: { context?: string }; ip?: string }) => handleNetlifyRequest(req, context);

export const config = {
  path: ["/api/instructor/session", "/api/instructor/leads", "/api/instructor/leads/*", "/api/instructor/funnel"],
};

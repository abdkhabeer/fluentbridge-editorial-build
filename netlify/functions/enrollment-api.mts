// Student assessment endpoints (autosave, submit, results, remove access).
// These only update an existing application, so the limit is generous enough
// for several students sharing one mobile-carrier IP.
import { handleNetlifyRequest } from "../../server/netlify";

export default (req: Request, context: { deploy?: { context?: string }; ip?: string }) => handleNetlifyRequest(req, context);

export const config = {
  path: ["/api/assessment", "/api/assessment/*"],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

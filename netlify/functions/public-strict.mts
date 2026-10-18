// Endpoints that create records or check passwords, under the strictest rate
// limit: new applications and instructor sign-in. (Free/Personal plans allow two
// code-based rate-limit rules per project; this is one, enrollment-api is the other.)
import { handleNetlifyRequest } from "../../server/netlify";

export default (req: Request, context: { deploy?: { context?: string }; ip?: string }) => handleNetlifyRequest(req, context);

export const config = {
  path: ["/api/applications", "/api/instructor/login"],
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

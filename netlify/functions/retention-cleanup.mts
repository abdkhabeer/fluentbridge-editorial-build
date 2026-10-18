// Daily data-retention sweep (see docs/privacy-and-retention.md). Netlify runs
// scheduled functions only on the published production deploy.
import { runRetention } from "../../server/api";
import { buildContext } from "../../server/netlify";

export default async (_req: Request, context: { deploy?: { context?: string } }) => {
  if (context?.deploy?.context !== "production") return new Response("skipped: not production", { status: 200 });
  const ctx = buildContext(context);
  if (!ctx) return new Response("storage unavailable", { status: 503 });
  const report = await runRetention(ctx.store, new Date());
  console.log("[retention]", JSON.stringify(report));
  return new Response(JSON.stringify(report), { status: 200 });
};

export const config = { schedule: "@daily" };

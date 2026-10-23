// Vite dev-server middleware that serves /api/* with the same handlers as
// production, backed by JSON files in .data/ (gitignored). Dev only: Vite
// calls configureServer only for `vite` / `npm run dev`, never for builds.

import path from "node:path";
import type { Plugin } from "vite";

export const devApiPlugin = (env: Record<string, string>): Plugin => ({
  name: "fluentbridges-dev-api",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api/")) return next();
      try {
        const { handleApiRequest } = (await server.ssrLoadModule("/server/api.ts")) as typeof import("./api");
        const { fileStore } = (await server.ssrLoadModule("/server/store.ts")) as typeof import("./store");

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = chunks.length ? Buffer.concat(chunks) : undefined;
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (typeof v === "string") headers.set(k, v);
          else if (Array.isArray(v)) headers.set(k, v.join(", "));
        }
        const request = new Request(`http://localhost${req.url}`, {
          method: req.method,
          headers,
          body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
        });

        const response = await handleApiRequest(request, {
          store: fileStore(path.resolve(server.config.root, env.DEV_DATA_DIR || ".data")),
          clientIp: req.socket.remoteAddress,
          config: {
            instructorPassword: env.INSTRUCTOR_PASSWORD,
            sessionSecret: env.INSTRUCTOR_SESSION_SECRET,
            secureCookies: false,
            leadAttribution: env.FEATURE_LEAD_ATTRIBUTION === "true",
            email: { apiKey: env.RESEND_API_KEY, to: env.ALERT_EMAIL_TO, from: env.EMAIL_FROM },
          },
        });
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (e) {
        server.config.logger.error(`[dev-api] ${e instanceof Error ? e.message : String(e)}`);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Dev API error." }));
      }
    });
  },
});

// Chooses storage and instructor credentials for a Netlify deploy context.
//
// - production: site-wide store "enrollment-production" and INSTRUCTOR_* secrets.
// - deploy-preview / branch-deploy / preview-server: a deploy-scoped store
//   (getDeployStore), so previews can never read or write production records,
//   and PREVIEW_INSTRUCTOR_* secrets. Production secrets are never used here.
// - dev (netlify dev): site-wide local sandbox store "enrollment-dev", PREVIEW_* secrets.
// - anything else (missing or unknown context): no storage and no instructor
//   access. Requests fail with 503 instead of guessing.

export const PRODUCTION_STORE = "enrollment-production";
export const PREVIEW_STORE = "enrollment-preview";
export const DEV_STORE = "enrollment-dev";

export type StorageSelection =
  | { scope: "site"; name: string; context: string }
  | { scope: "deploy"; name: string; context: string }
  | { scope: "none"; reason: string };

export type RuntimeConfig = {
  storage: StorageSelection;
  instructorPassword?: string;
  sessionSecret?: string;
};

const PREVIEW_CONTEXTS = new Set(["deploy-preview", "branch-deploy", "preview-server"]);

export const resolveRuntime = (deployContext: string | undefined, env: Record<string, string | undefined>): RuntimeConfig => {
  if (deployContext === "production") {
    return {
      storage: { scope: "site", name: PRODUCTION_STORE, context: deployContext },
      instructorPassword: env.INSTRUCTOR_PASSWORD,
      sessionSecret: env.INSTRUCTOR_SESSION_SECRET,
    };
  }
  if (deployContext && (PREVIEW_CONTEXTS.has(deployContext) || deployContext === "dev")) {
    const password = env.PREVIEW_INSTRUCTOR_PASSWORD;
    const secret = env.PREVIEW_INSTRUCTOR_SESSION_SECRET;
    // If preview credentials are copies of production ones, refuse them: previews must not share production access.
    const reusesProduction =
      (password && password === env.INSTRUCTOR_PASSWORD) || (secret && secret === env.INSTRUCTOR_SESSION_SECRET);
    return {
      storage:
        deployContext === "dev"
          ? { scope: "site", name: DEV_STORE, context: deployContext }
          : { scope: "deploy", name: PREVIEW_STORE, context: deployContext },
      instructorPassword: reusesProduction ? undefined : password,
      sessionSecret: reusesProduction ? undefined : secret,
    };
  }
  return { storage: { scope: "none", reason: `Unknown deploy context: ${deployContext ?? "missing"}` } };
};

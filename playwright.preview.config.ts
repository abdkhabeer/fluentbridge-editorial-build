import { defineConfig, devices } from "@playwright/test";

// Smoke tests against a deployed Netlify deploy preview (never production):
//   PREVIEW_URL=https://deploy-preview-4--fluentbridges.netlify.app npm run test:preview
// Test leads go to the preview's own deploy-scoped store.
const baseURL = process.env.PREVIEW_URL;
if (!baseURL || !/^https:\/\/deploy-preview-\d+--/.test(baseURL)) {
  throw new Error("Set PREVIEW_URL to a deploy preview URL (https://deploy-preview-N--site.netlify.app).");
}

export default defineConfig({
  testDir: "e2e-preview",
  timeout: 60_000,
  workers: 1,
  retries: 1,
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"], baseURL } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 }, baseURL } },
  ],
});

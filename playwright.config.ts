import { defineConfig, devices } from "@playwright/test";

// End-to-end tests:
// - "mobile" / "desktop": the full journey against the Vite dev server, whose
//   dev-only API stores data in .data-e2e/ (gitignored, wiped on start).
// - "csp": the production build (vite preview) with public/_headers applied,
//   checking the Content Security Policy doesn't break the site.
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  projects: [
    { name: "mobile", testIgnore: /csp\.spec/, use: { ...devices["Pixel 5"], baseURL: "http://localhost:8091" } },
    {
      name: "desktop",
      testIgnore: /csp\.spec/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 }, baseURL: "http://localhost:8091" },
    },
    { name: "csp", testMatch: /csp\.spec/, use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:8093" } },
  ],
  webServer: [
    {
      command: "rm -rf .data-e2e && npx vite --port 8091 --strictPort",
      url: "http://localhost:8091",
      reuseExistingServer: false,
      env: {
        DEV_DATA_DIR: ".data-e2e",
        INSTRUCTOR_PASSWORD: "e2e-instructor-password",
        INSTRUCTOR_SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
      },
    },
    {
      command: "npx vite build --outDir .e2e-dist --emptyOutDir && npx vite preview --outDir .e2e-dist --port 8093 --strictPort",
      url: "http://localhost:8093",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

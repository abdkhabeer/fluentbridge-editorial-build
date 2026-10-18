import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Applies the headers from public/_headers (as Netlify would) to the production
// build and checks that no page triggers a Content Security Policy violation.
const parseHeaders = () => {
  const out: Record<string, string> = {};
  for (const line of readFileSync("public/_headers", "utf8").split("\n")) {
    const m = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(line);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
};

test("security headers allow the site to work without CSP violations", async ({ page }) => {
  const headers = parseHeaders();
  expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");

  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), ...headers } });
  });
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  const consoleCsp: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy/i.test(m.text())) consoleCsp.push(m.text());
  });

  const violations = async () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(500);
  // Google Fonts (stylesheet + font files) must still load under the policy.
  const loadedFamilies = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, ""));
  });
  expect(loadedFamilies).toEqual(expect.arrayContaining(["Inter", "Cormorant Garamond"]));
  expect(await page.evaluate(() => document.querySelector("video")?.currentSrc ?? "")).toContain("/videos/");
  // Contact form posts to the same origin (allowed by connect-src 'self').
  await page.getByPlaceholder("Name").fill("CSP Check");
  await page.getByPlaceholder("Email").fill("csp@example.com");
  await page.getByRole("button", { name: "Send Message" }).click();
  await page.waitForTimeout(500);
  expect(await violations()).toEqual([]);

  // Netlify's deploy-preview toolbar iframe (app.netlify.com) must be allowed; any other frame stays blocked.
  const frameCheck = async (src: string) =>
    page.evaluate(async (s) => {
      const before = (window as unknown as { __csp: string[] }).__csp.length;
      const f = document.createElement("iframe");
      f.src = s;
      document.body.appendChild(f);
      await new Promise((r) => setTimeout(r, 300));
      f.remove();
      return (window as unknown as { __csp: string[] }).__csp.slice(before);
    }, src);
  expect(await frameCheck("https://app.netlify.com/cdp/")).toEqual([]);
  expect((await frameCheck("https://example.com/")).join(" ")).toContain("frame-src");
  (await page.evaluate(() => ((window as unknown as { __csp: string[] }).__csp.length = 0)));
  consoleCsp.length = 0;

  for (const path of ["/enroll", "/privacy", "/instructor"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await violations(), path).toEqual([]);
  }
  await expect(page.getByText(/Instructor|sign-in|reach the server/i).first()).toBeVisible();
  expect(consoleCsp).toEqual([]);
});

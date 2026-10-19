import { expect, test, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { QUESTIONS } from "../src/lib/assessment/questions";
import { ANSWER_KEY } from "../server/assessment/answerKey";

const LOCATIONS = [
  { label: "Cairo, Egypt", currency: "EGP", price: /EGP/ },
  { label: "Other locations in Egypt", currency: null, price: null },
  { label: "Saudi Arabia", currency: "SAR", price: /^855\s*SAR per 4 weeks$/ },
  { label: "United States", currency: "USD", price: /^\$?228\s*USD per 4 weeks$/ },
  { label: "United Kingdom", currency: "GBP", price: /^£?170\s*GBP per 4 weeks$/ },
  { label: "Other countries", currency: null, price: null },
];

test.describe("pricing", () => {
  test("each location tab shows its own currency", async ({ page }) => {
    await page.goto("/#pricing");
    const pricing = page.locator("#pricing");
    for (const loc of LOCATIONS) {
      // The radio is visually hidden; people click its visible label.
      await pricing.locator("label").filter({ hasText: new RegExp(`^${loc.label}$`) }).click();
      await expect(pricing.getByRole("radio", { name: loc.label, exact: true })).toBeChecked();
      if (loc.currency) {
        await expect(pricing.getByText(`Showing prices for ${loc.label} in ${loc.currency}.`)).toBeVisible();
        await expect(pricing.getByText(`Prices in ${loc.currency}`)).toBeVisible();
        await expect(pricing.getByText(loc.price!).first()).toBeVisible();
        for (const other of ["EGP", "SAR", "USD", "GBP"].filter((c) => c !== loc.currency)) {
          await expect(pricing.getByText(`Prices in ${other}`)).toHaveCount(0);
        }
      } else {
        await expect(pricing.getByText(`Showing pricing options for ${loc.label}.`)).toBeVisible();
        await expect(pricing.getByText(/^Prices in /)).toHaveCount(0);
      }
    }
  });
});

/** Creates a made-up lead on the preview through the API and opens its results page. */
const openResults = async (page: Page) => {
  const token = randomBytes(32).toString("hex");
  const application = {
    full_name: `Preview Check ${randomBytes(3).toString("hex")}`,
    country: "Egypt",
    country_other: "",
    city: "Cairo",
    email: "preview-check@example.com",
    whatsapp_number: "010 0000 0000",
    alternative_phone: "",
    primary_learning_goal: "business",
    additional_learning_goals: [],
    other_goal_text: "",
    learning_goal_details: "",
    self_reported_level: "intermediate",
    lesson_format: "one_on_one",
    group_status: "",
    preferred_classes_per_week: "2",
    selected_package: "help",
    is_student: false,
    preferred_payment_method: "vodafone_cash",
    preferred_days: ["tue"],
    preferred_time_of_day: ["evening"],
    timezone: "Africa/Cairo",
    consent: true,
  };
  const created = await page.request.post("/api/applications", { data: { application, access_token: token } });
  expect(created.status(), await created.text()).toBe(201);
  const headers = { "X-Assessment-Token": token };
  // Correct to B1, wrong above: a mid-range result.
  const bands = ["A1", "A2", "B1"];
  const answers = Object.fromEntries(
    QUESTIONS.map((q) => [q.id, bands.includes(q.band) ? ANSWER_KEY[q.id].correct : (["a", "b", "c", "d"].find((o) => o !== ANSWER_KEY[q.id].correct) as string)]),
  );
  expect((await page.request.post("/api/assessment/objective", { data: { answers }, headers })).status()).toBe(200);
  expect((await page.request.post("/api/assessment/complete", { data: { skipped: true }, headers })).status()).toBe(200);
  await page.goto("/");
  await page.evaluate((t) => localStorage.setItem("fb-enrollment-v1", JSON.stringify({ token: t, submitted: true, phase: "results" })), token);
  await page.goto("/enroll");
  await expect(page.getByText("Estimated English Level")).toBeVisible();
  return application.full_name.split(" ")[0];
};

test.describe("results page", () => {
  test("shows the level range and both WhatsApp message buttons with the right text", async ({ page }, info) => {
    const firstName = await openResults(page);
    await expect(page.getByText("B1 to B2")).toBeVisible();
    await expect(page.getByText("Your next target")).toBeVisible();

    const trial = page.getByRole("link", { name: /^Book my trial/ });
    const ask = page.getByRole("link", { name: "Ask Abdul on WhatsApp" });
    await expect(trial).toBeVisible();
    await expect(ask).toBeVisible();

    const trialUrl = new URL((await trial.getAttribute("href"))!);
    const askUrl = new URL((await ask.getAttribute("href"))!);
    // BOOKING_URL is unset on previews, so the trial button falls back to WhatsApp.
    expect(trialUrl.hostname).toBe("wa.me");
    expect(trialUrl.searchParams.get("text")).toBe("Hi Abdul, I'd like to book my 30 minute trial");
    expect(askUrl.hostname).toBe("wa.me");
    expect(askUrl.searchParams.get("text")).toBe(
      `Hi Abdul, I'm ${firstName}. I just completed the FluentBridges placement test (level range: B1 to B2). I'd like to discuss my results and next steps.`,
    );
    for (const link of [trial, ask]) {
      await expect(link).toHaveAttribute("target", "_blank");
      expect(await link.getAttribute("href")).not.toMatch(/Preview%20Check%20|preview-check|\d{6,}%40/);
    }

    // Clicking opens WhatsApp in a new tab (stubbed so nothing leaves the test).
    await page.context().route("https://wa.me/**", (route) => route.fulfill({ status: 200, body: "stub" }));
    for (const link of [trial, ask]) {
      const [popup] = await Promise.all([page.waitForEvent("popup"), link.click()]);
      expect(new URL(popup.url()).hostname).toBe("wa.me");
      await popup.close();
    }

    if (info.project.name === "mobile") {
      // No horizontal scroll on a phone.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await page.screenshot({ path: info.outputPath("results-mobile.png"), fullPage: true });
    }
  });
});

test.describe("routing and crawler files", () => {
  test("unknown paths return a real 404 page", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res!.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This page doesn't exist." })).toBeVisible();
    expect(await page.locator('meta[name="robots"]').getAttribute("content")).toMatch(/noindex/);
    for (const path of ["/", "/enroll", "/privacy", "/instructor"]) {
      expect((await page.request.get(path)).status(), path).toBe(200);
    }
  });

  test("sitemap.xml lists the public pages", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/xml/);
    const body = await res.text();
    for (const loc of ["https://fluentbridges.com/", "https://fluentbridges.com/enroll", "https://fluentbridges.com/privacy"]) {
      expect(body).toContain(`<loc>${loc}</loc>`);
    }
    expect(body).not.toContain("/instructor");
  });

  test("robots.txt blocks the admin and points to the sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/^User-agent: \*$/m);
    expect(body).toMatch(/^Disallow: \/instructor$/m);
    expect(body).toMatch(/^Sitemap: https:\/\/fluentbridges\.com\/sitemap\.xml$/m);
    expect(body).not.toMatch(/User-agent: (Googlebot|Bingbot)/);
  });
});

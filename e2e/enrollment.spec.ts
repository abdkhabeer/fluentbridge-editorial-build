import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.E2E_SCREENSHOT_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${test.info().project.name}-${name}.png`, fullPage: true });
};

const expectNoHorizontalScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
};

test("student completes the enrollment funnel and the instructor can follow up", async ({ page }) => {
  const name = `E2E Student ${test.info().project.name} ${Date.now()}`;

  await page.goto("/");
  await page.getByRole("link", { name: "Take the free placement test" }).click();
  await expect(page).toHaveURL(/\/enroll$/);
  await expectNoHorizontalScroll(page);
  await shot(page, "1-details");

  // Step 1
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Country of residence").selectOption("Egypt");
  await page.getByLabel("City").fill("Cairo");
  await page.getByLabel("Email address").fill("student@example.com");
  await page.getByLabel("WhatsApp number").fill("010 1234 5678");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2
  await page.getByText("Job interviews and career development", { exact: true }).first().click();
  await page.getByText("Upper-intermediate", { exact: true }).click();
  await shot(page, "2-goals");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3
  await page.getByText("One-on-one lessons", { exact: true }).click();
  await page.getByText("Once per week", { exact: true }).click();
  await page.getByRole("radio", { name: /^8 Lessons.*3,600 EGP/ }).check({ force: true });
  await expect(page.getByText(/about 2 lessons per week/).first()).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shot(page, "3-lessons");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4
  await page.getByRole("radio", { name: /^Vodafone Cash/ }).check({ force: true });
  await page.getByText("Sat", { exact: true }).click();
  await page.getByText("Evening (17:00–21:00)", { exact: true }).click();
  await shot(page, "4-payment");
  await page.getByRole("button", { name: "Review my details" }).click();

  // Review
  await expect(page.getByRole("heading", { name: "Review your details" })).toBeVisible();
  await page.getByRole("checkbox", { name: /I agree/ }).check();
  await expectNoHorizontalScroll(page);
  await shot(page, "5-review");
  await page.getByRole("button", { name: "Continue to English Placement Test" }).click();

  // Test
  await page.getByRole("button", { name: "Start the test" }).click();
  // Contact details are no longer stored on the device once submitted.
  const stored = await page.evaluate(() => localStorage.getItem("fb-enrollment-v1") ?? "");
  expect(stored).not.toContain("student@example.com");
  expect(stored).not.toContain(name);
  for (let i = 0; i < 30; i++) {
    await expect(page.getByText(`Question ${i + 1} of 30`)).toBeVisible();
    if (i === 3) await page.reload(); // progress survives a refresh
    if (i === 3) await expect(page.getByText("Question 4 of 30")).toBeVisible();
    if (i === 24) await shot(page, "6-reading");
    await page.locator("label:has(input[type=radio])").first().click();
    await page.getByRole("button", { name: /^(Next|Finish)/ }).click();
  }
  await page.getByRole("button", { name: "Continue to the writing task" }).click();
  await page.getByLabel("Your answer").fill("My name is Sam. I live in Cairo and I work in marketing. I want to improve my English for job interviews.");
  await expectNoHorizontalScroll(page);
  await shot(page, "7-writing");
  await page.getByRole("button", { name: "Submit and see my results" }).click();

  // Results
  await expect(page.getByText("Estimated English Level")).toBeVisible();
  await expect(page.getByRole("link", { name: /Discuss My Results on WhatsApp/ })).toHaveAttribute("href", /wa\.me\/15713265041/);
  await expectNoHorizontalScroll(page);
  await shot(page, "8-results");

  // Results survive a refresh (loaded from the server with this browser's token).
  await page.reload();
  await expect(page.getByText("Estimated English Level")).toBeVisible();

  // Shared-device cleanup.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Remove my data from this device" }).click();
  await expect(page.getByText("Your information has been removed from this device.")).toBeVisible();
  await expect(page.getByText(/can no longer open your application/)).toBeVisible();
  await page.goto("/enroll");
  await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("fb-enrollment-v1") ?? "")).not.toMatch(/[a-f0-9]{64}/);

  // Instructor
  await page.goto("/instructor");
  await page.getByLabel("Password").fill("e2e-instructor-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.getByText("+20 10 1234 5678")).toBeVisible();
  await expect(page.getByText(/I live in Cairo/)).toBeVisible();
  await page.getByLabel("Lead status").selectOption("contacted");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shot(page, "9-instructor");

  // Signing out revokes the session.
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Instructor sign-in" })).toBeVisible();
});

test("privacy policy is reachable from the footer and readable on mobile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy Policy", exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How long we keep it" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shot(page, "10-privacy");
});

test("pricing card links preselect the package", async ({ page }) => {
  await page.goto("/");
  await page.locator("#pricing").scrollIntoViewIfNeeded();
  await page.locator('a[href="/enroll?package=group-8"]').click();
  await expect(page).toHaveURL(/\/enroll$/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("fb-enrollment-v1") ?? "{}"));
  expect(saved.draft.selected_package).toBe("group-8");
  expect(saved.draft.lesson_format).toBe("small_group");
});

test("location-based pricing: switching locations, mobile layout, and pricing requests", async ({ page }) => {
  await page.goto("/");
  const pricing = page.locator("#pricing");
  await pricing.scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Special Pricing for Students in Cairo" })).toBeVisible();
  await expect(pricing.getByText("2,200", { exact: true })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shot(page, "11-pricing-cairo");

  // Keyboard: the selector is a radio group, so arrow keys move between locations.
  await page.getByRole("radio", { name: "Cairo, Egypt" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Saudi Arabia" })).toBeChecked();
  await expect(page.getByRole("heading", { name: "Pricing for Students in Saudi Arabia" })).toBeVisible();
  for (const price of ["35", "450", "680"]) await expect(pricing.getByText(price, { exact: true })).toBeVisible();
  await expect(pricing.getByText("2,200", { exact: true })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await shot(page, "12-pricing-ksa");

  await page.getByText("United States", { exact: true }).click();
  for (const price of ["$10", "$120", "$180"]) await expect(pricing.getByText(price, { exact: true })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByText("United Kingdom", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Based in the UK?" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shot(page, "13-pricing-uk");
  await page.getByRole("link", { name: "Request UK Pricing" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Country")).toHaveValue("United Kingdom");
  await expect(page.getByLabel("Preferred currency")).toHaveValue("GBP");
  await expect(page.locator("#contact").getByText("UK pricing in GBP")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shot(page, "14-contact-uk-request");

  // The choice survives a reload.
  await page.goto("/");
  await expect(page.getByRole("radio", { name: "United Kingdom" })).toBeChecked();
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { StudentResult } from "@/lib/enrollment/apiTypes";

const result = {
  full_name: "Mona Adel",
  test_version: "fb-placement-v1",
  completed_at: "2026-10-18T10:00:00Z",
  estimated_cefr_level: "A2",
  confidence: "standard",
  unanswered: 0,
  category_scores: {
    grammar: { correct: 6, total: 11, percent: 55 },
    vocabulary: { correct: 5, total: 8, percent: 63 },
    reading: { correct: 4, total: 6, percent: 67 },
    usage: { correct: 2, total: 5, percent: 40 },
  },
  writing_status: "submitted",
  strengths: [],
  improvement_areas: [],
  recommended_learning_priorities: [],
  primary_learning_goal: "career",
  additional_learning_goals: [],
  other_goal_text: null,
  lesson_format: "one_on_one",
  preferred_classes_per_week: "2",
  selected_package: "help",
  selected_package_price_snapshot: null,
  preferred_payment_method: "paypal",
  trial_price: null,
} satisfies StudentResult;

// Flags are read when the module loads, so each case imports a fresh copy.
const renderWith = async (env: Record<string, string>) => {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  vi.resetModules();
  const { ResultsView } = await import("./ResultsView");
  render(<ResultsView result={result} />);
};

afterEach(() => vi.unstubAllEnvs());

describe("results page flags and settings", () => {
  it("adds the refund line and the 24-hour review promise when the flags are on", async () => {
    await renderWith({ FEATURE_TRIAL_REFUND_COPY: "true", FEATURE_REVIEW_SLA_COPY: "true" });
    expect(screen.getByText(/If you don't leave the trial with a clear plan, the fee is refunded\./)).toBeInTheDocument();
    expect(screen.getByText("I'll review your writing within 24 hours and update your level.")).toBeInTheDocument();
    expect(screen.queryByText("Awaiting instructor review")).toBeNull();
  });

  it("links the trial button to BOOKING_URL when set, with a generic label when no trial price is published", async () => {
    await renderWith({ BOOKING_URL: "https://cal.example.com/fluentbridges/trial" });
    expect(screen.getByRole("link", { name: "Book my 30 minute trial" })).toHaveAttribute("href", "https://cal.example.com/fluentbridges/trial");
  });

  it("ignores a BOOKING_URL that isn't https", async () => {
    await renderWith({ BOOKING_URL: "javascript:alert(1)" });
    expect(screen.getByRole("link", { name: "Book my 30 minute trial" }).getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
  });
});

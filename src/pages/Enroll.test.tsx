import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { handleApiRequest, type ApiContext } from "../../server/api";
import { memoryStore } from "../../server/store";
import { QUESTIONS } from "@/lib/assessment/questions";
import { ANSWER_KEY } from "../../server/assessment/answerKey";
import { ResultsView } from "@/components/enroll/ResultsView";
import type { StudentResult } from "@/lib/enrollment/apiTypes";
import Enroll from "./Enroll";
import Instructor from "./Instructor";
import Privacy from "./Privacy";

let ctx: ApiContext & { store: ReturnType<typeof memoryStore> };
let failNext = 0;
const fetchSpy = vi.fn();

beforeEach(() => {
  localStorage.clear();
  failNext = 0;
  fetchSpy.mockReset();
  ctx = { store: memoryStore(), config: { instructorPassword: "instructor-password", sessionSecret: "s".repeat(40), secureCookies: false } };
  // Route the browser's fetch to the real API handlers with an in-memory store.
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    fetchSpy(url, init);
    // Analytics events are fire-and-forget and must not use up simulated failures.
    if (failNext > 0 && url !== "/api/events") {
      failNext--;
      throw new TypeError("Failed to fetch");
    }
    return handleApiRequest(new Request(`http://localhost${url}`, init), ctx);
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/enroll" element={<Enroll />} />
        <Route path="/instructor" element={<Instructor />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </MemoryRouter>,
  );

const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const pick = (name: RegExp) => fireEvent.click(screen.getByRole("radio", { name }));
const cont = () => fireEvent.click(screen.getByRole("button", { name: /^(Continue|Review my details)$/ }));

const fillDetails = () => {
  type(/^Full name/, "Mona Adel");
  type(/^Country of residence/, "Egypt");
  type(/^City/, "Cairo");
  type(/^Email address/, "mona@example.com");
  type(/^WhatsApp number/, "010 1234 5678");
  cont();
  pick(/^Business English and workplace communication/);
  pick(/^Intermediate$/);
  cont();
  pick(/^One-on-one lessons/);
  pick(/^Twice per week/);
  pick(/^8 Lessons.*6,800 EGP/);
  cont();
  pick(/^Vodafone Cash/);
  cont();
};

describe("enrollment funnel", () => {
  it("shows required-field errors beside fields and disables Continue until fixed", () => {
    renderAt("/enroll");
    cont();
    expect(screen.getByText("Please enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Please enter your WhatsApp number.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Full name/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    type(/^Email address/, "bad");
    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument();
  });

  it("shows the normalised phone number and only offers Vodafone Cash in Egypt", () => {
    renderAt("/enroll");
    type(/^Country of residence/, "Germany");
    type(/^WhatsApp number/, "0151 1234 5678");
    expect(screen.getByText(/We'll save this as \+4915112345678/)).toBeInTheDocument();
  });

  it("preselects a package from a pricing link and matches the lesson format", () => {
    renderAt("/enroll?package=group-8");
    const saved = JSON.parse(localStorage.getItem("fb-enrollment-v1")!);
    expect(saved.draft.selected_package).toBe("group-8");
    expect(saved.draft.lesson_format).toBe("small_group");
  });

  it("a pricing link from another location fills in an empty country, and Cairo for Cairo prices", () => {
    renderAt("/enroll?package=ksa-monthly-3");
    let saved = JSON.parse(localStorage.getItem("fb-enrollment-v1")!);
    expect(saved.draft).toMatchObject({ selected_package: "ksa-monthly-3", lesson_format: "one_on_one", country: "Saudi Arabia", city: "" });
    expect(screen.getByLabelText(/^Country of residence/)).toHaveValue("Saudi Arabia");
    localStorage.clear();
    renderAt("/enroll?package=student-8");
    saved = JSON.parse(localStorage.getItem("fb-enrollment-v1")!);
    expect(saved.draft).toMatchObject({ country: "Egypt", city: "Cairo" });
  });

  const toLessons = (country: string, city: string, phone: string) => {
    type(/^Full name/, "Sara Ali");
    type(/^Country of residence/, country);
    type(/^City/, city);
    type(/^Email address/, "sara@example.com");
    type(/^WhatsApp number/, phone);
    cont();
    pick(/^General English/);
    pick(/^Beginner$/);
    cont();
    pick(/^One-on-one lessons/);
  };

  it("shows students in Saudi Arabia only their SAR prices", () => {
    renderAt("/enroll");
    toLessons("Saudi Arabia", "Riyadh", "+966 50 123 4567");
    expect(screen.getByText(/Pricing for Students in Saudi Arabia, from your location/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Single Lesson.*75 SAR/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^12 Classes per 4 Weeks.*855 SAR per 4 weeks.*71\.25 SAR per class/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^20 Classes per 4 Weeks.*1,350 SAR per 4 weeks.*67\.50 SAR per class/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Trial lesson: 38 SAR \/ 30 minutes/ })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /EGP|USD|GBP/ })).toBeNull();
    pick(/^Twice per week/);
    pick(/^12 Classes per 4 Weeks/);
    expect(screen.getByText(/This 4-week plan includes 3 classes per week/)).toBeInTheDocument();
  });

  it("suggests Professional English for general goals and shows the Student tier only after the student checkbox", () => {
    renderAt("/enroll");
    toLessons("Egypt", "Cairo", "01012345678");
    expect(screen.queryByRole("heading", { name: "Student English" })).toBeNull();
    const professional = screen.getByRole("heading", { name: "Professional English" }).parentElement!;
    expect(professional).toHaveTextContent("Suggested for your goal");
    fireEvent.click(screen.getByRole("checkbox", { name: /I'm a school or university student/ }));
    expect(screen.getByText(/Student ID checked at your first lesson/)).toBeInTheDocument();
    const student = screen.getByRole("heading", { name: "Student English" }).parentElement!;
    expect(student).toHaveTextContent("Suggested for your goal");
    fireEvent.click(within(student.parentElement!).getAllByRole("radio")[0]);
    fireEvent.click(screen.getByRole("checkbox", { name: /I'm a school or university student/ }));
    expect(screen.queryByRole("heading", { name: "Student English" })).toBeNull();
    expect(screen.getAllByRole("radio", { checked: true }).filter((r) => (r as HTMLInputElement).name === "selected_package")).toHaveLength(0);
  });

  it("shows students outside Cairo the pricing request instead of Cairo prices", () => {
    renderAt("/enroll");
    toLessons("Egypt", "Giza", "01012345678");
    expect(screen.getByText(/Looking for English lessons outside Cairo\? Contact us for pricing/)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /EGP/ })).toBeNull();
    expect(screen.getByRole("radio", { name: /^I need help choosing/ })).toBeInTheDocument();
  });

  it("warns when a preselected package doesn't match the student's location", () => {
    renderAt("/enroll?package=us-monthly-5");
    toLessons("Germany", "Berlin", "+49 151 12345678");
    expect(screen.getByText(/This option is priced for students in the United States/)).toBeInTheDocument();
    pick(/^Twice per week/);
    cont();
    expect(screen.getByRole("heading", { name: "Your lessons" })).toBeInTheDocument();
    pick(/^I need help choosing/);
    cont();
    expect(screen.getByRole("heading", { name: "Payment & schedule" })).toBeInTheDocument();
  });

  it("distinguishes weekly frequency from package size and warns on a mismatch", () => {
    renderAt("/enroll");
    type(/^Full name/, "Mona Adel");
    type(/^Country of residence/, "Egypt");
    type(/^City/, "Cairo");
    type(/^Email address/, "mona@example.com");
    type(/^WhatsApp number/, "01012345678");
    cont();
    pick(/^General English/);
    pick(/^Beginner$/);
    cont();
    pick(/^Small-group lessons/);
    expect(screen.getByText(/prices are per student/)).toBeInTheDocument();
    // Only group packages are shown for small groups.
    expect(screen.queryByRole("radio", { name: /6,800 EGP/ })).toBeNull();
    pick(/^Once per week/);
    pick(/^12 Lessons.*1,500 EGP per student/);
    expect(screen.getByText(/about 3 lessons per week/)).toBeInTheDocument();
  });

  it("asks small-group students whether they already have a group", () => {
    renderAt("/enroll?package=group-8");
    type(/^Full name/, "Mona Adel");
    type(/^Country of residence/, "Egypt");
    type(/^City/, "Cairo");
    type(/^Email address/, "mona@example.com");
    type(/^WhatsApp number/, "01012345678");
    cont();
    pick(/^General English/);
    pick(/^Beginner$/);
    cont();
    expect(screen.getByRole("group", { name: "Do you already have a group?" })).toBeInTheDocument();
    pick(/^Twice per week/);
    cont();
    expect(screen.getByText("Please tell us whether you already have a group.")).toBeInTheDocument();
    pick(/^No, I'd like help forming/);
    cont();
    expect(screen.getByRole("heading", { name: "Payment & schedule" })).toBeInTheDocument();
  });

  it("removes contact details from this device after a successful submission", async () => {
    renderAt("/enroll");
    fillDetails();
    expect(localStorage.getItem("fb-enrollment-v1")).toContain("mona@example.com");
    fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to English Placement Test" }));
    expect(await screen.findByText(/Thanks, Mona\. Your details are saved\./)).toBeInTheDocument();
    const stored = localStorage.getItem("fb-enrollment-v1")!;
    expect(stored).not.toMatch(/mona@example\.com|Mona Adel|1012345678|Cairo/);
    expect(JSON.parse(stored)).toMatchObject({ submitted: true, phase: "test" });
    expect(JSON.parse(stored).token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("links the privacy policy from the consent step", () => {
    renderAt("/enroll");
    fillDetails();
    expect(screen.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
    // Approved v3 wording, exactly (2026-10-enrollment-v3).
    expect(screen.getByRole("link", { name: "privacy policy" }).parentElement!.textContent).toBe(
      "I agree that FluentBridges may use the information I have submitted, my placement test results, and how I found the website to evaluate my learning needs, email me my results and contact me about lessons, as described in the privacy policy.",
    );
  });

  it("submits once, saves before the test, and survives a failed attempt with retry", async () => {
    renderAt("/enroll");
    fillDetails();
    expect(screen.getByRole("heading", { name: "Review your details" })).toBeInTheDocument();
    expect(screen.getByText(/Business English, 8 Lessons: 6,800 EGP/)).toBeInTheDocument();

    // Consent is required.
    fireEvent.click(screen.getByRole("button", { name: "Continue to English Placement Test" }));
    expect(await screen.findByText("Please confirm you agree before continuing.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));

    // First attempt fails (network), then the student retries.
    failNext = 1;
    fireEvent.click(screen.getByRole("button", { name: "Continue to English Placement Test" }));
    expect(await screen.findByText(/couldn't reach the server/)).toBeInTheDocument();
    expect([...ctx.store.data.keys()].filter((k) => !k.startsWith("events/"))).toHaveLength(0);

    const retry = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(retry);
    fireEvent.click(retry); // double click must not create a duplicate
    expect(await screen.findByText(/Thanks, Mona\. Your details are saved\./)).toBeInTheDocument();

    expect(await ctx.store.list("applications/")).toHaveLength(1);
    const posts = fetchSpy.mock.calls.filter(([u, i]) => u === "/api/applications" && i?.method === "POST");
    const tokens = new Set(posts.map(([, i]) => JSON.parse(i.body).access_token));
    expect(tokens.size).toBe(1); // retries reuse the same idempotency token
  });

  it("renders placement questions without revealing answers and records 'not sure' as unanswered", async () => {
    renderAt("/enroll");
    fillDetails();
    fireEvent.click(screen.getByRole("checkbox", { name: /I agree/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to English Placement Test" }));
    fireEvent.click(await screen.findByRole("button", { name: "Start the test" }));

    expect(screen.getByText(`Question 1 of ${QUESTIONS.length}`)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: QUESTIONS[0].prompt })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /is$/ }));
    expect(screen.queryByText(/correct|incorrect/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("button", { name: "I'm not sure" }));
    expect(screen.getByText(`Question 3 of ${QUESTIONS.length}`)).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem("fb-enrollment-v1")!);
    expect(saved.answers).toEqual({ [QUESTIONS[0].id]: "b", [QUESTIONS[1].id]: null });
    expect(saved.questionIndex).toBe(2);
  });
});

describe("shared-device cleanup", () => {
  it("'Remove my data from this device' clears local storage and revokes the server token", async () => {
    // A completed assessment created through the real API.
    const token = "ab".repeat(32);
    const api = (method: string, path: string, body?: unknown) =>
      handleApiRequest(
        new Request(`http://localhost${path}`, {
          method,
          headers: { "Content-Type": "application/json", "X-Assessment-Token": token },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
        ctx,
      );
    const draft = {
      ...JSON.parse(JSON.stringify((await import("@/lib/enrollment/schema")).emptyDraft())),
      full_name: "Mona Adel", country: "Egypt", city: "Cairo", email: "mona@example.com", whatsapp_number: "01012345678",
      primary_learning_goal: "general", self_reported_level: "beginner", lesson_format: "one_on_one",
      preferred_classes_per_week: "2", selected_package: "student-8", is_student: true, preferred_payment_method: "paypal", consent: true,
    };
    expect((await api("POST", "/api/applications", { application: draft, access_token: token })).status).toBe(201);
    await api("POST", "/api/assessment/objective", { answers: Object.fromEntries(QUESTIONS.map((q) => [q.id, ANSWER_KEY[q.id].correct])) });
    await api("POST", "/api/assessment/complete", { text: "Hello." });
    localStorage.setItem("fb-enrollment-v1", JSON.stringify({ token, submitted: true, phase: "results" }));
    // Everything else the site keeps in this browser.
    localStorage.setItem("fb-pricing-location", "cairo");
    localStorage.setItem("fb-analytics-session-v1", JSON.stringify({ id: "a".repeat(32), created_at: new Date().toISOString() }));
    localStorage.setItem("fb-attribution-v1", JSON.stringify({ utm_source: "whatsapp", landing_path: "/", captured_at: new Date().toISOString() }));
    sessionStorage.setItem("fb-analytics-once-v1", JSON.stringify(["intake_started:{}"]));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderAt("/enroll");
    expect(await screen.findByText("Estimated English Level")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove my data from this device" }));
    expect(await screen.findByText("Your information has been removed from this device.")).toBeInTheDocument();
    expect(screen.getByText(/can no longer open your application/)).toBeInTheDocument();

    // Every key is gone, and nothing is written back afterwards.
    await new Promise((r) => setTimeout(r, 50));
    expect(Object.keys(localStorage)).toEqual([]);
    expect(Object.keys(sessionStorage)).toEqual([]);
    expect((await api("GET", "/api/assessment")).status).toBe(404);
    // The instructor still has the application.
    expect(await ctx.store.list("applications/")).toHaveLength(1);
  });
});

describe("privacy policy", () => {
  it("renders at /privacy with retention, storage, and contact sections", async () => {
    renderAt("/privacy");
    expect(screen.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeInTheDocument();
    expect(screen.getByText(/12 months after your last activity/)).toBeInTheDocument();
    expect(screen.getByText(/stops working 30 days after you apply/)).toBeInTheDocument();
    expect(screen.getAllByText(/Netlify, Inc\./).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Contact us about privacy" })).toBeInTheDocument();
    // Approved wording, exactly.
    expect(
      screen.getByText(
        "We count visits and steps on this site, for example that someone started or finished the placement test, so we can fix what is confusing. We do this ourselves, with no third-party analytics or advertising trackers. Each event stores only its name, a random session ID, a few non-personal details such as the step number, and the time. It does not store your name, email, phone number, IP address or browser details. The random ID is kept in your browser and replaced after 30 days. We delete these events after 12 months.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We use Netlify to host the site and Resend to email us a notification when you complete the placement test. That notification includes the details you submitted.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/We don't use analytics/)).toBeNull();
    expect(screen.getByRole("link", { name: "+1 (571) 326-5041" })).toHaveAttribute("href", "https://wa.me/15713265041");
  });
});

describe("results page", () => {
  const result: StudentResult = {
    full_name: "Mona Adel",
    test_version: "fb-placement-v1",
    completed_at: "2026-10-18T10:00:00Z",
    estimated_cefr_level: "B1",
    confidence: "standard",
    unanswered: 1,
    category_scores: {
      grammar: { correct: 6, total: 11, percent: 55 },
      vocabulary: { correct: 5, total: 8, percent: 63 },
      reading: { correct: 4, total: 6, percent: 67 },
      usage: { correct: 2, total: 5, percent: 40 },
    },
    writing_status: "submitted",
    strengths: ["You answered every question from A1 to A2 correctly."],
    improvement_areas: ["Review third conditional (B2)."],
    recommended_learning_priorities: ["Business communication: emails, meetings, and negotiating language."],
    primary_learning_goal: "business",
    additional_learning_goals: [],
    other_goal_text: null,
    lesson_format: "one_on_one",
    preferred_classes_per_week: "2",
    selected_package: "business-8",
    selected_package_price_snapshot: null,
    preferred_payment_method: "vodafone_cash",
    trial_price: "100 EGP",
  };

  it("names a strongest skill only at 50% or more with at least 4 correct, otherwise lists what went well", () => {
    const weak = {
      ...result,
      category_scores: {
        grammar: { correct: 4, total: 11, percent: 36 },
        vocabulary: { correct: 3, total: 8, percent: 38 },
        reading: { correct: 3, total: 6, percent: 50 },
        usage: { correct: 3, total: 5, percent: 60 },
      },
    };
    const { unmount } = render(<ResultsView result={weak} />);
    expect(screen.queryByText(/Your strongest skill/)).toBeNull();
    expect(screen.queryByText(/is your strongest skill/)).toBeNull();
    expect(screen.getByRole("heading", { name: "What you did well" })).toBeInTheDocument();
    expect(screen.getByText("You answered every question from A1 to A2 correctly.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Strengths you showed" })).toBeNull();
    expect(screen.getByText(/^This test can't measure speaking/)).toBeInTheDocument();
    unmount();
    render(<ResultsView result={result} />);
    expect(screen.queryByRole("heading", { name: "What you did well" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Strengths you showed" })).toBeInTheDocument();
  });

  it("shows a level range and next target instead of exact scores, and leads with the strongest skill", () => {
    render(<ResultsView result={result} />);
    expect(screen.getByText("Estimated English Level")).toBeInTheDocument();
    expect(screen.getByText("B1 to B2")).toBeInTheDocument();
    expect(screen.getByText("Your next target")).toBeInTheDocument();
    expect(screen.getByText("B2")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/Overall score|Correct answers/)).toBeNull();
    expect(screen.getByText("Your strongest skill: reading comprehension, 4 of 6")).toBeInTheDocument();
    expect(screen.getByText(/Your instructor may adjust your level after reviewing your writing and speaking ability/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What we measured" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What we recommend" })).toBeInTheDocument();
    expect(screen.getByText("Awaiting instructor review")).toBeInTheDocument();
    expect(screen.getByText("Nothing is charged and nothing is booked until you confirm.")).toBeInTheDocument();
    expect(screen.queryByText(/refunded/)).toBeNull();
  });

  it("shows no range at the top band, and a range from Pre-A1", () => {
    const { unmount } = render(<ResultsView result={{ ...result, estimated_cefr_level: "C2" }} />);
    expect(screen.getByText("C2")).toBeInTheDocument();
    expect(screen.queryByText(/C2 to/)).toBeNull();
    expect(screen.queryByText("Your next target")).toBeNull();
    unmount();
    render(<ResultsView result={{ ...result, estimated_cefr_level: "Pre-A1" }} />);
    expect(screen.getByText("Pre-A1 to A1")).toBeInTheDocument();
  });

  it("explains the next step and offers the trial, then WhatsApp with only the first name and level range", () => {
    render(<ResultsView result={result} />);
    expect(
      screen.getByText(
        "Your reading comprehension is your strongest skill. This test can't measure speaking, so the next step is a 30 minute trial. I'll hear you speak and send you a written plan for business English and workplace communication.",
      ),
    ).toBeInTheDocument();
    // Without BOOKING_URL, booking falls back to WhatsApp.
    const book = screen.getByRole("link", { name: "Book my trial: 100 EGP, credited to your package" }).getAttribute("href")!;
    expect(decodeURIComponent(book.split("text=")[1])).toBe("Hi Abdul, I'd like to book my 30 minute trial");
    const href = screen.getByRole("link", { name: /Ask Abdul on WhatsApp/ }).getAttribute("href")!;
    expect(href).toMatch(/^https:\/\/wa\.me\/15713265041\?text=/);
    const text = decodeURIComponent(href.split("text=")[1]);
    expect(text).toContain("Mona");
    expect(text).toContain("B1 to B2");
    expect(text).not.toContain("Adel");
    expect(screen.getByRole("link", { name: /Send a message instead/ })).toHaveAttribute("href", "/#contact");
  });
});

describe("instructor view", () => {
  it("requires sign-in and lists leads only after authenticating", async () => {
    renderAt("/instructor");
    expect(await screen.findByRole("heading", { name: "Instructor sign-in" })).toBeInTheDocument();
    expect(screen.queryByText("Student leads")).toBeNull();

    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Incorrect password.")).toBeInTheDocument();
  });

  it("shows a configuration notice when instructor access is not set up", async () => {
    ctx.config = { secureCookies: false };
    renderAt("/instructor");
    expect(await screen.findByText(/Instructor access isn't configured/)).toBeInTheDocument();
  });
});

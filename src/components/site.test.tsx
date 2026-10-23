import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import AboutSection from "./AboutSection";
import Hero from "./Hero";
import NotFound from "@/pages/NotFound";
import ContactSection from "./ContactSection";
import Footer from "./Footer";
import PricingSection from "./PricingSection";
import { getRegion } from "@/data/pricing";

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

const renderContact = () =>
  render(
    <MemoryRouter>
      <Toaster />
      <ContactSection />
    </MemoryRouter>,
  );

const fill = () => {
  fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Test Person" } });
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Message"), { target: { value: "Hello" } });
};

describe("contact form", () => {
  it("shows success only after Netlify confirms the submission, with a correct Content-Type", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderContact();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
    expect(await screen.findByText("Thank you! I'll be in touch within 24 hours.")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(String(init.body)).toContain("form-name=contact");
    expect(String(init.body)).toContain("name=Test+Person");
    expect(screen.getByPlaceholderText("Name")).toHaveValue("");
  });

  it("shows an error and keeps the message when submission fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    renderContact();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
    expect(await screen.findByText(/your message wasn't sent/)).toBeInTheDocument();
    expect(screen.queryByText(/Thank you!/)).toBeNull();
    expect(screen.getByPlaceholderText("Name")).toHaveValue("Test Person");
  });

  it("handles network errors and prevents duplicate submissions while sending", async () => {
    let reject!: (e: Error) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((_, r) => (reject = r)));
    vi.stubGlobal("fetch", fetchMock);
    renderContact();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Send Message" }));
    const sending = screen.getByRole("button", { name: "Sending…" });
    expect(sending).toBeDisabled();
    fireEvent.click(sending);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => reject(new TypeError("Failed to fetch")));
    expect(await screen.findByText(/your message wasn't sent/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Send Message" })).toBeEnabled());
  });

  it("links to the privacy policy", () => {
    vi.stubGlobal("fetch", vi.fn());
    renderContact();
    expect(screen.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
  });
});

describe("hero", () => {
  it("leads with the level test and prices", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );
    expect(screen.getByText("CELTA-CERTIFIED AMERICAN ENGLISH COACH")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Speak English with confidence in meetings, interviews, and negotiations." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Take the free level test" })).toHaveAttribute("href", "/enroll");
    expect(screen.getByRole("link", { name: "See prices" })).toHaveAttribute("href", "#pricing");
    expect(screen.getByText("Free. About 25 to 30 minutes.")).toBeInTheDocument();
    expect(screen.queryByText(/Take the free placement test/)).toBeNull();
  });
});

describe("about section", () => {
  it("introduces the coach with the local instructor photo and descriptive alt text", () => {
    render(<AboutSection />);
    expect(screen.getByRole("heading", { name: "Meet Your English Coach" })).toBeInTheDocument();
    expect(screen.getByText("CELTA-Certified English Teacher")).toBeInTheDocument();
    const img = screen.getByRole("img", { name: "Abdul Khabeer, FluentBridges English coach" });
    expect(img).toHaveAttribute("src", "/fluentbridges-instructor.jpg");
    expect(img).toHaveAttribute("width", "259");
    expect(img).toHaveAttribute("height", "452");
  });
});

describe("footer and pricing", () => {
  it("footer links to the privacy policy", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });

  const renderPricing = () =>
    render(
      <MemoryRouter>
        <PricingSection />
      </MemoryRouter>,
    );
  const enrollHrefs = () => screen.queryAllByRole("link", { name: "Choose & Start Enrollment" }).map((b) => b.getAttribute("href"));
  const choose = (label: string) => fireEvent.click(screen.getByRole("radio", { name: label }));

  it("shows a founding rate under the hard-currency plan cards only when one is set", () => {
    const us = getRegion("us");
    const { unmount } = renderPricing();
    choose("United States");
    expect(screen.queryByText(/Founding rate until/)).toBeNull();
    unmount();
    us.foundingRate = { endsOn: "2999-12-31", note: "Your rate stays while your plan continues." };
    try {
      renderPricing();
      choose("United States");
      expect(screen.getByText("Founding rate until 31 December 2999. Your rate stays while your plan continues.")).toBeInTheDocument();
      choose("Cairo, Egypt");
      expect(screen.queryByText(/Founding rate until/)).toBeNull();
    } finally {
      delete us.foundingRate;
    }
  });

  it("defaults to Cairo, and its buttons start enrollment with their package links and prices", () => {
    renderPricing();
    expect(screen.getByRole("radio", { name: "Cairo, Egypt" })).toBeChecked();
    expect(screen.getByRole("heading", { name: "Special Pricing for Students in Cairo" })).toBeInTheDocument();
    const plans = getRegion("cairo").tracks.flatMap((t) => t.plans);
    expect(enrollHrefs()).toEqual(plans.map((p) => `/enroll?package=${p.id}`));
    expect(screen.getByText(/You won't be charged, and nothing is booked/)).toBeInTheDocument();
    for (const price of ["200", "1,500", "2,200", "6,800", "9,600"]) expect(screen.getAllByText(price).length).toBeGreaterThan(0);
    expect(screen.getByText("Trial Lesson")).toBeInTheDocument();
    expect(screen.getByText("Vodafone Cash")).toBeInTheDocument();
  });

  it("offers every location in an accessible selector", () => {
    renderPricing();
    const group = screen.getByRole("group", { name: "Where are you based?" });
    expect(Array.from(group.querySelectorAll("input[type=radio]")).map((r) => (r.closest("label") as HTMLElement).textContent)).toEqual([
      "Cairo, Egypt", "Other locations in Egypt", "Saudi Arabia", "United States", "United Kingdom", "Other countries",
    ]);
  });

  it("switching location updates the prices without a reload", () => {
    renderPricing();
    choose("Saudi Arabia");
    expect(screen.getByRole("heading", { name: "Pricing for Students in Saudi Arabia" })).toBeInTheDocument();
    for (const price of ["75", "855", "1,350"]) expect(screen.getByText(price)).toBeInTheDocument();
    expect(screen.getAllByText("SAR per 4 weeks")).toHaveLength(2);
    expect(enrollHrefs()).toEqual(["/enroll?package=ksa-single", "/enroll?package=ksa-monthly-3", "/enroll?package=ksa-monthly-5"]);
    expect(screen.queryByText("2,200")).toBeNull();
    expect(screen.getByText("38 SAR / 30 minutes")).toBeInTheDocument();
    expect(screen.queryByText("Vodafone Cash")).toBeNull();
    expect(screen.queryByText("InstaPay")).toBeNull();

    choose("United States");
    for (const price of ["$20", "$228", "$360"]) expect(screen.getByText(price)).toBeInTheDocument();
    expect(screen.getAllByText("USD per 4 weeks")).toHaveLength(2);
    expect(screen.getByText("Save $40 USD")).toBeInTheDocument();
    expect(screen.queryByText("855")).toBeNull();

    choose("United Kingdom");
    for (const price of ["15", "170", "265"]) expect(screen.getByText(price)).toBeInTheDocument();
    expect(enrollHrefs()).toEqual(["/enroll?package=uk-single", "/enroll?package=uk-monthly-3", "/enroll?package=uk-monthly-5"]);
    expect(screen.queryByRole("link", { name: "Request UK Pricing" })).toBeNull();
    expect(screen.getByText("Showing prices for United Kingdom in GBP.")).toBeInTheDocument();

    choose("Cairo, Egypt");
    expect(screen.getByText("2,200")).toBeInTheDocument();
  });

  it.each([
    ["Other locations in Egypt", "Looking for English lessons outside Cairo?", "Request Pricing", "egypt-pricing"],
    ["Other countries", "Studying from another country? Let's find the right plan and currency for you.", "Request a Consultation", "consultation"],
  ])("%s shows its inquiry and no prices", (location, heading, cta, type) => {
    renderPricing();
    choose(location);
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: cta })).toHaveAttribute("href", `/?inquiry=${type}#contact`);
    expect(enrollHrefs()).toEqual([]);
    expect(screen.queryByText(/EGP|SAR|USD/)).toBeNull();
  });

  it("remembers the chosen location, and otherwise reuses the enrollment form's country", () => {
    localStorage.setItem("fb-enrollment-v1", JSON.stringify({ draft: { country: "United States", city: "Austin" } }));
    const first = renderPricing();
    expect(screen.getByRole("radio", { name: "United States" })).toBeChecked();
    choose("Saudi Arabia");
    first.unmount();
    renderPricing();
    expect(screen.getByRole("radio", { name: "Saudi Arabia" })).toBeChecked();
  });
});

describe("pricing requests through the contact form", () => {
  const renderAt = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Toaster />
        <PricingSection />
        <ContactSection />
      </MemoryRouter>,
    );

  it("a pricing CTA prefills the request type, country and currency", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("radio", { name: "Other locations in Egypt" }));
    fireEvent.click(screen.getByRole("link", { name: "Request Pricing" }));
    expect(screen.getByText("Pricing for students outside Cairo")).toBeInTheDocument();
    expect(screen.getByLabelText("Country")).toHaveValue("Egypt");
    expect(screen.getByLabelText("City or region")).toBeRequired();
    expect(screen.getByLabelText("Preferred currency")).toHaveValue("EGP");
    expect(screen.getByRole("button", { name: "Send Request" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Other countries" }));
    fireEvent.click(screen.getByRole("link", { name: "Request a Consultation" }));
    expect(screen.getByText("Pricing consultation")).toBeInTheDocument();
    expect(screen.getByLabelText("Country")).toHaveValue("");
  });

  it("submits a request with WhatsApp only and shows a clear confirmation", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderAt("/?inquiry=consultation");
    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Test Person" } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "Germany" } });
    fireEvent.change(screen.getByLabelText("Preferred currency"), { target: { value: "EUR" } });
    fireEvent.change(screen.getByPlaceholderText("WhatsApp Number"), { target: { value: "+49 151 12345678" } });
    fireEvent.change(screen.getByLabelText("How often would you like lessons?"), { target: { value: "Twice per week" } });
    fireEvent.change(screen.getByLabelText("Your learning goals"), { target: { value: "IELTS" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Request" }));
    expect(await screen.findByText("Your request (Pricing consultation) has been received.", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Thank you, Test.");
    const body = new URLSearchParams(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(Object.fromEntries(body)).toMatchObject({
      "form-name": "contact",
      request_type: "Pricing consultation",
      name: "Test Person",
      email: "",
      whatsapp: "+49 151 12345678",
      country: "Germany",
      currency: "EUR",
      frequency: "Twice per week",
      goals: "IELTS",
    });
    // Back to a general message afterwards.
    expect(screen.getByRole("button", { name: "Send Message" })).toBeInTheDocument();
  });

  it("asks for an email or WhatsApp number before sending a request", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderAt("/?inquiry=consultation");
    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Test Person" } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "Germany" } });
    fireEvent.click(screen.getByRole("button", { name: "Send Request" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter an email address or a WhatsApp number");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores unknown request types", () => {
    renderAt("/?inquiry=free-lessons");
    expect(screen.getByRole("button", { name: "Send Message" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Country")).toBeNull();
  });

  it("every field the contact form sends is registered in the hidden Netlify form", () => {
    renderAt("/?inquiry=consultation");
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "Other" } });
    const form = document.querySelector("form[name=contact]") as HTMLFormElement;
    const sent = Array.from(form.elements).map((el) => (el as HTMLInputElement).name).filter(Boolean);
    const html = readFileSync("index.html", "utf8");
    const registered = [...html.matchAll(/name="([a-z_-]+)"/g)].map((m) => m[1]);
    for (const name of [...sent, "level"]) if (name !== "form-name") expect(registered, name).toContain(name);
  });
});

describe("routing and crawling", () => {
  const rules = readFileSync("public/_redirects", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.trim().split(/\s+/));

  it("serves every app route with 200 and everything else with a real 404", () => {
    const appRoutes = [...readFileSync("src/App.tsx", "utf8").matchAll(/path="([^"*]+)"/g)].map((m) => m[1].replace(/\/:[^/]+$/, "/*"));
    const ok = rules.filter((r) => r[2] === "200").map((r) => r[0]);
    for (const route of new Set(appRoutes)) expect(ok, route).toContain(route.replace("/funnel", "/*"));
    expect(rules[rules.length - 1]).toEqual(["/*", "/index.html", "404"]);
  });

  it("lists public pages in the sitemap, points robots at it and keeps crawlers out of the admin", () => {
    const sitemap = readFileSync("public/sitemap.xml", "utf8");
    for (const path of ["/", "/enroll", "/privacy"]) expect(sitemap).toContain(`<loc>https://fluentbridges.com${path}</loc>`);
    expect(sitemap).not.toContain("instructor");
    const robots = readFileSync("public/robots.txt", "utf8");
    expect(robots).toContain("Sitemap: https://fluentbridges.com/sitemap.xml");
    expect(robots.match(/^User-agent:/gm)).toHaveLength(1);
    expect(robots).toContain("Disallow: /instructor");
  });

  it("shows a not-found page that links home and is not indexed", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "This page doesn't exist." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the homepage" })).toHaveAttribute("href", "/");
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import ContactSection from "./ContactSection";
import Footer from "./Footer";
import PricingSection from "./PricingSection";
import { tracks } from "@/data/pricing";

beforeEach(() => {
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

describe("footer and pricing", () => {
  it("footer links to the privacy policy", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });

  it("pricing buttons say they start enrollment and keep their package links and prices", () => {
    render(
      <MemoryRouter>
        <PricingSection />
      </MemoryRouter>,
    );
    const buttons = screen.getAllByRole("link", { name: "Choose & Start Enrollment" });
    const plans = tracks.flatMap((t) => t.plans);
    expect(buttons.map((b) => b.getAttribute("href"))).toEqual(plans.map((p) => `/enroll?package=${p.id}`));
    expect(screen.getByText(/You won't be charged, and nothing is booked/)).toBeInTheDocument();
    for (const price of ["200", "1,500", "2,200", "6,800", "9,600"]) expect(screen.getAllByText(price).length).toBeGreaterThan(0);
  });
});

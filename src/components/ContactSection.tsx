import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import AnimatedSection from "./AnimatedSection";
import { toast } from "sonner";
import { QUOTE_CURRENCIES, formatMoney, inquiryFor, trialLesson, type InquiryType } from "@/data/pricing";
import { COUNTRIES } from "@/lib/enrollment/countries";
import { WEEKLY_FREQUENCIES } from "@/lib/enrollment/options";

// Every field name here must also be in the hidden "contact" form in index.html,
// or Netlify Forms drops it.
const emptyForm = {
  name: "", email: "", whatsapp: "", level: "", goals: "", message: "",
  request_type: "" as InquiryType | "", country: "", country_other: "", city: "", currency: "", frequency: "",
};

const ContactSection = () => {
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ firstName: string; request: string } | null>(null);
  const sendingRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const inquiry = form.request_type ? inquiryFor(form.request_type) : null;
  const set = (patch: Partial<typeof emptyForm>) => setForm((f) => ({ ...f, ...patch }));

  // A pricing CTA links here with ?inquiry=<type>: prefill the request type, country and currency.
  useEffect(() => {
    const requested = inquiryFor(searchParams.get("inquiry") ?? "");
    if (!requested) return;
    setForm((f) => ({ ...f, request_type: requested.type, country: requested.country, country_other: "", currency: requested.currency }));
    setSent(null);
    setError("");
    sectionRef.current?.scrollIntoView();
    nameRef.current?.focus({ preventScroll: true });
    // Re-run on every navigation, so clicking the same CTA again scrolls back here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  useEffect(() => {
    if (sent) confirmRef.current?.focus();
  }, [sent]);

  // Netlify Forms: success is only shown once Netlify confirms the submission (2xx).
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sendingRef.current) return;
    if (inquiry && !form.email.trim() && !form.whatsapp.trim()) {
      setError("Please enter an email address or a WhatsApp number so we can reply.");
      return;
    }
    setError("");
    sendingRef.current = true;
    setSending(true);
    const body = new URLSearchParams();
    new FormData(e.currentTarget).forEach((value, key) => {
      if (typeof value === "string") body.append(key, value);
    });
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error(`Form submission failed (${res.status})`);
      toast.success("Thank you! I'll be in touch within 24 hours.");
      setSent({ firstName: form.name.trim().split(/\s+/)[0] ?? "", request: inquiry?.requestLabel ?? "" });
      setForm(emptyForm);
      if (searchParams.has("inquiry")) setSearchParams({}, { replace: true, preventScrollReset: true });
    } catch {
      // Keep what the visitor typed so they can retry.
      toast.error("Sorry, your message wasn't sent. Please try again, or message us on WhatsApp at +1 (571) 326-5041.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-navy transition-colors font-sans text-sm";

  const cairoTrial = formatMoney(trialLesson.amount, trialLesson.currency);

  return (
    <section id="contact" ref={sectionRef} className="section-padding bg-secondary">
      <div className="container-editorial">
        <div className="grid md:grid-cols-2 gap-16 lg:gap-24">
          <AnimatedSection>
            <p className="text-label text-muted-foreground mb-4">Get in Touch</p>
            <h2 className="text-editorial-lg text-foreground mb-8">
              Start your journey.
            </h2>
            <div className="space-y-6 text-muted-foreground">
              <p className="text-body-lg">
                Based in Cairo, teaching students online worldwide. Send a message to book your 30-minute trial lesson ({cairoTrial} for
                students in Cairo, credited toward your first 8- or 12-lesson package), ask for pricing where you live, or ask any
                questions.
              </p>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-label text-foreground block mb-1">WhatsApp</span>
                  <a href="https://wa.me/15713265041" className="hover:text-foreground transition-colors">+1 (571) 326-5041</a>
                </p>
                <p>
                  <span className="text-label text-foreground block mb-1">Egypt</span>
                  <a href="tel:+201500743304" className="hover:text-foreground transition-colors">+20 150 074 3304</a>
                </p>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            {sent && (
              <div
                ref={confirmRef}
                tabIndex={-1}
                role="status"
                className="mb-6 border border-navy/30 bg-background p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
              >
                <p className="font-serif text-xl text-foreground mb-2">Thank you{sent.firstName ? `, ${sent.firstName}` : ""}.</p>
                <p className="text-sm text-muted-foreground">
                  {sent.request ? `Your request (${sent.request}) has been received.` : "Your message has been received."} I'll reply
                  within 24 hours using the contact details you gave.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit}
                className="space-y-5"
                name="contact"
                method="POST"
                data-netlify="true"
            >
                <input type="hidden" name="form-name" value="contact" />

              {inquiry && (
                <div className="flex flex-wrap items-start justify-between gap-3 border-l-2 border-navy bg-background px-4 py-3 text-sm">
                  <p>
                    <span className="text-label text-foreground block mb-1">Request</span>
                    <span className="text-muted-foreground">{inquiry.requestLabel}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => set({ request_type: "", country: "", country_other: "", city: "", currency: "", frequency: "" })}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-navy"
                  >
                    Send a general message instead
                  </button>
                  <input type="hidden" name="request_type" value={inquiry.requestLabel} />
                </div>
              )}

              <input
                ref={nameRef}
                name="name"
                type="text"
                placeholder="Name"
                aria-label="Name"
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                className={inputClass}
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                aria-label="Email"
                required={!inquiry}
                maxLength={255}
                value={form.email}
                onChange={(e) => set({ email: e.target.value })}
                className={inputClass}
              />
              <input
                name="whatsapp"
                type="tel"
                placeholder="WhatsApp Number"
                aria-label="WhatsApp number"
                maxLength={20}
                value={form.whatsapp}
                onChange={(e) => set({ whatsapp: e.target.value })}
                className={inputClass}
                aria-describedby={inquiry ? "contact-reach-hint" : undefined}
              />
              {inquiry && (
                <p id="contact-reach-hint" className="-mt-3 text-xs text-muted-foreground">
                  Give an email address, a WhatsApp number, or both.
                </p>
              )}

              {inquiry ? (
                <>
                  <select
                    name="country"
                    aria-label="Country"
                    required
                    value={form.country}
                    onChange={(e) => set({ country: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {form.country === "Other" && (
                    <input
                      name="country_other"
                      type="text"
                      placeholder="Your country"
                      aria-label="Your country"
                      required
                      maxLength={80}
                      value={form.country_other}
                      onChange={(e) => set({ country_other: e.target.value })}
                      className={inputClass}
                    />
                  )}
                  <input
                    name="city"
                    type="text"
                    placeholder={inquiry.type === "egypt-pricing" ? "City or governorate" : "City or region (optional)"}
                    aria-label="City or region"
                    required={inquiry.type === "egypt-pricing"}
                    maxLength={80}
                    value={form.city}
                    onChange={(e) => set({ city: e.target.value })}
                    className={inputClass}
                  />
                  <select
                    name="currency"
                    aria-label="Preferred currency"
                    value={form.currency}
                    onChange={(e) => set({ currency: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Preferred currency</option>
                    {QUOTE_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    name="frequency"
                    aria-label="How often would you like lessons?"
                    value={form.frequency}
                    onChange={(e) => set({ frequency: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">How often would you like lessons?</option>
                    {WEEKLY_FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.label}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <select
                  name="level"
                  aria-label="Current English level"
                  value={form.level}
                  onChange={(e) => set({ level: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Current English Level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="upper-intermediate">Upper Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              )}
              <input
                name="goals"
                type="text"
                placeholder={inquiry ? "Your learning goals" : "Your Goals (e.g., interview prep, business English)"}
                aria-label="Your learning goals"
                maxLength={200}
                value={form.goals}
                onChange={(e) => set({ goals: e.target.value })}
                className={inputClass}
              />
              <textarea
                name="message"
                placeholder={inquiry ? "Anything else? (optional)" : "Message"}
                aria-label="Message"
                rows={4}
                maxLength={1000}
                value={form.message}
                onChange={(e) => set({ message: e.target.value })}
                className={inputClass + " resize-none"}
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={sending}
                aria-busy={sending}
                className="text-label w-full px-8 py-4 bg-foreground text-background hover:bg-navy transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
              >
                {sending ? "Sending…" : inquiry ? "Send Request" : "Send Message"}
              </button>
              <p className="text-xs text-muted-foreground">
                We use your details only to reply to you and discuss lessons. See our{" "}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
                  privacy policy
                </Link>
                .
              </p>
            </form>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;

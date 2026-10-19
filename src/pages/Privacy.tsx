import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CONTACT } from "@/lib/contact";
import { ACCESS_TTL_DAYS, ENROLLED_REVIEW_MONTHS, PROSPECT_RETENTION_DAYS } from "@/lib/enrollment/policy";

// Plain-language privacy policy. Periods come from src/lib/enrollment/policy.ts,
// which the server also enforces. See docs/privacy-and-retention.md.

export const PRIVACY_LAST_UPDATED = "18 October 2026";

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h2 className="font-serif text-2xl text-foreground">{title}</h2>
    <div className="space-y-3 text-[0.95rem] leading-relaxed text-foreground/85">{children}</div>
  </section>
);

const List = ({ items }: { items: ReactNode[] }) => (
  <ul className="space-y-2">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2">
        <span className="text-navy/50">–</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const Privacy = () => {
  useEffect(() => {
    document.title = "Privacy Policy | FluentBridges";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <Link to="/" className="font-serif text-2xl tracking-tight text-foreground">
            FluentBridges
          </Link>
          <Link to="/" className="text-label text-foreground hover:opacity-70">
            Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16 space-y-10">
        <div>
          <p className="text-label text-muted-foreground mb-3">Privacy</p>
          <h1 className="text-editorial-lg text-foreground mb-4">Privacy policy</h1>
          <p className="text-muted-foreground">Last updated: {PRIVACY_LAST_UPDATED}</p>
        </div>

        <Section title="Who we are">
          <p>
            FluentBridges is an online English tutoring service led by Abdul Khabeer, an English instructor based in Cairo, Egypt. This
            policy explains what information we collect through this website, why, where it is stored, and how you can ask us to correct
            or delete it.
          </p>
        </Section>

        <Section title="What we collect">
          <p>
            <strong className="font-medium">When you apply and take the placement test:</strong>
          </p>
          <List
            items={[
              "Your name, country, city, email address, WhatsApp number, and (if you give one) an alternative phone number.",
              "Your reasons for learning English, anything you tell us about your goals, and how you describe your current level.",
              "Your lesson preferences: format, whether you already have a group (for small-group lessons), how often you'd like lessons, the package you're interested in and its price at the time, your preferred payment method, and your preferred days, times, and time zone.",
              "Your placement test answers, your written response, your scores, and your estimated English level.",
              "The date and time you gave consent.",
            ]}
          />
          <p>
            <strong className="font-medium">When you use the contact form:</strong> your name, email and/or WhatsApp number, level, goals,
            and message. When you ask for pricing or a consultation, also the type of request, your country, your city or region, your
            preferred currency, and how often you'd like lessons.
          </p>
          <p>
            <strong className="font-medium">Technical information:</strong> our hosting provider processes your IP address to deliver the
            site and to limit abusive traffic. To limit repeated applications, we keep a scrambled (hashed) value derived from your IP
            address and the date for no more than two days. We don't use analytics, advertising, or tracking cookies.
          </p>
          <p>
            We never ask for card numbers, bank details, or passwords. Choosing a preferred payment method doesn't charge you or book a
            lesson.
          </p>
        </Section>

        <Section title="Why we use it">
          <List
            items={[
              "To evaluate your learning needs and estimate your English level.",
              "To recommend suitable lessons and packages and to contact you about lessons, scheduling, and payment.",
              "To prepare your lessons if you enroll.",
              "To keep the website secure and prevent abuse.",
            ]}
          />
          <p>We don't sell your information or use it for advertising.</p>
        </Section>

        <Section title="How your placement result is produced">
          <p>
            Multiple-choice answers are scored automatically to give an estimated level. Your instructor reviews your writing personally,
            and no automated or AI tool scores it. The result is an initial estimate, not an official exam result, and your instructor may
            adjust it after reviewing your writing and speaking.
          </p>
        </Section>

        <Section title="Where it is stored and who can see it">
          <List
            items={[
              <>
                Your application and test results are stored by <strong className="font-medium">Netlify, Inc.</strong>, which hosts this
                website and provides its storage (Netlify Blobs) and server functions. Contact-form messages are stored by Netlify Forms.
                Netlify is a US-based company, and your data may be stored and processed outside Egypt.
              </>,
              "Only your instructor can view applications and results, through a password-protected dashboard. Netlify processes the data only to provide its service.",
              "This site loads its fonts from Google Fonts, so Google receives your IP address when the page loads.",
              "If you choose to message us on WhatsApp, that conversation is handled by WhatsApp (Meta) under its own terms.",
              "If you later pay for lessons, the payment provider you choose (for example Vodafone Cash, PayPal, Stripe, or Wise) processes that payment under its own terms. Payments aren't made through this website.",
            ]}
          />
        </Section>

        <Section title="Information stored on your device">
          <p>
            While you fill in the enrollment form, your answers are saved in your browser so you don't lose them if the page reloads.
            After you submit, your contact details are removed from the browser. Only a private access key and your test progress are
            kept, so you can resume the test on the same device.
          </p>
          <p>
            The access key stops working {ACCESS_TTL_DAYS} days after you apply. On the results page, <em>Remove my data from this device</em> clears
            everything from your browser and switches off the access key straight away. We recommend using it on shared or public
            computers.
          </p>
        </Section>

        <Section title="How long we keep it">
          <List
            items={[
              `If you don't become a student, we delete your application, test results, and writing automatically ${Math.round(PROSPECT_RETENTION_DAYS / 30.4)} months after your last activity, unless an ongoing conversation about lessons or a legal obligation means we need to keep them longer.`,
              `If you enroll, we keep your records while you are taking lessons, and review them for deletion ${ENROLLED_REVIEW_MONTHS} months after your last lesson, unless we need some records longer for a legal or accounting reason.`,
              "Contact-form messages are reviewed and deleted at least every 12 months.",
              "You can ask us to delete your information sooner at any time (see below).",
            ]}
          />
        </Section>

        <Section title="Your choices: access, correction, and deletion">
          <p>
            You can ask us for a copy of your information, ask us to correct it, or ask us to delete it. Contact us using the details
            below. To protect your privacy, we may confirm the request from the WhatsApp number or email address you applied with. We aim
            to respond within 30 days.
          </p>
        </Section>

        <Section title="Under 18?">
          <p>
            Our lessons are designed for adults and university students. If you are under 18, please ask a parent or guardian to contact
            us before you apply.
          </p>
        </Section>

        <Section title="Contact us about privacy">
          <List
            items={[
              <>
                WhatsApp:{" "}
                <a className="underline underline-offset-2" href={`https://wa.me/${CONTACT.whatsappDigits}`} target="_blank" rel="noopener noreferrer">
                  {CONTACT.whatsappDisplay}
                </a>
              </>,
              <>
                Phone (Egypt):{" "}
                <a className="underline underline-offset-2" href={`tel:${CONTACT.egyptPhoneE164}`}>
                  {CONTACT.egyptPhoneDisplay}
                </a>
              </>,
              <>
                The{" "}
                <a className="underline underline-offset-2" href="/#contact">
                  contact form
                </a>{" "}
                on our website.
              </>,
            ]}
          />
        </Section>

        <Section title="Changes to this policy">
          <p>If we change how we handle your information, we'll update this page and the date at the top.</p>
        </Section>
      </main>
    </div>
  );
};

export default Privacy;

import AnimatedSection from "./AnimatedSection";

const plans = [
  {
    label: "Trial",
    title: "Trial Lesson",
    price: "300",
    unit: "EGP",
    duration: "30 minutes",
    description: "A relaxed first session to assess your level, discuss your goals, and see if we're a good fit.",
    features: [
      "Level assessment",
      "Personalized learning plan",
      "No commitment required",
    ],
    cta: "Book a Trial",
    highlight: false,
  },
  {
    label: "Standard",
    title: "Single Lesson",
    price: "800",
    unit: "EGP",
    duration: "60 minutes",
    description: "One-on-one instruction tailored to your goals. Flexible scheduling, no package required.",
    features: [
      "Fully personalized lesson",
      "Written feedback after each session",
      "Homework & resources included",
    ],
    cta: "Book a Lesson",
    highlight: false,
  },
  {
    label: "Most Popular",
    title: "8-Lesson Package",
    price: "4,800",
    unit: "EGP",
    duration: "600 EGP per lesson",
    description: "Consistent weekly practice for real, measurable progress. Best for most learners.",
    features: [
      "Save 200 EGP per lesson",
      "Priority scheduling",
      "Monthly progress review",
      "WhatsApp support between lessons",
    ],
    cta: "Get Started",
    highlight: true,
  },
  {
    label: "Best Value",
    title: "12-Lesson Package",
    price: "6,600",
    unit: "EGP",
    duration: "550 EGP per lesson",
    description: "Maximum commitment, maximum results. Ideal for professionals with a specific deadline or exam.",
    features: [
      "Save 250 EGP per lesson",
      "Priority scheduling",
      "Monthly progress review",
      "WhatsApp support between lessons",
      "One free make-up lesson",
    ],
    cta: "Get Started",
    highlight: false,
  },
];

const addons = [
  {
    title: "Business English Coaching",
    price: "900 EGP / session",
    description:
      "Targeted coaching for professionals. Covers job interview prep, presentation skills, business communication, and workplace English.",
  },
  {
    title: "4-Lesson Package",
    price: "2,600 EGP",
    description:
      "650 EGP per lesson. A lighter commitment — ideal if you want to try a package before going all-in.",
  },
  {
    title: "Small Group Lessons",
    price: "300 EGP / student",
    description:
      "Groups of 3–5 students. Practice English in a social setting at a fraction of the 1-on-1 rate. Contact me to arrange.",
  },
];

const payment = [
  "Vodafone Cash",
  "PayPal",
  "Stripe",
  "Wise (international students)",
];

const PricingSection = () => (
  <section id="pricing" className="section-padding bg-background">
    <div className="container-editorial">

      {/* Header */}
      <AnimatedSection>
        <p className="text-label text-muted-foreground mb-4">Pricing</p>
        <h2 className="text-editorial-lg text-foreground mb-4 max-w-2xl">
          Transparent pricing. No surprises.
        </h2>
        <p className="text-body-lg text-muted-foreground max-w-xl mb-16">
          All lessons are live, 1-on-1, and fully personalized. Packages are valid for 30 days from purchase.
        </p>
      </AnimatedSection>

      {/* Main Plans */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {plans.map((plan, i) => (
          <AnimatedSection key={plan.title} delay={i * 0.1}>
            <div
              className={`h-full flex flex-col p-8 border transition-all duration-500 ${
                plan.highlight
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border hover:border-navy/30 hover:shadow-md"
              }`}
            >
              {/* Label */}
              <p
                className={`text-label mb-4 ${
                  plan.highlight ? "text-background/60" : "text-muted-foreground"
                }`}
              >
                {plan.label}
              </p>

              {/* Title */}
              <h3
                className={`font-serif text-xl font-normal mb-2 ${
                  plan.highlight ? "text-background" : "text-foreground"
                }`}
              >
                {plan.title}
              </h3>

              {/* Price */}
              <div className="mb-1">
                <span
                  className={`font-serif text-4xl font-light ${
                    plan.highlight ? "text-background" : "text-foreground"
                  }`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm ml-1 ${
                    plan.highlight ? "text-background/70" : "text-muted-foreground"
                  }`}
                >
                  {plan.unit}
                </span>
              </div>
              <p
                className={`text-xs mb-6 ${
                  plan.highlight ? "text-background/60" : "text-muted-foreground"
                }`}
              >
                {plan.duration}
              </p>

              {/* Description */}
              <p
                className={`text-sm leading-relaxed mb-6 ${
                  plan.highlight ? "text-background/80" : "text-muted-foreground"
                }`}
              >
                {plan.description}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className={`text-sm flex items-start gap-2 ${
                      plan.highlight ? "text-background/80" : "text-muted-foreground"
                    }`}
                  >
                    <span className={`mt-0.5 ${plan.highlight ? "text-background/50" : "text-navy/50"}`}>—</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href="#contact"
                className={`text-label text-center py-3 px-6 transition-colors ${
                  plan.highlight
                    ? "bg-background text-foreground hover:bg-sand"
                    : "bg-foreground text-background hover:bg-navy"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          </AnimatedSection>
        ))}
      </div>

      {/* Add-ons */}
      <AnimatedSection>
        <p className="text-label text-muted-foreground mb-8">Additional Options</p>
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {addons.map((addon, i) => (
            <div
              key={addon.title}
              className="p-8 bg-secondary border border-border hover:border-navy/20 transition-all duration-300"
            >
              <h3 className="font-serif text-lg font-normal text-foreground mb-2">
                {addon.title}
              </h3>
              <p className="text-label text-navy mb-4">{addon.price}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {addon.description}
              </p>
            </div>
          ))}
        </div>
      </AnimatedSection>

      {/* Payment + Note */}
      <AnimatedSection>
        <div className="grid md:grid-cols-2 gap-12 pt-12 border-t border-border">
          <div>
            <p className="text-label text-muted-foreground mb-4">Payment Methods</p>
            <ul className="space-y-2">
              {payment.map((p) => (
                <li key={p} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="text-navy/40">—</span> {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-label text-muted-foreground mb-4">Good to Know</p>
            <ul className="space-y-2">
              {[
                "Packages are valid for 30 days from purchase",
                "24-hour cancellation policy",
                "Lessons conducted via Zoom or Google Meet",
                "All levels welcome, from beginner to advanced",
              ].map((note) => (
                <li key={note} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-navy/40 mt-0.5">—</span> {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AnimatedSection>

    </div>
  </section>
);

export default PricingSection;
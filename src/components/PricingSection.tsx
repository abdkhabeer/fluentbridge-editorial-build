import AnimatedSection from "./AnimatedSection";

type Plan = {
  label: string;
  title: string;
  price: string;
  unit: string;
  duration: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

type Track = {
  id: string;
  heading: string;
  blurb: string;
  plans: Plan[];
};

const tracks: Track[] = [
  {
    id: "student",
    heading: "Egyptian Student & General English",
    blurb:
      "Affordable one-on-one coaching for Egyptian students and anyone building everyday fluency and confidence.",
    plans: [
      {
        label: "Student Rate",
        title: "Single Lesson",
        price: "200",
        unit: "EGP",
        duration: "60 minutes",
        description: "One-on-one instruction tailored to your goals. No package required.",
        features: ["Fully personalized lesson", "Feedback after each session"],
        cta: "Book a Lesson",
        highlight: false,
      },
      {
        label: "Most Popular",
        title: "8 Lessons",
        price: "1,500",
        unit: "EGP",
        duration: "187.50 EGP per lesson",
        description: "Consistent weekly practice for real, measurable progress.",
        features: ["Save 100 EGP", "Priority scheduling", "Monthly progress review"],
        cta: "Get Started",
        highlight: true,
      },
      {
        label: "Best Value",
        title: "12 Lessons",
        price: "2,200",
        unit: "EGP",
        duration: "≈ 183.33 EGP per lesson",
        description: "Long-term practice at the lowest per-lesson rate.",
        features: ["Save 200 EGP", "Priority scheduling", "One free make-up lesson"],
        cta: "Get Started",
        highlight: false,
      },
    ],
  },
  {
    id: "group",
    heading: "Small Group English",
    blurb:
      "Groups of 2–4 students. All prices below are per student, not per group. Each student pays their own rate.",
    plans: [
      {
        label: "2–4 Students",
        title: "Single Lesson",
        price: "150",
        unit: "EGP per student",
        duration: "60 minutes · 2–4 students per group",
        description: "Practice English in a social setting at the most affordable rate.",
        features: ["150 EGP per student", "Shared speaking practice"],
        cta: "Arrange a Group",
        highlight: false,
      },
      {
        label: "Most Popular",
        title: "8 Lessons",
        price: "1,100",
        unit: "EGP per student",
        duration: "137.50 EGP per lesson, per student",
        description: "A steady weekly rhythm for a study group, colleagues, or friends.",
        features: ["Save 100 EGP per student", "Priority scheduling", "Monthly progress review"],
        cta: "Arrange a Group",
        highlight: true,
      },
      {
        label: "Best Value",
        title: "12 Lessons",
        price: "1,500",
        unit: "EGP per student",
        duration: "125 EGP per lesson, per student",
        description: "The lowest per-lesson rate offered by Fluent Bridges.",
        features: ["Save 300 EGP per student", "Priority scheduling", "One free make-up lesson"],
        cta: "Arrange a Group",
        highlight: false,
      },
    ],
  },
  {
    id: "professional",
    heading: "Professional English",
    blurb:
      "For career development, workplace communication, interviews, presentations, and meetings.",
    plans: [
      {
        label: "Professional",
        title: "Single Lesson",
        price: "500",
        unit: "EGP",
        duration: "60 minutes",
        description: "Focused coaching built around your role and your career goals.",
        features: ["Industry-specific vocabulary", "Real materials from your work"],
        cta: "Book a Lesson",
        highlight: false,
      },
      {
        label: "Most Popular",
        title: "8 Lessons",
        price: "3,600",
        unit: "EGP",
        duration: "450 EGP per lesson",
        description: "A focused block to sharpen how you speak and write at work.",
        features: ["Save 400 EGP", "Interview & presentation prep", "Priority scheduling"],
        cta: "Get Started",
        highlight: true,
      },
      {
        label: "Best Value",
        title: "12 Lessons",
        price: "5,100",
        unit: "EGP",
        duration: "425 EGP per lesson",
        description: "Built around a specific role, deadline, or promotion.",
        features: ["Save 900 EGP", "Fully customized curriculum", "One free make-up lesson"],
        cta: "Get Started",
        highlight: false,
      },
    ],
  },
  {
    id: "business",
    heading: "Business English",
    blurb:
      "The premium offering, for executives, entrepreneurs, managers, and teams who need advanced English for business.",
    plans: [
      {
        label: "Premium",
        title: "Single Lesson",
        price: "900",
        unit: "EGP",
        duration: "60 minutes",
        description: "Advanced business communication, negotiation, and executive presence.",
        features: ["Tailored to your company", "Feedback after each session"],
        cta: "Enquire",
        highlight: false,
      },
      {
        label: "Most Popular",
        title: "8 Lessons",
        price: "6,800",
        unit: "EGP",
        duration: "850 EGP per lesson",
        description: "High-intensity coaching for meetings, pitches, and negotiations.",
        features: ["Save 400 EGP", "Priority scheduling", "Monthly progress review"],
        cta: "Enquire",
        highlight: true,
      },
      {
        label: "Best Value",
        title: "12 Lessons",
        price: "9,600",
        unit: "EGP",
        duration: "800 EGP per lesson",
        description: "A full programme for sustained executive-level communication.",
        features: ["Save 1,200 EGP", "Fully customized curriculum", "One free make-up lesson"],
        cta: "Enquire",
        highlight: false,
      },
    ],
  },
];

const addons = [
  {
    title: "Trial Lesson",
    price: "100 EGP / 30 minutes",
    description:
      "A relaxed 30-minute first session to assess your level and discuss your goals, not a full 60-minute lesson. The 100 EGP fee is credited toward your first 8- or 12-lesson package if you enroll.",
  },
];

const payment = [
  "Vodafone Cash",
  "PayPal",
  "Stripe",
  "Wise (international students)",
];

const PlanCard = ({ plan }: { plan: Plan }) => (
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
          <span className={`mt-0.5 ${plan.highlight ? "text-background/50" : "text-navy/50"}`}>–</span>
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
);

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
          All lessons are live and fully personalized. Rates depend on the kind of coaching
          you need: small group, Egyptian student and General English, Professional, or
          Business English. Packages are valid for 30 days from purchase.
        </p>
      </AnimatedSection>

      {/* Tracks */}
      {tracks.map((track) => (
        <div key={track.id}>
          <AnimatedSection>
            <div className="mb-8">
              <h3 className="font-serif text-2xl font-normal text-foreground mb-2">
                {track.heading}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl">{track.blurb}</p>
            </div>
          </AnimatedSection>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {track.plans.map((plan, i) => (
              <AnimatedSection key={`${track.id}-${plan.title}`} delay={i * 0.1}>
                <PlanCard plan={plan} />
              </AnimatedSection>
            ))}
          </div>
        </div>
      ))}

      {/* Add-ons */}
      <AnimatedSection>
        <p className="text-label text-muted-foreground mb-8">Additional Options</p>
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {addons.map((addon) => (
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
                  <span className="text-navy/40">–</span> {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-label text-muted-foreground mb-4">Good to Know</p>
            <ul className="space-y-2">
              {[
                "Packages are valid for 30 days from purchase",
                "Trial lessons are 30 minutes, not a full 60-minute lesson",
                "The 100 EGP trial fee is credited toward your first 8- or 12-lesson package",
                "Small group rates are per student, for groups of 2–4",
                "24-hour cancellation policy",
                "Lessons conducted via Zoom or Google Meet",
                "All levels welcome, from beginner to advanced",
              ].map((note) => (
                <li key={note} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-navy/40 mt-0.5">–</span> {note}
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

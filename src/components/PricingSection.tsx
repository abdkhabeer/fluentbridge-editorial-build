import { Link } from "react-router-dom";
import AnimatedSection from "./AnimatedSection";
import { tracks, trialLesson, paymentMethodsDisplay, type Plan } from "@/data/pricing";

const addons = [trialLesson];
const payment = paymentMethodsDisplay;

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
    <Link
      to={`/enroll?package=${plan.id}`}
      className={`text-label text-center py-3 px-6 transition-colors ${
        plan.highlight
          ? "bg-background text-foreground hover:bg-sand"
          : "bg-foreground text-background hover:bg-navy"
      }`}
    >
      {plan.cta}
    </Link>
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
        <p className="text-body-lg text-muted-foreground max-w-xl mb-4">
          All lessons are live and fully personalized. Rates depend on the kind of coaching
          you need: small group, Egyptian student and General English, Professional, or
          Business English. Packages are valid for 30 days from purchase.
        </p>
        <p className="text-sm text-muted-foreground max-w-xl mb-16">
          Choosing a package opens a short enrollment form and a free placement test. You won't be charged, and nothing is booked
          until you confirm with your instructor.
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

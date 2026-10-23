import { useState } from "react";
import { Link } from "react-router-dom";
import AnimatedSection from "./AnimatedSection";
import {
  DEFAULT_REGION,
  displayAmount,
  foundingRateLabel,
  getRegion,
  isRegionId,
  pricingRegions,
  regionForLocation,
  type Inquiry,
  type Plan,
  type RegionId,
} from "@/data/pricing";
import { ENROLLMENT_STORAGE_KEY } from "@/lib/enrollment/storageKey";
import { LOCAL_STORAGE_KEYS } from "@/lib/browserStorage";

const LOCATION_KEY = LOCAL_STORAGE_KEYS.pricingLocation;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** The visitor's last choice, else the location on an enrollment form in progress here, else Cairo. Never guessed from IP. */
const initialRegion = (): RegionId => {
  try {
    const saved = localStorage.getItem(LOCATION_KEY);
    if (isRegionId(saved)) return saved;
    const draft = JSON.parse(localStorage.getItem(ENROLLMENT_STORAGE_KEY) ?? "{}")?.draft ?? {};
    const country = draft.country === "Other" ? draft.country_other : draft.country;
    if (typeof country === "string" && country) return regionForLocation(country, typeof draft.city === "string" ? draft.city : "");
  } catch {
    /* storage unavailable or unreadable */
  }
  return DEFAULT_REGION;
};

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
    <h5
      className={`font-serif text-xl font-normal mb-2 ${
        plan.highlight ? "text-background" : "text-foreground"
      }`}
    >
      {plan.title}
    </h5>

    {/* Price */}
    <div className="mb-1">
      <span
        className={`font-serif text-4xl font-light ${
          plan.highlight ? "text-background" : "text-foreground"
        }`}
      >
        {displayAmount(plan)}
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
      className={`text-label text-center py-3 px-6 transition-colors ${focusRing} ${
        plan.highlight
          ? "bg-background text-foreground hover:bg-sand"
          : "bg-foreground text-background hover:bg-navy"
      }`}
    >
      {plan.cta}
    </Link>
  </div>
);

const InquiryCard = ({ inquiry }: { inquiry: Inquiry }) => (
  <div className="bg-foreground text-background p-8 md:p-12 mb-16 max-w-3xl">
    <h4 className="font-serif text-2xl md:text-3xl font-light leading-snug mb-4">{inquiry.heading}</h4>
    <p className="text-background/80 leading-relaxed mb-8 max-w-xl">{inquiry.body}</p>
    <Link
      to={{ pathname: "/", search: `?inquiry=${inquiry.type}`, hash: "#contact" }}
      className={`inline-block text-label text-center py-3 px-8 bg-background text-foreground hover:bg-sand transition-colors ${focusRing} focus-visible:ring-background focus-visible:ring-offset-foreground`}
    >
      {inquiry.cta}
    </Link>
  </div>
);

const LocationSelector = ({ value, onChange }: { value: RegionId; onChange: (id: RegionId) => void }) => (
  <fieldset className="mb-12 min-w-0">
    <legend className="text-label text-muted-foreground mb-4">Where are you based?</legend>
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
      {pricingRegions.map((r) => (
        <label key={r.id} className="cursor-pointer">
          <input
            type="radio"
            name="pricing-location"
            value={r.id}
            checked={value === r.id}
            onChange={() => onChange(r.id)}
            className="peer sr-only"
          />
          <span className="flex h-full items-center justify-center text-center px-4 py-2.5 text-sm border border-border bg-card text-foreground transition-colors hover:border-navy/40 peer-checked:bg-foreground peer-checked:text-background peer-checked:border-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-navy peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background">
            {r.label}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);

const PricingSection = () => {
  const [regionId, setRegionId] = useState<RegionId>(initialRegion);
  const region = getRegion(regionId);
  const foundingRate = foundingRateLabel(region.foundingRate);

  const choose = (id: RegionId) => {
    setRegionId(id);
    try {
      localStorage.setItem(LOCATION_KEY, id);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <section id="pricing" className="section-padding bg-background">
      <div className="container-editorial">

        {/* Header */}
        <AnimatedSection>
          <p className="text-label text-muted-foreground mb-4">Pricing</p>
          <h2 className="text-editorial-lg text-foreground mb-4 max-w-2xl">
            Transparent pricing. No surprises.
          </h2>
          <p className="text-body-lg text-muted-foreground max-w-xl mb-4">
            All lessons are live and fully personalized. Prices depend on where you're based, so
            choose your location to see the rates and currency that apply to you.
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mb-12">
            Choosing a package opens a short enrollment form and a free placement test. You won't be charged, and nothing is booked
            until you confirm with your instructor.
          </p>
        </AnimatedSection>

        {/* Location and prices. Switching location swaps the content without animation. */}
        <AnimatedSection>
          <LocationSelector value={regionId} onChange={choose} />
          <p className="sr-only" aria-live="polite">
            {region.currency ? `Showing prices for ${region.label} in ${region.currency}.` : `Showing pricing options for ${region.label}.`}
          </p>

          <div className="mb-10 max-w-2xl">
            <h3 className="font-serif text-3xl font-normal text-foreground mb-3">{region.heading}</h3>
            <p className="text-sm text-muted-foreground">{region.intro}</p>
            {region.currency && <p className="text-label text-navy mt-4">Prices in {region.currency}</p>}
          </div>

          {region.tracks.length === 0 && <InquiryCard inquiry={region.inquiry} />}

          {region.tracks.map((track) => (
            <div key={track.id}>
              <div className="mb-8">
                <h4 className="font-serif text-2xl font-normal text-foreground mb-2">
                  {track.heading}
                </h4>
                <p className="text-sm text-muted-foreground max-w-xl">{track.blurb}</p>
              </div>
              <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 ${foundingRate ? "mb-6" : "mb-16"}`}>
                {track.plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
              {foundingRate && <p className="text-label text-navy mb-16">{foundingRate}</p>}
            </div>
          ))}

          {/* Add-ons */}
          {region.trial && (
            <>
              <p className="text-label text-muted-foreground mb-8">Additional Options</p>
              <div className="grid md:grid-cols-2 gap-6 mb-16">
                <div className="p-8 bg-secondary border border-border hover:border-navy/20 transition-all duration-300">
                  <h4 className="font-serif text-lg font-normal text-foreground mb-2">
                    {region.trial.title}
                  </h4>
                  <p className="text-label text-navy mb-4">{region.trial.price}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {region.trial.description}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Payment + Note */}
          <div className="grid md:grid-cols-2 gap-12 pt-12 border-t border-border">
            {region.paymentMethods.length > 0 && (
              <div>
                <p className="text-label text-muted-foreground mb-4">Payment Methods</p>
                <ul className="space-y-2">
                  {region.paymentMethods.map((p) => (
                    <li key={p} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="text-navy/40">–</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="text-label text-muted-foreground mb-4">Good to Know</p>
              <ul className="space-y-2">
                {region.notes.map((note) => (
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
};

export default PricingSection;

import { Link } from "react-router-dom";
import AnimatedSection from "./AnimatedSection";
import { track } from "@/lib/analytics/client";

const CTASection = () => (
  <section className="section-padding bg-primary">
    <div className="container-editorial text-center max-w-3xl">
      <AnimatedSection>
        <h2 className="text-editorial-lg text-primary-foreground mb-6">
          Take the next step toward confident English.
        </h2>
      </AnimatedSection>
      <AnimatedSection delay={0.15}>
        <p className="text-body-lg text-primary-foreground/75 mb-10 max-w-xl mx-auto">
          Start with a 30-minute trial lesson. The fee is credited toward your first package if you enroll.
        </p>
      </AnimatedSection>
      <AnimatedSection delay={0.25}>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#contact"
            onClick={() => track("trial_cta_clicked", { location: "cta_section" })}
            className="inline-block text-label px-10 py-4 bg-warm-white text-charcoal hover:bg-sand transition-colors"
          >
            Book Your Trial Lesson
          </a>
          <Link
            to="/enroll"
            className="inline-block text-label px-10 py-4 border border-warm-white text-warm-white hover:bg-warm-white/10 transition-colors"
          >
            Find Your Level
          </Link>
        </div>
        <p className="mt-6 text-sm text-primary-foreground/60">
          A free placement test with your personalized learning priorities, in about 25 minutes.
        </p>
      </AnimatedSection>
    </div>
  </section>
);

export default CTASection;

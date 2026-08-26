import AnimatedSection from "./AnimatedSection";

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
          Start with a 30-minute trial lesson for 100 EGP — credited toward your first 8- or 12-lesson package if you enroll.
        </p>
      </AnimatedSection>
      <AnimatedSection delay={0.25}>
        <a
          href="#contact"
          className="inline-block text-label px-10 py-4 bg-warm-white text-charcoal hover:bg-sand transition-colors"
        >
          Book Your Trial Lesson
        </a>
      </AnimatedSection>
    </div>
  </section>
);

export default CTASection;

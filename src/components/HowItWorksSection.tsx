import AnimatedSection from "./AnimatedSection";

const steps = [
  { num: "01", title: "Book a Trial Lesson" },
  { num: "02", title: "Discuss Your Goals" },
  { num: "03", title: "Start Personalized Lessons" },
  { num: "04", title: "Build Confidence & Fluency" },
];

const HowItWorksSection = () => (
  <section className="section-padding bg-background">
    <div className="container-editorial">
      <AnimatedSection>
        <p className="text-label text-muted-foreground mb-4 text-center">How It Works</p>
        <h2 className="text-editorial-lg text-foreground mb-20 text-center">
          Four simple steps.
        </h2>
      </AnimatedSection>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-6">
        {steps.map((step, i) => (
          <AnimatedSection key={step.num} delay={i * 0.1} className="text-center">
            <span className="font-serif text-6xl text-navy/20 block mb-4">{step.num}</span>
            <h3 className="font-serif text-xl text-foreground">{step.title}</h3>
          </AnimatedSection>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;

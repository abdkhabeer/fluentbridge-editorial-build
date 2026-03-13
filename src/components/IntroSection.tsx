import AnimatedSection from "./AnimatedSection";

const IntroSection = () => (
  <section id="intro" className="section-padding bg-background">
    <div className="container-editorial max-w-4xl text-center">
      <AnimatedSection>
        <h2 className="text-editorial-lg text-foreground mb-8">
          English learning with a clear path forward.
        </h2>
      </AnimatedSection>
      <AnimatedSection delay={0.15}>
        <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
          FluentBridge offers personalized English coaching for adults who want to communicate clearly and confidently in real-life situations. Lessons focus on practical speaking, listening, and real-world communication.
        </p>
      </AnimatedSection>
    </div>
  </section>
);

export default IntroSection;

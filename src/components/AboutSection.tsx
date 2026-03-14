import AnimatedSection from "./AnimatedSection";

const AboutSection = () => (
  <section id="about" className="section-padding bg-secondary">
    <div className="container-editorial">
      <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-center">
      <AnimatedSection>
  <div className="aspect-[4/5] overflow-hidden">
    <img
      src="/Instructor.jpg"
      alt="FluentBridges instructor"
      className="w-full h-full object-cover"
    />
  </div>
</AnimatedSection>
        <AnimatedSection delay={0.2}>
          <p className="text-label text-muted-foreground mb-4">About</p>
          <h2 className="text-editorial-lg text-foreground mb-8">
            Meet your instructor.
          </h2>
          <div className="space-y-6">
            <p className="text-body-lg text-muted-foreground">
              Fluent Bridges is led by Abdul Khabeer, a CELTA-certified English instructor based in Cairo who works with adult learners and professionals seeking practical communication skills.
            </p>
            <p className="text-body-lg text-muted-foreground">
              Lessons focus on building confidence, clarity, and real-world fluency, not memorizing textbooks.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  </section>
);

export default AboutSection;

import AnimatedSection from "./AnimatedSection";

// The photo is 259×452. It's shown uncropped and no larger than ~300px wide,
// so the small original stays sharp; width/height reserve its space while it loads.
const AboutSection = () => (
  <section id="about" className="section-padding bg-secondary">
    <div className="container-editorial">
      <div className="grid md:grid-cols-[minmax(0,300px)_1fr] gap-12 md:gap-16 lg:gap-24 items-center">
        <AnimatedSection>
          <div className="w-full max-w-[300px] border border-border bg-background">
            <img
              src="/fluentbridges-instructor.jpg"
              alt="Abdul Khabeer, Fluent Bridges English coach"
              width={259}
              height={452}
              loading="lazy"
              decoding="async"
              className="block w-full h-auto aspect-[259/452] object-contain"
            />
          </div>
        </AnimatedSection>
        <AnimatedSection delay={0.2}>
          <p className="text-label text-muted-foreground mb-4">About</p>
          <h2 className="text-editorial-lg text-foreground mb-4">
            Meet Your English Coach
          </h2>
          <p className="text-label text-navy mb-8">CELTA-Certified English Teacher</p>
          <div className="space-y-6">
            <p className="text-body-lg text-muted-foreground">
              Learn English with personalized, one-on-one lessons designed around your goals. Whether you want to improve your
              speaking confidence, communicate more effectively at work, or build stronger everyday English skills, your lessons will
              focus on helping you make practical progress.
            </p>
            <p className="text-body-lg text-muted-foreground">
              Fluent Bridges is led by Abdul Khabeer, a CELTA-certified English instructor based in Cairo who works with adult learners and professionals seeking practical communication skills.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  </section>
);

export default AboutSection;

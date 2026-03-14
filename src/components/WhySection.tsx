import { Award, User, Globe, MonitorSmartphone } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const features = [
  { icon: Award, title: "CELTA-Certified Instruction", description: "Internationally recognized teaching certification ensuring quality methodology." },
  { icon: User, title: "Personalized Learning", description: "Every lesson is tailored to your specific goals, level, and interests." },
  { icon: Globe, title: "Real Communication Focus", description: "Practice English the way it's used in real conversations and professional settings." },
  { icon: MonitorSmartphone, title: "Flexible Online Lessons", description: "Learn from anywhere with convenient scheduling that fits your busy life." },
];

const WhySection = () => (
  <section className="section-padding bg-background">
    <div className="container-editorial">
      <AnimatedSection>
        <p className="text-label text-muted-foreground mb-4 text-center">Why FluentBridges?</p>
        <h2 className="text-editorial-lg text-foreground mb-20 text-center max-w-2xl mx-auto">
          A thoughtful approach to English learning.
        </h2>
      </AnimatedSection>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
        {features.map((f, i) => (
          <AnimatedSection key={f.title} delay={i * 0.1} className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-secondary mb-6">
              <f.icon size={24} className="text-navy" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-xl text-foreground mb-3">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
          </AnimatedSection>
        ))}
      </div>
    </div>
  </section>
);

export default WhySection;

import { BookOpen, MessageCircle, Briefcase, UserCheck } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const services = [
  {
    icon: BookOpen,
    title: "1-on-1 English Lessons",
    description: "Personalized lessons designed around your goals and learning style.",
  },
  {
    icon: MessageCircle,
    title: "Conversational English Practice",
    description: "Build fluency through structured speaking practice.",
  },
  {
    icon: Briefcase,
    title: "Business English Coaching",
    description: "Improve professional communication for meetings, interviews, and workplace discussions.",
  },
  {
    icon: UserCheck,
    title: "Interview Preparation",
    description: "Prepare for job interviews and important conversations.",
  },
];

const ServicesSection = () => (
  <section id="services" className="section-padding bg-secondary">
    <div className="container-editorial">
      <AnimatedSection>
        <p className="text-label text-muted-foreground mb-4">What I Offer</p>
        <h2 className="text-editorial-lg text-foreground mb-16 max-w-2xl">
          Lessons designed for how you actually use English.
        </h2>
      </AnimatedSection>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {services.map((service, i) => (
          <AnimatedSection key={service.title} delay={i * 0.1}>
            <div className="group p-8 lg:p-10 bg-background border border-border hover:border-navy/20 transition-all duration-500 hover:shadow-lg">
              <service.icon
                size={28}
                className="text-navy mb-6 transition-transform duration-500 group-hover:scale-110"
                strokeWidth={1.5}
              />
              <h3 className="text-editorial-md text-foreground mb-3">{service.title}</h3>
              <p className="text-body-lg text-muted-foreground">{service.description}</p>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  </section>
);

export default ServicesSection;

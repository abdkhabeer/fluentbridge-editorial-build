import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AnimatedSection from "./AnimatedSection";

const faqs = [
  {
    q: "Who are lessons for?",
    a: "Lessons are designed for adults and professionals, university graduates, entrepreneurs, career-focused individuals, and anyone seeking to improve their English communication skills.",
  },
  {
    q: "Are lessons online?",
    a: "Yes, all lessons are conducted online via Zoom or Google Meet. This allows flexible scheduling and learning from anywhere.",
  },
  {
    q: "Do you teach beginners?",
    a: "I primarily work with intermediate to advanced learners who want to refine their fluency and confidence. If you have basic English foundations, we can discuss whether my approach is right for you.",
  },
  {
    q: "How long are lessons?",
    a: "Standard lessons are 60 minutes. Trial lessons are 30 minutes so we can discuss your goals and see if we're a good fit.",
  },
  {
    q: "How do I book a trial lesson?",
    a: "Simply fill out the contact form below or send a message via WhatsApp. I'll respond within 24 hours to schedule your trial.",
  },
];

const FAQSection = () => (
  <section id="faq" className="section-padding bg-background">
    <div className="container-editorial max-w-3xl">
      <AnimatedSection>
        <p className="text-label text-muted-foreground mb-4 text-center">FAQ</p>
        <h2 className="text-editorial-lg text-foreground mb-16 text-center">
          Common questions.
        </h2>
      </AnimatedSection>

      <AnimatedSection delay={0.15}>
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border border-border px-6 py-2 bg-background data-[state=open]:bg-secondary transition-colors"
            >
              <AccordionTrigger className="font-serif text-lg text-foreground hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </AnimatedSection>
    </div>
  </section>
);

export default FAQSection;

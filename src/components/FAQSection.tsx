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
    a: "Lessons are designed for students, adults, professionals, entrepreneurs, and anyone seeking to improve their English communication skills. There are four options: Small Group English for groups of 2–4 students, Egyptian Student and General English for everyday fluency, Professional English for career development, and Business English for advanced business communication.",
  },
  {
    q: "How is pricing structured?",
    a: "Each option is priced separately. Small Group English is 150 EGP per student per lesson, Egyptian Student and General English is 200 EGP per lesson, Professional English is 500 EGP per lesson, and Business English is 900 EGP per lesson. Every option offers 8- and 12-lesson packages at a lower effective rate. A 30-minute trial lesson is 100 EGP, credited toward your first 8- or 12-lesson package if you enroll.",
  },
  {
    q: "Do you offer group lessons?",
    a: "Yes. Small Group English runs with 2–4 students per group at 150 EGP per student, per lesson — each student pays their own rate. It is the most affordable way to practice, and works well for classmates, colleagues, or friends studying together.",
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
    a: "Standard lessons are 60 minutes. A trial lesson is a shorter 30-minute session — not a full lesson — so we can assess your level and discuss your goals.",
  },
  {
    q: "How do I book a trial lesson?",
    a: "Simply fill out the contact form below or send a message via WhatsApp. I'll respond within 24 hours to schedule your trial. The trial is 100 EGP for 30 minutes, and that fee is credited toward your first 8- or 12-lesson package if you decide to enroll.",
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

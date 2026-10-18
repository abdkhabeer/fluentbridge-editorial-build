import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AnimatedSection from "./AnimatedSection";
import { BILLING_PERIOD_WEEKS, REGION_WHERE, findPlan, formatMoney, pricingRegions, trialLesson, type Plan } from "@/data/pricing";

// Prices in answers come from src/data/pricing.ts so they always match the pricing section.
const money = (p: Plan) => formatMoney(p.amount, p.currency);
const plan = (id: string) => findPlan(id)!.plan;
const trial = formatMoney(trialLesson.amount, trialLesson.currency);

const monthlyRegions = pricingRegions.filter((r) => r.tracks.some((t) => t.plans.some((p) => p.billing === "monthly")));
const quotedRegions = pricingRegions.filter((r) => r.tracks.length === 0);
const joinOr = (parts: string[]) => (parts.length > 1 ? `${parts.slice(0, -1).join(", ")}, or ${parts[parts.length - 1]}` : parts[0] ?? "");

const pricingAnswer = [
  `Prices depend on where you live. For students in Cairo, each option is priced separately: Small Group English is ${money(plan("group-single"))} per student per lesson, Egyptian Student and General English is ${money(plan("student-single"))} per lesson, Professional English is ${money(plan("professional-single"))} per lesson, and Business English is ${money(plan("business-single"))} per lesson. Every option offers 8- and 12-lesson packages at a lower effective rate, and a 30-minute trial lesson is ${trial}, credited toward your first 8- or 12-lesson package if you enroll.`,
  ...monthlyRegions.map((r) => {
    const [single, three, five] = r.tracks[0].plans;
    return `For students ${REGION_WHERE[r.id]}, single lessons are ${money(single)}, and monthly plans are ${money(three)} (${three.classesPerWeek} classes per week) or ${money(five)} (${five.classesPerWeek} classes per week).`;
  }),
  monthlyRegions.length ? `Monthly plans include ${3 * BILLING_PERIOD_WEEKS} or ${5 * BILLING_PERIOD_WEEKS} classes in each ${BILLING_PERIOD_WEEKS}-week billing period.` : "",
  quotedRegions.length ? `Students ${joinOr(quotedRegions.map((r) => REGION_WHERE[r.id]))} can contact us for pricing in their currency.` : "",
]
  .filter(Boolean)
  .join(" ");

const faqs = [
  {
    q: "Who are lessons for?",
    a: "Lessons are designed for students, adults, professionals, entrepreneurs, and anyone seeking to improve their English communication skills. There are four options: Small Group English for groups of 2–4 students, Egyptian Student and General English for everyday fluency, Professional English for career development, and Business English for advanced business communication.",
  },
  {
    q: "How is pricing structured?",
    a: pricingAnswer,
  },
  {
    q: "Do you offer group lessons?",
    a: `Yes. For students in Cairo, Small Group English runs with 2–4 students per group at ${money(plan("group-single"))} per student, per lesson. Each student pays their own rate. It is the most affordable way to practice, and works well for classmates, colleagues, or friends studying together. Students elsewhere can ask about group lessons when they contact us.`,
  },
  {
    q: "Are lessons online?",
    a: "Yes, all lessons are conducted online via Zoom or Google Meet. This allows flexible scheduling and learning from anywhere.",
  },
  {
    q: "Do you teach beginners?",
    a: "Yes. Most of my students are intermediate to advanced learners refining their fluency and confidence, but beginners are welcome too. Take the free placement test and I'll recommend the right starting point and lesson plan for your level.",
  },
  {
    q: "How long are lessons?",
    a: "Standard lessons are 60 minutes. A trial lesson is a shorter 30-minute session, not a full lesson, so we can assess your level and discuss your goals.",
  },
  {
    q: "How do I book a trial lesson?",
    a: `Simply fill out the contact form below or send a message via WhatsApp. I'll respond within 24 hours to schedule your trial. For students in Cairo, the trial is ${trial} for ${trialLesson.minutes} minutes, and that fee is credited toward your first 8- or 12-lesson package if you decide to enroll. Students elsewhere can ask about a trial lesson when they contact us.`,
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

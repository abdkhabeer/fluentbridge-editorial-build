import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import AnimatedSection from "./AnimatedSection";
import { REGION_WHERE, findPlan, formatMoney, pricingRegions, type Plan } from "@/data/pricing";

// Prices in answers come from src/data/pricing.ts so they always match the pricing section.
const money = (p: Plan) => formatMoney(p.amount, p.currency);
const plan = (id: string) => findPlan(id)!.plan;
const cairo = pricingRegions.find((r) => r.id === "cairo")!;

const planRegions = pricingRegions.filter((r) => r.tracks.some((t) => t.plans.some((p) => p.billing === "monthly")));
const quotedRegions = pricingRegions.filter((r) => r.tracks.length === 0);
const joinOr = (parts: string[]) => (parts.length > 1 ? `${parts.slice(0, -1).join(", ")}, or ${parts[parts.length - 1]}` : parts[0] ?? "");
const trialPrices = pricingRegions.filter((r) => r.trial).map((r) => `${formatMoney(r.trial!.amount, r.trial!.currency)} ${REGION_WHERE[r.id]}`);

const pricingAnswer = [
  `Prices depend on where you live. For students in Cairo, each option is priced separately: Business English is ${money(plan("business-single"))} per lesson, Professional English is ${money(plan("professional-single"))} per lesson, Small Group English is ${money(plan("group-single"))} per student per lesson, and Student English, for school and university students, is ${money(plan("student-single"))} per lesson. Every option offers 8- and 12-lesson packages at a lower effective rate.`,
  ...planRegions.map((r) => {
    const [single, twelve, twenty] = r.tracks[0].plans;
    return `For students ${REGION_WHERE[r.id]}, single lessons are ${money(single)}, and 4-week plans are ${money(twelve)} for ${twelve.lessons} classes or ${money(twenty)} for ${twenty.lessons} classes.`;
  }),
  trialPrices.length ? `A 30-minute trial lesson is ${joinOr(trialPrices)}, credited toward your first package if you enroll.` : "",
  quotedRegions.length ? `Students ${joinOr(quotedRegions.map((r) => REGION_WHERE[r.id]))} can contact us for pricing in their currency.` : "",
]
  .filter(Boolean)
  .join(" ");

const faqs = [
  {
    q: "Who are lessons for?",
    a: "Lessons are designed for students, adults, professionals, entrepreneurs, and anyone seeking to improve their English communication skills. In Cairo there are four options: Business English for advanced business communication, Professional English for career development, Small Group English for groups of 2–4 students, and Student English, a reduced rate for school and university students.",
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
    a: `Simply fill out the contact form below or send a message via WhatsApp. I'll respond within 24 hours to schedule your trial. The trial is ${cairo.trial ? `${formatMoney(cairo.trial.amount, cairo.trial.currency)} for 30 minutes in Cairo` : "30 minutes"}, and the fee is credited toward your first package if you decide to enroll. See Pricing for the trial price where you live.`,
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

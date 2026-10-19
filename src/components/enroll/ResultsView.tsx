import { CalendarCheck, MessageCircle, Mail, ShieldCheck } from "lucide-react";
import { levelRange, nextLevel } from "@/lib/assessment/levels";
import { CATEGORY_LABELS, type Category, type CefrLevel } from "@/lib/assessment/questions";
import type { StudentResult } from "@/lib/enrollment/apiTypes";
import { LEARNING_GOALS, LESSON_FORMATS, PAYMENT_METHODS, WEEKLY_FREQUENCIES, labelFor } from "@/lib/enrollment/options";
import { CONTACT } from "@/lib/contact";
import { bookingLink, packageSummary, whatsappLink } from "@/lib/enrollment/display";
import { goalText, renderSentences, strongestSkill } from "@/lib/enrollment/followUp";
import { BOOKING_URL, featureFlags } from "@/lib/featureFlags";
import { Notice } from "./fields";

const LEVEL_DESCRIPTIONS: Record<CefrLevel, string> = {
  "Pre-A1": "You're at the very start of your English journey. Lessons will focus on the most useful everyday words and phrases.",
  A1: "You can understand and use familiar everyday expressions and very basic phrases.",
  A2: "You can communicate in simple, routine situations and describe your background and immediate needs.",
  B1: "You can deal with most everyday situations and describe experiences, plans, and opinions in simple connected language.",
  B2: "You can interact with a good degree of fluency and understand the main ideas of complex texts.",
  C1: "You can use English flexibly and effectively for social, academic, and professional purposes.",
  C2: "You can understand virtually everything you read and express yourself precisely, even in complex situations.",
};

const ListCard = ({ title, items, note }: { title: string; items: string[]; note?: string }) => (
  <section className="border border-border bg-background p-5 sm:p-6">
    <h3 className="font-serif text-xl text-foreground mb-1">{title}</h3>
    {note && <p className="text-xs text-muted-foreground mb-3">{note}</p>}
    <ul className="space-y-2 mt-3">
      {items.map((s) => (
        <li key={s} className="flex gap-2 text-sm text-foreground leading-relaxed">
          <span className="text-navy/50">–</span>
          {s}
        </li>
      ))}
    </ul>
  </section>
);

type Props = { result: StudentResult; onRemoveData?: () => void; removing?: boolean };

const NEXT_STEP = [
  "Your {strength} is your strongest skill.",
  "This test can't measure speaking, so the next step is a 30 minute trial.",
  "I'll hear you speak and send you a written plan for {goal}.",
];

export const ResultsView = ({ result, onRemoveData, removing }: Props) => {
  const firstName = result.full_name.split(" ")[0];
  const range = levelRange(result.estimated_cefr_level);
  const target = nextLevel(result.estimated_cefr_level);
  const strongest = strongestSkill(result.category_scores);
  const nextStep = renderSentences(NEXT_STEP, { strength: strongest?.label, goal: goalText(result) });
  const goals = [result.primary_learning_goal, ...result.additional_learning_goals]
    .map((g) => (g === "other" && result.other_goal_text ? result.other_goal_text : labelFor(LEARNING_GOALS, g)));

  return (
    <div className="space-y-10">
      <header>
        <p className="text-label text-muted-foreground mb-3">Your results</p>
        <h1 className="text-editorial-md text-foreground mb-2">Well done, {result.full_name}.</h1>
        <p className="text-muted-foreground">You've completed the FluentBridges placement test.</p>
        {strongest && (
          <p className="mt-4 text-label text-navy">
            Your strongest skill: {strongest.label}, {strongest.correct} of {strongest.total}
          </p>
        )}
      </header>

      {/* Measured results */}
      <section aria-labelledby="measured" className="space-y-6">
        <h2 id="measured" className="text-label text-muted-foreground">
          What we measured
        </h2>
        <div className="bg-foreground text-background p-6 sm:p-8">
          <p className="text-label text-background/60 mb-2">Estimated English Level</p>
          <p className="font-serif text-5xl sm:text-7xl font-light mb-4">{range}</p>
          <p className="text-background/80 leading-relaxed max-w-xl">{LEVEL_DESCRIPTIONS[result.estimated_cefr_level]}</p>
          {target && (
            <p className="mt-6 pt-6 border-t border-background/15 text-sm">
              <span className="text-background/60 text-xs uppercase tracking-wider block mb-1">Your next target</span>
              <span className="font-serif text-3xl">{target}</span>
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Your result is an initial estimate based on this assessment. Your instructor may adjust your level after reviewing your writing and
          speaking ability.
        </p>
        {result.confidence === "limited" && (
          <Notice tone="warning">
            You left {result.unanswered} questions unanswered, so this estimate is based on limited evidence. Your instructor will check
            your level with you.
          </Notice>
        )}

        <div className="border border-border bg-background p-5 sm:p-6">
          <h3 className="font-serif text-xl text-foreground mb-4">Results by skill</h3>
          <dl className="space-y-4">
            {(Object.entries(result.category_scores) as [Category, StudentResult["category_scores"][Category]][]).map(([c, s]) => (
              <div key={c}>
                <div className="flex justify-between text-sm mb-1.5">
                  <dt className="text-foreground">{CATEGORY_LABELS[c]}</dt>
                  <dd className="text-muted-foreground tabular-nums">
                    {s.correct} / {s.total}
                  </dd>
                </div>
                <div className="h-1.5 bg-muted" aria-hidden>
                  <div className="h-1.5 bg-navy" style={{ width: `${s.percent}%` }} />
                </div>
              </div>
            ))}
            <div>
              <div className="flex justify-between text-sm">
                <dt className="text-foreground">{CATEGORY_LABELS.writing}</dt>
                <dd className="text-muted-foreground">
                  {result.writing_status === "skipped"
                    ? "Skipped"
                    : result.writing_status === "scored"
                      ? "Reviewed by your instructor"
                      : featureFlags.reviewSlaCopy
                        ? "I'll review your writing within 24 hours and update your level."
                        : "Awaiting instructor review"}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ListCard title="Strengths you showed" items={result.strengths} />
          <ListCard title="Areas to work on" items={result.improvement_areas.length ? result.improvement_areas : ["No clear gaps at this level. Your instructor will help you set new challenges."]} />
        </div>
      </section>

      {/* Recommendations */}
      <section aria-labelledby="recommended" className="space-y-6">
        <h2 id="recommended" className="text-label text-muted-foreground">
          What we recommend
        </h2>
        <ListCard
          title="Suggested learning priorities"
          note="These recommendations are based on your answers and goals. Your instructor will confirm them with you."
          items={result.recommended_learning_priorities}
        />
        <section className="border border-border bg-secondary p-5 sm:p-6">
          <h3 className="font-serif text-xl text-foreground mb-3">What you told us</h3>
          <dl className="space-y-2 text-sm">
            <div className="grid sm:grid-cols-[10rem_1fr] gap-1">
              <dt className="text-muted-foreground">Goals</dt>
              <dd className="text-foreground">{goals.join("; ")}</dd>
            </div>
            <div className="grid sm:grid-cols-[10rem_1fr] gap-1">
              <dt className="text-muted-foreground">Format</dt>
              <dd className="text-foreground">{labelFor(LESSON_FORMATS, result.lesson_format)}</dd>
            </div>
            <div className="grid sm:grid-cols-[10rem_1fr] gap-1">
              <dt className="text-muted-foreground">Lessons per week</dt>
              <dd className="text-foreground">{labelFor(WEEKLY_FREQUENCIES, result.preferred_classes_per_week)}</dd>
            </div>
            <div className="grid sm:grid-cols-[10rem_1fr] gap-1">
              <dt className="text-muted-foreground">Package</dt>
              <dd className="text-foreground">{packageSummary(result.selected_package)}</dd>
            </div>
            <div className="grid sm:grid-cols-[10rem_1fr] gap-1">
              <dt className="text-muted-foreground">Payment preference</dt>
              <dd className="text-foreground">{labelFor(PAYMENT_METHODS, result.preferred_payment_method)}</dd>
            </div>
          </dl>
        </section>
      </section>

      {/* Next step */}
      <section aria-labelledby="next" className="border-t border-border pt-10 space-y-5">
        <h2 id="next" className="text-editorial-md text-foreground">
          Your next step
        </h2>
        <p className="text-muted-foreground leading-relaxed">{nextStep}</p>
        <p className="text-muted-foreground leading-relaxed">
          Nothing is charged and nothing is booked until you confirm.
          {featureFlags.trialRefundCopy && " If you don't leave the trial with a clear plan, the fee is refunded."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={bookingLink(BOOKING_URL)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-label text-center px-8 py-4 bg-foreground text-background hover:bg-navy transition-colors"
          >
            <CalendarCheck size={16} className="shrink-0" />
            {result.trial_price ? `Book my trial: ${result.trial_price}, credited to your package` : "Book my 30 minute trial"}
          </a>
          <a
            href={whatsappLink(firstName, range)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-label px-8 py-4 border border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            <MessageCircle size={16} /> Ask Abdul on WhatsApp
          </a>
          <a
            href="/#contact"
            className="inline-flex items-center justify-center gap-2 text-label px-8 py-4 text-foreground underline underline-offset-4 hover:text-navy transition-colors"
          >
            <Mail size={16} /> Send a message instead
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Prefer to call? Egypt: <a className="underline underline-offset-2" href={`tel:${CONTACT.egyptPhoneE164}`}>{CONTACT.egyptPhoneDisplay}</a>
        </p>
      </section>

      {onRemoveData && (
        <section aria-labelledby="device" className="border border-border bg-secondary p-5 sm:p-6 space-y-3">
          <h2 id="device" className="font-serif text-xl text-foreground flex items-center gap-2">
            <ShieldCheck size={18} className="text-navy" /> Using a shared or public device?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your results are saved with your instructor. When you've finished, you can remove your information from this browser so the
            next person can't see it.
          </p>
          <button
            type="button"
            onClick={onRemoveData}
            disabled={removing}
            className="text-label px-6 py-3 border border-foreground text-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove my data from this device"}
          </button>
        </section>
      )}
    </div>
  );
};

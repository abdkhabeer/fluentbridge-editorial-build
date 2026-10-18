import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { frequencyPackageNote } from "@/lib/enrollment/flags";
import {
  DAYS,
  GROUP_STATUSES,
  LEARNING_GOALS,
  LESSON_FORMATS,
  PAYMENT_METHODS,
  SELF_REPORTED_LEVELS,
  TIMES_OF_DAY,
  WEEKLY_FREQUENCIES,
  labelFor,
} from "@/lib/enrollment/options";
import { checkPhone, formatE164 } from "@/lib/enrollment/phone";
import type { EnrollmentDraft, FieldErrors } from "@/lib/enrollment/schema";
import { ErrorText, Notice, PrimaryButton } from "./fields";
import { STEP_TITLES, packageSummary } from "@/lib/enrollment/display";

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-1 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4">
    <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground break-words">{children || <span className="text-muted-foreground">Not provided</span>}</dd>
  </div>
);

const Section = ({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) => (
  <section className="border border-border bg-background p-5 sm:p-6">
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-serif text-xl text-foreground">{title}</h3>
      <button type="button" onClick={onEdit} className="text-label text-navy hover:underline underline-offset-4" aria-label={`Edit ${title}`}>
        Edit
      </button>
    </div>
    <dl className="divide-y divide-border">{children}</dl>
  </section>
);

type Props = {
  draft: EnrollmentDraft;
  errors: FieldErrors;
  onEdit: (step: number) => void;
  onConsent: (v: boolean) => void;
  honeypot: string;
  onHoneypot: (v: string) => void;
  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
};

export const ReviewStep = ({ draft, errors, onEdit, onConsent, honeypot, onHoneypot, submitting, submitError, onSubmit }: Props) => {
  const country = draft.country === "Other" ? draft.country_other : draft.country;
  const phone = (raw: string) => {
    const r = checkPhone(raw, country, { mobile: false });
    return r.ok ? formatE164(r.e164) : raw;
  };
  const goals = [draft.primary_learning_goal, ...draft.additional_learning_goals];
  const note = frequencyPackageNote(draft.selected_package, draft.preferred_classes_per_week);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      <Section title={STEP_TITLES[0]} onEdit={() => onEdit(0)}>
        <Row label="Name">{draft.full_name}</Row>
        <Row label="Location">{[draft.city, country].filter(Boolean).join(", ")}</Row>
        <Row label="Email">{draft.email}</Row>
        <Row label="WhatsApp">{phone(draft.whatsapp_number)}</Row>
        {draft.alternative_phone && <Row label="Alternative phone">{phone(draft.alternative_phone)}</Row>}
      </Section>

      <Section title={STEP_TITLES[1]} onEdit={() => onEdit(1)}>
        <Row label="Main goal">{labelFor(LEARNING_GOALS, draft.primary_learning_goal)}</Row>
        {draft.additional_learning_goals.length > 0 && (
          <Row label="Other goals">{draft.additional_learning_goals.map((g) => labelFor(LEARNING_GOALS, g)).join("; ")}</Row>
        )}
        {goals.includes("other") && <Row label="Your reason">{draft.other_goal_text}</Row>}
        {draft.learning_goal_details && <Row label="More detail">{draft.learning_goal_details}</Row>}
        <Row label="Your level">{labelFor(SELF_REPORTED_LEVELS, draft.self_reported_level)}</Row>
      </Section>

      <Section title={STEP_TITLES[2]} onEdit={() => onEdit(2)}>
        <Row label="Format">{labelFor(LESSON_FORMATS, draft.lesson_format)}</Row>
        {draft.lesson_format === "small_group" && <Row label="Group">{labelFor(GROUP_STATUSES, draft.group_status)}</Row>}
        <Row label="Lessons per week">{labelFor(WEEKLY_FREQUENCIES, draft.preferred_classes_per_week)}</Row>
        <Row label="Package">{packageSummary(draft.selected_package)}</Row>
      </Section>

      <Section title={STEP_TITLES[3]} onEdit={() => onEdit(3)}>
        <Row label="Payment">{labelFor(PAYMENT_METHODS, draft.preferred_payment_method)}</Row>
        <Row label="Days">{draft.preferred_days.map((d) => labelFor(DAYS, d)).join(", ")}</Row>
        <Row label="Time of day">{draft.preferred_time_of_day.map((t) => labelFor(TIMES_OF_DAY, t)).join(", ")}</Row>
        <Row label="Time zone">{draft.timezone.replace(/_/g, " ")}</Row>
      </Section>

      {note && <Notice tone="warning">{note}</Notice>}

      {/* Honeypot for bots. Hidden from people and assistive technology. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => onHoneypot(e.target.value)} />
        </label>
      </div>

      <div className="border border-border bg-secondary p-5 sm:p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.consent}
            onChange={(e) => onConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--navy))]"
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? "consent-error" : undefined}
          />
          <span className="text-sm text-foreground leading-relaxed">
            I agree that Fluent Bridges may use the information I have submitted and my placement test results to evaluate my
            learning needs and contact me about lessons, as described in the{" "}
            <Link to="/privacy" target="_blank" className="underline underline-offset-2 hover:text-navy">
              privacy policy
            </Link>
            .
          </span>
        </label>
        <ErrorText id="consent-error">{errors.consent}</ErrorText>
      </div>

      {submitError && (
        <Notice tone="error">
          {submitError} Your answers are saved on this device, so you can safely try again.
        </Notice>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <p className="text-xs text-muted-foreground max-w-sm">
          Next: a placement test of about 15–25 minutes. Your details are saved before the test starts.
        </p>
        <PrimaryButton type="submit" disabled={submitting || !!errors.consent} aria-busy={submitting}>
          {submitting ? "Saving your details…" : submitError ? "Try again" : "Continue to English Placement Test"}
        </PrimaryButton>
      </div>
    </form>
  );
};

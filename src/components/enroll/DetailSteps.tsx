import { useMemo } from "react";
import {
  BILLING_PERIOD_WEEKS,
  HELP_CHOOSING_PACKAGE,
  PACKAGE_VALIDITY_DAYS,
  formatMoney,
  getRegion,
  packageLocationError,
  perLessonPrice,
  regionForLocation,
  trialLesson,
  type Plan,
} from "@/data/pricing";
import { COUNTRIES } from "@/lib/enrollment/countries";
import { frequencyPackageNote } from "@/lib/enrollment/flags";
import {
  DAYS,
  GROUP_STATUSES,
  LEARNING_GOALS,
  LESSON_FORMATS,
  SELF_REPORTED_LEVELS,
  TIMES_OF_DAY,
  WEEKLY_FREQUENCIES,
  paymentMethodsFor,
  suggestedTrackForGoal,
} from "@/lib/enrollment/options";
import { checkPhone, formatE164 } from "@/lib/enrollment/phone";
import { packageFitsFormat, type EnrollmentDraft, type FieldErrors } from "@/lib/enrollment/schema";
import { CheckboxChips, Field, Group, Notice, RadioCards, inputClass } from "./fields";

export type StepProps = {
  draft: EnrollmentDraft;
  update: (patch: Partial<EnrollmentDraft>) => void;
  errors: FieldErrors;
};

const residenceCountry = (d: EnrollmentDraft) => (d.country === "Other" ? d.country_other : d.country);

const PhonePreview = ({ value, country }: { value: string; country: string }) => {
  if (!value.trim()) return null;
  const r = checkPhone(value, country, { mobile: false });
  return r.ok ? <span className="block mt-1 text-foreground/80">We'll save this as {formatE164(r.e164)}</span> : null;
};

// ── Step 1 ──

export const PersonalStep = ({ draft, update, errors }: StepProps) => {
  const country = residenceCountry(draft);
  return (
    <div className="space-y-6">
      <Field label="Full name" error={errors.full_name}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            className={inputClass}
            autoComplete="name"
            maxLength={100}
            value={draft.full_name}
            onChange={(e) => update({ full_name: e.target.value })}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Country of residence" error={errors.country}>
          {({ id, describedBy, invalid }) => (
            <select
              id={id}
              className={inputClass}
              autoComplete="country-name"
              value={draft.country}
              onChange={(e) => update({ country: e.target.value })}
              aria-invalid={invalid}
              aria-describedby={describedBy}
            >
              <option value="">Choose a country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="City" error={errors.city}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              className={inputClass}
              autoComplete="address-level2"
              maxLength={80}
              value={draft.city}
              onChange={(e) => update({ city: e.target.value })}
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      </div>

      {draft.country === "Other" && (
        <Field label="Your country" error={errors.country_other}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              className={inputClass}
              maxLength={80}
              value={draft.country_other}
              onChange={(e) => update({ country_other: e.target.value })}
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      )}

      <Field label="Email address" error={errors.email}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            type="email"
            inputMode="email"
            autoComplete="email"
            className={inputClass}
            maxLength={254}
            value={draft.email}
            onChange={(e) => update({ email: e.target.value })}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      <Field
        label="WhatsApp number"
        error={errors.whatsapp_number}
        hint={
          <>
            Include your country code, for example +20 10 1234 5678. Egyptian numbers starting with 0 are fine.
            <PhonePreview value={draft.whatsapp_number} country={country} />
          </>
        }
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={inputClass}
            maxLength={40}
            placeholder="+20 10 1234 5678"
            value={draft.whatsapp_number}
            onChange={(e) => update({ whatsapp_number: e.target.value })}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      <Field
        label="Alternative phone number"
        optional
        error={errors.alternative_phone}
        hint={<PhonePreview value={draft.alternative_phone} country={country} />}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            type="tel"
            inputMode="tel"
            className={inputClass}
            maxLength={40}
            value={draft.alternative_phone}
            onChange={(e) => update({ alternative_phone: e.target.value })}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      </Field>
    </div>
  );
};

// ── Step 2 ──

export const GoalsStep = ({ draft, update, errors }: StepProps) => {
  const showOther = draft.primary_learning_goal === "other" || draft.additional_learning_goals.includes("other");
  return (
    <div className="space-y-10">
      <Group legend="What is your main reason for learning English?" error={errors.primary_learning_goal}>
        <RadioCards
          name="primary_learning_goal"
          options={[...LEARNING_GOALS]}
          value={draft.primary_learning_goal}
          invalid={!!errors.primary_learning_goal}
          onChange={(v) =>
            update({
              primary_learning_goal: v,
              additional_learning_goals: draft.additional_learning_goals.filter((g) => g !== v),
            })
          }
        />
      </Group>

      <Group legend="Any other goals?" optional description="Choose as many as you like.">
        <CheckboxChips
          options={LEARNING_GOALS.map((g) => ({ value: g.value, label: g.label }))}
          values={draft.additional_learning_goals}
          disabled={draft.primary_learning_goal ? [draft.primary_learning_goal] : []}
          onChange={(v) => update({ additional_learning_goals: v })}
        />
      </Group>

      {showOther && (
        <Field label="Your other reason" error={errors.other_goal_text}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              className={inputClass}
              maxLength={200}
              value={draft.other_goal_text}
              onChange={(e) => update({ other_goal_text: e.target.value })}
              aria-invalid={invalid}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      )}

      <Field label="Tell us a little more about what you want to achieve in English" optional error={errors.learning_goal_details}>
        {({ id, describedBy }) => (
          <textarea
            id={id}
            rows={4}
            maxLength={1000}
            className={`${inputClass} resize-y`}
            placeholder="For example: I have job interviews next month and want to answer questions more confidently."
            value={draft.learning_goal_details}
            onChange={(e) => update({ learning_goal_details: e.target.value })}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      <Group
        legend="How would you describe your current English level?"
        description="Choose what feels closest. The placement test will help estimate your level, so there is no wrong answer here."
        error={errors.self_reported_level}
      >
        <RadioCards
          name="self_reported_level"
          columns={2}
          options={[...SELF_REPORTED_LEVELS]}
          value={draft.self_reported_level}
          invalid={!!errors.self_reported_level}
          onChange={(v) => update({ self_reported_level: v })}
        />
      </Group>
    </div>
  );
};

// ── Step 3 ──

const planDescription = (plan: Plan) => {
  const price = formatMoney(plan.amount, plan.currency);
  if (plan.billing === "monthly") {
    return [`Monthly plan`, `${price} per month`, `${plan.lessons} classes per ${BILLING_PERIOD_WEEKS}-week billing period`].join(" · ");
  }
  const parts = [plan.lessons === 1 ? "1 lesson, 60 minutes" : `${plan.lessons} lessons`, `${price}${plan.perStudent ? " per student" : ""}`];
  if (plan.lessons > 1) {
    parts.push(`${formatMoney(perLessonPrice(plan), plan.currency)} per lesson`, `valid for ${PACKAGE_VALIDITY_DAYS} days`);
  }
  return parts.join(" · ");
};

export const LessonsStep = ({ draft, update, errors }: StepProps) => {
  const country = residenceCountry(draft);
  // Prices come from the country and city on step 1, never from the visitor's IP.
  const region = getRegion(regionForLocation(country, draft.city));
  const priced = region.tracks.length > 0;
  const suggested = suggestedTrackForGoal(draft.primary_learning_goal as never);
  const visibleTracks = region.tracks.filter((t) =>
    draft.lesson_format === "small_group" ? t.id === "group" : draft.lesson_format === "one_on_one" ? t.id !== "group" : true,
  );
  const note = frequencyPackageNote(draft.selected_package, draft.preferred_classes_per_week);
  // A package chosen on the pricing page for another location (or before the country changed).
  const locationNote = errors.selected_package ? null : packageLocationError(draft.selected_package, country, draft.city);
  const helpDescription = priced
    ? "Your instructor will recommend a package after your test."
    : "Your instructor will recommend a plan and send pricing in your currency after your test.";

  return (
    <div className="space-y-10">
      <Group legend="How would you prefer to study?" error={errors.lesson_format}>
        <RadioCards
          name="lesson_format"
          options={[...LESSON_FORMATS]}
          value={draft.lesson_format}
          invalid={!!errors.lesson_format}
          onChange={(v) =>
            update({
              lesson_format: v,
              group_status: v === "small_group" ? draft.group_status : "",
              selected_package: packageFitsFormat(draft.selected_package, v) ? draft.selected_package : "",
            })
          }
        />
        {draft.lesson_format === "small_group" && region.tracks.some((t) => t.id === "group") && (
          <div className="mt-4">
            <Notice>Small-group prices are per student, and each group has 2–4 students. If you don't have a group yet, your instructor can help.</Notice>
          </div>
        )}
      </Group>

      {draft.lesson_format === "small_group" && (
        <Group legend="Do you already have a group?" error={errors.group_status}>
          <RadioCards
            name="group_status"
            options={[...GROUP_STATUSES]}
            value={draft.group_status}
            invalid={!!errors.group_status}
            onChange={(v) => update({ group_status: v })}
          />
        </Group>
      )}

      <Group
        legend="How often would you like to have English lessons?"
        description="This is how many lessons you'd like each week, which is separate from how many lessons are in a package."
        error={errors.preferred_classes_per_week}
      >
        <RadioCards
          name="preferred_classes_per_week"
          columns={2}
          options={[...WEEKLY_FREQUENCIES]}
          value={draft.preferred_classes_per_week}
          invalid={!!errors.preferred_classes_per_week}
          onChange={(v) => update({ preferred_classes_per_week: v })}
        />
      </Group>

      <Group
        legend="Which package interests you?"
        description={
          priced
            ? `${region.heading}, from your location on the first step.${region.id === "cairo" ? ` Packages are valid for ${PACKAGE_VALIDITY_DAYS} days from purchase.` : ""} You won't be charged now.`
            : "You won't be charged now."
        }
        error={errors.selected_package}
      >
        <div className="space-y-8">
          {!priced && (
            <Notice>
              {region.inquiry.heading} {region.inquiry.body}{" "}
              {region.id === "egypt-other" && "If you live in Cairo, enter “Cairo” as your city on the first step. "}
              Choose “I need help choosing” below.
            </Notice>
          )}
          {priced && visibleTracks.length === 0 && (
            <Notice>Small-group lessons aren't priced for your location yet. Choose “I need help choosing” and your instructor will help.</Notice>
          )}
          {locationNote && <Notice tone="warning">{locationNote}</Notice>}
          {visibleTracks.map((track) => (
            <div key={track.id}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-serif text-lg text-foreground">{track.heading}</h3>
                {track.id === suggested && draft.primary_learning_goal && draft.lesson_format !== "small_group" && (
                  <span className="text-[0.65rem] uppercase tracking-widest text-navy">Suggested for your goal</span>
                )}
              </div>
              <RadioCards
                name="selected_package"
                options={track.plans.map((p) => ({ value: p.id, label: p.title, description: planDescription(p) }))}
                value={draft.selected_package}
                invalid={!!errors.selected_package}
                onChange={(v) => update({ selected_package: v })}
              />
            </div>
          ))}
          <div>
            <h3 className="font-serif text-lg text-foreground mb-3">{priced ? "Not ready to choose?" : "Pricing for your location"}</h3>
            <RadioCards
              name="selected_package"
              options={[
                ...(region.trial
                  ? [
                      {
                        value: trialLesson.id,
                        label: `Trial lesson: ${trialLesson.price}`,
                        description: "Credited toward your first 8- or 12-lesson package if you enroll.",
                      },
                    ]
                  : []),
                { value: HELP_CHOOSING_PACKAGE, label: "I need help choosing", description: helpDescription },
              ]}
              value={draft.selected_package}
              invalid={!!errors.selected_package}
              onChange={(v) => update({ selected_package: v })}
            />
          </div>
        </div>
        {note && (
          <div className="mt-4">
            <Notice tone="warning">{note}</Notice>
          </div>
        )}
      </Group>
    </div>
  );
};

// ── Step 4 ──

const FALLBACK_TIMEZONES = ["Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "UTC"];

export const PaymentScheduleStep = ({ draft, update, errors }: StepProps) => {
  const country = residenceCountry(draft);
  const wa = checkPhone(draft.whatsapp_number, country, { mobile: true });
  const methods = paymentMethodsFor(country, wa.ok ? wa.e164 : null);
  const timezones = useMemo(() => {
    const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    const list = intl.supportedValuesOf?.("timeZone") ?? FALLBACK_TIMEZONES;
    return draft.timezone && !list.includes(draft.timezone) ? [draft.timezone, ...list] : list;
  }, [draft.timezone]);

  return (
    <div className="space-y-10">
      <Group
        legend="How would you prefer to pay?"
        description="This only records your preference. Nothing is charged now. Your instructor will confirm payment details with you."
        error={errors.preferred_payment_method}
      >
        <RadioCards
          name="preferred_payment_method"
          options={methods.map((m) => ({
            value: m.value,
            label: m.label,
            badge: m.egyptOnly ? "Egypt" : m.value === "wise" && !methods.some((x) => x.egyptOnly) ? "International" : undefined,
          }))}
          value={draft.preferred_payment_method}
          invalid={!!errors.preferred_payment_method}
          onChange={(v) => update({ preferred_payment_method: v })}
        />
        <p className="mt-3 text-xs text-muted-foreground">Please don't share card numbers or banking passwords in this form.</p>
      </Group>

      <Group
        legend="When would you generally prefer to have lessons?"
        optional
        description="This helps your instructor suggest times. Lesson times are always confirmed with you first."
      >
        <div className="space-y-6">
          <div>
            <p className="text-label text-foreground mb-3">Days</p>
            <CheckboxChips options={[...DAYS]} values={draft.preferred_days} onChange={(v) => update({ preferred_days: v })} />
          </div>
          <div>
            <p className="text-label text-foreground mb-3">Time of day</p>
            <CheckboxChips options={[...TIMES_OF_DAY]} values={draft.preferred_time_of_day} onChange={(v) => update({ preferred_time_of_day: v })} />
          </div>
          <Field label="Time zone" error={errors.timezone}>
            {({ id, describedBy }) => (
              <select id={id} className={inputClass} value={draft.timezone} onChange={(e) => update({ timezone: e.target.value })} aria-describedby={describedBy}>
                <option value="">Choose a time zone</option>
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </Group>
    </div>
  );
};

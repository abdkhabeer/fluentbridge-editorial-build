import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { findPlan, getRegion, isKnownPackageId, regionOfPackage } from "@/data/pricing";
import type { StudentAssessmentState, StudentResult } from "@/lib/enrollment/apiTypes";
import { ApiError, newAccessToken, studentApi } from "@/lib/enrollment/client";
import { paymentMethodsFor } from "@/lib/enrollment/options";
import { checkPhone } from "@/lib/enrollment/phone";
import { STEP_SCHEMAS, emptyDraft, validateStep, type EnrollmentDraft, type FieldErrors } from "@/lib/enrollment/schema";
import { clearFunnel, initialFunnel, loadFunnel, saveFunnel, type SavedFunnel } from "@/lib/enrollment/storage";
import { cn } from "@/lib/utils";
import { GoalsStep, LessonsStep, PaymentScheduleStep, PersonalStep } from "@/components/enroll/DetailSteps";
import { STEP_TITLES } from "@/lib/enrollment/display";
import { ReviewStep } from "@/components/enroll/ReviewStep";
import { PlacementTest } from "@/components/enroll/PlacementTest";
import { ResultsView } from "@/components/enroll/ResultsView";
import { Notice, PrimaryButton, SecondaryButton } from "@/components/enroll/fields";

const STEPS = [PersonalStep, GoalsStep, LessonsStep, PaymentScheduleStep];
const STEP_FIELDS: (keyof EnrollmentDraft)[][] = [
  ["full_name", "country", "country_other", "city", "email", "whatsapp_number", "alternative_phone"],
  ["primary_learning_goal", "additional_learning_goals", "other_goal_text", "learning_goal_details", "self_reported_level"],
  ["lesson_format", "group_status", "preferred_classes_per_week", "selected_package"],
  ["preferred_payment_method", "preferred_days", "preferred_time_of_day", "timezone"],
];

const MACRO_STEPS = ["Your Details", "Placement Test", "Your Results"];

const Progress = ({ current }: { current: number }) => (
  <ol className="grid grid-cols-3 gap-2" aria-label="Enrollment progress">
    {MACRO_STEPS.map((label, i) => (
      <li key={label} aria-current={i === current ? "step" : undefined}>
        <div className={cn("h-0.5 mb-2", i <= current ? "bg-navy" : "bg-border")} />
        <span className={cn("text-[0.65rem] sm:text-xs uppercase tracking-widest", i === current ? "text-foreground" : "text-muted-foreground")}>
          <span className="mr-1">{i + 1}.</span>
          {label}
        </span>
      </li>
    ))}
  </ol>
);

const focusFirstError = () =>
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>("[aria-invalid=true], [role=alert]");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el && "focus" in el && el.tagName !== "P") el.focus({ preventScroll: true });
  }, 0);

const Enroll = () => {
  const [funnel, setFunnel] = useState<SavedFunnel>(() => loadFunnel());
  const [searchParams, setSearchParams] = useSearchParams();
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<StudentAssessmentState | null>(null);
  const [result, setResult] = useState<StudentResult | null>(null);
  const [syncError, setSyncError] = useState<ApiError | null>(null);
  const submittingRef = useRef(false);
  const [removed, setRemoved] = useState<"revoked" | "local-only" | null>(null);
  const [removing, setRemoving] = useState(false);

  const { draft, phase, step } = funnel;

  useEffect(() => {
    document.title = "Enroll | Fluent Bridges";
  }, []);

  useEffect(() => saveFunnel(funnel), [funnel]);

  // Preselect a package from a pricing-card link (?package=student-8), then clean the URL.
  useEffect(() => {
    const pkg = searchParams.get("package");
    if (!pkg) return;
    setSearchParams({}, { replace: true });
    if (!isKnownPackageId(pkg) || funnel.submitted) return;
    const track = findPlan(pkg)?.track.id;
    // The card's location fills in an empty country (and "Cairo" for Cairo prices); the student can still change it.
    const region = regionOfPackage(pkg);
    const country = region ? getRegion(region).country : "";
    setFunnel((f) => ({
      ...f,
      draft: {
        ...f.draft,
        selected_package: pkg,
        lesson_format: track === "group" ? "small_group" : track ? "one_on_one" : f.draft.lesson_format,
        ...(country && !f.draft.country ? { country } : {}),
        ...(region === "cairo" && !f.draft.country && !f.draft.city ? { city: "Cairo" } : {}),
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default the time zone to the browser's.
  useEffect(() => {
    if (draft.timezone) return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setFunnel((f) => ({ ...f, draft: { ...f.draft, timezone: tz } }));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After submission, load the assessment state from the server (resume after refresh).
  const sync = useCallback(async () => {
    if (!funnel.submitted || !funnel.token) return;
    setSyncError(null);
    try {
      const state = await studentApi.getAssessment(funnel.token);
      setAssessment(state);
      if (state.result) {
        setResult(state.result);
        setFunnel((f) => ({ ...f, phase: "results" }));
      }
    } catch (e) {
      setSyncError(e instanceof ApiError ? e : new ApiError(0, "Something went wrong."));
    }
  }, [funnel.submitted, funnel.token]);

  useEffect(() => {
    sync();
  }, [sync]);

  const update = (patch: Partial<EnrollmentDraft>) => {
    setServerErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof EnrollmentDraft];
      return next;
    });
    setFunnel((f) => {
      const d = { ...f.draft, ...patch };
      const country = d.country === "Other" ? d.country_other : d.country;
      const wa = checkPhone(d.whatsapp_number, country, { mobile: true });
      if (d.preferred_payment_method && !paymentMethodsFor(country, wa.ok ? wa.e164 : null).some((m) => m.value === d.preferred_payment_method)) {
        d.preferred_payment_method = "";
      }
      return { ...f, draft: d };
    });
  };

  const goTo = (p: Partial<SavedFunnel>) => {
    setFunnel((f) => ({ ...f, ...p }));
    window.scrollTo({ top: 0 });
  };

  const stepErrors = (s: number): FieldErrors => {
    const local = validateStep(s, draft);
    const server = Object.fromEntries(Object.entries(serverErrors).filter(([k]) => STEP_FIELDS[s]?.includes(k as keyof EnrollmentDraft)));
    return { ...server, ...local };
  };

  const startOver = () => {
    if (!window.confirm("Start over? This clears the answers saved on this device.")) return;
    clearFunnel();
    setFunnel(initialFunnel());
    setAssessment(null);
    setResult(null);
    setAttempted({});
    setServerErrors({});
    setSubmitError(null);
    setSyncError(null);
  };

  /** "Remove my data from this device": revoke the server token, then clear local storage. */
  const removeFromDevice = async () => {
    if (!window.confirm("Remove your information from this device? You won't be able to reopen these results here.")) return;
    setRemoving(true);
    let revoked = false;
    if (funnel.token) {
      try {
        await studentApi.revokeAccess(funnel.token);
        revoked = true;
      } catch {
        revoked = false;
      }
    }
    clearFunnel();
    setFunnel(initialFunnel());
    setAssessment(null);
    setResult(null);
    setRemoving(false);
    setRemoved(revoked ? "revoked" : "local-only");
    window.scrollTo({ top: 0 });
  };

  const continueStep = () => {
    const errs = stepErrors(step);
    if (Object.keys(errs).length) {
      setAttempted((a) => ({ ...a, [step]: true }));
      focusFirstError();
      return;
    }
    if (step < STEPS.length - 1) goTo({ step: step + 1 });
    else goTo({ phase: "review" });
  };

  const submit = async () => {
    if (submittingRef.current) return;
    for (let s = 0; s < STEP_SCHEMAS.length; s++) {
      if (Object.keys(validateStep(s, draft)).length) {
        setAttempted((a) => ({ ...a, [s]: true }));
        goTo({ phase: "details", step: s });
        focusFirstError();
        return;
      }
    }
    if (!draft.consent) {
      setServerErrors((e) => ({ ...e, consent: "Please confirm you agree before continuing." }));
      focusFirstError();
      return;
    }

    // Reuse the same token on retries so the server can de-duplicate.
    const token = funnel.token ?? newAccessToken();
    if (!funnel.token) setFunnel((f) => ({ ...f, token }));
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await studentApi.createApplication(draft, token, honeypot);
      // Contact details are now saved on the server; remove them from this device.
      setFunnel((f) => ({ ...f, token, submitted: true, phase: "test", draft: emptyDraft() }));
      window.scrollTo({ top: 0 });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, "Something went wrong.");
      if (err.status === 422 && err.fields) {
        setServerErrors(err.fields);
        const s = STEP_FIELDS.findIndex((fields) => fields.some((k) => err.fields![k]));
        if (s >= 0) {
          setAttempted((a) => ({ ...a, [s]: true }));
          goTo({ phase: "details", step: s });
        }
        focusFirstError();
      } else if (err.status === 429) {
        setSubmitError("Too many attempts from your network. Please wait a minute, then try again.");
      } else if (err.status === 410) {
        // The saved token expired; a fresh one is used on the next attempt.
        setFunnel((f) => ({ ...f, token: null }));
        setSubmitError("This saved application expired.");
      } else {
        setSubmitError(err.message);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const macro = phase === "results" ? 2 : phase === "test" ? 1 : 0;
  const StepComponent = STEPS[step];
  const errors = attempted[step] ? stepErrors(step) : {};
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <Link to="/" className="font-serif text-2xl tracking-tight text-foreground">
            FluentBridges
          </Link>
          <div className="flex items-center gap-4">
            {(funnel.submitted || draft.full_name) && (
              <button type="button" onClick={startOver} className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                Start over
              </button>
            )}
            <Link to="/" className="text-label text-foreground hover:opacity-70">
              Back to site
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        {!removed && (
          <div className="mb-10">
            <Progress current={macro} />
          </div>
        )}

        {phase === "details" && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              continueStep();
            }}
          >
            {step === 0 && (
              <div className="mb-10">
                <h1 className="text-editorial-md text-foreground mb-3">Let's find the right lessons for you.</h1>
                <p className="text-muted-foreground leading-relaxed">
                  Tell us a little about yourself and your goals, then take a short placement test. It's free and takes about 25–30 minutes
                  in total.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  How we use and protect your information is explained in our{" "}
                  <Link to="/privacy" target="_blank" className="underline underline-offset-2">
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
            )}
            <div className="mb-8">
              <p className="text-label text-muted-foreground mb-2">
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 className="font-serif text-3xl text-foreground">{STEP_TITLES[step]}</h2>
            </div>

            <StepComponent draft={draft} update={update} errors={errors} />

            {hasErrors && (
              <p role="status" className="mt-8 text-sm text-destructive">
                Please complete the highlighted fields to continue.
              </p>
            )}
            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              {step > 0 ? (
                <SecondaryButton type="button" onClick={() => goTo({ step: step - 1 })}>
                  Back
                </SecondaryButton>
              ) : (
                <span />
              )}
              <PrimaryButton type="submit" disabled={hasErrors}>
                {step < STEPS.length - 1 ? "Continue" : "Review my details"}
              </PrimaryButton>
            </div>
          </form>
        )}

        {phase === "review" && (
          <>
            <div className="mb-8">
              <p className="text-label text-muted-foreground mb-2">Almost there</p>
              <h1 className="font-serif text-3xl text-foreground mb-2">Review your details</h1>
              <p className="text-sm text-muted-foreground">Check everything looks right. You can edit any section.</p>
            </div>
            <ReviewStep
              draft={draft}
              errors={serverErrors}
              onEdit={(s) => goTo({ phase: "details", step: s })}
              onConsent={(v) => update({ consent: v })}
              honeypot={honeypot}
              onHoneypot={setHoneypot}
              submitting={submitting}
              submitError={submitError}
              onSubmit={submit}
            />
            <div className="mt-6">
              <button type="button" className="text-label text-foreground py-3" onClick={() => goTo({ phase: "details", step: STEPS.length - 1 })}>
                ← Back
              </button>
            </div>
          </>
        )}

        {phase === "test" && (
          <>
            {syncError ? (
              <div className="space-y-4">
                <Notice tone="error">
                  {[401, 404, 410].includes(syncError.status)
                    ? "We couldn't open your application from this device (it may have expired or been removed). You can start a new one."
                    : syncError.message}
                </Notice>
                {[401, 404, 410].includes(syncError.status) ? (
                  <PrimaryButton
                    type="button"
                    onClick={() => {
                      clearFunnel();
                      setFunnel(initialFunnel());
                      setSyncError(null);
                    }}
                  >
                    Start a new application
                  </PrimaryButton>
                ) : (
                  <PrimaryButton type="button" onClick={sync}>
                    Try again
                  </PrimaryButton>
                )}
              </div>
            ) : !assessment ? (
              <p className="flex items-center gap-2 text-muted-foreground" role="status">
                <Loader2 size={16} className="animate-spin" /> Loading your placement test…
              </p>
            ) : (
              <PlacementTest
                token={funnel.token!}
                firstName={assessment.first_name}
                initial={assessment}
                savedAnswers={funnel.answers}
                savedIndex={funnel.questionIndex}
                savedWriting={funnel.writing}
                onProgress={(p) => setFunnel((f) => ({ ...f, ...p }))}
                onComplete={(r) => {
                  setResult(r);
                  goTo({ phase: "results", answers: {}, questionIndex: 0, writing: "" });
                }}
              />
            )}
          </>
        )}

        {removed && (
          <div className="space-y-6">
            <h1 className="text-editorial-md text-foreground">Your information has been removed from this device.</h1>
            <p className="text-muted-foreground leading-relaxed">
              {removed === "revoked"
                ? "This browser can no longer open your application or results."
                : "We couldn't reach the server, so the link from this device will stop working when it expires (30 days after you applied)."}{" "}
              Your application is still with your instructor so they can follow up. To have it deleted, see our{" "}
              <Link to="/privacy" className="underline underline-offset-2">
                privacy policy
              </Link>
              .
            </p>
            <Link to="/" className="inline-block text-label px-8 py-4 bg-foreground text-background hover:bg-navy transition-colors">
              Back to the website
            </Link>
          </div>
        )}

        {!removed && phase === "results" &&
          (result ? (
            <ResultsView result={result} onRemoveData={removeFromDevice} removing={removing} />
          ) : syncError ? (
            <div className="space-y-4">
              <Notice tone="error">{syncError.message}</Notice>
              <PrimaryButton type="button" onClick={sync}>
                Try again
              </PrimaryButton>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-muted-foreground" role="status">
              <Loader2 size={16} className="animate-spin" /> Loading your results…
            </p>
          ))}
      </main>
    </div>
  );
};

export default Enroll;

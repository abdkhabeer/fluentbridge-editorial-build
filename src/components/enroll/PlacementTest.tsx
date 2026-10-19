import { useCallback, useEffect, useRef, useState } from "react";
import { trackOnce } from "@/lib/analytics/client";
import { PROGRESS_MARKS } from "@/lib/analytics/events";
import { ArrowLeft, ArrowRight, Check, CloudOff, Loader2 } from "lucide-react";
import {
  PASSAGES,
  QUESTIONS,
  WRITING_MAX_CHARS,
  countWords,
  type OptionId,
  type WritingPrompt,
} from "@/lib/assessment/questions";
import type { StudentAssessmentState, StudentResult } from "@/lib/enrollment/apiTypes";
import { ApiError, studentApi } from "@/lib/enrollment/client";
import { cn } from "@/lib/utils";
import { Notice, PrimaryButton, SecondaryButton, inputClass } from "./fields";

type Answers = Record<string, OptionId | null>;
type SaveStatus = "idle" | "saving" | "saved" | "offline" | "throttled";

type Props = {
  token: string;
  firstName: string;
  initial: StudentAssessmentState;
  savedAnswers: Answers;
  savedIndex: number;
  savedWriting: string;
  onProgress: (p: { answers?: Answers; questionIndex?: number; writing?: string }) => void;
  onComplete: (result: StudentResult) => void;
};

const TOTAL = QUESTIONS.length;
const firstReadingIndex = QUESTIONS.findIndex((q) => q.category === "reading");

const SaveIndicator = ({ status }: { status: SaveStatus }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
    {status === "saving" && (
      <>
        <Loader2 size={12} className="animate-spin" /> Saving…
      </>
    )}
    {status === "saved" && (
      <>
        <Check size={12} /> Saved
      </>
    )}
    {status === "offline" && (
      <>
        <CloudOff size={12} /> Saved on this device. We'll sync when you're back online.
      </>
    )}
    {status === "throttled" && (
      <>
        <CloudOff size={12} /> Saved on this device. Syncing is paused for a moment; we'll retry automatically.
      </>
    )}
  </span>
);

export const PlacementTest = ({ token, firstName, initial, savedAnswers, savedIndex, savedWriting, onProgress, onComplete }: Props) => {
  // Resume from server status, or from progress saved on this device if the last autosave didn't reach the server.
  const [view, setView] = useState<"intro" | "question" | "check" | "writing">(
    initial.status === "writing"
      ? "writing"
      : initial.status === "in_progress" || savedIndex > 0 || Object.keys(savedAnswers).length > 0
        ? "question"
        : "intro",
  );
  const [answers, setAnswers] = useState<Answers>({ ...initial.answers, ...savedAnswers });
  const [index, setIndex] = useState(Math.min(savedIndex, TOTAL - 1));
  const [prompt, setPrompt] = useState<WritingPrompt | null>(initial.writing_prompt);
  const [writing, setWriting] = useState(savedWriting || initial.writing_draft);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // ── Autosave multiple-choice answers (debounced) ──
  // `inflight` tracks the request currently on the wire, so submitting can wait for it
  // and a stale autosave never races the final submission.
  const pending = useRef<Answers | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const timer = useRef<number>();
  const flushAnswers = useCallback(async () => {
    if (inflight.current) await inflight.current;
    const toSave = pending.current;
    if (!toSave) return;
    pending.current = null;
    setSaveStatus("saving");
    const run = (async () => {
      try {
        await studentApi.saveAnswers(token, toSave);
        setSaveStatus("saved");
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) return; // section already submitted; final answers were sent with it
        // Keep the unsaved answers (merged with anything newer) for the next retry.
        pending.current = { ...toSave, ...(pending.current ?? {}) };
        setSaveStatus(e instanceof ApiError && e.status === 429 ? "throttled" : "offline");
      }
    })();
    inflight.current = run;
    await run;
    inflight.current = null;
  }, [token]);

  const queueSave = (next: Answers) => {
    pending.current = next;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flushAnswers, 1200);
  };

  useEffect(() => {
    const retry = window.setInterval(() => {
      if (pending.current) flushAnswers();
    }, 15000);
    // Best effort: send unsaved answers when the student leaves or switches apps.
    const onHide = () => {
      if (document.visibilityState === "hidden" && pending.current) flushAnswers();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(retry);
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flushAnswers]);

  // ── Autosave writing draft ──
  const writingTimer = useRef<number>();
  const writingInflight = useRef<Promise<void> | null>(null);
  useEffect(() => {
    if (view !== "writing") return;
    window.clearTimeout(writingTimer.current);
    writingTimer.current = window.setTimeout(() => {
      const run = (async () => {
        try {
          await studentApi.saveWriting(token, writing);
          setSaveStatus("saved");
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) return;
          setSaveStatus(e instanceof ApiError && e.status === 429 ? "throttled" : "offline");
        }
      })();
      writingInflight.current = run;
      run.finally(() => {
        if (writingInflight.current === run) writingInflight.current = null;
      });
    }, 2000);
    return () => window.clearTimeout(writingTimer.current);
  }, [writing, view, token]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [index, view]);

  const choose = (qid: string, option: OptionId | null) => {
    const next = { ...answers, [qid]: option };
    setAnswers(next);
    onProgress({ answers: next });
    queueSave(next);
  };

  const goTo = (i: number) => {
    if (i > index && PROGRESS_MARKS.includes(i as never)) trackOnce("test_progress", { answered: i });
    setIndex(i);
    onProgress({ questionIndex: i });
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (index < TOTAL - 1) return goTo(index + 1);
    if (PROGRESS_MARKS.includes(TOTAL as never)) trackOnce("test_progress", { answered: TOTAL });
    setView("check");
  };

  const submitObjective = async () => {
    setBusy(true);
    setError(null);
    window.clearTimeout(timer.current);
    pending.current = null;
    try {
      // Let any autosave already on the wire finish first; the submission carries every answer anyway.
      if (inflight.current) await inflight.current;
      const r = await studentApi.submitObjective(token, answers);
      setPrompt(r.writing_prompt);
      setView("writing");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const complete = async (skipped: boolean) => {
    setBusy(true);
    setError(null);
    window.clearTimeout(writingTimer.current);
    try {
      if (writingInflight.current) await writingInflight.current;
      const r = await studentApi.complete(token, skipped ? "" : writing, skipped);
      trackOnce("test_completed");
      onComplete(r.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  };

  // ── Views ──

  if (view === "intro") {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-label text-muted-foreground mb-3">Placement test</p>
          <h1 ref={headingRef} tabIndex={-1} className="text-editorial-md text-foreground mb-4 outline-none">
            Thanks, {firstName}. Your details are saved.
          </h1>
          <p className="text-body-lg text-muted-foreground">
            Now let's estimate your English level so your lessons start in the right place.
          </p>
        </div>
        <ul className="space-y-3 text-sm text-foreground">
          {[
            `${TOTAL} multiple-choice questions on grammar, vocabulary, reading, and practical English, followed by one short writing task.`,
            "About 15–25 minutes. There is no time limit.",
            "Questions start easy and become more challenging. It's normal not to know every answer.",
            "If you don't know an answer, choose “I'm not sure” rather than guessing.",
            "Please don't use a dictionary or translation tool, so the result reflects your real level.",
            "Your answers save automatically. You can close the page and come back on this device.",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span className="text-navy/50 mt-0.5">–</span>
              <span className="leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>
        <PrimaryButton
          type="button"
          className="w-full sm:w-auto"
          onClick={() => {
            trackOnce("test_started");
            setView("question");
            queueSave(answers);
          }}
        >
          Start the test
        </PrimaryButton>
      </div>
    );
  }

  if (view === "check") {
    const unanswered = QUESTIONS.filter((q) => !answers[q.id]).length;
    return (
      <div className="space-y-6">
        <h2 ref={headingRef} tabIndex={-1} className="text-editorial-md text-foreground outline-none">
          Multiple-choice section complete
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          {unanswered === 0
            ? "You answered every question."
            : `You left ${unanswered} question${unanswered === 1 ? "" : "s"} unanswered or marked “I'm not sure”. That's fine. Unanswered questions simply don't add to your score.`}{" "}
          Once you continue, you can't change these answers.
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <SecondaryButton type="button" onClick={() => setView("question")} disabled={busy}>
            Review my answers
          </SecondaryButton>
          <PrimaryButton type="button" onClick={submitObjective} disabled={busy} aria-busy={busy}>
            {busy ? "Saving…" : error ? "Try again" : "Continue to the writing task"}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (view === "writing" && prompt) {
    const words = countWords(writing);
    const [min, max] = prompt.targetWords;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-label text-muted-foreground">Part 3 of 3 · Writing</p>
          <SaveIndicator status={saveStatus} />
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="text-editorial-md text-foreground outline-none">
          {prompt.title}
        </h2>
        <p className="text-foreground leading-relaxed">{prompt.prompt}</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          {prompt.guidance.map((g) => (
            <li key={g} className="flex gap-2">
              <span className="text-navy/50">–</span>
              {g}
            </li>
          ))}
        </ul>
        <div>
          <label htmlFor="writing" className="text-label text-foreground block mb-2">
            Your answer
          </label>
          <textarea
            id="writing"
            rows={10}
            maxLength={WRITING_MAX_CHARS}
            className={`${inputClass} resize-y leading-relaxed`}
            value={writing}
            onChange={(e) => {
              setWriting(e.target.value);
              onProgress({ writing: e.target.value });
              setSaveStatus("saving");
            }}
            aria-describedby="writing-count"
          />
          <p id="writing-count" className={cn("mt-2 text-xs", words > 0 && words < min ? "text-amber-700" : "text-muted-foreground")}>
            {words} word{words === 1 ? "" : "s"} · aim for {min}–{max}
          </p>
        </div>
        <Notice>Your instructor reviews your writing personally. It isn't scored automatically.</Notice>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <SecondaryButton type="button" onClick={() => complete(true)} disabled={busy}>
            Skip writing
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => complete(false)} disabled={busy || words === 0} aria-busy={busy}>
            {busy ? "Submitting…" : error ? "Try again" : "Submit and see my results"}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // Question view
  const q = QUESTIONS[index];
  const passage = q.passageId ? PASSAGES.find((p) => p.id === q.passageId) : null;
  const selected = answers[q.id];
  const part = index < firstReadingIndex ? "Part 1 of 3 · Grammar, vocabulary & usage" : "Part 2 of 3 · Reading";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-label text-muted-foreground">{part}</p>
          <SaveIndicator status={saveStatus} />
        </div>
        <div
          className="h-1 w-full bg-muted"
          role="progressbar"
          aria-label="Test progress"
          aria-valuemin={0}
          aria-valuemax={TOTAL}
          aria-valuenow={index + 1}
        >
          <div className="h-1 bg-navy transition-all" style={{ width: `${((index + 1) / TOTAL) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Question {index + 1} of {TOTAL}
        </p>
      </div>

      {passage && (
        <article className="border border-border bg-secondary p-5 sm:p-6">
          <p className="text-label text-muted-foreground mb-3">Read: {passage.title}</p>
          <div className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-line">{passage.text}</div>
        </article>
      )}

      <fieldset>
        <legend className="w-full">
          <h2 ref={headingRef} tabIndex={-1} className="font-serif text-2xl sm:text-3xl text-foreground leading-snug outline-none">
            {q.prompt}
          </h2>
        </legend>
        <div className="mt-6 grid gap-2">
          {q.options.map((o) => {
            const checked = selected === o.id;
            return (
              <label
                key={o.id}
                className={cn(
                  "flex items-start gap-3 border px-4 py-4 cursor-pointer transition-colors focus-within:ring-1 focus-within:ring-navy",
                  checked ? "border-navy bg-secondary" : "border-border bg-background hover:border-navy/40",
                )}
              >
                <input type="radio" name={q.id} className="sr-only" checked={checked} onChange={() => choose(q.id, o.id)} />
                <span
                  aria-hidden
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center border text-xs uppercase",
                    checked ? "bg-navy border-navy text-warm-white" : "border-muted-foreground/40 text-muted-foreground",
                  )}
                >
                  {o.id}
                </span>
                <span className="text-sm sm:text-base text-foreground leading-relaxed">{o.text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="inline-flex items-center gap-2 text-label text-foreground py-3 disabled:opacity-30"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2 sm:gap-4">
          {!selected && (
            <button
              type="button"
              onClick={() => {
                choose(q.id, null);
                next();
              }}
              className="text-label text-muted-foreground hover:text-foreground py-3 px-2"
            >
              I'm not sure
            </button>
          )}
          <PrimaryButton type="button" onClick={next} disabled={!selected} className="inline-flex items-center gap-2 px-6">
            {index === TOTAL - 1 ? "Finish" : "Next"} <ArrowRight size={14} />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

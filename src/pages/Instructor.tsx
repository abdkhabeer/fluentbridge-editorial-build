import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { describeSnapshot, formatMoney, snapshotPrice, trialPriceFor } from "@/data/pricing";
import {
  CATEGORY_LABELS,
  CEFR_LEVELS,
  RUBRIC_MAX_PER_CRITERION,
  RUBRIC_SCALE,
  WRITING_RUBRIC,
  type Category,
  type RubricCriterion,
} from "@/lib/assessment/questions";
import type { FunnelReport, LeadDetail, LeadSummary } from "@/lib/enrollment/apiTypes";
import { ApiError, instructorApi } from "@/lib/enrollment/client";
import { REVIEW_FLAG_LABELS } from "@/lib/enrollment/flags";
import {
  FOLLOW_UP_MESSAGES,
  WAITING_ALERT_MINUTES,
  followUpEventType,
  renderFollowUp,
  waitingLabel,
  waitingMinutes,
  whatsappUrl,
  type FollowUpMessage,
} from "@/lib/enrollment/followUp";
import { featureFlags } from "@/lib/featureFlags";
import {
  DAYS,
  GROUP_STATUSES,
  LEAD_STATUSES,
  LEARNING_GOALS,
  LESSON_FORMATS,
  PAYMENT_METHODS,
  SELF_REPORTED_LEVELS,
  TIMES_OF_DAY,
  WEEKLY_FREQUENCIES,
  labelFor,
  type LeadStatus,
} from "@/lib/enrollment/options";
import { formatE164 } from "@/lib/enrollment/phone";
import { cn } from "@/lib/utils";
import { Notice, PrimaryButton, SecondaryButton, inputClass } from "@/components/enroll/fields";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Not set";

const ASSESSMENT_LABELS = { not_started: "Not started", in_progress: "In progress", writing: "Writing task", completed: "Completed" };

const useNoIndex = () =>
  useEffect(() => {
    document.title = "Instructor | FluentBridges";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

// ── Login ──

const Login = ({ onDone }: { onDone: () => void }) => {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="mx-auto max-w-sm space-y-5 py-16"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await instructorApi.login(password);
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Sign-in failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 className="font-serif text-3xl text-foreground">Instructor sign-in</h1>
      <div>
        <label htmlFor="pw" className="text-label text-foreground block mb-2">
          Password
        </label>
        <input id="pw" type="password" autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <PrimaryButton type="submit" className="w-full" disabled={busy || !password}>
        {busy ? "Signing in…" : "Sign in"}
      </PrimaryButton>
    </form>
  );
};

// ── List ──

const StatusBadge = ({ status }: { status: LeadStatus }) => (
  <span
    className={cn(
      "inline-block whitespace-nowrap px-2 py-0.5 text-[0.65rem] uppercase tracking-widest",
      status === "new" && "bg-navy text-warm-white",
      status === "assessment_completed" && "bg-navy/15 text-navy",
      status === "follow_up_needed" && "bg-amber-100 text-amber-900",
      ["contacted", "trial_scheduled"].includes(status) && "bg-secondary text-foreground",
      status === "enrolled" && "bg-emerald-100 text-emerald-900",
      status === "not_proceeding" && "bg-muted text-muted-foreground",
    )}
  >
    {labelFor(LEAD_STATUSES, status)}
  </span>
);

/** Re-renders every 30 seconds so "waiting N min" badges stay current. */
const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
};

const WaitingBadge = ({ minutes }: { minutes: number }) => (
  <span
    className={cn(
      "inline-block whitespace-nowrap px-2 py-0.5 text-[0.65rem] uppercase tracking-widest",
      minutes >= WAITING_ALERT_MINUTES ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-900",
    )}
  >
    {waitingLabel(minutes)}
  </span>
);

const LeadList = ({ leads, onOpen }: { leads: LeadSummary[]; onOpen: (id: string) => void }) => {
  const now = useNow();
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [source, setSource] = useState("all");
  const [q, setQ] = useState("");
  const sources = useMemo(() => [...new Set(leads.map((l) => l.source ?? "unknown"))].sort(), [leads]);
  const shown = useMemo(
    () =>
      leads.filter(
        (l) =>
          (filter === "all" || l.lead_status === filter) &&
          (source === "all" || (l.source ?? "unknown") === source) &&
          (!q || `${l.full_name} ${l.email} ${l.whatsapp_number}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [leads, filter, source, q],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input className={inputClass} placeholder="Search name, email, or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search leads" />
        <select className={cn(inputClass, "sm:w-64")} value={filter} onChange={(e) => setFilter(e.target.value as LeadStatus | "all")} aria-label="Filter by status">
          <option value="all">All statuses ({leads.length})</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} ({leads.filter((l) => l.lead_status === s.value).length})
            </option>
          ))}
        </select>
        <select className={cn(inputClass, "sm:w-48")} value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source">
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s === "unknown" ? "Not recorded" : s} ({leads.filter((l) => (l.source ?? "unknown") === s).length})
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{leads.length === 0 ? "No applications yet." : "No leads match these filters."}</p>
      ) : (
        <ul className="divide-y divide-border border border-border bg-background">
          {shown.map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => onOpen(l.id)} className="w-full text-left p-4 sm:p-5 hover:bg-secondary transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-serif text-xl text-foreground">{l.full_name}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const waiting = waitingMinutes(l.assessment_completed_at, l.follow_up_count, now);
                      return waiting === null ? null : <WaitingBadge minutes={waiting} />;
                    })()}
                    <StatusBadge status={l.lead_status} />
                  </span>
                </div>
                <div className="mt-1 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>
                    {l.city}, {l.country}
                  </span>
                  <span>{labelFor(LEARNING_GOALS, l.primary_learning_goal)}</span>
                  <span>{l.selected_package_title}</span>
                  <span>Submitted {fmtDate(l.created_at)}</span>
                  <span>
                    Test: {ASSESSMENT_LABELS[l.assessment_status]}
                    {l.estimated_cefr_level && ` · ${l.instructor_level ?? l.estimated_cefr_level}${l.instructor_level ? " (adjusted)" : ""} · ${l.overall_score}%`}
                  </span>
                  {l.review_flags.length > 0 && <span className="text-amber-800">{l.review_flags.length} item(s) to review</span>}
                  {l.source && <span>Source: {l.source}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Detail ──

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="border border-border bg-background p-5 sm:p-6">
    <h3 className="font-serif text-xl text-foreground mb-3">{title}</h3>
    {children}
  </section>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-1 py-1.5 sm:grid-cols-[10rem_1fr] text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-foreground break-words">{children || "None"}</dd>
  </div>
);

type ContactForm = { full_name: string; email: string; whatsapp_number: string; alternative_phone: string; country: string; city: string };

const ContactEditor = ({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: ContactForm;
  saving: boolean;
  onSave: (c: ContactForm) => void;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState(initial);
  const fields: [keyof ContactForm, string][] = [
    ["full_name", "Full name"],
    ["email", "Email"],
    ["whatsapp_number", "WhatsApp (with country code)"],
    ["alternative_phone", "Alternative phone"],
    ["city", "City"],
    ["country", "Country"],
  ];
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      {fields.map(([k, label]) => (
        <div key={k}>
          <label htmlFor={`c-${k}`} className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">
            {label}
          </label>
          <input id={`c-${k}`} className={inputClass} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        </div>
      ))}
      <div className="flex gap-3">
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save corrections"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
};

const ReplyOnWhatsApp = ({ lead, onSent }: { lead: LeadDetail; onSent: (n: FollowUpMessage) => void }) => {
  const app = lead.application;
  const input = {
    ...app,
    category_scores: lead.assessment.category_scores,
    improvement_areas: lead.assessment.improvement_areas,
    trial_price: trialPriceFor(app.country, app.city),
  };
  const options = { now: new Date(), trialRefundCopy: featureFlags.trialRefundCopy };
  return (
    <Card title="Reply on WhatsApp">
      <p className="text-xs text-muted-foreground mb-4">
        Opens WhatsApp in a new tab with the message filled in. Message 1 marks the lead as Contacted.
      </p>
      <ul className="space-y-4">
        {FOLLOW_UP_MESSAGES.map((n) => {
          const text = renderFollowUp(n, input, options);
          const sent = (app.follow_up_events ?? []).filter((e) => e.type === followUpEventType(n));
          return (
            <li key={n} className="space-y-2">
              <a
                href={text ? whatsappUrl(app.whatsapp_number, text) : undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!text}
                onClick={() => text && onSent(n)}
                className={cn(
                  "inline-flex items-center justify-center text-label px-5 py-2.5 bg-foreground text-background hover:bg-navy transition-colors",
                  !text && "pointer-events-none opacity-50",
                )}
              >
                Message {n}
              </a>
              {sent.length > 0 && <span className="ml-3 text-xs text-muted-foreground">Sent {fmtDate(sent[sent.length - 1].at)}</span>}
              <p className="text-sm text-muted-foreground leading-relaxed">{text || "Not enough information to write this message."}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

const Detail = ({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) => {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<LeadStatus>("new");
  const [notes, setNotes] = useState("");
  const [rubric, setRubric] = useState<Partial<Record<RubricCriterion, number>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    instructorApi
      .lead(id)
      .then((d) => {
        if (cancelled) return;
        setLead(d);
        setStatus(d.application.lead_status);
        setNotes(d.application.instructor_notes);
        setRubric(d.assessment.writing.rubric ?? {});
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const reload = () => {
    setConflict(false);
    setError(null);
    setSaved(null);
    setReloadKey((k) => k + 1);
  };

  const save = async (what: string, update: Parameters<typeof instructorApi.updateLead>[1]) => {
    if (!lead) return;
    setSaving(what);
    setSaved(null);
    setError(null);
    try {
      const d = await instructorApi.updateLead(id, {
        ...update,
        application_version: lead.application_version,
        assessment_version: lead.assessment_version,
      });
      setLead(d);
      setSaved(what);
      if (what === "contact") setEditingContact(false);
      onChanged();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(true);
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(null);
    }
  };

  const recordFollowUp = async (n: FollowUpMessage) => {
    try {
      const d = await instructorApi.recordFollowUp(id, n);
      setLead(d);
      setStatus(d.application.lead_status);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? `WhatsApp opened, but the follow-up wasn't recorded: ${e.message}` : "The follow-up wasn't recorded.");
    }
  };

  if (error && !lead) return <Notice tone="error">{error}</Notice>;
  if (!lead) return <p className="text-muted-foreground flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading…</p>;

  const app = lead.application;
  const a = lead.assessment;
  const snap = app.selected_package_price_snapshot;
  const quoted = snap && snapshotPrice(snap);
  const rubricComplete = WRITING_RUBRIC.every((c) => Number.isInteger(rubric[c.id]));
  const canScoreWriting = a.status === "completed" && (a.writing.status === "submitted" || a.writing.status === "scored");

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="text-label text-foreground py-2">
        ← All leads
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-3xl text-foreground">{app.full_name}</h2>
        <StatusBadge status={app.lead_status} />
      </div>
      {conflict ? (
        <Notice tone="warning">
          {error}{" "}
          <button type="button" className="underline underline-offset-2 font-medium" onClick={reload}>
            Reload this lead
          </button>{" "}
          (your unsaved edits on this page will be replaced).
        </Notice>
      ) : (
        error && <Notice tone="error">{error}</Notice>
      )}

      {a.missing && (
        <Notice tone="warning">
          This application's assessment record is missing (the student's submission was interrupted). The contact details below are
          complete. A new assessment is created automatically if the student returns on the same device.
        </Notice>
      )}

      {app.review_flags.length > 0 && (
        <Notice tone="warning">
          <strong className="font-medium">To review:</strong> {app.review_flags.map((f) => REVIEW_FLAG_LABELS[f]).join(" · ")}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Contact">
          {editingContact ? (
            <ContactEditor
              initial={{
                full_name: app.full_name,
                email: app.email,
                whatsapp_number: app.whatsapp_number,
                alternative_phone: app.alternative_phone ?? "",
                country: app.country,
                city: app.city,
              }}
              saving={saving === "contact"}
              onCancel={() => setEditingContact(false)}
              onSave={(c) => save("contact", { contact: { ...c, alternative_phone: c.alternative_phone || null } })}
            />
          ) : (
          <>
          <dl>
            <Row label="Email">
              <a className="underline underline-offset-2" href={`mailto:${app.email}`}>
                {app.email}
              </a>
            </Row>
            <Row label="WhatsApp">
              <a className="underline underline-offset-2" href={`https://wa.me/${app.whatsapp_number.slice(1)}`} target="_blank" rel="noopener noreferrer">
                {formatE164(app.whatsapp_number)}
              </a>
            </Row>
            <Row label="Alternative phone">{app.alternative_phone && formatE164(app.alternative_phone)}</Row>
            <Row label="Location">
              {app.city}, {app.country}
            </Row>
            <Row label="Time zone">{app.timezone?.replace(/_/g, " ")}</Row>
            <Row label="Submitted">{fmtDate(app.created_at)}</Row>
            {app.attribution && (
              <>
                <Row label="Source">
                  {[app.attribution.utm_source, app.attribution.utm_medium, app.attribution.utm_campaign, app.attribution.utm_content]
                    .map((v, i) => v && `${["source", "medium", "campaign", "content"][i]}: ${v}`)
                    .filter(Boolean)
                    .join(" · ") || "No UTM tags"}
                </Row>
                <Row label="Referrer">{app.attribution.referrer ?? "Direct"}</Row>
                <Row label="Landing page">{`${app.attribution.landing_path} (${fmtDate(app.attribution.captured_at)})`}</Row>
              </>
            )}
            <Row label="Consent">{`${fmtDate(app.consent_timestamp)} (${app.consent_version})`}</Row>
            <Row label="Student access">
              {app.access_revoked_at
                ? `Removed from student's device ${fmtDate(app.access_revoked_at)}`
                : app.access_expires_at
                  ? `Expires ${fmtDate(app.access_expires_at)}`
                  : null}
            </Row>
          </dl>
          <div className="mt-3 flex items-center gap-4">
            <button type="button" className="text-label text-navy hover:underline underline-offset-4" onClick={() => setEditingContact(true)}>
              Correct details
            </button>
            {saved === "contact" && <span className="text-sm text-muted-foreground">Saved.</span>}
          </div>
          </>
          )}
        </Card>

        <Card title="Follow-up">
          <div className="space-y-4">
            <div>
              <label htmlFor="status" className="text-label text-foreground block mb-2">
                Lead status
              </label>
              <select id="status" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="notes" className="text-label text-foreground block mb-2">
                Private notes
              </label>
              <textarea id="notes" rows={4} maxLength={4000} className={cn(inputClass, "resize-y")} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <PrimaryButton type="button" disabled={saving !== null} onClick={() => save("followup", { lead_status: status, instructor_notes: notes })}>
                {saving === "followup" ? "Saving…" : "Save"}
              </PrimaryButton>
              {saved === "followup" && <span className="text-sm text-muted-foreground">Saved.</span>}
            </div>
          </div>
        </Card>

        <ReplyOnWhatsApp lead={lead} onSent={recordFollowUp} />

        <Card title="Goals">
          <dl>
            <Row label="Main goal">{labelFor(LEARNING_GOALS, app.primary_learning_goal)}</Row>
            <Row label="Other goals">{app.additional_learning_goals.map((g) => labelFor(LEARNING_GOALS, g)).join("; ")}</Row>
            <Row label="'Other' reason">{app.other_goal_text}</Row>
            <Row label="Details">
              <span className="whitespace-pre-line">{app.learning_goal_details}</span>
            </Row>
            <Row label="Self-reported level">{labelFor(SELF_REPORTED_LEVELS, app.self_reported_level)}</Row>
          </dl>
        </Card>

        <Card title="Lessons & payment">
          <dl>
            <Row label="Format">{labelFor(LESSON_FORMATS, app.lesson_format)}</Row>
            {app.lesson_format === "small_group" && <Row label="Group">{labelFor(GROUP_STATUSES, app.group_status ?? "")}</Row>}
            <Row label="Per week">{labelFor(WEEKLY_FREQUENCIES, app.preferred_classes_per_week)}</Row>
            <Row label="Package">{snap ? describeSnapshot(snap) : "Needs help choosing"}</Row>
            <Row label="Quoted price">{quoted && `${formatMoney(quoted.amount, quoted.currency)}${snap?.billing === "monthly" ? " per 4 weeks" : ""} (snapshot at submission)`}</Row>
            <Row label="Payment">{labelFor(PAYMENT_METHODS, app.preferred_payment_method)}</Row>
            <Row label="Days">{app.preferred_days.map((d) => labelFor(DAYS, d)).join(", ")}</Row>
            <Row label="Time of day">{app.preferred_time_of_day.map((t) => labelFor(TIMES_OF_DAY, t)).join(", ")}</Row>
          </dl>
        </Card>
      </div>

      <Card title="Placement assessment">
        <dl className="mb-6">
          <Row label="Status">{ASSESSMENT_LABELS[a.status]}</Row>
          <Row label="Started / completed">{`${fmtDate(a.started_at)} / ${fmtDate(a.completed_at)}`}</Row>
          <Row label="Test version">{`${a.test_version}${a.scoring_method ? ` · ${a.scoring_method}` : ""}`}</Row>
          <Row label="Estimated level">
            {a.estimated_cefr_level && `${a.estimated_cefr_level} (objective)${a.confidence === "limited" ? ", limited evidence" : ""}`}
          </Row>
          <Row label="Objective score">{a.objective_score && `${a.objective_score.points} / ${a.objective_score.max} (${a.objective_score.percent}%)`}</Row>
          <Row label="Writing score">{a.writing_score !== null ? `${a.writing_score}% (instructor rubric)` : null}</Row>
          <Row label="Overall score">{a.overall_score !== null ? `${a.overall_score}%` : null}</Row>
          <Row label="Unanswered">{a.unanswered !== null ? String(a.unanswered) : null}</Row>
        </dl>

        {a.estimated_cefr_level && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="sm:w-64">
              <label htmlFor="ilevel" className="text-label text-foreground block mb-2">
                Your adjusted level
              </label>
              <select
                id="ilevel"
                className={inputClass}
                value={a.instructor_level ?? ""}
                disabled={saving !== null}
                onChange={(e) => save("level", { instructor_level: (e.target.value || null) as LeadDetail["assessment"]["instructor_level"] })}
              >
                <option value="">Not adjusted</option>
                {CEFR_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            {saved === "level" && <span className="text-sm text-muted-foreground pb-3">Saved.</span>}
          </div>
        )}

        {a.category_scores && (
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <div>
              <p className="text-label text-muted-foreground mb-2">By category</p>
              <dl>
                {(Object.entries(a.category_scores) as [Category, { correct: number; total: number; percent: number }][]).map(([c, s]) => (
                  <Row key={c} label={CATEGORY_LABELS[c]}>{`${s.correct} / ${s.total} (${s.percent}%)`}</Row>
                ))}
              </dl>
            </div>
            <div>
              <p className="text-label text-muted-foreground mb-2">By CEFR band</p>
              <dl>
                {a.level_evidence?.map((b) => (
                  <Row key={b.band} label={b.band}>{`${b.correct} / ${b.total} ${b.met ? "· met" : ""}`}</Row>
                ))}
              </dl>
            </div>
          </div>
        )}

        {a.status === "completed" && (
          <div className="grid gap-6 md:grid-cols-3 mb-6 text-sm">
            {[
              ["Strengths (shown to student)", a.strengths],
              ["Improvement areas (shown to student)", a.improvement_areas],
              ["Recommended priorities (shown to student)", a.recommended_learning_priorities],
            ].map(([title, items]) => (
              <div key={title as string}>
                <p className="text-label text-muted-foreground mb-2">{title as string}</p>
                <ul className="space-y-1">
                  {(items as string[]).map((s) => (
                    <li key={s}>– {s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <details className="border-t border-border pt-4">
          <summary className="cursor-pointer text-label text-foreground">Responses ({a.responses.filter((r) => r.selected_answer).length} answered)</summary>
          <ol className="mt-4 space-y-3 text-sm">
            {a.responses.map((r, i) => (
              <li key={r.question_id} className={cn("border-l-2 pl-3", r.awarded_score ? "border-emerald-600" : "border-destructive/60")}>
                <p className="text-foreground">
                  {i + 1}. [{r.band} · {CATEGORY_LABELS[r.category]}] {r.passage_title && <em>({r.passage_title}) </em>}
                  {r.prompt}
                </p>
                <p className="text-muted-foreground">
                  Answer: {r.selected_text ?? <em>not answered</em>} {r.awarded_score ? "✓" : `✗ · Correct: ${r.correct_text}`}
                </p>
              </li>
            ))}
          </ol>
        </details>
      </Card>

      <Card title="Writing">
        {a.writing.prompt ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong className="font-medium text-foreground">{a.writing.prompt.title}:</strong> {a.writing.prompt.prompt}
            </p>
            {a.writing.status === "skipped" ? (
              <p className="text-sm text-muted-foreground">The student skipped the writing task.</p>
            ) : (
              <>
                <blockquote className="whitespace-pre-line bg-secondary p-4 text-sm text-foreground leading-relaxed">
                  {a.writing.response || <em className="text-muted-foreground">No text yet.</em>}
                </blockquote>
                <p className="text-xs text-muted-foreground">
                  {a.writing.word_count} words · submitted {fmtDate(a.writing.submitted_at)}
                  {a.writing.scored_at && ` · scored ${fmtDate(a.writing.scored_at)}`}
                </p>
              </>
            )}
            {canScoreWriting && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-label text-muted-foreground">Rubric (0–{RUBRIC_MAX_PER_CRITERION} each) · {RUBRIC_SCALE.join(" · ")}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {WRITING_RUBRIC.map((c) => (
                    <label key={c.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        <span className="text-foreground">{c.label}</span>
                        <span className="block text-xs text-muted-foreground">{c.descriptor}</span>
                      </span>
                      <select
                        className={cn(inputClass, "w-20")}
                        value={rubric[c.id] ?? ""}
                        onChange={(e) => setRubric((r) => ({ ...r, [c.id]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                      >
                        <option value="">–</option>
                        {Array.from({ length: RUBRIC_MAX_PER_CRITERION + 1 }, (_, n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <SecondaryButton
                    type="button"
                    disabled={!rubricComplete || saving !== null}
                    onClick={() => save("rubric", { writing_rubric: rubric as Record<RubricCriterion, number> })}
                  >
                    {saving === "rubric" ? "Saving…" : "Save writing score"}
                  </SecondaryButton>
                  {saved === "rubric" && <span className="text-sm text-muted-foreground">Saved. Overall score updated.</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall score = 80% objective + 20% writing. The objective CEFR estimate isn't changed. Use “Your adjusted level” to record your
                  judgement.
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">The student hasn't reached the writing task yet.</p>
        )}
      </Card>

      <Card title="Delete this lead">
        <p className="text-sm text-muted-foreground mb-4">
          Permanently deletes the application, assessment, writing, and the student's access. Use this for deletion requests and test
          records. This can't be undone.
        </p>
        <SecondaryButton
          type="button"
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={saving !== null}
          onClick={async () => {
            const typed = window.prompt(`Type the student's full name to delete this lead permanently:\n${app.full_name}`);
            if (typed === null) return;
            if (typed.trim() !== app.full_name) {
              setError("The name didn't match, so nothing was deleted.");
              return;
            }
            setSaving("delete");
            try {
              await instructorApi.deleteLead(id);
              onChanged();
              onBack();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Delete failed.");
              setSaving(null);
            }
          }}
        >
          {saving === "delete" ? "Deleting…" : "Delete permanently"}
        </SecondaryButton>
      </Card>
    </div>
  );
};

// ── Funnel ──

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

const Funnel = () => {
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)));
  const [report, setReport] = useState<FunnelReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setReport(await instructorApi.funnel(from, to));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the funnel.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-foreground">Funnel</h1>
      <p className="text-sm text-muted-foreground">
        Anonymous visitors (one per browser) reaching each step, by UTC date. Conversion is from the step above.
      </p>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          From
          <input type="date" className={cn(inputClass, "mt-1")} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          To
          <input type="date" className={cn(inputClass, "mt-1")} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Loading…" : "Show"}
        </PrimaryButton>
      </form>
      {error && <Notice tone="error">{error}</Notice>}
      {report && (
        <div className="overflow-x-auto border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-3 font-normal">Step</th>
                <th className="p-3 font-normal text-right">Visitors</th>
                <th className="p-3 font-normal text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {report.steps.map((s) => (
                <tr key={s.label} className="border-b border-border last:border-0">
                  <td className="p-3 text-foreground">{s.label}</td>
                  <td className="p-3 text-right tabular-nums">{s.sessions}</td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">{s.conversion === null ? "" : `${s.conversion}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="p-3 text-xs text-muted-foreground border-t border-border">
            {report.total_events} events from {report.from} to {report.to}.
          </p>
        </div>
      )}
    </div>
  );
};

// ── Page ──

const Instructor = ({ view }: { view?: "funnel" }) => {
  useNoIndex();
  const { id } = useParams();
  const navigate = useNavigate();
  const [auth, setAuth] = useState<"loading" | "in" | "out" | "unconfigured" | "error">("loading");
  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = () =>
    instructorApi
      .leads()
      .then((r) => setLeads(r.leads))
      .catch((e: ApiError) => {
        if (e.status === 401) setAuth("out");
        else setError(e.message);
      });

  const checkSession = () =>
    instructorApi
      .session()
      .then((r) => setAuth(r.authenticated ? "in" : "out"))
      .catch((e: ApiError) => setAuth(e.status === 503 ? "unconfigured" : "error"));

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (auth === "in") loadLeads();
  }, [auth]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex h-16 items-center justify-between">
          <Link to="/" className="font-serif text-2xl tracking-tight text-foreground">
            FluentBridges <span className="font-sans text-xs uppercase tracking-widest text-muted-foreground ml-2">Instructor</span>
          </Link>
          {auth === "in" && (
            <div className="flex items-center gap-4">
              <Link to={view === "funnel" ? "/instructor" : "/instructor/funnel"} className="text-label text-foreground">
                {view === "funnel" ? "Leads" : "Funnel"}
              </Link>
              <button type="button" className="text-label text-foreground" onClick={() => loadLeads()}>
                Refresh
              </button>
              <button
                type="button"
                className="text-label text-muted-foreground hover:text-foreground"
                onClick={async () => {
                  await instructorApi.logout().catch(() => undefined);
                  setLeads(null);
                  setAuth("out");
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {auth === "loading" && <Loader2 className="animate-spin text-muted-foreground" />}
        {auth === "unconfigured" && (
          <Notice tone="warning">
            Instructor access isn't configured for this deployment. Production uses INSTRUCTOR_PASSWORD and INSTRUCTOR_SESSION_SECRET;
            deploy previews use separate PREVIEW_INSTRUCTOR_PASSWORD and PREVIEW_INSTRUCTOR_SESSION_SECRET values.
          </Notice>
        )}
        {auth === "error" && (
          <div className="space-y-4">
            <Notice tone="error">Couldn't reach the server.</Notice>
            <PrimaryButton type="button" onClick={checkSession}>
              Try again
            </PrimaryButton>
          </div>
        )}
        {auth === "out" && <Login onDone={() => setAuth("in")} />}
        {auth === "in" &&
          (error ? (
            <Notice tone="error">{error}</Notice>
          ) : view === "funnel" ? (
            <Funnel />
          ) : id ? (
            <Detail id={id} onBack={() => navigate("/instructor")} onChanged={loadLeads} />
          ) : leads ? (
            <>
              <h1 className="font-serif text-3xl text-foreground mb-6">Student leads</h1>
              <LeadList leads={leads} onOpen={(lid) => navigate(`/instructor/${lid}`)} />
            </>
          ) : (
            <Loader2 className="animate-spin text-muted-foreground" />
          ))}
      </main>
    </div>
  );
};

export default Instructor;

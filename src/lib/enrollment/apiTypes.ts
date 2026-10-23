// Types shared by the API (server/) and the browser. Types only.

import type { PriceSnapshot } from "../../data/pricing";
import type { Category, CefrLevel, OptionId, RubricCriterion, WritingPrompt } from "../assessment/questions";
import type { LeadStatus, LearningGoal, LessonFormat, PaymentMethod, WeeklyFrequency } from "./options";
import type { ContactCorrection, NormalizedApplication } from "./schema";
import type { ReviewFlag } from "./flags";
import type { FollowUpEvent } from "./followUp";
import type { Attribution } from "../analytics/events";

export type AssessmentStatus = "not_started" | "in_progress" | "writing" | "completed";
export type WritingStatus = "not_started" | "draft" | "submitted" | "skipped" | "scored";

export type CategoryScore = { correct: number; total: number; percent: number };
export type BandEvidence = { band: string; correct: number; total: number; met: boolean };

/** What a student sees on their results page. */
export type StudentResult = {
  full_name: string;
  test_version: string;
  completed_at: string;
  estimated_cefr_level: CefrLevel;
  confidence: "standard" | "limited";
  unanswered: number;
  category_scores: Record<Category, CategoryScore>;
  writing_status: WritingStatus;
  strengths: string[];
  improvement_areas: string[];
  recommended_learning_priorities: string[];
  primary_learning_goal: LearningGoal;
  additional_learning_goals: LearningGoal[];
  other_goal_text: string | null;
  lesson_format: LessonFormat;
  preferred_classes_per_week: WeeklyFrequency;
  selected_package: string;
  selected_package_price_snapshot: PriceSnapshot | null;
  preferred_payment_method: PaymentMethod;
  /** Trial lesson price for the student's location ("10 USD"), or null where none is published. */
  trial_price: string | null;
};

export type StudentAssessmentState = {
  status: AssessmentStatus;
  first_name: string;
  answers: Record<string, OptionId | null>;
  writing_prompt: WritingPrompt | null;
  writing_draft: string;
  result: StudentResult | null;
};

export type CreateApplicationResponse = { application_id: string; assessment_status: AssessmentStatus };

// ── Instructor ──

export type LeadSummary = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  whatsapp_number: string;
  country: string;
  city: string;
  primary_learning_goal: LearningGoal;
  lesson_format: LessonFormat;
  selected_package_title: string;
  lead_status: LeadStatus;
  assessment_status: AssessmentStatus;
  estimated_cefr_level: CefrLevel | null;
  instructor_level: CefrLevel | null;
  overall_score: number | null;
  review_flags: ReviewFlag[];
  assessment_completed_at: string | null;
  follow_up_count: number;
  /** utm_source, referring host, or "direct". Null when attribution isn't stored. */
  source: string | null;
};

export type ResponseDetail = {
  question_id: string;
  band: string;
  category: Category;
  prompt: string;
  passage_title: string | null;
  selected_answer: OptionId | null;
  selected_text: string | null;
  correct_answer: OptionId;
  correct_text: string;
  explanation: string;
  awarded_score: number;
  maximum_score: number;
};

export type LeadDetail = {
  application: ApplicationRecordPublic;
  /** Opaque versions; send them back with updates so concurrent edits are detected. */
  application_version: string;
  assessment_version: string | null;
  assessment: {
    /** True when the assessment record was never created (a partial failure). */
    missing: boolean;
    id: string;
    test_version: string;
    status: AssessmentStatus;
    started_at: string | null;
    completed_at: string | null;
    scoring_method: string | null;
    objective_score: { points: number; max: number; percent: number } | null;
    writing_score: number | null;
    overall_score: number | null;
    estimated_cefr_level: CefrLevel | null;
    instructor_level: CefrLevel | null;
    confidence: "standard" | "limited" | null;
    unanswered: number | null;
    category_scores: Record<Category, CategoryScore> | null;
    level_evidence: BandEvidence[] | null;
    strengths: string[];
    improvement_areas: string[];
    recommended_learning_priorities: string[];
    responses: ResponseDetail[];
    writing: {
      status: WritingStatus;
      prompt: WritingPrompt | null;
      response: string;
      word_count: number;
      submitted_at: string | null;
      rubric: Record<RubricCriterion, number> | null;
      scored_at: string | null;
    };
  };
};

export type ApplicationRecordPublic = NormalizedApplication & {
  id: string;
  created_at: string;
  updated_at: string;
  selected_package_price_snapshot: PriceSnapshot | null;
  consent_timestamp: string;
  consent_version: string;
  lead_status: LeadStatus;
  review_flags: ReviewFlag[];
  instructor_notes: string;
  assessment_id: string;
  access_expires_at: string | null;
  access_revoked_at: string | null;
  /** WhatsApp follow-ups sent from the lead admin. Missing on leads created before this field existed. */
  follow_up_events?: FollowUpEvent[];
  /** First-touch attribution (only when FEATURE_LEAD_ATTRIBUTION is on). */
  attribution?: Attribution | null;
  analytics_session_id?: string | null;
};

export type LeadUpdate = {
  application_version?: string;
  assessment_version?: string | null;
  contact?: ContactCorrection;
  lead_status?: LeadStatus;
  instructor_notes?: string;
  instructor_level?: CefrLevel | null;
  writing_rubric?: Record<RubricCriterion, number>;
};

export type FunnelReport = {
  from: string;
  to: string;
  total_events: number;
  steps: { label: string; sessions: number; conversion: number | null }[];
};

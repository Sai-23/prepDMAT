import type { UserRole } from "@/types/auth";
import type { Question, QuestionOption } from "@/types/questions";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type DatabaseTable<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: DatabaseTable<{
        id: string;
        display_name: string | null;
        full_name: string | null;
        avatar_path: string | null;
        target_exam_date: string | null;
        theme_preference: "light" | "dark" | "system";
        onboarding_completed_at: string | null;
        onboarding_preference: "diagnostic" | "practice_first" | "explore" | null;
        diagnostic_status: "not_started" | "in_progress" | "completed" | "skipped";
        diagnostic_session_id: string | null;
        timezone: string;
        created_at: string;
        updated_at: string;
      }>;
      user_roles: DatabaseTable<{
        id: string;
        user_id: string;
        role: UserRole;
        created_at: string;
        updated_at: string;
      }>;
      questions: DatabaseTable<
        Question & {
          deleted_at?: string | null;
          deleted_by?: string | null;
          metadata?: Json;
          structuredData?: Json;
        }
      >;
      question_options: DatabaseTable<
        QuestionOption & {
          questionId: string;
          sortOrder: number;
        }
      >;
      tests: DatabaseTable<{
        id: string;
        title: string;
        test_type: "diagnostic" | "mini_mock" | "full_mock" | "sectional";
        duration_seconds: number;
        is_published: boolean;
      }>;
      test_attempts: DatabaseTable<{
        id: string;
        test_id: string | null;
        generated_mock_id: string | null;
        mock_origin: "curated" | "generated";
        display_title: string | null;
        user_id: string;
        status: "in_progress" | "submitted" | "auto_submitted" | "abandoned";
        started_at: string;
        submitted_at: string | null;
        total_time_seconds: number;
        score: number | null;
        accuracy: number | null;
      }>;
      practice_sessions: DatabaseTable<{
        id: string;
        user_id: string;
        module: "figure_sequence" | "mathematical_equation" | "latin_square" | null;
        difficulty_mode: "easy" | "medium" | "hard" | "mixed";
        question_count: 1 | 5 | 10 | 15 | 20;
        timing_mode: "untimed" | "timed";
        source_mode: "generated" | "exact_review";
        session_type: "standard_practice" | "targeted_practice" | "exact_review" | "diagnostic";
        status: "in_progress" | "completed" | "abandoned" | "failed";
        master_seed: string;
        current_position: number;
        correct_count: number;
        incorrect_count: number;
        total_time_seconds: number;
        retry_of_session_id: string | null;
        focus_families: Json;
        started_at: string;
        expires_at: string | null;
        completed_at: string | null;
        abandoned_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      practice_session_items: DatabaseTable<{
        id: string;
        session_id: string;
        source_question_id: string | null;
        question_key: string;
        position: number;
        question_type: "figure_sequence" | "mathematical_equation" | "latin_square";
        difficulty: "easy" | "medium" | "hard";
        public_snapshot: Json;
        private_snapshot: Json;
        generator_version: string | null;
        validator_version: string | null;
        seed: string | null;
        fingerprint: string;
        structural_profile: Json;
        reasoning_family: string;
        reasoning_classification: string;
        response_status: "unanswered" | "answered" | "skipped";
        response_payload: Json | null;
        is_correct: boolean | null;
        time_spent_seconds: number;
        shown_at: string | null;
        answered_at: string | null;
        explanation_opened_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      practice_events: DatabaseTable<{
        id: string;
        user_id: string;
        session_id: string | null;
        question_key: string | null;
        event_type: "practice_started" | "question_answered" | "practice_completed" | "practice_abandoned" | "explanation_opened" | "generation_failed" | "diagnostic_started" | "diagnostic_completed" | "diagnostic_skipped";
        metadata: Json;
        created_at: string;
      }>;
      bookmarks: DatabaseTable<{
        id: string;
        user_id: string;
        question_id: string;
        created_at: string;
        updated_at: string;
      }>;
      user_topic_performance: DatabaseTable<{
        id: string;
        user_id: string;
        module: "core" | "computer_science";
        topic: string;
        subtopic: string;
        attempts_count: number;
        correct_count: number;
        incorrect_count: number;
        unanswered_count: number;
        average_response_time_seconds: number | null;
        accuracy: number | null;
        last_practiced_at: string | null;
      }>;
      study_plans: DatabaseTable<{
        id: string;
        user_id: string;
        plan_date: string;
        status: "draft" | "active" | "completed" | "archived";
      }>;
      study_tasks: DatabaseTable<{
        id: string;
        study_plan_id: string;
        title: string;
        description: string | null;
        topic: string | null;
        target_count: number | null;
        status: "pending" | "in_progress" | "completed" | "skipped";
        due_at: string | null;
        sort_order: number;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

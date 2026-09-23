import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_ORIGINS,
  GENERAL_ACADEMIC_REVIEW_STATUSES,
  GENERAL_ACADEMIC_SKILLS,
} from "./registries";

const migration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/202609010030_general_academic_foundation.sql",
), "utf8");
const reviewMigration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/202609020031_general_academic_review_lifecycle.sql",
), "utf8");
const practiceMigration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/202609030032_general_academic_student_practice.sql",
), "utf8");
const learningMigration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/202609030033_general_academic_learning_loop.sql",
), "utf8");
const mockMigration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/202609030034_general_academic_mock_engine.sql",
), "utf8");

describe("General Academic migration authorization contract", () => {
  it("creates only additive General Academic content tables", () => {
    expect(migration).toContain("create table public.general_academic_source_packs");
    expect(migration).toContain("create table public.general_academic_questions");
    expect(migration).not.toMatch(/alter table public\.(?:questions|mocks|practice_attempts)\b/i);
    expect(migration).not.toMatch(/\b(?:drop|truncate)\s+table\b/i);
  });

  it("persists every canonical registry value in database enums", () => {
    for (const value of [
      ...GENERAL_ACADEMIC_DOMAINS,
      ...GENERAL_ACADEMIC_SKILLS,
      ...GENERAL_ACADEMIC_ORIGINS,
      ...GENERAL_ACADEMIC_REVIEW_STATUSES,
    ]) {
      expect(migration).toContain(`'${value}'`);
    }
    expect(GENERAL_ACADEMIC_DIFFICULTIES).toEqual(["easy", "medium", "hard"]);
    expect(migration).toContain("difficulty public.question_difficulty not null");
  });

  it("enforces source-pack question identity and order invariants", () => {
    expect(migration).toContain("unique (source_pack_id, local_id)");
    expect(migration).toContain("unique (source_pack_id, order_index)");
    expect(migration).toContain("order_index integer not null check (order_index > 0)");
    expect(migration).toContain("on delete cascade");
  });

  it("enables RLS and withholds browser mutation grants", () => {
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on public.general_academic_source_packs from public, anon, authenticated");
    expect(migration).toContain("revoke all on public.general_academic_questions from public, anon, authenticated");
    expect(migration).not.toMatch(/grant\s+(?:insert|update|delete|all).*authenticated/i);
  });

  it("uses the existing role system for admin and reviewer access", () => {
    expect(migration).toContain("public.current_user_has_role('admin')");
    expect(migration).toContain("public.current_user_has_any_role(array['reviewer', 'admin']::public.app_role[])");
    expect(migration).toContain("from public.user_roles");
  });

  it("keeps atomic draft RPCs service-only and forces draft lifecycle", () => {
    expect(migration).toContain("create or replace function public.create_general_academic_draft");
    expect(migration).toContain("create or replace function public.update_general_academic_draft");
    expect(migration).toMatch(/revoke all on function public\.create_general_academic_draft[\s\S]+authenticated/);
    expect(migration).toMatch(/grant execute on function public\.create_general_academic_draft[\s\S]+service_role/);
    expect(migration).toContain("review_status = 'draft'");
    expect(migration).not.toMatch(/create policy[^;]+to anon/i);
  });
});

describe("General Academic Phase 4 lifecycle migration contract", () => {
  it("is additive and preserves existing GAM and Core tables", () => {
    expect(reviewMigration).toContain("alter table public.general_academic_source_packs");
    expect(reviewMigration).toContain("create table public.general_academic_review_events");
    expect(reviewMigration).not.toMatch(/\b(?:drop|truncate)\s+table\b/i);
    expect(reviewMigration).not.toMatch(/alter table public\.(?:questions|mocks|practice_attempts)\b/i);
  });

  it("records server-owned reviewer, approver and publisher metadata", () => {
    for (const field of ["reviewed_at", "approved_by", "approved_at", "published_by", "published_at"]) {
      expect(reviewMigration).toContain(field);
    }
    expect(reviewMigration).toContain("actor_user_id uuid not null");
    expect(reviewMigration).toContain("created_at timestamptz not null default");
  });

  it("enforces the lifecycle transition graph in the database RPC", () => {
    expect(reviewMigration).toContain("v_from = 'draft' and p_to_status = 'needs_review'");
    expect(reviewMigration).toContain("v_from = 'needs_review' and p_to_status in ('draft', 'approved', 'rejected')");
    expect(reviewMigration).toContain("v_from = 'approved' and p_to_status in ('needs_review', 'published')");
    expect(reviewMigration).toContain("v_from = 'rejected' and p_to_status = 'draft'");
    expect(reviewMigration).toContain("v_from = 'published' and p_to_status = 'archived'");
  });

  it("requires an admin actor and rejection note server-side", () => {
    expect(reviewMigration).toContain("from public.user_roles where user_id = p_actor_id and role = 'admin'");
    expect(reviewMigration).toContain("p_to_status = 'rejected'");
    expect(reviewMigration).toContain("general_academic_rejection_reason_required");
  });

  it("keeps the transition RPC service-role-only", () => {
    expect(reviewMigration).toMatch(/revoke all on function public\.transition_general_academic_pack[\s\S]+authenticated/);
    expect(reviewMigration).toMatch(/grant execute on function public\.transition_general_academic_pack[\s\S]+service_role/);
  });

  it("protects the append-only event log with RLS and no browser writes", () => {
    expect(reviewMigration).toContain("alter table public.general_academic_review_events enable row level security");
    expect(reviewMigration).toContain("revoke all on public.general_academic_review_events from public, anon, authenticated");
    expect(reviewMigration).not.toMatch(/grant\s+(?:insert|update|delete|all).*general_academic_review_events.*authenticated/i);
  });
});

describe("General Academic Phase 5 practice migration contract", () => {
  it("adds dedicated snapshot attempts without changing Core tables", () => {
    expect(practiceMigration).toContain("create table public.general_academic_practice_attempts");
    expect(practiceMigration).toContain("create table public.general_academic_practice_answers");
    expect(practiceMigration).not.toMatch(/alter table public\.(?:practice_sessions|practice_session_items|test_attempts|user_responses)\b/i);
    expect(practiceMigration).not.toMatch(/\b(?:drop|truncate)\s+table\b/i);
  });

  it("stores bounded public and private snapshots separately", () => {
    expect(practiceMigration).toContain("public_snapshot jsonb not null");
    expect(practiceMigration).toContain("private_snapshot jsonb not null");
    expect(practiceMigration).toContain("pg_column_size(public_snapshot) <= 2097152");
  });

  it("permits only published non-deleted source packs at creation", () => {
    expect(practiceMigration).toContain("review_status = 'published'");
    expect(practiceMigration).toContain("deleted_at is null");
  });

  it("prevents duplicate active attempts with a lock and partial unique index", () => {
    expect(practiceMigration).toContain("pg_advisory_xact_lock");
    expect(practiceMigration).toContain("idx_general_academic_practice_one_active_user");
    expect(practiceMigration).toContain("where status = 'in_progress'");
  });

  it("enforces ownership and in-progress state for answer mutation", () => {
    expect(practiceMigration).toMatch(/where id = p_attempt_id and user_id = p_user_id and status = 'in_progress'/);
    expect(practiceMigration).toContain("general_academic_invalid_option");
  });

  it("calculates the result from the private snapshot on the server", () => {
    expect(practiceMigration).toContain("v_attempt.private_snapshot");
    expect(practiceMigration).toContain("answer.selected_option = expected.correct_option");
    expect(practiceMigration).not.toMatch(/p_(?:score|correct|answer_key)/);
  });

  it("makes submission idempotent and submitted answers immutable", () => {
    expect(practiceMigration).toContain("if v_attempt.status = 'submitted' then return");
    expect(practiceMigration).toContain("status = 'submitted'");
  });

  it("keeps tables and RPCs inaccessible to browser roles", () => {
    expect(practiceMigration).toContain("enable row level security");
    expect(practiceMigration).toContain("revoke all on public.general_academic_practice_attempts from public, anon, authenticated");
    expect(practiceMigration).toContain("revoke all on function public.save_general_academic_practice_state");
    expect(practiceMigration).toContain("to service_role");
  });
});

describe("General Academic Phase 6 learning-loop migration contract", () => {
  it("adds dedicated source-aware tables without altering Core learning tables", () => {
    expect(learningMigration).toContain("create table public.general_academic_bookmarks");
    expect(learningMigration).toContain("create table public.general_academic_mistakes");
    expect(learningMigration).not.toMatch(/alter table public\.(?:bookmarks|mistake_notebook_entries|user_topic_performance)\b/i);
    expect(learningMigration).not.toMatch(/\b(?:drop|truncate)\s+table\b/i);
  });

  it("prevents duplicate logical bookmarks and mistakes", () => {
    expect(learningMigration.match(/unique \(user_id, source_pack_id, question_id\)/g)).toHaveLength(2);
  });

  it("validates bookmark ownership and snapshot membership server-side", () => {
    expect(learningMigration).toContain("id = p_attempt_id and user_id = p_user_id and status = 'submitted'");
    expect(learningMigration).toContain("v_attempt.public_snapshot");
    expect(learningMigration).toContain("v_attempt.private_snapshot");
  });

  it("derives mistakes only on the first transition to submitted", () => {
    expect(learningMigration).toContain("new.status = 'submitted'");
    expect(learningMigration).toContain("old.status is distinct from new.status");
    expect(learningMigration).toContain("answer.selected_option = private_question ->> 'correctOption'");
  });

  it("excludes unanswered questions from mistakes", () => {
    expect(learningMigration).toContain("if v_question.selected_option is null then");
    expect(learningMigration).toContain("continue;");
  });

  it("supports increment, resolution and reactivation without erasing history", () => {
    expect(learningMigration).toContain("times_incorrect = public.general_academic_mistakes.times_incorrect + 1");
    expect(learningMigration).toContain("times_correct_after_mistake = times_correct_after_mistake + 1");
    expect(learningMigration).toContain("status = 'resolved'");
    expect(learningMigration).toContain("status = 'active'");
    expect(learningMigration).toContain("latest_missed_attempt_id");
  });

  it("backfills existing submitted history without mutating attempts", () => {
    expect(learningMigration).toContain("Backfill already-submitted Phase 5 attempts");
    expect(learningMigration).toContain("from public.general_academic_practice_attempts attempt");
    expect(learningMigration).not.toMatch(/update public\.general_academic_practice_(?:attempts|answers)/);
  });

  it("aggregates counts server-side from private snapshots and stored answers", () => {
    expect(learningMigration).toContain("get_general_academic_learning_analytics");
    expect(learningMigration).toContain("private_question ->> 'correctOption'");
    expect(learningMigration).toContain("limit 5");
  });

  it("keeps learning tables and RPCs service-role-only", () => {
    expect(learningMigration).toContain("revoke all on public.general_academic_bookmarks from public, anon, authenticated");
    expect(learningMigration).toContain("revoke all on public.general_academic_mistakes from public, anon, authenticated");
    expect(learningMigration).toMatch(/revoke all on function public\.toggle_general_academic_bookmark[\s\S]+authenticated/);
    expect(learningMigration).toContain("revoke all on function public.sync_general_academic_mistakes_from_submission() from public, anon, authenticated");
    expect(learningMigration).toMatch(/grant execute on function public\.get_general_academic_learning_analytics[\s\S]+service_role/);
  });
});

describe("General Academic Phase 7 mock-engine migration contract", () => {
  it("adds dedicated GAM mock tables without altering Core mocks", () => {
    expect(mockMigration).toContain("create table public.general_academic_mock_attempts");
    expect(mockMigration).toContain("create table public.general_academic_mock_answers");
    expect(mockMigration).not.toMatch(/alter table public\.(?:tests|test_sections|test_questions|test_attempts|user_responses)\b/i);
    expect(mockMigration).not.toMatch(/\b(?:drop|truncate)\s+table\b/i);
  });

  it("enforces one active attempt, atomic creation, and current published inventory", () => {
    expect(mockMigration).toContain("idx_general_academic_mock_one_active_user");
    expect(mockMigration).toContain("pg_advisory_xact_lock");
    expect(mockMigration).toContain("review_status = 'published'");
    expect(mockMigration).toContain("deleted_at is null");
  });

  it("fixes the duration at one server-controlled 90-minute expiry", () => {
    expect(mockMigration).toContain("duration_seconds = 5400");
    expect(mockMigration).toContain("expires_at = started_at + interval '90 minutes'");
    expect(mockMigration).toContain("clock_timestamp()");
  });

  it("validates ownership, status, expiry, pack, question, option and navigation on save", () => {
    expect(mockMigration).toContain("id = p_attempt_id and user_id = p_user_id for update");
    expect(mockMigration).toContain("v_attempt.expires_at <= v_now");
    expect(mockMigration).toContain("p_source_pack_id::text");
    expect(mockMigration).toContain("question ->> 'id' = p_question_id");
    expect(mockMigration).toContain("option ->> 'id' = p_selected_option");
  });

  it("scores exclusively from the private snapshot and stored answers", () => {
    expect(mockMigration).toContain("v_attempt.private_snapshot -> 'packs'");
    expect(mockMigration).toContain("question ->> 'correctOption'");
    expect(mockMigration).not.toMatch(/p_(?:score|correct|accuracy|answer_key)/);
  });

  it("makes manual and expired submission converge on one idempotent finalizer", () => {
    expect(mockMigration).toContain("finalize_general_academic_mock_attempt");
    expect(mockMigration).toContain("if not found or v_attempt.status = 'submitted' then return");
    expect(mockMigration).toContain("case when p_now >= expires_at then 'expired' else 'manual' end");
  });

  it("integrates mock-origin bookmarks and mistakes without weakening identity", () => {
    expect(mockMigration).toContain("general_academic_bookmark_one_origin");
    expect(mockMigration).toContain("general_academic_mistake_one_latest_origin");
    expect(mockMigration).toContain("toggle_general_academic_mock_bookmark");
    expect(mockMigration).toContain("sync_general_academic_mistakes_from_mock_submission");
  });

  it("combines practice and mock observations transparently once", () => {
    expect(mockMigration).toContain("practice_scored");
    expect(mockMigration).toContain("mock_scored");
    expect(mockMigration).toContain("union all");
    expect(mockMigration).toContain("recent_attempts");
  });

  it("keeps tables and RPCs inaccessible to browser roles", () => {
    expect(mockMigration).toContain("enable row level security");
    expect(mockMigration).toContain("revoke all on public.general_academic_mock_attempts from public, anon, authenticated");
    expect(mockMigration).toContain("revoke all on function public.save_general_academic_mock_state");
    expect(mockMigration).toContain("to service_role");
  });
});

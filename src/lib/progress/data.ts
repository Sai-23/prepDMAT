import "server-only";

import type { StructuralProfile } from "@/lib/generation/novelty";
import type { PracticeQuestion } from "@/lib/practice/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { buildCoreProgress, getModuleFromProgress, getSkillFromProgress, type CoreProgress, type ProgressObservation } from "./model";
import { coreSkill, mapQuestionToSkills, type CoreSkillId } from "./skills";

type PracticeSessionRow = {
  id: string;
  module: ProgressObservation["module"];
  source_mode: "generated" | "exact_review";
  status: "in_progress" | "completed" | "abandoned" | "failed";
  session_type: "standard_practice" | "targeted_practice" | "exact_review" | "diagnostic";
};
type PracticeItemRow = {
  id: string;
  session_id: string;
  difficulty: ProgressObservation["difficulty"];
  public_snapshot: unknown;
  private_snapshot: unknown;
  structural_profile: unknown;
  response_status: "unanswered" | "answered" | "skipped";
  is_correct: boolean | null;
  time_spent_seconds: number;
  answered_at: string | null;
};
type MockAttemptRow = {
  id: string;
  mock_origin: "curated" | "generated";
  status: "in_progress" | "submitted" | "auto_submitted" | "abandoned";
};
type MockItemRow = { attempt_id: string; question_key: string; public_snapshot: unknown; private_snapshot: unknown };
type MockResponseRow = {
  id: string;
  attempt_id: string;
  question_key: string;
  response_status: "unanswered" | "answered" | "skipped";
  is_correct: boolean | null;
  time_spent_seconds: number;
  answered_at: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asProfile(value: unknown): StructuralProfile | null {
  const row = record(value);
  return row && typeof row.namespace === "string" && record(row.features)
    ? row as unknown as StructuralProfile
    : null;
}

function traceFromPrivateSnapshot(value: unknown) {
  return record(value)?.explanationTrace;
}

function questionFromSnapshot(value: unknown): PracticeQuestion | null {
  const row = record(value);
  if (!row || !["figure_sequence", "mathematical_equation", "latin_square"].includes(String(row.questionType))) return null;
  return row as unknown as PracticeQuestion;
}

export async function loadCoreProgressObservations(userId: string): Promise<ProgressObservation[]> {
  const admin = createSupabaseAdminClient();
  const [practiceResult, mockResult] = await Promise.all([
    admin.from("practice_sessions")
      .select("id, module, source_mode, status, session_type")
      .eq("user_id", userId).eq("status", "completed").eq("source_mode", "generated")
      .neq("session_type", "diagnostic")
      .order("completed_at", { ascending: false })
      .limit(1000)
      .overrideTypes<PracticeSessionRow[], { merge: false }>(),
    admin.from("test_attempts")
      .select("id, mock_origin, status")
      .eq("user_id", userId).in("status", ["submitted", "auto_submitted"])
      .order("submitted_at", { ascending: false })
      .limit(250)
      .overrideTypes<MockAttemptRow[], { merge: false }>(),
  ]);
  if (practiceResult.error || mockResult.error) throw new Error("Unable to load progress history.");

  const practiceSessions = practiceResult.data ?? [];
  const mockAttempts = mockResult.data ?? [];
  const [practiceItemsResult, mockItemsResult, mockResponsesResult] = await Promise.all([
    practiceSessions.length
      ? admin.from("practice_session_items")
          .select("id, session_id, difficulty, public_snapshot, private_snapshot, structural_profile, response_status, is_correct, time_spent_seconds, answered_at")
          .in("session_id", practiceSessions.map((session) => session.id)).eq("response_status", "answered")
          .limit(10000).overrideTypes<PracticeItemRow[], { merge: false }>()
      : Promise.resolve({ data: [] as PracticeItemRow[], error: null }),
    mockAttempts.length
      ? admin.from("practice_attempt_items").select("attempt_id, question_key, public_snapshot, private_snapshot")
          .in("attempt_id", mockAttempts.map((attempt) => attempt.id)).limit(10000)
          .overrideTypes<MockItemRow[], { merge: false }>()
      : Promise.resolve({ data: [] as MockItemRow[], error: null }),
    mockAttempts.length
      ? admin.from("user_responses")
          .select("id, attempt_id, question_key, response_status, is_correct, time_spent_seconds, answered_at")
          .in("attempt_id", mockAttempts.map((attempt) => attempt.id)).eq("response_status", "answered").limit(10000)
          .overrideTypes<MockResponseRow[], { merge: false }>()
      : Promise.resolve({ data: [] as MockResponseRow[], error: null }),
  ]);
  if (practiceItemsResult.error || mockItemsResult.error || mockResponsesResult.error) {
    throw new Error("Unable to load progress responses.");
  }

  const practiceSessionById = new Map(practiceSessions.map((session) => [session.id, session]));
  const practiceObservations = (practiceItemsResult.data ?? []).flatMap((item): ProgressObservation[] => {
    const session = practiceSessionById.get(item.session_id);
    const question = questionFromSnapshot(item.public_snapshot);
    if (!session || !question || item.is_correct === null || !item.answered_at) return [];
    return [{
      id: `practice:${item.id}`,
      sessionId: item.session_id,
      module: session.module,
      difficulty: item.difficulty,
      source: "practice",
      correct: item.is_correct,
      responseTimeSeconds: Math.max(0, item.time_spent_seconds),
      expectedTimeSeconds: question.estimatedTimeSeconds || null,
      answeredAt: item.answered_at,
      skills: mapQuestionToSkills({
        module: session.module,
        structuralProfile: asProfile(item.structural_profile),
        publicSnapshot: item.public_snapshot,
        explanationTrace: traceFromPrivateSnapshot(item.private_snapshot),
      }),
    }];
  });

  const attemptById = new Map(mockAttempts.map((attempt) => [attempt.id, attempt]));
  const itemByKey = new Map((mockItemsResult.data ?? []).map((item) => [`${item.attempt_id}:${item.question_key}`, item]));
  const mockObservations = (mockResponsesResult.data ?? []).flatMap((response): ProgressObservation[] => {
    const attempt = attemptById.get(response.attempt_id);
    const item = itemByKey.get(`${response.attempt_id}:${response.question_key}`);
    const question = item ? questionFromSnapshot(item.public_snapshot) : null;
    if (!attempt || !item || !question || response.is_correct === null || !response.answered_at || question.module !== "core") return [];
    const questionModule = question.questionType;
    return [{
      id: `mock:${response.id}`,
      sessionId: response.attempt_id,
      module: questionModule,
      difficulty: question.difficulty,
      source: attempt.mock_origin === "generated" ? "generated_mock" : "curated_mock",
      correct: response.is_correct,
      responseTimeSeconds: Math.max(0, response.time_spent_seconds),
      expectedTimeSeconds: question.estimatedTimeSeconds || null,
      answeredAt: response.answered_at,
      skills: mapQuestionToSkills({
        module: questionModule,
        publicSnapshot: item.public_snapshot,
        // Curated snapshots must not gain invented skill precision from answer-only metadata.
        explanationTrace: attempt.mock_origin === "generated" ? traceFromPrivateSnapshot(item.private_snapshot) : undefined,
      }),
    }];
  });
  return [...practiceObservations, ...mockObservations].sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
}

export async function getCoreProgress(userId: string): Promise<CoreProgress> {
  return buildCoreProgress(await loadCoreProgressObservations(userId));
}

export async function getModuleProgress(userId: string, module: ProgressObservation["module"]) {
  return getModuleFromProgress(await getCoreProgress(userId), module);
}

export async function getSkillPerformance(userId: string, skillId: CoreSkillId) {
  if (!coreSkill(skillId)) return null;
  return getSkillFromProgress(await getCoreProgress(userId), skillId);
}

export async function getWeakAreas(userId: string) {
  return (await getCoreProgress(userId)).weakAreas;
}

export async function getRecommendations(userId: string) {
  return (await getCoreProgress(userId)).recommendations;
}

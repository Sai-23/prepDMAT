import "server-only";

import { getCoreProgress } from "@/lib/progress/data";
import { MODULE_LABELS } from "@/lib/progress/model";
import type { PracticeModule } from "@/lib/practice/schemas";
import type { StudentDiagnosticStatus } from "@/lib/constants/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/validators/env";

import {
  assembleStudentDashboard,
  type DashboardActivity,
  type DashboardLatestMock,
  type DashboardLatestPractice,
  type DashboardResumeCandidate,
  type StudentDashboardViewModel,
} from "./model";

const PRACTICE_TEST_ID = "00000000-0000-4000-8000-000000000001";
const CORE_SECTION_TYPES = new Set([
  "figure_sequence",
  "mathematical_equation",
  "latin_square",
  "mixed",
]);

type ProfileRow = {
  display_name: string | null;
  full_name: string | null;
  target_exam_date: string | null;
  diagnostic_status: StudentDiagnosticStatus;
};

type PracticeSessionRow = {
  id: string;
  module: PracticeModule | null;
  session_type: "standard_practice" | "targeted_practice" | "exact_review" | "diagnostic";
  difficulty_mode: "easy" | "medium" | "hard" | "mixed";
  question_count: number;
  timing_mode: "timed" | "untimed";
  source_mode: "generated" | "exact_review";
  current_position: number;
  correct_count: number;
  incorrect_count: number;
  started_at: string;
  expires_at: string | null;
  completed_at: string | null;
};

type ActiveMockRow = {
  id: string;
  test_id: string | null;
  generated_mock_id: string | null;
  mock_origin: "curated" | "generated";
  display_title: string | null;
  started_at: string;
  expires_at: string | null;
  last_activity_at: string;
  current_section_key: string | null;
  test_snapshot: unknown;
};

type CompletedMockRow = {
  id: string;
  display_title: string | null;
  submitted_at: string | null;
  accuracy: number | null;
};

type MockResponseRow = {
  attempt_id: string;
  is_correct: boolean | null;
};

type PublishedTestRow = { id: string };
type TestSectionRow = { test_id: string; section_type: string };

type DashboardQueryBundle = {
  profile: ProfileRow | null;
  activePractice: PracticeSessionRow[];
  practiceHistory: PracticeSessionRow[];
  activeMocks: ActiveMockRow[];
  mockHistory: CompletedMockRow[];
};

export type LoadStudentDashboardResult =
  | {
      data: StudentDashboardViewModel;
      error: null;
      warnings: string[];
    }
  | {
      data: null;
      error: string;
      warnings: string[];
    };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function activeSectionTitle(attempt: ActiveMockRow): string | null {
  const sections = record(attempt.test_snapshot)?.sections;
  if (!Array.isArray(sections)) return null;
  const current = sections.find(
    (section) => record(section)?.id === attempt.current_section_key,
  );
  const title = record(current)?.title;
  return typeof title === "string" && title.trim() ? title : null;
}

function safeNumber(value: number | null): number {
  return value === null || !Number.isFinite(Number(value)) ? 0 : Number(value);
}

function practiceTitle(row: PracticeSessionRow): string {
  if (!row.module) return "Core diagnostic";
  return row.source_mode === "exact_review"
    ? `${MODULE_LABELS[row.module]} review`
    : `${MODULE_LABELS[row.module]} practice`;
}

function buildPracticeResume(row: PracticeSessionRow): DashboardResumeCandidate {
  const answeredCount = Math.min(
    row.question_count,
    Math.max(0, row.correct_count + row.incorrect_count),
  );
  const shared = {
    id: row.id,
    title: practiceTitle(row),
    description: `${answeredCount} of ${row.question_count} answered · ${row.timing_mode === "timed" ? "Timed" : "Untimed"}`,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
  };
  if (row.session_type === "diagnostic") {
    return { ...shared, kind: "diagnostic", href: "/onboarding/diagnostic" };
  }
  return { ...shared, kind: "practice", href: "/practice", timingMode: row.timing_mode };
}

function buildMockResume(row: ActiveMockRow): DashboardResumeCandidate | null {
  const targetId = row.test_id ?? row.generated_mock_id;
  if (!targetId) return null;
  const sectionTitle = activeSectionTitle(row);
  return {
    kind: "mock",
    id: row.id,
    title: row.display_title?.trim() || "Core Mock",
    description: sectionTitle
      ? `Continue from ${sectionTitle}. Your existing attempt is saved.`
      : "Continue your saved exam-style Core attempt.",
    href: `/tests/${targetId}/take?attempt=${row.id}`,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
  };
}

function responseCounts(rows: MockResponseRow[]) {
  const byAttempt = new Map<string, { correct: number; total: number }>();
  rows.forEach((row) => {
    const current = byAttempt.get(row.attempt_id) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (row.is_correct === true) current.correct += 1;
    byAttempt.set(row.attempt_id, current);
  });
  return byAttempt;
}

function mapPracticeActivity(row: PracticeSessionRow): DashboardActivity | null {
  if (!row.completed_at) return null;
  const correct = Math.max(0, row.correct_count);
  const total = Math.max(1, row.question_count);
  return {
    id: row.id,
    type: "practice",
    title: practiceTitle(row),
    subtitle: `${row.difficulty_mode[0].toUpperCase()}${row.difficulty_mode.slice(1)} · ${row.timing_mode === "timed" ? "Timed" : "Untimed"}`,
    completedAt: row.completed_at,
    href: `/practice/review/${row.id}`,
    correctCount: correct,
    questionCount: total,
    accuracy: (correct / total) * 100,
  };
}

function mapMockActivity(
  row: CompletedMockRow,
  counts: Map<string, { correct: number; total: number }>,
): DashboardActivity | null {
  if (!row.submitted_at) return null;
  const count = counts.get(row.id);
  return {
    id: row.id,
    type: "mock",
    title: row.display_title?.trim() || "Core Mock",
    subtitle: "Completed Core Mock",
    completedAt: row.submitted_at,
    href: `/results?attempt=${row.id}`,
    correctCount: count?.correct ?? null,
    questionCount: count?.total ?? null,
    accuracy: row.accuracy === null ? null : safeNumber(row.accuracy),
  };
}

async function loadPrimaryDashboardRows(userId: string): Promise<DashboardQueryBundle> {
  const admin = createSupabaseAdminClient();
  const [
    profileResult,
    activePracticeResult,
    practiceHistoryResult,
    activeMockResult,
    mockHistoryResult,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("display_name, full_name, target_exam_date, diagnostic_status")
      .eq("id", userId)
      .maybeSingle()
      .overrideTypes<ProfileRow | null, { merge: false }>(),
    admin
      .from("practice_sessions")
      .select(
        "id, module, session_type, difficulty_mode, question_count, timing_mode, source_mode, current_position, correct_count, incorrect_count, started_at, expires_at, completed_at",
      )
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .overrideTypes<PracticeSessionRow[], { merge: false }>(),
    admin
      .from("practice_sessions")
      .select(
        "id, module, session_type, difficulty_mode, question_count, timing_mode, source_mode, current_position, correct_count, incorrect_count, started_at, expires_at, completed_at",
      )
      .eq("user_id", userId)
      .eq("status", "completed")
      .neq("session_type", "diagnostic")
      .order("completed_at", { ascending: false })
      .limit(6)
      .overrideTypes<PracticeSessionRow[], { merge: false }>(),
    admin
      .from("test_attempts")
      .select(
        "id, test_id, generated_mock_id, mock_origin, display_title, started_at, expires_at, last_activity_at, current_section_key, test_snapshot",
      )
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("last_activity_at", { ascending: false })
      .limit(4)
      .overrideTypes<ActiveMockRow[], { merge: false }>(),
    admin
      .from("test_attempts")
      .select("id, display_title, submitted_at, accuracy")
      .eq("user_id", userId)
      .in("status", ["submitted", "auto_submitted"])
      .order("submitted_at", { ascending: false })
      .limit(6)
      .overrideTypes<CompletedMockRow[], { merge: false }>(),
  ]);

  const error = [
    profileResult.error,
    activePracticeResult.error,
    practiceHistoryResult.error,
    activeMockResult.error,
    mockHistoryResult.error,
  ].find(Boolean);
  if (error) throw new Error("Unable to load dashboard activity.");

  return {
    profile: profileResult.data,
    activePractice: activePracticeResult.data ?? [],
    practiceHistory: practiceHistoryResult.data ?? [],
    activeMocks: activeMockResult.data ?? [],
    mockHistory: mockHistoryResult.data ?? [],
  };
}

async function loadOwnedMockResponseCounts(
  userId: string,
  attempts: CompletedMockRow[],
): Promise<Map<string, { correct: number; total: number }>> {
  if (!attempts.length) return new Map();

  // Attempt IDs come only from the preceding user_id-scoped query. The response
  // projection is intentionally limited to aggregate correctness fields.
  const admin = createSupabaseAdminClient();
  const ownedAttemptIds = attempts.map((attempt) => attempt.id);
  const ownershipResult = await admin
    .from("test_attempts")
    .select("id")
    .eq("user_id", userId)
    .in("id", ownedAttemptIds)
    .overrideTypes<Array<{ id: string }>, { merge: false }>();
  if (ownershipResult.error) throw new Error("Unable to verify mock ownership.");
  const verifiedIds = (ownershipResult.data ?? []).map((attempt) => attempt.id);
  if (!verifiedIds.length) return new Map();

  const responsesResult = await admin
    .from("user_responses")
    .select("attempt_id, is_correct")
    .in("attempt_id", verifiedIds)
    .limit(600)
    .overrideTypes<MockResponseRow[], { merge: false }>();
  if (responsesResult.error) throw new Error("Unable to load mock result totals.");
  return responseCounts(responsesResult.data ?? []);
}

async function hasPublishedCoreMock(): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const testsResult = await admin
    .from("tests")
    .select("id")
    .eq("is_published", true)
    .neq("id", PRACTICE_TEST_ID)
    .order("created_at", { ascending: false })
    .limit(20)
    .overrideTypes<PublishedTestRow[], { merge: false }>();
  if (testsResult.error) throw new Error("Unable to check Core mock availability.");
  const tests = testsResult.data ?? [];
  if (!tests.length) return false;

  const sectionsResult = await admin
    .from("test_sections")
    .select("test_id, section_type")
    .in(
      "test_id",
      tests.map((test) => test.id),
    )
    .eq("is_current", true)
    .limit(100)
    .overrideTypes<TestSectionRow[], { merge: false }>();
  if (sectionsResult.error) throw new Error("Unable to check Core mock sections.");
  const sections = sectionsResult.data ?? [];

  return tests.some((test) => {
    const testSections = sections.filter((section) => section.test_id === test.id);
    return (
      testSections.length > 0 &&
      testSections.every((section) => CORE_SECTION_TYPES.has(section.section_type))
    );
  });
}

export async function loadStudentDashboardData(
  userId: string,
  now = new Date(),
): Promise<LoadStudentDashboardResult> {
  const onDemandMocksEnabled = getEnv().ENABLE_ON_DEMAND_CORE_MOCKS;
  const [primaryResult, progressResult, availabilityResult] =
    await Promise.allSettled([
      loadPrimaryDashboardRows(userId),
      getCoreProgress(userId),
      onDemandMocksEnabled ? Promise.resolve(true) : hasPublishedCoreMock(),
    ]);

  if (primaryResult.status === "rejected") {
    return {
      data: null,
      error: "We could not load your dashboard activity. Try again shortly.",
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const primary = primaryResult.value;
  const progress = progressResult.status === "fulfilled" ? progressResult.value : null;
  if (progressResult.status === "rejected") {
    warnings.push("Core progress is temporarily unavailable. Your activity and resume actions are still shown.");
  }
  const mockAvailable =
    availabilityResult.status === "fulfilled" ? availabilityResult.value : false;
  if (availabilityResult.status === "rejected") {
    warnings.push("Mock availability could not be confirmed, so the mock shortcut is hidden for now.");
  }

  let counts = new Map<string, { correct: number; total: number }>();
  try {
    counts = await loadOwnedMockResponseCounts(userId, primary.mockHistory);
  } catch {
    warnings.push("Exact mock score totals are temporarily unavailable. Saved accuracy is shown instead.");
  }

  const practiceActivity = primary.practiceHistory
    .map(mapPracticeActivity)
    .filter((activity): activity is DashboardActivity => activity !== null);
  const mockActivity = primary.mockHistory
    .map((attempt) => mapMockActivity(attempt, counts))
    .filter((activity): activity is DashboardActivity => activity !== null);
  const recentActivity = [...practiceActivity, ...mockActivity];
  const latestPracticeRow = primary.practiceHistory[0] ?? null;
  const latestPractice: DashboardLatestPractice | null =
    latestPracticeRow?.completed_at && latestPracticeRow.module
      ? {
          sessionId: latestPracticeRow.id,
          title: practiceTitle(latestPracticeRow),
          module: latestPracticeRow.module,
          correctCount: Math.max(0, latestPracticeRow.correct_count),
          questionCount: Math.max(1, latestPracticeRow.question_count),
          completedAt: latestPracticeRow.completed_at,
          href: `/practice/review/${latestPracticeRow.id}`,
        }
      : null;
  const latestMockRow = primary.mockHistory[0] ?? null;
  const latestMockCount = latestMockRow ? counts.get(latestMockRow.id) : undefined;
  const latestMock: DashboardLatestMock | null =
    latestMockRow?.submitted_at
      ? {
          attemptId: latestMockRow.id,
          title: latestMockRow.display_title?.trim() || "Core Mock",
          correctCount: latestMockCount?.correct ?? null,
          questionCount: latestMockCount?.total ?? null,
          accuracy:
            latestMockRow.accuracy === null
              ? null
              : safeNumber(latestMockRow.accuracy),
          completedAt: latestMockRow.submitted_at,
          href: `/results?attempt=${latestMockRow.id}`,
        }
      : null;
  const resumeCandidates = [
    ...primary.activeMocks
      .map(buildMockResume)
      .filter((candidate): candidate is DashboardResumeCandidate => candidate !== null),
    ...primary.activePractice.map(buildPracticeResume),
  ];

  return {
    data: assembleStudentDashboard({
      displayName:
        primary.profile?.display_name ?? primary.profile?.full_name ?? "Student",
      diagnosticStatus: primary.profile?.diagnostic_status ?? "not_started",
      targetExamDate: primary.profile?.target_exam_date ?? null,
      onDemandMocksEnabled,
      mockAvailable,
      resumeCandidates,
      progress,
      progressUnavailable: progressResult.status === "rejected",
      recentActivity,
      latestPractice,
      latestMock,
      now,
    }),
    error: null,
    warnings,
  };
}

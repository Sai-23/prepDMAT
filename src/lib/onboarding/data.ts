import "server-only";

import type { StructuralProfile } from "@/lib/generation/novelty";
import type { PrivatePracticeSnapshot } from "@/lib/practice/native";
import type { PracticeAnswer, PracticeQuestion, PracticeReviewItem } from "@/lib/practice/schemas";
import {
  markPracticeQuestionShown,
  recordDiagnosticAnswer,
} from "@/lib/practice/data";
import { mapQuestionToSkills } from "@/lib/progress/skills";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { generateCoreDiagnosticManifest } from "./diagnostic-generation";
import { buildInitialCoreProfile, type DiagnosticEvidence, type InitialCoreProfile } from "./model";

export type OnboardingPreference = "diagnostic" | "practice_first" | "explore";
export type DiagnosticStatus = "not_started" | "in_progress" | "completed" | "skipped";

export type OnboardingState = {
  completedAt: string | null;
  preference: OnboardingPreference | null;
  diagnosticStatus: DiagnosticStatus;
  diagnosticSessionId: string | null;
};

export type DiagnosticSessionState = {
  sessionId: string;
  currentPosition: number;
  questionCount: 15;
  question: PracticeQuestion;
  answer: PracticeAnswer | null;
  answered: boolean;
  targetPaceSeconds: number;
};

export type CompletedDiagnostic = {
  sessionId: string;
  completedAt: string;
  profile: InitialCoreProfile;
  reviewItems: PracticeReviewItem[];
};

type ProfileRow = {
  onboarding_completed_at: string | null;
  onboarding_preference: OnboardingPreference | null;
  diagnostic_status: DiagnosticStatus;
  diagnostic_session_id: string | null;
};

type DiagnosticSessionRow = {
  id: string;
  user_id: string;
  status: "in_progress" | "completed" | "abandoned" | "failed";
  current_position: number;
  question_count: number;
  completed_at: string | null;
};

type DiagnosticItemRow = {
  id: string;
  question_key: string;
  position: number;
  question_type: "figure_sequence" | "mathematical_equation" | "latin_square";
  difficulty: "easy" | "medium" | "hard";
  public_snapshot: unknown;
  private_snapshot: unknown;
  structural_profile: unknown;
  response_status: "unanswered" | "answered" | "skipped";
  response_payload: unknown;
  is_correct: boolean | null;
  time_spent_seconds: number;
  answered_at: string | null;
  reasoning_family: string;
  reasoning_classification: string;
};

function profileState(row: ProfileRow): OnboardingState {
  return {
    completedAt: row.onboarding_completed_at,
    preference: row.onboarding_preference,
    diagnosticStatus: row.diagnostic_status,
    diagnosticSessionId: row.diagnostic_session_id,
  };
}

export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles")
    .select("onboarding_completed_at, onboarding_preference, diagnostic_status, diagnostic_session_id")
    .eq("id", userId).maybeSingle()
    .overrideTypes<ProfileRow | null, { merge: false }>();
  if (error || !data) throw new Error("Unable to load first-use status.");
  return profileState(data);
}

export async function completeOnboardingWithoutDiagnostic(
  userId: string,
  preference: Exclude<OnboardingPreference, "diagnostic">,
) {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin.from("profiles")
    .update({
      onboarding_completed_at: now,
      onboarding_preference: preference,
      diagnostic_status: "skipped",
    })
    .eq("id", userId).neq("diagnostic_status", "in_progress")
    .select("id").maybeSingle();
  if (error || !data) throw new Error("Unable to save the onboarding choice.");
  await admin.from("practice_events").insert({
    user_id: userId,
    session_id: null,
    event_type: "diagnostic_skipped",
    metadata: { preference },
  });
}

export async function startInitialDiagnostic(userId: string): Promise<string> {
  const current = await getOnboardingState(userId);
  if (current.diagnosticStatus === "in_progress" && current.diagnosticSessionId) {
    return current.diagnosticSessionId;
  }
  if (current.diagnosticStatus === "completed" || current.diagnosticStatus === "skipped") {
    throw new Error("The initial diagnostic is already closed for this account.");
  }

  const admin = createSupabaseAdminClient();
  const { data: recentSessions } = await admin.from("practice_sessions")
    .select("id").eq("user_id", userId).eq("status", "completed")
    .order("completed_at", { ascending: false }).limit(20);
  const recentIds = (recentSessions ?? []).map((row) => row.id as string);
  const { data: recentItems } = recentIds.length
    ? await admin.from("practice_session_items")
        .select("fingerprint, structural_profile").in("session_id", recentIds)
        .order("created_at", { ascending: false }).limit(400)
    : { data: [] };
  const sessionId = crypto.randomUUID();
  const masterSeed = crypto.randomUUID();
  let items;
  try {
    items = generateCoreDiagnosticManifest({
      masterSeed,
      blockedFingerprints: (recentItems ?? []).map((item) => String(item.fingerprint)),
      recentProfiles: (recentItems ?? []).map((item) => item.structural_profile as StructuralProfile),
    });
  } catch (error) {
    await admin.from("practice_events").insert({
      user_id: userId,
      session_id: null,
      event_type: "generation_failed",
      metadata: { context: "initial_diagnostic", errorName: error instanceof Error ? error.name : "unknown" },
    });
    throw new Error("Unable to generate the diagnostic right now. You can try again or skip for now.");
  }

  const { error } = await admin.rpc("create_initial_core_diagnostic", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_master_seed: masterSeed,
    p_started_at: new Date().toISOString(),
    p_items: items,
  });
  if (error) {
    if (String(error.message).includes("active_practice_session_exists")) {
      throw new Error("Finish your current Practice session before starting the diagnostic.");
    }
    throw new Error("Unable to save the diagnostic. Apply the latest database migration and try again.");
  }
  return sessionId;
}

async function diagnosticSessionRow(
  userId: string,
  status: "in_progress" | "completed",
  knownSessionId?: string | null,
) {
  const admin = createSupabaseAdminClient();
  const sessionId = knownSessionId
    ?? (await getOnboardingState(userId)).diagnosticSessionId;
  if (!sessionId) return null;
  const { data } = await admin.from("practice_sessions").select("id, user_id, status, current_position, question_count, completed_at")
    .eq("id", sessionId).eq("user_id", userId).eq("session_type", "diagnostic")
    .eq("status", status).maybeSingle()
    .overrideTypes<DiagnosticSessionRow | null, { merge: false }>();
  return data;
}

export async function getActiveDiagnosticSession(
  userId: string,
  knownSessionId?: string | null,
): Promise<DiagnosticSessionState | null> {
  const admin = createSupabaseAdminClient();
  const session = await diagnosticSessionRow(userId, "in_progress", knownSessionId);
  if (!session) return null;
  const position = Math.min(session.current_position, session.question_count);
  const { data, error } = await admin.from("practice_session_items")
    .select("id, question_key, position, question_type, difficulty, public_snapshot, private_snapshot, structural_profile, response_status, response_payload, is_correct, time_spent_seconds, answered_at, reasoning_family, reasoning_classification")
    .eq("session_id", session.id).eq("position", position).maybeSingle()
    .overrideTypes<DiagnosticItemRow | null, { merge: false }>();
  if (error || !data) throw new Error("Unable to restore the diagnostic question.");
  const question = data.public_snapshot as PracticeQuestion;
  return {
    sessionId: session.id,
    currentPosition: data.position,
    questionCount: 15,
    question,
    answer: data.response_status === "answered" ? data.response_payload as PracticeAnswer : null,
    answered: data.response_status === "answered",
    targetPaceSeconds: Math.max(1, Math.round(question.estimatedTimeSeconds || 60)),
  };
}

export async function showDiagnosticQuestion(userId: string, sessionId: string, questionId: string) {
  const state = await getOnboardingState(userId);
  if (state.diagnosticSessionId !== sessionId || state.diagnosticStatus !== "in_progress") {
    throw new Error("This diagnostic is unavailable.");
  }
  await markPracticeQuestionShown(userId, sessionId, questionId);
}

export async function saveDiagnosticAnswer(
  userId: string,
  input: { sessionId: string; questionId: string; answer: PracticeAnswer },
) {
  const state = await getOnboardingState(userId);
  if (state.diagnosticSessionId !== input.sessionId || state.diagnosticStatus !== "in_progress") {
    throw new Error("This diagnostic is unavailable.");
  }
  await recordDiagnosticAnswer(userId, input);
  return { saved: true as const };
}

export async function advanceDiagnosticQuestion(userId: string, sessionId: string) {
  const state = await getOnboardingState(userId);
  if (state.diagnosticSessionId !== sessionId || state.diagnosticStatus !== "in_progress") {
    throw new Error("This diagnostic is unavailable.");
  }
  return advanceVerifiedDiagnosticQuestion(userId, sessionId);
}

async function advanceVerifiedDiagnosticQuestion(userId: string, sessionId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("advance_practice_question", {
    p_user_id: userId,
    p_session_id: sessionId,
  });
  if (error) throw new Error("Save the current answer before continuing.");
  const session = await getActiveDiagnosticSession(userId, sessionId);
  if (!session) throw new Error("Unable to load the next diagnostic question.");
  return session;
}

export type DiagnosticContinuationResult =
  | { status: "advanced"; session: DiagnosticSessionState }
  | { status: "completed" }
  | { status: "error"; error: string; answerSaved: boolean };

export async function continueInitialDiagnostic(
  userId: string,
  input: { sessionId: string; questionId: string; answer: PracticeAnswer },
): Promise<DiagnosticContinuationResult> {
  const onboarding = await getOnboardingState(userId);
  if (onboarding.diagnosticStatus === "completed") return { status: "completed" };
  if (
    onboarding.diagnosticStatus !== "in_progress"
    || onboarding.diagnosticSessionId !== input.sessionId
  ) {
    return {
      status: "error",
      error: "This diagnostic is no longer available.",
      answerSaved: false,
    };
  }

  let currentPosition: number;
  let questionCount: number;
  let answerSaved = false;
  try {
    const saved = await recordDiagnosticAnswer(userId, input);
    currentPosition = saved.currentPosition;
    questionCount = saved.questionCount;
    answerSaved = true;
  } catch {
    // A retry may arrive after persistence committed but its response was lost.
    // Read the server-owned position instead of mutating a locked old answer.
    const current = await getActiveDiagnosticSession(
      userId,
      onboarding.diagnosticSessionId,
    );
    if (current?.question.id !== input.questionId) {
      return current
        ? { status: "advanced", session: current }
        : {
            status: "error",
            error: "Unable to restore the diagnostic question.",
            answerSaved: false,
          };
    }
    if (!current.answered) {
      return {
        status: "error",
        error: "Unable to save this answer. Check your connection and try again.",
        answerSaved: false,
      };
    }
    currentPosition = current.currentPosition;
    questionCount = current.questionCount;
    answerSaved = true;
  }

  if (currentPosition === questionCount) {
    try {
      await completeVerifiedDiagnostic(userId, input.sessionId);
      return { status: "completed" };
    } catch {
      return {
        status: "error",
        error: "The answer was saved, but the diagnostic could not finish. Try again.",
        answerSaved,
      };
    }
  }

  try {
    return {
      status: "advanced",
      session: await advanceVerifiedDiagnosticQuestion(userId, input.sessionId),
    };
  } catch {
    return {
      status: "error",
      error: "The answer was saved, but the next question could not load. Try again.",
      answerSaved,
    };
  }
}

export async function completeInitialDiagnostic(userId: string, sessionId: string) {
  const state = await getOnboardingState(userId);
  if (state.diagnosticSessionId !== sessionId || state.diagnosticStatus !== "in_progress") {
    throw new Error("This diagnostic is unavailable.");
  }
  await completeVerifiedDiagnostic(userId, sessionId);
}

async function completeVerifiedDiagnostic(userId: string, sessionId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("complete_initial_core_diagnostic", {
    p_user_id: userId,
    p_session_id: sessionId,
  });
  if (error) throw new Error("Answer all 15 questions before completing the diagnostic.");
}

function feedback(item: DiagnosticItemRow) {
  const privateSnapshot = item.private_snapshot as PrivatePracticeSnapshot;
  return {
    isCorrect: item.is_correct === true,
    correctAnswer: privateSnapshot.correctAnswer,
    explanation: privateSnapshot.explanation,
    explanationTrace: privateSnapshot.explanationTrace,
    educationalExplanation: privateSnapshot.educationalExplanation,
  };
}

export async function getCompletedDiagnostic(userId: string): Promise<CompletedDiagnostic | null> {
  const admin = createSupabaseAdminClient();
  const session = await diagnosticSessionRow(userId, "completed");
  if (!session?.completed_at) return null;
  const { data, error } = await admin.from("practice_session_items")
    .select("id, question_key, position, question_type, difficulty, public_snapshot, private_snapshot, structural_profile, response_status, response_payload, is_correct, time_spent_seconds, answered_at, reasoning_family, reasoning_classification")
    .eq("session_id", session.id).order("position")
    .overrideTypes<DiagnosticItemRow[], { merge: false }>();
  if (error || data?.length !== 15) throw new Error("Unable to load the completed diagnostic.");
  const items = data ?? [];
  const evidence: DiagnosticEvidence[] = items.map((item) => {
    const question = item.public_snapshot as PracticeQuestion;
    const privateSnapshot = item.private_snapshot as PrivatePracticeSnapshot;
    return {
      id: item.id,
      module: item.question_type,
      difficulty: item.difficulty,
      correct: item.is_correct === true,
      answeredAt: item.answered_at ?? session.completed_at!,
      responseTimeSeconds: Math.max(0, item.time_spent_seconds),
      expectedTimeSeconds: question.estimatedTimeSeconds || null,
      skills: mapQuestionToSkills({
        module: item.question_type,
        structuralProfile: item.structural_profile as StructuralProfile,
        publicSnapshot: item.public_snapshot,
        explanationTrace: privateSnapshot.explanationTrace,
      }),
    };
  });
  return {
    sessionId: session.id,
    completedAt: session.completed_at,
    profile: buildInitialCoreProfile(evidence),
    reviewItems: items.map((item) => ({
      position: item.position,
      question: item.public_snapshot as PracticeQuestion,
      answer: item.response_payload as PracticeAnswer,
      feedback: feedback(item),
      timeSpentSeconds: item.time_spent_seconds,
      reasoningFamily: item.reasoning_family,
      reasoningClassification: item.reasoning_classification,
    })),
  };
}

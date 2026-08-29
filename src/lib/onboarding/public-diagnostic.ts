import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import type { StructuralProfile } from "@/lib/generation/novelty";
import type { PrivatePracticeSnapshot } from "@/lib/practice/native";
import { gradePracticeAnswer } from "@/lib/practice/native";
import {
  answerMatchesQuestion,
  type PracticeAnswer,
  type PracticeQuestion,
} from "@/lib/practice/schemas";
import { mapQuestionToSkills } from "@/lib/progress/skills";
import { enforceSecurityRateLimit } from "@/lib/security/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  DIAGNOSTIC_QUESTION_COUNT,
  generateCoreDiagnosticManifest,
} from "./diagnostic-generation";
import type {
  DiagnosticContinuationResult,
  DiagnosticSessionState,
} from "./data";
import {
  buildInitialCoreProfile,
  type DiagnosticEvidence,
  type InitialCoreProfile,
} from "./model";

const PUBLIC_DIAGNOSTIC_COOKIE = "prepdmat_public_diagnostic";
const PUBLIC_DIAGNOSTIC_TTL_SECONDS = 2 * 60 * 60;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type PublicSessionRow = {
  id: string;
  status: "in_progress" | "completed";
  current_position: number;
  question_count: number;
  completed_at: string | null;
  expires_at: string;
};

type PublicItemRow = {
  id: string;
  question_key: string;
  position: number;
  question_type: PracticeQuestion["questionType"];
  difficulty: PracticeQuestion["difficulty"];
  public_snapshot: unknown;
  private_snapshot: unknown;
  structural_profile: unknown;
  response_status: "unanswered" | "answered" | "skipped";
  response_payload: unknown;
  is_correct: boolean | null;
  time_spent_seconds: number;
  shown_at: string | null;
  answered_at: string | null;
};

type AnswerRpcRow = {
  result_status: "advanced" | "completed";
  result_position: number;
};

export type CompletedPublicDiagnostic = {
  completedAt: string;
  profile: InitialCoreProfile;
};

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function currentToken() {
  const value = (await cookies()).get(PUBLIC_DIAGNOSTIC_COOKIE)?.value ?? null;
  return value && TOKEN_PATTERN.test(value) ? value : null;
}

async function setCurrentToken(token: string) {
  (await cookies()).set(PUBLIC_DIAGNOSTIC_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PUBLIC_DIAGNOSTIC_TTL_SECONDS,
  });
}

export async function clearPublicDiagnosticCookie() {
  (await cookies()).delete(PUBLIC_DIAGNOSTIC_COOKIE);
}

async function sessionForToken(token: string, status?: PublicSessionRow["status"]) {
  const admin = createSupabaseAdminClient();
  let query = admin.from("public_diagnostic_sessions")
    .select("id, status, current_position, question_count, completed_at, expires_at")
    .eq("token_hash", tokenHash(token))
    .gt("expires_at", new Date().toISOString());
  if (status) query = query.eq("status", status);
  const { data, error } = await query.maybeSingle()
    .overrideTypes<PublicSessionRow | null, { merge: false }>();
  if (error) throw new Error("Unable to restore the public diagnostic.");
  return data;
}

async function currentItem(session: PublicSessionRow) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("public_diagnostic_items")
    .select("id, question_key, position, question_type, difficulty, public_snapshot, private_snapshot, structural_profile, response_status, response_payload, is_correct, time_spent_seconds, shown_at, answered_at")
    .eq("session_id", session.id)
    .eq("position", Math.min(session.current_position, session.question_count))
    .maybeSingle()
    .overrideTypes<PublicItemRow | null, { merge: false }>();
  if (error || !data) throw new Error("Unable to restore the public diagnostic question.");
  return data;
}

function publicState(session: PublicSessionRow, item: PublicItemRow): DiagnosticSessionState {
  const question = item.public_snapshot as PracticeQuestion;
  return {
    sessionId: session.id,
    currentPosition: item.position,
    questionCount: DIAGNOSTIC_QUESTION_COUNT,
    question,
    answer: item.response_status === "answered"
      ? item.response_payload as PracticeAnswer
      : null,
    answered: item.response_status === "answered",
    targetPaceSeconds: Math.max(1, Math.round(question.estimatedTimeSeconds || 60)),
  };
}

export async function createPublicDiagnostic(): Promise<DiagnosticSessionState> {
  const admin = createSupabaseAdminClient();
  const token = randomBytes(32).toString("base64url");
  const sessionId = randomUUID();
  const masterSeed = randomUUID();
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + PUBLIC_DIAGNOSTIC_TTL_SECONDS * 1000);
  const items = generateCoreDiagnosticManifest({ masterSeed });
  const { error } = await admin.rpc("create_public_core_diagnostic", {
    p_session_id: sessionId,
    p_token_hash: tokenHash(token),
    p_master_seed: masterSeed,
    p_started_at: startedAt.toISOString(),
    p_expires_at: expiresAt.toISOString(),
    p_items: items,
  });
  if (error) {
    throw new Error("Unable to start the public diagnostic. Apply the latest database migration and try again.");
  }
  await setCurrentToken(token);
  const session = await sessionForToken(token, "in_progress");
  if (!session) throw new Error("Unable to restore the new public diagnostic.");
  return publicState(session, await currentItem(session));
}

export async function getActivePublicDiagnostic(): Promise<DiagnosticSessionState | null> {
  const token = await currentToken();
  if (!token) return null;
  const session = await sessionForToken(token, "in_progress");
  if (!session) return null;
  return publicState(session, await currentItem(session));
}

export async function getPublicDiagnosticStatus() {
  const token = await currentToken();
  if (!token) return "not_started" as const;
  const session = await sessionForToken(token);
  return session?.status ?? "not_started";
}

export async function showPublicDiagnosticQuestion(sessionId: string, questionId: string) {
  const token = await currentToken();
  if (!token) throw new Error("This public diagnostic is unavailable.");
  const session = await sessionForToken(token, "in_progress");
  if (!session || session.id !== sessionId) throw new Error("This public diagnostic is unavailable.");
  const item = await currentItem(session);
  if (item.question_key !== questionId) throw new Error("This public diagnostic question is unavailable.");
  if (!item.shown_at) {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("public_diagnostic_items")
      .update({ shown_at: new Date().toISOString() })
      .eq("id", item.id).eq("session_id", session.id).is("shown_at", null);
    if (error) throw new Error("Unable to start response timing.");
  }
}

export async function continuePublicDiagnostic(input: {
  sessionId: string;
  questionId: string;
  answer: PracticeAnswer;
}): Promise<DiagnosticContinuationResult> {
  const token = await currentToken();
  if (!token) return { status: "error", error: "This public diagnostic is unavailable.", answerSaved: false };
  const session = await sessionForToken(token);
  if (!session || session.id !== input.sessionId) {
    return { status: "error", error: "This public diagnostic is unavailable.", answerSaved: false };
  }
  if (session.status === "completed") return { status: "completed" };
  const item = await currentItem(session);
  if (item.question_key !== input.questionId) {
    return { status: "advanced", session: publicState(session, item) };
  }
  const question = item.public_snapshot as PracticeQuestion;
  if (!answerMatchesQuestion(input.answer, question)) {
    return { status: "error", error: "Choose a valid answer before continuing.", answerSaved: false };
  }
  const privateSnapshot = item.private_snapshot as PrivatePracticeSnapshot;
  const elapsedSeconds = item.shown_at
    ? Math.max(0, Math.round((Date.now() - new Date(item.shown_at).getTime()) / 1000))
    : 0;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("record_public_diagnostic_answer", {
    p_token_hash: tokenHash(token),
    p_question_key: item.question_key,
    p_response_payload: input.answer,
    p_is_correct: gradePracticeAnswer(input.answer, privateSnapshot),
    p_time_spent_seconds: Math.min(86400, elapsedSeconds),
  });
  if (error) {
    const restored = await sessionForToken(token);
    if (restored?.status === "completed") return { status: "completed" };
    if (restored && restored.current_position !== session.current_position) {
      return { status: "advanced", session: publicState(restored, await currentItem(restored)) };
    }
    return {
      status: "error",
      error: "Unable to save this answer. Check your connection and try again.",
      answerSaved: false,
    };
  }
  const result = (Array.isArray(data) ? data[0] : data) as AnswerRpcRow | null;
  if (result?.result_status === "completed") return { status: "completed" };
  const advanced = await sessionForToken(token, "in_progress");
  if (!advanced) {
    return { status: "error", error: "The answer was saved, but the next question could not load. Try again.", answerSaved: true };
  }
  return { status: "advanced", session: publicState(advanced, await currentItem(advanced)) };
}

export async function getCompletedPublicDiagnostic(): Promise<CompletedPublicDiagnostic | null> {
  const token = await currentToken();
  if (!token) return null;
  const session = await sessionForToken(token, "completed");
  if (!session?.completed_at) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("public_diagnostic_items")
    .select("id, question_key, position, question_type, difficulty, public_snapshot, private_snapshot, structural_profile, response_status, response_payload, is_correct, time_spent_seconds, shown_at, answered_at")
    .eq("session_id", session.id).order("position")
    .overrideTypes<PublicItemRow[], { merge: false }>();
  if (error || data?.length !== DIAGNOSTIC_QUESTION_COUNT) {
    throw new Error("Unable to load the public diagnostic result.");
  }
  const evidence: DiagnosticEvidence[] = data.map((item) => {
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
  return { completedAt: session.completed_at, profile: buildInitialCoreProfile(evidence) };
}

export async function claimPublicDiagnosticForUser(userId: string) {
  const token = await currentToken();
  if (!token) return false;
  await enforceSecurityRateLimit("assessment:public-diagnostic-claim", { userId });
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("claim_public_core_diagnostic", {
    p_token_hash: tokenHash(token),
    p_user_id: userId,
  });
  if (error) throw new Error("Unable to attach the completed diagnostic to this account.");
  await clearPublicDiagnosticCookie();
  return true;
}

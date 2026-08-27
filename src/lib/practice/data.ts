import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PublicActionError } from "@/lib/security/public-errors";

import { generatePracticeManifest, practiceDurationSeconds, type PracticeItemManifest } from "./generation";
import { createPracticeSnapshots, gradePracticeAnswer, type PrivatePracticeSnapshot } from "./native";
import type {
  PracticeAnswer,
  PracticeConfig,
  PracticeFeedback,
  PracticeModulePerformance,
  PracticeQuestion,
  PracticeReview,
  PracticeSessionState,
  PracticeSummary,
} from "./schemas";
import { practiceTargetPaceSeconds } from "./timing";
import { coreSkill, mapQuestionToSkills } from "@/lib/progress/skills";
import { getMockPracticeContext } from "@/lib/results/mock-practice-context";
import type { MathematicalEquationStructuredData } from "@/lib/generation/mathematical-equations";
import { createVerifiedEquationExplanationTrace } from "./mathematical-equation-explanation-trace";
import { createVerifiedFigureExplanationTrace } from "./figure-sequence-explanation-trace";
import { createVerifiedLatinExplanationTrace } from "./latin-square-explanation-trace";
import type { FigureSequencePresentation } from "@/lib/generation/figure-sequences";
import type { LatinSquareStructuredData } from "@/lib/generation/latin-squares";

type QuestionRow = {
  id: string;
  module: "core";
  question_type: PracticeQuestion["questionType"];
  topic: string;
  subtopic: string | null;
  difficulty: PracticeQuestion["difficulty"];
  question_text: string;
  passage: string | null;
  code: string | null;
  formula: string | null;
  table_data: unknown;
  image_url: string | null;
  estimated_time_seconds: number;
  structured_data: unknown;
  metadata: unknown;
  explanation: string;
  correct_option_id: string | null;
  source_type: string;
};

type OptionRow = { id: string; question_id: string; label: string; content: string; sort_order: number };

type SessionRow = {
  id: string;
  module: PracticeQuestion["questionType"];
  difficulty_mode: "easy" | "medium" | "hard" | "mixed";
  question_count: number;
  timing_mode: "untimed" | "timed";
  status: "in_progress" | "completed" | "abandoned" | "failed";
  expires_at: string | null;
  current_position: number;
  correct_count: number;
  incorrect_count: number;
  total_time_seconds: number;
  completed_at?: string | null;
};

type ItemRow = {
  id: string;
  question_key: string;
  position: number;
  public_snapshot: unknown;
  private_snapshot: unknown;
  response_status: "unanswered" | "answered" | "skipped";
  response_payload: unknown;
  is_correct: boolean | null;
  time_spent_seconds: number;
  shown_at: string | null;
  answered_at: string | null;
  reasoning_family: string;
  reasoning_classification: string;
  difficulty: PracticeQuestion["difficulty"];
  structural_profile: unknown;
  source_question_id?: string | null;
  generator_version?: string | null;
  validator_version?: string | null;
  seed?: string | null;
  fingerprint?: string | null;
};

function feedback(item: ItemRow, question: PracticeQuestion): PracticeFeedback | null {
  if (item.response_status !== "answered") return null;
  const privateSnapshot = item.private_snapshot as PrivatePracticeSnapshot;
  const mathematicalExplanationTrace = question.questionType === "mathematical_equation"
    ? createVerifiedEquationExplanationTrace(
        question.structuredData as MathematicalEquationStructuredData,
        privateSnapshot.explanationTrace,
        privateSnapshot.correctAnswer,
        privateSnapshot.mathematicalExplanationTrace,
      )
    : null;
  const figureExplanationTrace = question.questionType === "figure_sequence"
    ? createVerifiedFigureExplanationTrace(
        question.structuredData as FigureSequencePresentation,
        privateSnapshot.figureExplanationTrace ?? privateSnapshot.explanationTrace,
        privateSnapshot.correctAnswer,
      )
    : null;
  const latinExplanationTrace = question.questionType === "latin_square"
    ? createVerifiedLatinExplanationTrace(
        question.structuredData as LatinSquareStructuredData,
        privateSnapshot.explanationTrace,
        privateSnapshot.correctAnswer,
        privateSnapshot.latinExplanationTrace?.completedGrid,
      )
    : null;
  return {
    isCorrect: item.is_correct === true,
    correctAnswer: privateSnapshot.correctAnswer,
    explanation: privateSnapshot.explanation,
    ...(privateSnapshot.explanationTrace === undefined ? {} : { explanationTrace: privateSnapshot.explanationTrace }),
    ...(figureExplanationTrace ? { figureExplanationTrace } : {}),
    ...(latinExplanationTrace ? { latinExplanationTrace } : {}),
    ...(mathematicalExplanationTrace ? { mathematicalExplanationTrace } : {}),
    ...(privateSnapshot.educationalExplanation === undefined ? {} : { educationalExplanation: privateSnapshot.educationalExplanation }),
  };
}

function answerMatchesQuestion(answer: PracticeAnswer, question: PracticeQuestion): boolean {
  const response = question.response ?? { kind: "single_choice" as const, options: question.options };
  if (response.kind !== answer.kind) return false;
  if (answer.kind === "single_choice" && response.kind === "single_choice") {
    return response.options.some((option) => option.id === answer.optionId);
  }
  if (answer.kind === "symbol_assignment" && response.kind === "symbol_assignment") {
    const supplied = Object.keys(answer.values).sort();
    return supplied.length === response.symbols.length
      && supplied.every((symbol, index) => symbol === [...response.symbols].sort()[index]);
  }
  if (answer.kind === "two_stage_single_choice") {
    const matrices = (question.structuredData as { missingMatrices?: Array<{ candidates?: Array<{ id?: string }> }> })?.missingMatrices ?? [];
    return matrices.length === 2 && answer.optionIds.every((optionId, index) =>
      matrices[index]?.candidates?.some((candidate) => candidate.id === optionId));
  }
  return false;
}

function state(session: SessionRow, item: ItemRow): PracticeSessionState {
  const question = item.public_snapshot as PracticeQuestion;
  return {
    sessionId: session.id,
    module: session.module,
    difficulty: session.difficulty_mode,
    questionCount: session.question_count,
    timingMode: session.timing_mode,
    expiresAt: session.expires_at,
    currentPosition: item.position,
    correctCount: session.correct_count,
    incorrectCount: session.incorrect_count,
    totalTimeSeconds: session.total_time_seconds,
    question,
    answer: item.response_status === "answered" ? item.response_payload as PracticeAnswer : null,
    feedback: feedback(item, question),
    targetPaceSeconds: practiceTargetPaceSeconds(question.estimatedTimeSeconds),
  };
}

function summary(session: SessionRow, items: ItemRow[]): PracticeSummary {
  const total = items.length || session.question_count;
  const correct = items.filter((item) => item.is_correct === true).length;
  const incorrect = items.filter((item) => item.response_status === "answered" && item.is_correct !== true).length;
  const familyCounts = new Map<string, number>();
  items.filter((item) => item.response_status === "answered" && item.is_correct !== true)
    .forEach((item) => {
      const privateSnapshot = item.private_snapshot as PrivatePracticeSnapshot;
      const skills = mapQuestionToSkills({
        module: session.module,
        structuralProfile: item.structural_profile as never,
        publicSnapshot: item.public_snapshot,
        explanationTrace: privateSnapshot.explanationTrace,
      });
      skills.forEach((skill) => familyCounts.set(skill, (familyCounts.get(skill) ?? 0) + 1 / Math.max(1, skills.length)));
    });
  const incorrectFamilies = [...familyCounts.entries()].sort((a, b) => b[1] - a[1]).map(([family]) => family);
  const accuracy = total ? (correct / total) * 100 : 0;
  const insight = incorrectFamilies[0]
    ? `Review ${coreSkill(incorrectFamilies[0])?.label ?? "the main reasoning skill"}, where the most errors occurred.`
    : accuracy === 100
      ? "All answers were correct. Try a harder or timed session next."
      : "Review the worked explanations, then repeat this module to build consistency.";
  return {
    sessionId: session.id,
    score: correct,
    correct,
    incorrect,
    accuracy,
    averageTimeSeconds: total ? session.total_time_seconds / total : 0,
    module: session.module,
    difficulty: session.difficulty_mode,
    insight,
    incorrectFamilies,
  };
}

async function exactQuestionManifest(questionId: string, expectedModule: PracticeQuestion["questionType"]): Promise<PracticeItemManifest> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("questions")
    .select("id, module, question_type, topic, subtopic, difficulty, question_text, passage, code, formula, table_data, image_url, estimated_time_seconds, structured_data, metadata, explanation, correct_option_id, source_type")
    .eq("id", questionId).eq("module", "core").eq("verification_status", "approved")
    .eq("publication_status", "published").is("deleted_at", null).maybeSingle();
  if (error || !data) throw new Error("This published practice question is no longer available.");
  const question = data as QuestionRow;
  if (question.question_type !== expectedModule) throw new Error("The selected question does not match this practice module.");
  const { data: optionData, error: optionError } = await admin.from("question_options")
    .select("id, question_id, label, content, sort_order").eq("question_id", questionId).order("sort_order");
  if (optionError) throw new Error("Unable to load this question's response options.");
  const questionKey = crypto.randomUUID();
  const snapshot = createPracticeSnapshots({
    id: questionKey, module: question.module, questionType: question.question_type,
    topic: question.topic, subtopic: question.subtopic, difficulty: question.difficulty,
    questionText: question.question_text, passage: question.passage, code: question.code,
    formula: question.formula, tableData: question.table_data, imageUrl: question.image_url,
    estimatedTimeSeconds: question.estimated_time_seconds, structuredData: question.structured_data,
    metadata: question.metadata, explanation: question.explanation,
    options: ((optionData ?? []) as OptionRow[]).map(({ id, label, content }) => ({ id, label, content })),
    correctOptionId: question.correct_option_id, sourceType: question.source_type,
  });
  const provenance = snapshot.privateSnapshot.provenance;
  return {
    source_question_id: question.id,
    question_key: questionKey,
    position: 1,
    question_type: question.question_type,
    difficulty: question.difficulty,
    public_snapshot: snapshot.publicQuestion,
    private_snapshot: snapshot.privateSnapshot,
    generator_version: String(provenance.generatorVersion ?? "bank"),
    validator_version: String(provenance.validatorVersion ?? "approved-workflow"),
    seed: String(provenance.seed ?? `exact/${question.id}`),
    fingerprint: String(provenance.fingerprint ?? `exact/${question.id}`),
    structural_profile: { namespace: question.question_type, features: { source: "approved-bank" } },
    reasoning_family: question.topic,
    reasoning_classification: question.subtopic ?? question.topic,
  };
}

export async function createPracticeSession(userId: string, config: PracticeConfig) {
  const admin = createSupabaseAdminClient();
  const sessionId = crypto.randomUUID();
  const masterSeed = crypto.randomUUID();
  const startedAt = new Date();
  const { data: recentSessionData } = config.questionId ? { data: [] } : await admin.from("practice_sessions")
    .select("id").eq("user_id", userId).eq("status", "completed").eq("source_mode", "generated")
    .order("completed_at", { ascending: false }).limit(20);
  const recentSessionIds = (recentSessionData ?? []).map((row) => row.id as string);
  const { data: recentItemData } = recentSessionIds.length
    ? await admin.from("practice_session_items").select("fingerprint, structural_profile")
        .in("session_id", recentSessionIds).order("created_at", { ascending: true }).limit(400)
    : { data: [] };
  const sourceContext = config.sourceAttemptId
    ? await getMockPracticeContext(userId, config.sourceAttemptId)
    : { fingerprints: [], structuralProfiles: [] };
  const items = config.questionId
    ? [await exactQuestionManifest(config.questionId, config.module)]
    : generatePracticeManifest({
        module: config.module,
        difficulty: config.difficulty,
        questionCount: config.questionCount as 5 | 10 | 20,
        masterSeed,
        focusSkills: config.focusFamilies,
        blockedFingerprints: [
          ...(recentItemData ?? []).map((item) => String(item.fingerprint)),
          ...sourceContext.fingerprints,
        ],
        recentProfiles: [
          ...(recentItemData ?? []).map((item) => item.structural_profile as never),
          ...sourceContext.structuralProfiles,
        ],
      });
  const duration = practiceDurationSeconds(config.module, config.questionCount, config.timingMode, items);
  const expiresAt = duration === null ? null : new Date(startedAt.getTime() + duration * 1000).toISOString();
  const { error } = await admin.rpc("create_practice_session", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_module: config.module,
    p_difficulty_mode: config.difficulty,
    p_question_count: config.questionCount,
    p_timing_mode: config.timingMode,
    p_source_mode: config.questionId ? "exact_review" : "generated",
    p_master_seed: masterSeed,
    p_started_at: startedAt.toISOString(),
    p_expires_at: expiresAt,
    p_retry_of_session_id: config.retryOfSessionId ?? null,
    p_focus_families: config.focusFamilies ?? [],
    p_items: items,
  });
  if (error) {
    if (String(error.message).includes("active_practice_session_exists")) {
      throw new Error("Finish or abandon your current practice session before starting another.");
    }
    throw new Error("Unable to save this practice session. Apply the latest database migration and try again.");
  }
  const sessionType = config.questionId
    ? "exact_review"
    : config.focusFamilies?.length
      ? "targeted_practice"
      : "standard_practice";
  const { error: categoryError } = await admin.from("practice_sessions")
    .update({ session_type: sessionType })
    .eq("id", sessionId).eq("user_id", userId);
  if (categoryError) throw new Error("Unable to classify this practice session.");
  return getActivePracticeSession(userId, sessionId);
}

export async function getPracticeLandingData(userId: string): Promise<PracticeModulePerformance[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("practice_sessions")
    .select("module, correct_count, incorrect_count, completed_at")
    .eq("user_id", userId).eq("status", "completed").neq("session_type", "diagnostic")
    .order("completed_at", { ascending: false }).limit(100);
  if (error) throw new Error("Unable to load recent practice performance.");
  return (["figure_sequence", "mathematical_equation", "latin_square"] as const).map((module) => {
    const rows = (data ?? []).filter((row) => row.module === module);
    const correct = rows.reduce((value, row) => value + Number(row.correct_count), 0);
    const total = rows.reduce((value, row) => value + Number(row.correct_count) + Number(row.incorrect_count), 0);
    return { module, completedSessions: rows.length, accuracy: total ? (correct / total) * 100 : null, lastPracticedAt: rows[0]?.completed_at ?? null };
  });
}

export async function getExactPracticeModule(questionId: string): Promise<PracticeQuestion["questionType"] | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("questions").select("question_type")
    .eq("id", questionId).eq("module", "core").eq("verification_status", "approved")
    .eq("publication_status", "published").is("deleted_at", null).maybeSingle();
  const type = data?.question_type;
  return type === "figure_sequence" || type === "mathematical_equation" || type === "latin_square" ? type : null;
}

export async function getActivePracticeSession(userId: string, sessionId?: string): Promise<PracticeSessionState | null> {
  const admin = createSupabaseAdminClient();
  let query = admin.from("practice_sessions").select("*").eq("user_id", userId)
    .eq("status", "in_progress").neq("session_type", "diagnostic");
  query = sessionId ? query.eq("id", sessionId) : query.order("started_at", { ascending: false }).limit(1);
  const { data } = await query.maybeSingle();
  if (!data) return null;
  const session = data as SessionRow;
  const { data: itemData } = await admin.from("practice_session_items").select("*")
    .eq("session_id", session.id).eq("position", Math.min(session.current_position, session.question_count)).maybeSingle();
  if (!itemData) return null;
  return state(session, itemData as ItemRow);
}

export async function markPracticeQuestionShown(userId: string, sessionId: string, questionId: string) {
  const admin = createSupabaseAdminClient();
  const { data: session } = await admin.from("practice_sessions").select("id, current_position")
    .eq("id", sessionId).eq("user_id", userId).eq("status", "in_progress").maybeSingle();
  if (!session) throw new Error("Practice session unavailable.");
  const { error } = await admin.from("practice_session_items").update({ shown_at: new Date().toISOString() })
    .eq("session_id", sessionId).eq("question_key", questionId).eq("position", session.current_position)
    .eq("response_status", "unanswered").is("shown_at", null);
  if (error) throw new Error("Unable to start response timing.");
}

export async function recordPracticeAnswer(userId: string, input: { sessionId: string; questionId: string; answer: PracticeAnswer }) {
  const admin = createSupabaseAdminClient();
  const { data: session } = await admin.from("practice_sessions").select("*")
    .eq("id", input.sessionId).eq("user_id", userId).eq("status", "in_progress").maybeSingle();
  if (!session) throw new Error("This practice session is no longer available.");
  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) throw new Error("Time has expired for this practice session.");
  const { data } = await admin.from("practice_session_items").select("*")
    .eq("session_id", input.sessionId).eq("question_key", input.questionId).maybeSingle();
  if (!data) throw new Error("The submitted answer is invalid.");
  const item = data as ItemRow;
  if (item.response_status === "answered") throw new Error("This question has already been answered.");
  if (!item.shown_at) throw new Error("The question timer has not started. Refresh and try again.");
  if (!answerMatchesQuestion(input.answer, item.public_snapshot as PracticeQuestion)) throw new Error("The submitted answer does not match this question's response format.");
  const privateSnapshot = item.private_snapshot as PrivatePracticeSnapshot;
  const isCorrect = gradePracticeAnswer(input.answer, privateSnapshot);
  const timeSpentSeconds = Math.max(0, Math.min(86_400, Math.round((Date.now() - new Date(item.shown_at).getTime()) / 1000)));
  const { error } = await admin.rpc("record_practice_answer", {
    p_user_id: userId, p_session_id: input.sessionId, p_question_key: input.questionId,
    p_response_payload: input.answer, p_is_correct: isCorrect, p_time_spent_seconds: timeSpentSeconds,
  });
  if (error) {
    if (String(error.message).includes("practice_answer_locked")) throw new Error("This question has already been answered.");
    throw new Error("Unable to save this answer.");
  }
  const question = item.public_snapshot as PracticeQuestion;
  return { ...feedback({ ...item, response_status: "answered", response_payload: input.answer, is_correct: isCorrect }, question)!, timeSpentSeconds, targetPaceSeconds: practiceTargetPaceSeconds(question.estimatedTimeSeconds) };
}

export async function openPracticeExplanation(userId: string, sessionId: string, questionId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("open_practice_explanation", { p_user_id: userId, p_session_id: sessionId, p_question_key: questionId });
  if (error) throw new Error("Unable to record explanation activity.");
}

export async function completePracticeSession(userId: string, sessionId: string): Promise<PracticeSummary> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("complete_practice_session", { p_user_id: userId, p_session_id: sessionId });
  if (error) {
    if (String(error.message).includes("practice_session_incomplete")) throw new Error("Answer every question before completing this session.");
    throw new Error("Unable to complete this practice session.");
  }
  const review = await getPracticeReview(userId, sessionId);
  return review.summary;
}

export async function abandonPracticeSession(userId: string, sessionId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("abandon_practice_session", { p_user_id: userId, p_session_id: sessionId });
  if (error) throw new Error("Unable to leave this practice session.");
}

export async function getPracticeReview(userId: string, sessionId: string): Promise<PracticeReview> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("practice_sessions").select("*").eq("id", sessionId).eq("user_id", userId).eq("status", "completed").maybeSingle();
  if (!data) throw new Error("This completed practice session is unavailable.");
  const session = data as SessionRow;
  const { data: itemData, error } = await admin.from("practice_session_items").select("*").eq("session_id", sessionId).order("position");
  if (error || !itemData?.length) throw new Error("Unable to load this practice review.");
  const items = itemData as ItemRow[];
  return {
    summary: summary(session, items),
    items: items.map((item) => ({
      position: item.position,
      question: item.public_snapshot as PracticeQuestion,
      answer: item.response_payload as PracticeAnswer,
      feedback: feedback(item, item.public_snapshot as PracticeQuestion)!,
      timeSpentSeconds: item.time_spent_seconds,
      reasoningFamily: item.reasoning_family,
      reasoningClassification: item.reasoning_classification,
    })),
  };
}

export async function getNextPracticeQuestion(userId: string, sessionId: string): Promise<PracticeSessionState> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("advance_practice_question", { p_user_id: userId, p_session_id: sessionId });
  if (error) throw new Error("Finish checking the current answer before moving forward.");
  const session = await getActivePracticeSession(userId, sessionId);
  if (!session) throw new Error("This practice session is unavailable.");
  return session;
}

export async function reportPracticeQuestion(userId: string, input: { sessionId: string; questionId: string; reason: string; details: string | null }) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("practice_sessions").select("id").eq("id", input.sessionId).eq("user_id", userId).maybeSingle();
  const { data: itemData } = await admin.from("practice_session_items")
    .select("id, source_question_id, generator_version, validator_version, seed, fingerprint")
    .eq("session_id", input.sessionId).eq("question_key", input.questionId).maybeSingle();
  const item = itemData as ItemRow | null;
  if (!data || !item) throw new Error("This question is not part of your practice session.");
  const { error } = await admin.from("question_reports").insert({
    question_id: item.source_question_id ?? null,
    practice_session_item_id: item.id,
    reporter_id: userId,
    reason: input.reason,
    details: input.details,
    provenance: { seed: item.seed, generatorVersion: item.generator_version, validatorVersion: item.validator_version, fingerprint: item.fingerprint },
  });
  if (error) {
    if (String(error.message).includes("question_report_duplicate")) {
      throw new PublicActionError(
        "INVALID_REQUEST",
        "You have already reported this question for review.",
      );
    }
    throw new Error("Unable to submit this report.");
  }
}

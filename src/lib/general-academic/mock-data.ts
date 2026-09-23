import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION,
  GENERAL_ACADEMIC_MOCK_DURATION_SECONDS,
  GENERAL_ACADEMIC_MOCK_RECENT_HISTORY_WINDOW,
  buildGeneralAcademicMockReview,
  buildGeneralAcademicMockSnapshots,
  composeGeneralAcademicMock,
  generalAcademicMockAnswerInputSchema,
  generalAcademicMockPrivateSnapshotSchema,
  generalAcademicMockPublicSnapshotSchema,
  type GeneralAcademicMockAnswer,
  type GeneralAcademicMockAttempt,
  type GeneralAcademicMockPrivateSnapshot,
  type GeneralAcademicMockReview,
  type GeneralAcademicMockStatus,
} from "./mock";
import { listPublishedGeneralAcademicPacks, startGeneralAcademicPracticePack } from "./practice-data";

type MockAttemptRow = {
  id: string;
  user_id: string;
  status: GeneralAcademicMockStatus;
  submission_reason: "manual" | "expired" | null;
  composition_version: string;
  seed: string;
  duration_seconds: number;
  pack_ids: string[];
  question_count: number;
  current_pack_index: number;
  current_question_id: string;
  public_snapshot: unknown;
  private_snapshot: unknown;
  correct_count: number | null;
  incorrect_count: number | null;
  unanswered_count: number | null;
  elapsed_seconds: number;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  last_activity_at: string;
};

type MockAnswerRow = {
  source_pack_id: string;
  question_id: string;
  selected_option: GeneralAcademicMockAnswer["selectedOption"];
  is_flagged: boolean;
  response_seconds: number;
  answered_at: string | null;
};

export type StoredGeneralAcademicMockAttempt = {
  id: string;
  userId: string;
  status: GeneralAcademicMockStatus;
  submissionReason: "manual" | "expired" | null;
  compositionVersion: typeof GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION;
  seed: string;
  durationSeconds: typeof GENERAL_ACADEMIC_MOCK_DURATION_SECONDS;
  packIds: string[];
  questionCount: number;
  currentPackIndex: number;
  currentQuestionId: string;
  publicSnapshot: z.infer<typeof generalAcademicMockPublicSnapshotSchema>;
  privateSnapshot: GeneralAcademicMockPrivateSnapshot;
  correctCount: number | null;
  incorrectCount: number | null;
  unansweredCount: number | null;
  elapsedSeconds: number;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  lastActivityAt: string;
  answers: GeneralAcademicMockAnswer[];
};

export type GeneralAcademicMockHistoryItem = {
  id: string;
  status: GeneralAcademicMockStatus;
  questionCount: number;
  correctCount: number | null;
  accuracy: number | null;
  elapsedSeconds: number;
  startedAt: string;
  submittedAt: string | null;
  currentPackIndex: number;
  packCount: number;
};

export interface GeneralAcademicMockRepository {
  listPublishedPacks: typeof listPublishedGeneralAcademicPacks;
  findActive(userId: string): Promise<StoredGeneralAcademicMockAttempt | null>;
  load(userId: string, attemptId: string): Promise<StoredGeneralAcademicMockAttempt | null>;
  recentPackIds(userId: string): Promise<string[]>;
  create(input: { id: string; userId: string; seed: string; packIds: string[]; questionCount: number; currentQuestionId: string; publicSnapshot: StoredGeneralAcademicMockAttempt["publicSnapshot"]; privateSnapshot: GeneralAcademicMockPrivateSnapshot }): Promise<string>;
  save(userId: string, input: z.infer<typeof generalAcademicMockAnswerInputSchema>): Promise<"saved" | "submitted">;
  submit(userId: string, attemptId: string): Promise<void>;
}

export class GeneralAcademicMockError extends Error {
  constructor(message: string, readonly code: "INVALID_REQUEST" | "NO_CONTENT" | "NOT_FOUND" | "LOCKED" | "PERSISTENCE_FAILED") {
    super(message);
    this.name = "GeneralAcademicMockError";
  }
}

const uuidSchema = z.string().uuid();

function validateUserId(userId: string) {
  if (!uuidSchema.safeParse(userId).success) throw new GeneralAcademicMockError("Sign in to continue.", "INVALID_REQUEST");
}

function createMockRepository(): GeneralAcademicMockRepository {
  const admin = createSupabaseAdminClient();
  const load = async (userId: string, attemptId?: string, activeOnly = false) => {
    let query = admin.from("general_academic_mock_attempts")
      .select("id, user_id, status, submission_reason, composition_version, seed, duration_seconds, pack_ids, question_count, current_pack_index, current_question_id, public_snapshot, private_snapshot, correct_count, incorrect_count, unanswered_count, elapsed_seconds, started_at, expires_at, submitted_at, last_activity_at")
      .eq("user_id", userId);
    if (attemptId) query = query.eq("id", attemptId);
    if (activeOnly) query = query.eq("status", "in_progress");
    const { data, error } = await query.order("started_at", { ascending: false }).limit(1).maybeSingle()
      .overrideTypes<MockAttemptRow | null, { merge: false }>();
    if (error) throw new GeneralAcademicMockError("Unable to load the General Academic mock.", "PERSISTENCE_FAILED");
    if (!data) return null;
    const [publicResult, privateResult, answerResult] = await Promise.all([
      Promise.resolve(generalAcademicMockPublicSnapshotSchema.safeParse(data.public_snapshot)),
      Promise.resolve(generalAcademicMockPrivateSnapshotSchema.safeParse(data.private_snapshot)),
      admin.from("general_academic_mock_answers")
        .select("source_pack_id, question_id, selected_option, is_flagged, response_seconds, answered_at")
        .eq("mock_attempt_id", data.id).overrideTypes<MockAnswerRow[], { merge: false }>(),
    ]);
    if (!publicResult.success || !privateResult.success || answerResult.error
      || data.composition_version !== GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION
      || data.duration_seconds !== GENERAL_ACADEMIC_MOCK_DURATION_SECONDS) {
      throw new GeneralAcademicMockError("Saved General Academic mock data is inconsistent.", "PERSISTENCE_FAILED");
    }
    return {
      id: data.id, userId: data.user_id, status: data.status, submissionReason: data.submission_reason,
      compositionVersion: GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION, seed: data.seed,
      durationSeconds: GENERAL_ACADEMIC_MOCK_DURATION_SECONDS, packIds: data.pack_ids,
      questionCount: data.question_count, currentPackIndex: data.current_pack_index,
      currentQuestionId: data.current_question_id, publicSnapshot: publicResult.data,
      privateSnapshot: privateResult.data, correctCount: data.correct_count,
      incorrectCount: data.incorrect_count, unansweredCount: data.unanswered_count,
      elapsedSeconds: data.elapsed_seconds, startedAt: data.started_at, expiresAt: data.expires_at,
      submittedAt: data.submitted_at, lastActivityAt: data.last_activity_at,
      answers: (answerResult.data ?? []).map((answer) => ({ packId: answer.source_pack_id, questionId: answer.question_id, selectedOption: answer.selected_option, isFlagged: answer.is_flagged, responseSeconds: answer.response_seconds, answeredAt: answer.answered_at })),
    } satisfies StoredGeneralAcademicMockAttempt;
  };
  return {
    listPublishedPacks: listPublishedGeneralAcademicPacks,
    findActive: (userId) => load(userId, undefined, true),
    load: (userId, attemptId) => load(userId, attemptId),
    async recentPackIds(userId) {
      const { data, error } = await admin.from("general_academic_mock_attempts").select("pack_ids")
        .eq("user_id", userId).eq("status", "submitted").order("submitted_at", { ascending: false })
        .limit(GENERAL_ACADEMIC_MOCK_RECENT_HISTORY_WINDOW)
        .overrideTypes<Array<{ pack_ids: string[] }>, { merge: false }>();
      if (error) throw new GeneralAcademicMockError("Unable to rotate General Academic mock content.", "PERSISTENCE_FAILED");
      return [...new Set((data ?? []).flatMap((attempt) => attempt.pack_ids))];
    },
    async create(input) {
      const { data, error } = await admin.rpc("create_general_academic_mock_attempt", {
        p_attempt_id: input.id,
        p_user_id: input.userId,
        p_composition_version: GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION,
        p_seed: input.seed,
        p_pack_ids: input.packIds,
        p_question_count: input.questionCount,
        p_current_question_id: input.currentQuestionId,
        p_public_snapshot: input.publicSnapshot,
        p_private_snapshot: input.privateSnapshot,
      });
      const parsed = uuidSchema.safeParse(data);
      if (error || !parsed.success) throw new GeneralAcademicMockError("Unable to start a General Academic mock.", "PERSISTENCE_FAILED");
      return parsed.data;
    },
    async save(userId, input) {
      const { data, error } = await admin.rpc("save_general_academic_mock_state", {
        p_user_id: userId, p_attempt_id: input.attemptId, p_source_pack_id: input.packId,
        p_question_id: input.questionId, p_selected_option: input.selectedOption,
        p_is_flagged: input.isFlagged, p_current_pack_index: input.currentPackIndex,
        p_current_question_id: input.currentQuestionId,
      });
      if (error || (data !== "saved" && data !== "submitted")) throw new GeneralAcademicMockError("Unable to save the General Academic mock.", "PERSISTENCE_FAILED");
      return data;
    },
    async submit(userId, attemptId) {
      const { error } = await admin.rpc("submit_general_academic_mock_attempt", { p_user_id: userId, p_attempt_id: attemptId });
      if (error) throw new GeneralAcademicMockError("Unable to submit the General Academic mock.", "PERSISTENCE_FAILED");
    },
  };
}

function toStudentAttempt(stored: StoredGeneralAcademicMockAttempt, now = new Date()): GeneralAcademicMockAttempt {
  return {
    id: stored.id, status: stored.status, compositionVersion: stored.compositionVersion,
    seed: stored.seed, durationSeconds: stored.durationSeconds,
    currentPackIndex: stored.currentPackIndex, currentQuestionId: stored.currentQuestionId,
    startedAt: stored.startedAt, expiresAt: stored.expiresAt, submittedAt: stored.submittedAt,
    elapsedSeconds: stored.status === "in_progress"
      ? Math.min(stored.durationSeconds, Math.max(stored.elapsedSeconds, Math.floor((now.getTime() - new Date(stored.startedAt).getTime()) / 1000)))
      : stored.elapsedSeconds,
    submissionReason: stored.submissionReason, serverNow: now.toISOString(),
    packs: stored.publicSnapshot.packs, answers: stored.answers,
  };
}

export async function getGeneralAcademicMockLanding(userId: string, repository: GeneralAcademicMockRepository = createMockRepository()) {
  validateUserId(userId);
  const [packs, active] = await Promise.all([repository.listPublishedPacks(), repository.findActive(userId)]);
  return {
    canStart: composeGeneralAcademicMock(packs, "inventory-check") !== null,
    active: active ? { id: active.id, expiresAt: active.expiresAt, questionCount: active.questionCount, currentPackIndex: active.currentPackIndex, packCount: active.packIds.length } : null,
  };
}

export async function startGeneralAcademicMock(userId: string, repository: GeneralAcademicMockRepository = createMockRepository(), now = new Date()) {
  validateUserId(userId);
  const active = await repository.findActive(userId);
  if (active) return toStudentAttempt(active, now);
  const [packs, recentPackIds] = await Promise.all([repository.listPublishedPacks(), repository.recentPackIds(userId)]);
  const seed = randomUUID();
  const composition = composeGeneralAcademicMock(packs, seed, recentPackIds);
  if (!composition) throw new GeneralAcademicMockError("Not enough published General Academic source packs are currently available for a full PrepDMAT mock.", "NO_CONTENT");
  const snapshots = buildGeneralAcademicMockSnapshots(composition);
  const attemptId = await repository.create({
    id: randomUUID(), userId, seed, packIds: composition.packs.map((pack) => pack.id),
    questionCount: composition.questionCount,
    currentQuestionId: snapshots.publicSnapshot.packs[0].questions[0].id,
    ...snapshots,
  });
  const stored = await repository.load(userId, attemptId);
  if (!stored) throw new GeneralAcademicMockError("Unable to restore the General Academic mock.", "PERSISTENCE_FAILED");
  return toStudentAttempt(stored, now);
}

export async function getGeneralAcademicMockAttempt(userId: string, attemptId: string, repository: GeneralAcademicMockRepository = createMockRepository()) {
  validateUserId(userId);
  if (!uuidSchema.safeParse(attemptId).success) return null;
  const stored = await repository.load(userId, attemptId);
  return stored ? toStudentAttempt(stored) : null;
}

export async function saveGeneralAcademicMockState(userId: string, input: unknown, repository: GeneralAcademicMockRepository = createMockRepository()) {
  validateUserId(userId);
  const parsed = generalAcademicMockAnswerInputSchema.safeParse(input);
  if (!parsed.success) throw new GeneralAcademicMockError("The mock update is invalid.", "INVALID_REQUEST");
  const stored = await repository.load(userId, parsed.data.attemptId);
  if (!stored) throw new GeneralAcademicMockError("General Academic mock was not found.", "NOT_FOUND");
  if (stored.status !== "in_progress") return "submitted" as const;
  const pack = stored.publicSnapshot.packs.find((candidate) => candidate.id === parsed.data.packId);
  const question = pack?.questions.find((candidate) => candidate.id === parsed.data.questionId);
  const currentQuestionExists = stored.publicSnapshot.packs.some((candidate) => candidate.questions.some((item) => item.id === parsed.data.currentQuestionId));
  if (!pack || !question || !currentQuestionExists || parsed.data.currentPackIndex >= stored.publicSnapshot.packs.length
    || (parsed.data.selectedOption && !question.options.some((option) => option.id === parsed.data.selectedOption))) {
    throw new GeneralAcademicMockError("The mock update is invalid.", "INVALID_REQUEST");
  }
  return repository.save(userId, parsed.data);
}

export async function submitGeneralAcademicMock(userId: string, attemptId: string, repository: GeneralAcademicMockRepository = createMockRepository()): Promise<GeneralAcademicMockReview> {
  validateUserId(userId);
  if (!uuidSchema.safeParse(attemptId).success) throw new GeneralAcademicMockError("The mock submission is invalid.", "INVALID_REQUEST");
  const stored = await repository.load(userId, attemptId);
  if (!stored) throw new GeneralAcademicMockError("General Academic mock was not found.", "NOT_FOUND");
  if (stored.status !== "submitted") await repository.submit(userId, attemptId);
  const submitted = await repository.load(userId, attemptId);
  if (!submitted || submitted.status !== "submitted") throw new GeneralAcademicMockError("Unable to restore the submitted mock.", "PERSISTENCE_FAILED");
  return buildGeneralAcademicMockReview(toStudentAttempt(submitted), submitted.privateSnapshot);
}

export async function getGeneralAcademicMockReview(userId: string, attemptId: string, repository: GeneralAcademicMockRepository = createMockRepository()) {
  validateUserId(userId);
  if (!uuidSchema.safeParse(attemptId).success) return null;
  const stored = await repository.load(userId, attemptId);
  return stored?.status === "submitted" ? buildGeneralAcademicMockReview(toStudentAttempt(stored), stored.privateSnapshot) : null;
}

export async function getGeneralAcademicMockHistory(userId: string): Promise<GeneralAcademicMockHistoryItem[]> {
  validateUserId(userId);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("general_academic_mock_attempts")
    .select("id, status, question_count, correct_count, elapsed_seconds, started_at, submitted_at, current_pack_index, pack_ids")
    .eq("user_id", userId).order("started_at", { ascending: false }).limit(50)
    .overrideTypes<Array<{ id: string; status: GeneralAcademicMockStatus; question_count: number; correct_count: number | null; elapsed_seconds: number; started_at: string; submitted_at: string | null; current_pack_index: number; pack_ids: string[] }>, { merge: false }>();
  if (error) throw new GeneralAcademicMockError("Unable to load General Academic mock history.", "PERSISTENCE_FAILED");
  return (data ?? []).map((row) => ({ id: row.id, status: row.status, questionCount: row.question_count, correctCount: row.correct_count, accuracy: row.correct_count === null ? null : row.question_count ? row.correct_count / row.question_count * 100 : 0, elapsedSeconds: row.elapsed_seconds, startedAt: row.started_at, submittedAt: row.submitted_at, currentPackIndex: row.current_pack_index, packCount: row.pack_ids.length }));
}

export async function retryGeneralAcademicMockSourcePack(userId: string, mockAttemptId: string, packId: string) {
  validateUserId(userId);
  if (!uuidSchema.safeParse(mockAttemptId).success || !uuidSchema.safeParse(packId).success) throw new GeneralAcademicMockError("The source-pack retry request is invalid.", "INVALID_REQUEST");
  const source = await createMockRepository().load(userId, mockAttemptId);
  if (!source || source.status !== "submitted" || !source.publicSnapshot.packs.some((pack) => pack.id === packId)) {
    throw new GeneralAcademicMockError("Completed General Academic mock source was not found.", "NOT_FOUND");
  }
  return startGeneralAcademicPracticePack(userId, packId);
}

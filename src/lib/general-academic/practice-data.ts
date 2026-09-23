import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  GENERAL_ACADEMIC_PRACTICE_SECONDS_PER_QUESTION,
  buildGeneralAcademicPracticeReview,
  generalAcademicAutosaveSchema,
  generalAcademicPracticeConfigSchema,
  privateGeneralAcademicSnapshotSchema,
  selectGeneralAcademicPack,
  studentGeneralAcademicPackSchema,
  toPrivateGeneralAcademicSnapshot,
  toStudentGeneralAcademicPack,
  type GeneralAcademicPracticeAnswer,
  type GeneralAcademicPracticeAttempt,
  type GeneralAcademicPracticeConfig,
  type GeneralAcademicPracticeReview,
  type GeneralAcademicPracticeStatus,
  type GeneralAcademicPublishedCandidate,
  type PrivateGeneralAcademicSnapshot,
  type StudentGeneralAcademicPack,
} from "./practice";
import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";

type PublishedPackRow = {
  id: string;
  schema_version: string;
  title: string;
  domain: CanonicalGeneralAcademicPack["domain"];
  topic: string;
  difficulty: CanonicalGeneralAcademicPack["difficulty"];
  origin: CanonicalGeneralAcademicPack["origin"];
  source_meta: CanonicalGeneralAcademicPack["sourceMeta"];
  stimulus_text: string;
  stimulus_json: Omit<CanonicalGeneralAcademicPack["stimulus"], "text">;
  tags: string[];
  review_status: CanonicalGeneralAcademicPack["review"]["status"];
  review_notes: string | null;
};

type PublishedQuestionRow = {
  source_pack_id: string;
  local_id: string;
  order_index: number;
  skill: CanonicalGeneralAcademicPack["questions"][number]["skill"];
  difficulty: CanonicalGeneralAcademicPack["questions"][number]["difficulty"];
  prompt: string;
  options_json: CanonicalGeneralAcademicPack["questions"][number]["options"];
  correct_option: CanonicalGeneralAcademicPack["questions"][number]["correctOption"];
  explanation_json: CanonicalGeneralAcademicPack["questions"][number]["explanation"];
  validation_json: CanonicalGeneralAcademicPack["questions"][number]["validation"] | null;
};

export type StoredGeneralAcademicPracticeAttempt = {
  id: string;
  userId: string;
  sourcePackId: string;
  status: GeneralAcademicPracticeStatus;
  mode: GeneralAcademicPracticeConfig["mode"];
  timingMode: GeneralAcademicPracticeConfig["timingMode"];
  selectedDomain: GeneralAcademicPracticeConfig["domain"] | null;
  selectedSkill: GeneralAcademicPracticeConfig["skill"] | null;
  selectedDifficulty: GeneralAcademicPracticeConfig["difficulty"];
  questionCount: number;
  currentQuestionIndex: number;
  publicSnapshot: StudentGeneralAcademicPack;
  privateSnapshot: PrivateGeneralAcademicSnapshot;
  correctCount: number | null;
  incorrectCount: number | null;
  unansweredCount: number | null;
  elapsedSeconds: number;
  startedAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
  lastActivityAt: string;
  answers: GeneralAcademicPracticeAnswer[];
};

type AttemptRow = {
  id: string;
  user_id: string;
  source_pack_id: string;
  status: GeneralAcademicPracticeStatus;
  selection_mode: GeneralAcademicPracticeConfig["mode"];
  timing_mode: GeneralAcademicPracticeConfig["timingMode"];
  selected_domain: GeneralAcademicPracticeConfig["domain"] | null;
  selected_skill: GeneralAcademicPracticeConfig["skill"] | null;
  selected_difficulty: GeneralAcademicPracticeConfig["difficulty"];
  question_count: number;
  current_question_index: number;
  public_snapshot: unknown;
  private_snapshot: unknown;
  correct_count: number | null;
  incorrect_count: number | null;
  unanswered_count: number | null;
  elapsed_seconds: number;
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  last_activity_at: string;
};

type AnswerRow = {
  question_id: string;
  selected_option: GeneralAcademicPracticeAnswer["selectedOption"];
  is_flagged: boolean;
  response_seconds: number;
  answered_at: string | null;
};

export interface GeneralAcademicPracticeRepository {
  listPublishedPacks(): Promise<GeneralAcademicPublishedCandidate[]>;
  recentPackIds(userId: string): Promise<string[]>;
  findActiveAttempt(userId: string): Promise<StoredGeneralAcademicPracticeAttempt | null>;
  loadAttempt(userId: string, attemptId: string): Promise<StoredGeneralAcademicPracticeAttempt | null>;
  createAttempt(input: {
    id: string;
    userId: string;
    packId: string;
    config: GeneralAcademicPracticeConfig;
    publicSnapshot: StudentGeneralAcademicPack;
    privateSnapshot: PrivateGeneralAcademicSnapshot;
    startedAt: string;
    expiresAt: string | null;
  }): Promise<string>;
  saveState(userId: string, input: z.infer<typeof generalAcademicAutosaveSchema>): Promise<void>;
  submit(userId: string, attemptId: string): Promise<void>;
  abandon(userId: string, attemptId: string): Promise<void>;
}

export class GeneralAcademicPracticeError extends Error {
  constructor(message: string, readonly code: "INVALID_REQUEST" | "NO_CONTENT" | "ATTEMPT_NOT_FOUND" | "ATTEMPT_LOCKED" | "PERSISTENCE_FAILED") {
    super(message);
    this.name = "GeneralAcademicPracticeError";
  }
}

function hydrateCandidate(row: PublishedPackRow, questions: PublishedQuestionRow[]): GeneralAcademicPublishedCandidate | null {
  const parsed = canonicalGeneralAcademicPackSchema.safeParse({
    schemaVersion: row.schema_version,
    title: row.title,
    domain: row.domain,
    topic: row.topic,
    difficulty: row.difficulty,
    origin: row.origin,
    sourceMeta: row.source_meta,
    stimulus: { text: row.stimulus_text, ...row.stimulus_json },
    questions: questions.map((question) => ({
      id: question.local_id,
      order: question.order_index,
      skill: question.skill,
      difficulty: question.difficulty,
      prompt: question.prompt,
      options: question.options_json,
      correctOption: question.correct_option,
      explanation: question.explanation_json,
      validation: question.validation_json,
    })),
    tags: row.tags,
    review: { status: row.review_status, notes: row.review_notes },
  });
  return parsed.success && parsed.data.review.status === "published" ? { id: row.id, pack: parsed.data } : null;
}

function createPracticeRepository(): GeneralAcademicPracticeRepository {
  const admin = createSupabaseAdminClient();
  const loadStoredAttempt = async (userId: string, attemptId?: string, activeOnly = false) => {
    let query = admin
      .from("general_academic_practice_attempts")
      .select("id, user_id, source_pack_id, status, selection_mode, timing_mode, selected_domain, selected_skill, selected_difficulty, question_count, current_question_index, public_snapshot, private_snapshot, correct_count, incorrect_count, unanswered_count, elapsed_seconds, started_at, expires_at, submitted_at, last_activity_at")
      .eq("user_id", userId);
    if (attemptId) query = query.eq("id", attemptId);
    if (activeOnly) query = query.eq("status", "in_progress");
    const { data, error } = await query.order("started_at", { ascending: false }).limit(1).maybeSingle().overrideTypes<AttemptRow | null, { merge: false }>();
    if (error) throw new GeneralAcademicPracticeError("Unable to load General Academic practice.", "PERSISTENCE_FAILED");
    if (!data) return null;
    const [{ data: answers, error: answerError }, publicResult, privateResult] = await Promise.all([
      admin.from("general_academic_practice_answers").select("question_id, selected_option, is_flagged, response_seconds, answered_at").eq("attempt_id", data.id).overrideTypes<AnswerRow[], { merge: false }>(),
      Promise.resolve(studentGeneralAcademicPackSchema.safeParse(data.public_snapshot)),
      Promise.resolve(privateGeneralAcademicSnapshotSchema.safeParse(data.private_snapshot)),
    ]);
    if (answerError || !publicResult.success || !privateResult.success) throw new GeneralAcademicPracticeError("Saved General Academic practice is inconsistent.", "PERSISTENCE_FAILED");
    return {
      id: data.id,
      userId: data.user_id,
      sourcePackId: data.source_pack_id,
      status: data.status,
      mode: data.selection_mode,
      timingMode: data.timing_mode,
      selectedDomain: data.selected_domain,
      selectedSkill: data.selected_skill,
      selectedDifficulty: data.selected_difficulty,
      questionCount: data.question_count,
      currentQuestionIndex: data.current_question_index,
      publicSnapshot: publicResult.data,
      privateSnapshot: privateResult.data,
      correctCount: data.correct_count,
      incorrectCount: data.incorrect_count,
      unansweredCount: data.unanswered_count,
      elapsedSeconds: data.elapsed_seconds,
      startedAt: data.started_at,
      expiresAt: data.expires_at,
      submittedAt: data.submitted_at,
      lastActivityAt: data.last_activity_at,
      answers: (answers ?? []).map((answer) => ({ questionId: answer.question_id, selectedOption: answer.selected_option, isFlagged: answer.is_flagged, responseSeconds: answer.response_seconds, answeredAt: answer.answered_at })),
    };
  };
  return {
    async listPublishedPacks() {
      const { data: packs, error } = await admin
        .from("general_academic_source_packs")
        .select("id, schema_version, title, domain, topic, difficulty, origin, source_meta, stimulus_text, stimulus_json, tags, review_status, review_notes")
        .eq("review_status", "published")
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(250)
        .overrideTypes<PublishedPackRow[], { merge: false }>();
      if (error) throw new GeneralAcademicPracticeError("Unable to load published General Academic packs.", "PERSISTENCE_FAILED");
      if (!packs?.length) return [];
      const { data: questions, error: questionError } = await admin
        .from("general_academic_questions")
        .select("source_pack_id, local_id, order_index, skill, difficulty, prompt, options_json, correct_option, explanation_json, validation_json")
        .in("source_pack_id", packs.map((pack) => pack.id))
        .order("order_index")
        .overrideTypes<PublishedQuestionRow[], { merge: false }>();
      if (questionError) throw new GeneralAcademicPracticeError("Unable to load published General Academic questions.", "PERSISTENCE_FAILED");
      return packs.flatMap((pack) => {
        const candidate = hydrateCandidate(pack, (questions ?? []).filter((question) => question.source_pack_id === pack.id));
        return candidate ? [candidate] : [];
      });
    },
    async recentPackIds(userId) {
      const { data, error } = await admin.from("general_academic_practice_attempts").select("source_pack_id").eq("user_id", userId).eq("status", "submitted").order("submitted_at", { ascending: false }).limit(3).overrideTypes<Array<{ source_pack_id: string }>, { merge: false }>();
      if (error) throw new GeneralAcademicPracticeError("Unable to rotate General Academic packs.", "PERSISTENCE_FAILED");
      return (data ?? []).map((item) => item.source_pack_id);
    },
    findActiveAttempt: (userId) => loadStoredAttempt(userId, undefined, true),
    loadAttempt: (userId, attemptId) => loadStoredAttempt(userId, attemptId),
    async createAttempt(input) {
      const { data, error } = await admin.rpc("create_general_academic_practice_attempt", {
        p_attempt_id: input.id,
        p_user_id: input.userId,
        p_pack_id: input.packId,
        p_selection_mode: input.config.mode,
        p_timing_mode: input.config.timingMode,
        p_selected_domain: input.config.domain ?? null,
        p_selected_skill: input.config.skill ?? null,
        p_selected_difficulty: input.config.difficulty,
        p_public_snapshot: input.publicSnapshot,
        p_private_snapshot: input.privateSnapshot,
        p_question_count: input.publicSnapshot.questions.length,
        p_started_at: input.startedAt,
        p_expires_at: input.expiresAt,
      });
      const parsed = z.string().uuid().safeParse(data);
      if (error || !parsed.success) throw new GeneralAcademicPracticeError("Unable to start General Academic practice.", "PERSISTENCE_FAILED");
      return parsed.data;
    },
    async saveState(userId, input) {
      const { error } = await admin.rpc("save_general_academic_practice_state", {
        p_user_id: userId,
        p_attempt_id: input.attemptId,
        p_question_id: input.questionId,
        p_selected_option: input.selectedOption,
        p_is_flagged: input.isFlagged,
        p_current_question_index: input.currentQuestionIndex,
      });
      if (error) throw new GeneralAcademicPracticeError("Unable to save General Academic practice.", "PERSISTENCE_FAILED");
    },
    async submit(userId, attemptId) {
      const { error } = await admin.rpc("submit_general_academic_practice_attempt", { p_user_id: userId, p_attempt_id: attemptId });
      if (error) throw new GeneralAcademicPracticeError("Unable to submit General Academic practice.", "PERSISTENCE_FAILED");
    },
    async abandon(userId, attemptId) {
      const { error } = await admin.rpc("abandon_general_academic_practice_attempt", { p_user_id: userId, p_attempt_id: attemptId });
      if (error) throw new GeneralAcademicPracticeError("Unable to leave General Academic practice.", "PERSISTENCE_FAILED");
    },
  };
}

export async function listPublishedGeneralAcademicPacks() {
  return createPracticeRepository().listPublishedPacks();
}

function toStudentAttempt(stored: StoredGeneralAcademicPracticeAttempt, now = new Date()): GeneralAcademicPracticeAttempt {
  const elapsed = stored.status === "in_progress"
    ? Math.min(86400, Math.max(stored.elapsedSeconds, Math.floor((now.getTime() - new Date(stored.startedAt).getTime()) / 1000)))
    : stored.elapsedSeconds;
  return {
    id: stored.id,
    status: stored.status,
    mode: stored.mode,
    timingMode: stored.timingMode,
    selectedDomain: stored.selectedDomain ?? null,
    selectedSkill: stored.selectedSkill ?? null,
    selectedDifficulty: stored.selectedDifficulty,
    currentQuestionIndex: stored.currentQuestionIndex,
    startedAt: stored.startedAt,
    expiresAt: stored.expiresAt,
    elapsedSeconds: elapsed,
    submittedAt: stored.submittedAt,
    pack: stored.publicSnapshot,
    answers: stored.answers,
  };
}

function validateUserId(userId: string) {
  if (!z.string().uuid().safeParse(userId).success) throw new GeneralAcademicPracticeError("Sign in to continue.", "INVALID_REQUEST");
}

async function createAttemptFromCandidate(
  userId: string,
  selected: GeneralAcademicPublishedCandidate,
  config: GeneralAcademicPracticeConfig,
  repository: GeneralAcademicPracticeRepository,
  now: Date,
) {
  const publicSnapshot = toStudentGeneralAcademicPack(selected);
  const privateSnapshot = toPrivateGeneralAcademicSnapshot(selected);
  const expiresAt = config.timingMode === "timed"
    ? new Date(now.getTime() + publicSnapshot.questions.length * GENERAL_ACADEMIC_PRACTICE_SECONDS_PER_QUESTION * 1000).toISOString()
    : null;
  const attemptId = await repository.createAttempt({ id: randomUUID(), userId, packId: selected.id, config, publicSnapshot, privateSnapshot, startedAt: now.toISOString(), expiresAt });
  const stored = await repository.loadAttempt(userId, attemptId);
  if (!stored) throw new GeneralAcademicPracticeError("Unable to restore General Academic practice.", "PERSISTENCE_FAILED");
  return toStudentAttempt(stored, now);
}

export async function getGeneralAcademicPracticeLanding(userId: string, repository: GeneralAcademicPracticeRepository = createPracticeRepository()) {
  validateUserId(userId);
  const [packs, active] = await Promise.all([repository.listPublishedPacks(), repository.findActiveAttempt(userId)]);
  const domains = new Map<CanonicalGeneralAcademicPack["domain"], number>();
  const skills = new Map<CanonicalGeneralAcademicPack["questions"][number]["skill"], number>();
  for (const candidate of packs) {
    domains.set(candidate.pack.domain, (domains.get(candidate.pack.domain) ?? 0) + 1);
    for (const skill of new Set(candidate.pack.questions.map((question) => question.skill))) skills.set(skill, (skills.get(skill) ?? 0) + 1);
  }
  return {
    domains: [...domains.entries()].map(([domain, packCount]) => ({ domain, packCount })),
    skills: [...skills.entries()].map(([skill, packCount]) => ({ skill, packCount })),
    totalPacks: packs.length,
    activeAttempt: active ? {
      id: active.id,
      title: active.publicSnapshot.title,
      domain: active.publicSnapshot.domain,
      answeredCount: active.answers.filter((answer) => answer.selectedOption !== null).length,
      currentQuestionIndex: active.currentQuestionIndex,
      questionCount: active.questionCount,
    } : null,
  };
}

export async function startGeneralAcademicPractice(
  userId: string,
  input: unknown,
  repository: GeneralAcademicPracticeRepository = createPracticeRepository(),
  now = new Date(),
) {
  validateUserId(userId);
  const config = generalAcademicPracticeConfigSchema.safeParse(input);
  if (!config.success) throw new GeneralAcademicPracticeError("Check the practice settings and try again.", "INVALID_REQUEST");
  const active = await repository.findActiveAttempt(userId);
  if (active) return toStudentAttempt(active, now);
  const [packs, recent] = await Promise.all([repository.listPublishedPacks(), repository.recentPackIds(userId)]);
  const selected = selectGeneralAcademicPack(packs, config.data, recent);
  if (!selected) throw new GeneralAcademicPracticeError("No published packs match those choices yet.", "NO_CONTENT");
  return createAttemptFromCandidate(userId, selected, config.data, repository, now);
}

export async function retryGeneralAcademicPracticePack(
  userId: string,
  sourceAttemptId: string,
  repository: GeneralAcademicPracticeRepository = createPracticeRepository(),
  now = new Date(),
) {
  validateUserId(userId);
  if (!z.string().uuid().safeParse(sourceAttemptId).success) throw new GeneralAcademicPracticeError("The retry request is invalid.", "INVALID_REQUEST");
  const sourceAttempt = await repository.loadAttempt(userId, sourceAttemptId);
  if (!sourceAttempt || sourceAttempt.status !== "submitted") throw new GeneralAcademicPracticeError("Completed General Academic practice was not found.", "ATTEMPT_NOT_FOUND");
  const active = await repository.findActiveAttempt(userId);
  if (active) {
    if (active.sourcePackId === sourceAttempt.sourcePackId) return toStudentAttempt(active, now);
    throw new GeneralAcademicPracticeError("Resume or abandon your active General Academic practice before retrying this pack.", "ATTEMPT_LOCKED");
  }
  const selected = (await repository.listPublishedPacks()).find((candidate) => candidate.id === sourceAttempt.sourcePackId);
  if (!selected) throw new GeneralAcademicPracticeError("This source pack is no longer available for new practice.", "NO_CONTENT");
  return createAttemptFromCandidate(userId, selected, { mode: "mixed", difficulty: "mixed", timingMode: sourceAttempt.timingMode }, repository, now);
}

export async function startGeneralAcademicPracticePack(
  userId: string,
  packId: string,
  repository: GeneralAcademicPracticeRepository = createPracticeRepository(),
  now = new Date(),
) {
  validateUserId(userId);
  if (!z.string().uuid().safeParse(packId).success) throw new GeneralAcademicPracticeError("The source pack request is invalid.", "INVALID_REQUEST");
  const active = await repository.findActiveAttempt(userId);
  if (active) return toStudentAttempt(active, now);
  const selected = (await repository.listPublishedPacks()).find((candidate) => candidate.id === packId);
  if (!selected) throw new GeneralAcademicPracticeError("This source pack is no longer available for new practice.", "NO_CONTENT");
  return createAttemptFromCandidate(userId, selected, { mode: "mixed", difficulty: "mixed", timingMode: "untimed" }, repository, now);
}

export async function getGeneralAcademicPracticeAttempt(userId: string, attemptId: string, repository: GeneralAcademicPracticeRepository = createPracticeRepository()) {
  validateUserId(userId);
  if (!z.string().uuid().safeParse(attemptId).success) return null;
  const stored = await repository.loadAttempt(userId, attemptId);
  return stored ? toStudentAttempt(stored) : null;
}

export async function saveGeneralAcademicPracticeState(userId: string, input: unknown, repository: GeneralAcademicPracticeRepository = createPracticeRepository()) {
  validateUserId(userId);
  const parsed = generalAcademicAutosaveSchema.safeParse(input);
  if (!parsed.success) throw new GeneralAcademicPracticeError("The practice update is invalid.", "INVALID_REQUEST");
  const stored = await repository.loadAttempt(userId, parsed.data.attemptId);
  if (!stored) throw new GeneralAcademicPracticeError("General Academic practice was not found.", "ATTEMPT_NOT_FOUND");
  if (stored.status !== "in_progress") throw new GeneralAcademicPracticeError("Submitted practice cannot be changed.", "ATTEMPT_LOCKED");
  const question = stored.publicSnapshot.questions.find((item) => item.id === parsed.data.questionId);
  if (!question || (parsed.data.selectedOption && !question.options.some((option) => option.id === parsed.data.selectedOption))) {
    throw new GeneralAcademicPracticeError("The practice update is invalid.", "INVALID_REQUEST");
  }
  await repository.saveState(userId, parsed.data);
}

export async function submitGeneralAcademicPractice(userId: string, attemptId: string, repository: GeneralAcademicPracticeRepository = createPracticeRepository()): Promise<GeneralAcademicPracticeReview> {
  validateUserId(userId);
  if (!z.string().uuid().safeParse(attemptId).success) throw new GeneralAcademicPracticeError("The practice submission is invalid.", "INVALID_REQUEST");
  const stored = await repository.loadAttempt(userId, attemptId);
  if (!stored) throw new GeneralAcademicPracticeError("General Academic practice was not found.", "ATTEMPT_NOT_FOUND");
  if (stored.status !== "submitted") await repository.submit(userId, attemptId);
  const submitted = await repository.loadAttempt(userId, attemptId);
  if (!submitted || submitted.status !== "submitted") throw new GeneralAcademicPracticeError("Unable to restore submitted practice.", "PERSISTENCE_FAILED");
  return buildGeneralAcademicPracticeReview(toStudentAttempt(submitted), submitted.privateSnapshot);
}

export async function getGeneralAcademicPracticeReview(userId: string, attemptId: string, repository: GeneralAcademicPracticeRepository = createPracticeRepository()) {
  validateUserId(userId);
  if (!z.string().uuid().safeParse(attemptId).success) return null;
  const stored = await repository.loadAttempt(userId, attemptId);
  if (!stored || stored.status !== "submitted") return null;
  return buildGeneralAcademicPracticeReview(toStudentAttempt(stored), stored.privateSnapshot);
}

export async function abandonGeneralAcademicPractice(userId: string, attemptId: string, repository: GeneralAcademicPracticeRepository = createPracticeRepository()) {
  validateUserId(userId);
  if (!z.string().uuid().safeParse(attemptId).success) throw new GeneralAcademicPracticeError("The practice request is invalid.", "INVALID_REQUEST");
  await repository.abandon(userId, attemptId);
}

export async function getGeneralAcademicDashboardActivity(userId: string) {
  validateUserId(userId);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("general_academic_practice_attempts")
    .select("id, status, current_question_index, question_count, correct_count, submitted_at, started_at, source_pack:general_academic_source_packs!inner(title, domain)")
    .eq("user_id", userId)
    .in("status", ["in_progress", "submitted"])
    .order("last_activity_at", { ascending: false })
    .limit(6)
    .overrideTypes<Array<{
      id: string;
      status: "in_progress" | "submitted";
      current_question_index: number;
      question_count: number;
      correct_count: number | null;
      submitted_at: string | null;
      started_at: string;
      source_pack: {
        title: string;
        domain: CanonicalGeneralAcademicPack["domain"];
      };
    }>, { merge: false }>();
  if (error) throw new GeneralAcademicPracticeError("Unable to load General Academic activity.", "PERSISTENCE_FAILED");
  const entries = (data ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      title: row.source_pack.title,
      domain: row.source_pack.domain,
      currentQuestion: Math.min(row.question_count, row.current_question_index + 1),
      questionCount: row.question_count,
      correctCount: row.correct_count,
      completedAt: row.submitted_at,
      startedAt: row.started_at,
    }));
  return { active: entries.find((entry) => entry.status === "in_progress") ?? null, recent: entries.filter((entry) => entry.status === "submitted") };
}

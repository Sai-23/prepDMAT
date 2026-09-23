import "server-only";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  getGeneralAcademicPracticeRecommendations,
  parseGeneralAcademicLearningAnalytics,
  type GeneralAcademicLearningAnalytics,
  type GeneralAcademicPracticeRecommendation,
} from "./learning";
import {
  buildGeneralAcademicMockReview,
  generalAcademicMockPrivateSnapshotSchema,
  generalAcademicMockPublicSnapshotSchema,
  type GeneralAcademicMockAnswer,
  type GeneralAcademicMockAttempt,
  type GeneralAcademicMockReview,
} from "./mock";
import {
  buildGeneralAcademicPracticeReview,
  privateGeneralAcademicSnapshotSchema,
  studentGeneralAcademicPackSchema,
  type GeneralAcademicPracticeAnswer,
  type GeneralAcademicPracticeAttempt,
  type GeneralAcademicPracticeReview,
} from "./practice";
import { getGeneralAcademicDashboardActivity } from "./practice-data";
import {
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_SKILLS,
  type GeneralAcademicDifficulty,
  type GeneralAcademicDomain,
  type GeneralAcademicSkill,
} from "./registries";

const uuidSchema = z.string().uuid();

type AttemptRow = {
  id: string;
  user_id: string;
  source_pack_id: string;
  status: "submitted";
  selection_mode: GeneralAcademicPracticeAttempt["mode"];
  timing_mode: GeneralAcademicPracticeAttempt["timingMode"];
  selected_domain: GeneralAcademicPracticeAttempt["selectedDomain"];
  selected_skill: GeneralAcademicPracticeAttempt["selectedSkill"];
  selected_difficulty: GeneralAcademicPracticeAttempt["selectedDifficulty"];
  current_question_index: number;
  public_snapshot: unknown;
  private_snapshot: unknown;
  elapsed_seconds: number;
  started_at: string;
  expires_at: string | null;
  submitted_at: string;
};

type AnswerRow = {
  attempt_id: string;
  question_id: string;
  selected_option: GeneralAcademicPracticeAnswer["selectedOption"];
  is_flagged: boolean;
  response_seconds: number;
  answered_at: string | null;
};

type MockAttemptRow = {
  id: string;
  status: "submitted";
  composition_version: GeneralAcademicMockAttempt["compositionVersion"];
  seed: string;
  duration_seconds: GeneralAcademicMockAttempt["durationSeconds"];
  current_pack_index: number;
  current_question_id: string;
  public_snapshot: unknown;
  private_snapshot: unknown;
  elapsed_seconds: number;
  started_at: string;
  expires_at: string;
  submitted_at: string;
  submission_reason: "manual" | "expired";
};

type MockAnswerRow = {
  mock_attempt_id: string;
  source_pack_id: string;
  question_id: string;
  selected_option: GeneralAcademicMockAnswer["selectedOption"];
  is_flagged: boolean;
  response_seconds: number;
  answered_at: string | null;
};

type BookmarkRow = {
  id: string;
  source_pack_id: string;
  question_id: string;
  source_attempt_id: string | null;
  source_mock_attempt_id: string | null;
  created_at: string;
};

type MistakeRow = {
  id: string;
  source_pack_id: string;
  question_id: string;
  skill: GeneralAcademicSkill;
  difficulty: GeneralAcademicDifficulty;
  latest_attempt_id: string | null;
  latest_missed_attempt_id: string | null;
  latest_mock_attempt_id: string | null;
  latest_missed_mock_attempt_id: string | null;
  times_incorrect: number;
  times_correct_after_mistake: number;
  first_missed_at: string;
  last_missed_at: string;
  last_resolved_at: string | null;
  status: "active" | "resolved";
};

export type GeneralAcademicBookmarkItem = {
  id: string;
  sourcePackId: string;
  sourceAttemptId: string;
  sourceType: "practice" | "mock";
  createdAt: string;
  pack: GeneralAcademicPracticeReview["attempt"]["pack"];
  item: GeneralAcademicPracticeReview["items"][number];
};

export type GeneralAcademicMistakeItem = {
  id: string;
  sourcePackId: string;
  latestAttemptId: string;
  latestMissedAttemptId: string;
  latestSource: "practice" | "mock";
  skill: GeneralAcademicSkill;
  difficulty: GeneralAcademicDifficulty;
  timesIncorrect: number;
  timesCorrectAfterMistake: number;
  firstMissedAt: string;
  lastMissedAt: string;
  lastResolvedAt: string | null;
  status: "active" | "resolved";
  pack: GeneralAcademicPracticeReview["attempt"]["pack"];
  item: GeneralAcademicPracticeReview["items"][number];
  isBookmarked: boolean;
};

export type GeneralAcademicLearningOverview = {
  analytics: GeneralAcademicLearningAnalytics;
  recommendations: GeneralAcademicPracticeRecommendation[];
  activeMistakeCount: number;
  recent: Awaited<ReturnType<typeof getGeneralAcademicDashboardActivity>>["recent"];
};

function validateUserId(userId: string) {
  if (!uuidSchema.safeParse(userId).success) throw new Error("Sign in to continue.");
}

function hydrateReview(row: AttemptRow, answers: AnswerRow[]) {
  const publicSnapshot = studentGeneralAcademicPackSchema.safeParse(row.public_snapshot);
  const privateSnapshot = privateGeneralAcademicSnapshotSchema.safeParse(row.private_snapshot);
  if (!publicSnapshot.success || !privateSnapshot.success || publicSnapshot.data.id !== row.source_pack_id) return null;
  const attempt: GeneralAcademicPracticeAttempt = {
    id: row.id,
    status: "submitted",
    mode: row.selection_mode,
    timingMode: row.timing_mode,
    selectedDomain: row.selected_domain,
    selectedSkill: row.selected_skill,
    selectedDifficulty: row.selected_difficulty,
    currentQuestionIndex: row.current_question_index,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    elapsedSeconds: row.elapsed_seconds,
    submittedAt: row.submitted_at,
    pack: publicSnapshot.data,
    answers: answers.map((answer) => ({
      questionId: answer.question_id,
      selectedOption: answer.selected_option,
      isFlagged: answer.is_flagged,
      responseSeconds: answer.response_seconds,
      answeredAt: answer.answered_at,
    })),
  };
  return buildGeneralAcademicPracticeReview(attempt, privateSnapshot.data);
}

async function loadSubmittedReviews(userId: string, attemptIds: string[]) {
  if (!attemptIds.length) return new Map<string, GeneralAcademicPracticeReview>();
  const admin = createSupabaseAdminClient();
  const uniqueIds = [...new Set(attemptIds)];
  const [{ data: attempts, error: attemptError }, { data: answers, error: answerError }] = await Promise.all([
    admin.from("general_academic_practice_attempts")
      .select("id, user_id, source_pack_id, status, selection_mode, timing_mode, selected_domain, selected_skill, selected_difficulty, current_question_index, public_snapshot, private_snapshot, elapsed_seconds, started_at, expires_at, submitted_at")
      .eq("user_id", userId).eq("status", "submitted").in("id", uniqueIds)
      .overrideTypes<AttemptRow[], { merge: false }>(),
    admin.from("general_academic_practice_answers")
      .select("attempt_id, question_id, selected_option, is_flagged, response_seconds, answered_at")
      .in("attempt_id", uniqueIds)
      .overrideTypes<AnswerRow[], { merge: false }>(),
  ]);
  if (attemptError || answerError) throw new Error("Unable to load General Academic review history.");
  const reviews = new Map<string, GeneralAcademicPracticeReview>();
  for (const attempt of attempts ?? []) {
    const review = hydrateReview(attempt, (answers ?? []).filter((answer) => answer.attempt_id === attempt.id));
    if (review) reviews.set(attempt.id, review);
  }
  return reviews;
}

async function loadSubmittedMockReviews(userId: string, attemptIds: string[]) {
  if (!attemptIds.length) return new Map<string, GeneralAcademicMockReview>();
  const admin = createSupabaseAdminClient();
  const uniqueIds = [...new Set(attemptIds)];
  const [{ data: attempts, error: attemptError }, { data: answers, error: answerError }] = await Promise.all([
    admin.from("general_academic_mock_attempts")
      .select("id, status, submission_reason, composition_version, seed, duration_seconds, current_pack_index, current_question_id, public_snapshot, private_snapshot, elapsed_seconds, started_at, expires_at, submitted_at")
      .eq("user_id", userId).eq("status", "submitted").in("id", uniqueIds)
      .overrideTypes<MockAttemptRow[], { merge: false }>(),
    admin.from("general_academic_mock_answers")
      .select("mock_attempt_id, source_pack_id, question_id, selected_option, is_flagged, response_seconds, answered_at")
      .in("mock_attempt_id", uniqueIds).overrideTypes<MockAnswerRow[], { merge: false }>(),
  ]);
  if (attemptError || answerError) throw new Error("Unable to load General Academic mock review history.");
  const reviews = new Map<string, GeneralAcademicMockReview>();
  for (const row of attempts ?? []) {
    const publicSnapshot = generalAcademicMockPublicSnapshotSchema.safeParse(row.public_snapshot);
    const privateSnapshot = generalAcademicMockPrivateSnapshotSchema.safeParse(row.private_snapshot);
    if (!publicSnapshot.success || !privateSnapshot.success) continue;
    const attempt: GeneralAcademicMockAttempt = {
      id: row.id, status: "submitted", compositionVersion: row.composition_version,
      seed: row.seed, durationSeconds: row.duration_seconds,
      currentPackIndex: row.current_pack_index, currentQuestionId: row.current_question_id,
      startedAt: row.started_at, expiresAt: row.expires_at, submittedAt: row.submitted_at,
      elapsedSeconds: row.elapsed_seconds, submissionReason: row.submission_reason,
      serverNow: row.submitted_at, packs: publicSnapshot.data.packs,
      answers: (answers ?? []).filter((answer) => answer.mock_attempt_id === row.id).map((answer) => ({ packId: answer.source_pack_id, questionId: answer.question_id, selectedOption: answer.selected_option, isFlagged: answer.is_flagged, responseSeconds: answer.response_seconds, answeredAt: answer.answered_at })),
    };
    reviews.set(row.id, buildGeneralAcademicMockReview(attempt, privateSnapshot.data));
  }
  return reviews;
}

export async function toggleGeneralAcademicBookmark(userId: string, input: unknown) {
  validateUserId(userId);
  const parsed = z.object({
    source: z.enum(["practice", "mock"]).default("practice"),
    attemptId: uuidSchema,
    packId: uuidSchema.optional(),
    questionId: z.string().min(1).max(64),
    bookmarked: z.boolean(),
  }).strict().safeParse(input);
  if (!parsed.success) throw new Error("The bookmark request is invalid.");
  const admin = createSupabaseAdminClient();
  const packId = parsed.data.packId;
  if (parsed.data.source === "mock" && !packId) throw new Error("The bookmark request is invalid.");
  const { data, error } = parsed.data.source === "mock" && packId
    ? await admin.rpc("toggle_general_academic_mock_bookmark", {
      p_user_id: userId, p_attempt_id: parsed.data.attemptId, p_source_pack_id: packId,
      p_question_id: parsed.data.questionId, p_bookmarked: parsed.data.bookmarked,
    })
    : await admin.rpc("toggle_general_academic_bookmark", {
      p_user_id: userId, p_attempt_id: parsed.data.attemptId,
      p_question_id: parsed.data.questionId, p_bookmarked: parsed.data.bookmarked,
    });
  if (error || typeof data !== "boolean") throw new Error("Unable to update this bookmark.");
  return data;
}

export async function getGeneralAcademicBookmarks(userId: string): Promise<GeneralAcademicBookmarkItem[]> {
  validateUserId(userId);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("general_academic_bookmarks")
    .select("id, source_pack_id, question_id, source_attempt_id, source_mock_attempt_id, created_at")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(300)
    .overrideTypes<BookmarkRow[], { merge: false }>();
  if (error) throw new Error("Unable to load General Academic bookmarks.");
  const rows = data ?? [];
  const [reviews, mockReviews] = await Promise.all([
    loadSubmittedReviews(userId, rows.flatMap((row) => row.source_attempt_id ? [row.source_attempt_id] : [])),
    loadSubmittedMockReviews(userId, rows.flatMap((row) => row.source_mock_attempt_id ? [row.source_mock_attempt_id] : [])),
  ]);
  return rows.flatMap<GeneralAcademicBookmarkItem>((row) => {
    if (row.source_attempt_id) {
      const review = reviews.get(row.source_attempt_id);
      const item = review?.items.find((candidate) => candidate.question.id === row.question_id);
      return review && item && review.attempt.pack.id === row.source_pack_id
        ? [{ id: row.id, sourcePackId: row.source_pack_id, sourceAttemptId: row.source_attempt_id, sourceType: "practice" as const, createdAt: row.created_at, pack: review.attempt.pack, item }]
        : [];
    }
    if (row.source_mock_attempt_id) {
      const review = mockReviews.get(row.source_mock_attempt_id);
      const mockItem = review?.items.find((candidate) => candidate.pack.id === row.source_pack_id && candidate.question.id === row.question_id);
      return mockItem ? [{ id: row.id, sourcePackId: row.source_pack_id, sourceAttemptId: row.source_mock_attempt_id, sourceType: "mock" as const, createdAt: row.created_at, pack: mockItem.pack, item: { question: mockItem.question, selectedOption: mockItem.selectedOption, correctOption: mockItem.correctOption, isCorrect: mockItem.isCorrect, explanation: mockItem.explanation, isFlagged: mockItem.isFlagged } }] : [];
    }
    return [];
  });
}

export async function getGeneralAcademicBookmarkReview(userId: string, bookmarkId: string) {
  validateUserId(userId);
  if (!uuidSchema.safeParse(bookmarkId).success) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("general_academic_bookmarks")
    .select("id, source_pack_id, question_id, source_attempt_id, source_mock_attempt_id, created_at")
    .eq("id", bookmarkId).eq("user_id", userId).maybeSingle()
    .overrideTypes<BookmarkRow | null, { merge: false }>();
  if (error || !data) return null;
  if (data.source_attempt_id) {
    const reviews = await loadSubmittedReviews(userId, [data.source_attempt_id]);
    const review = reviews.get(data.source_attempt_id);
    const item = review?.items.find((candidate) => candidate.question.id === data.question_id);
    return review && item && review.attempt.pack.id === data.source_pack_id
      ? { id: data.id, sourcePackId: data.source_pack_id, sourceAttemptId: data.source_attempt_id, sourceType: "practice" as const, createdAt: data.created_at, pack: review.attempt.pack, item }
      : null;
  }
  if (!data.source_mock_attempt_id) return null;
  const reviews = await loadSubmittedMockReviews(userId, [data.source_mock_attempt_id]);
  const item = reviews.get(data.source_mock_attempt_id)?.items.find((candidate) => candidate.pack.id === data.source_pack_id && candidate.question.id === data.question_id);
  return item ? { id: data.id, sourcePackId: data.source_pack_id, sourceAttemptId: data.source_mock_attempt_id, sourceType: "mock" as const, createdAt: data.created_at, pack: item.pack, item: { question: item.question, selectedOption: item.selectedOption, correctOption: item.correctOption, isCorrect: item.isCorrect, explanation: item.explanation, isFlagged: item.isFlagged } } : null;
}

export async function getGeneralAcademicMistakes(userId: string, status: "active" | "resolved" | "all" = "active"): Promise<GeneralAcademicMistakeItem[]> {
  validateUserId(userId);
  const admin = createSupabaseAdminClient();
  let query = admin.from("general_academic_mistakes")
    .select("id, source_pack_id, question_id, skill, difficulty, latest_attempt_id, latest_missed_attempt_id, latest_mock_attempt_id, latest_missed_mock_attempt_id, times_incorrect, times_correct_after_mistake, first_missed_at, last_missed_at, last_resolved_at, status")
    .eq("user_id", userId);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query.order("last_missed_at", { ascending: false }).limit(300)
    .overrideTypes<MistakeRow[], { merge: false }>();
  if (error) throw new Error("Unable to load General Academic mistakes.");
  const rows = data ?? [];
  const [reviews, mockReviews] = await Promise.all([
    loadSubmittedReviews(userId, rows.flatMap((row) => row.latest_missed_attempt_id ? [row.latest_missed_attempt_id] : [])),
    loadSubmittedMockReviews(userId, rows.flatMap((row) => row.latest_missed_mock_attempt_id ? [row.latest_missed_mock_attempt_id] : [])),
  ]);
  const { data: bookmarkRows, error: bookmarkError } = rows.length
    ? await admin.from("general_academic_bookmarks").select("source_pack_id, question_id").eq("user_id", userId)
      .in("source_pack_id", [...new Set(rows.map((row) => row.source_pack_id))])
      .overrideTypes<Array<{ source_pack_id: string; question_id: string }>, { merge: false }>()
    : { data: [], error: null };
  if (bookmarkError) throw new Error("Unable to load General Academic learning state.");
  const bookmarks = new Set((bookmarkRows ?? []).map((row) => `${row.source_pack_id}:${row.question_id}`));
  return rows.flatMap((row) => {
    const practiceReview = row.latest_missed_attempt_id ? reviews.get(row.latest_missed_attempt_id) : null;
    const mockItem = row.latest_missed_mock_attempt_id
      ? mockReviews.get(row.latest_missed_mock_attempt_id)?.items.find((candidate) => candidate.pack.id === row.source_pack_id && candidate.question.id === row.question_id)
      : null;
    const pack = practiceReview?.attempt.pack ?? mockItem?.pack;
    const item = practiceReview?.items.find((candidate) => candidate.question.id === row.question_id)
      ?? (mockItem ? { question: mockItem.question, selectedOption: mockItem.selectedOption, correctOption: mockItem.correctOption, isCorrect: mockItem.isCorrect, explanation: mockItem.explanation, isFlagged: mockItem.isFlagged } : null);
    const latestAttemptId = row.latest_attempt_id ?? row.latest_mock_attempt_id;
    const latestMissedAttemptId = row.latest_missed_attempt_id ?? row.latest_missed_mock_attempt_id;
    const latestSource = row.latest_missed_mock_attempt_id ? "mock" as const : "practice" as const;
    return pack && item && latestAttemptId && latestMissedAttemptId && pack.id === row.source_pack_id ? [{
      id: row.id,
      sourcePackId: row.source_pack_id,
      latestAttemptId,
      latestMissedAttemptId,
      latestSource,
      skill: row.skill,
      difficulty: row.difficulty,
      timesIncorrect: row.times_incorrect,
      timesCorrectAfterMistake: row.times_correct_after_mistake,
      firstMissedAt: row.first_missed_at,
      lastMissedAt: row.last_missed_at,
      lastResolvedAt: row.last_resolved_at,
      status: row.status,
      pack,
      item,
      isBookmarked: bookmarks.has(`${row.source_pack_id}:${row.question_id}`),
    }] : [];
  });
}

export async function getGeneralAcademicMistakeReview(userId: string, mistakeId: string) {
  if (!uuidSchema.safeParse(mistakeId).success) return null;
  const mistakes = await getGeneralAcademicMistakes(userId, "all");
  return mistakes.find((mistake) => mistake.id === mistakeId) ?? null;
}

export async function getGeneralAcademicAttemptLearningState(userId: string, attemptId: string) {
  validateUserId(userId);
  if (!uuidSchema.safeParse(attemptId).success) return null;
  const reviews = await loadSubmittedReviews(userId, [attemptId]);
  const review = reviews.get(attemptId);
  if (!review) return null;
  const admin = createSupabaseAdminClient();
  const [{ data: bookmarks, error: bookmarkError }, { data: mistakes, error: mistakeError }] = await Promise.all([
    admin.from("general_academic_bookmarks").select("question_id").eq("user_id", userId).eq("source_pack_id", review.attempt.pack.id),
    admin.from("general_academic_mistakes").select("question_id, status").eq("user_id", userId).eq("source_pack_id", review.attempt.pack.id),
  ]);
  if (bookmarkError || mistakeError) throw new Error("Unable to load General Academic learning state.");
  return {
    bookmarkQuestionIds: (bookmarks ?? []).map((row) => row.question_id as string),
    mistakes: (mistakes ?? []).map((row) => ({ questionId: row.question_id as string, status: row.status as "active" | "resolved" })),
  };
}

export async function getGeneralAcademicMockLearningState(userId: string, attemptId: string) {
  validateUserId(userId);
  if (!uuidSchema.safeParse(attemptId).success) return null;
  const reviews = await loadSubmittedMockReviews(userId, [attemptId]);
  const review = reviews.get(attemptId);
  if (!review) return null;
  const admin = createSupabaseAdminClient();
  const packIds = review.attempt.packs.map((pack) => pack.id);
  const [{ data: bookmarks, error: bookmarkError }, { data: mistakes, error: mistakeError }] = await Promise.all([
    admin.from("general_academic_bookmarks").select("source_pack_id, question_id").eq("user_id", userId).in("source_pack_id", packIds),
    admin.from("general_academic_mistakes").select("source_pack_id, question_id, status").eq("user_id", userId).in("source_pack_id", packIds),
  ]);
  if (bookmarkError || mistakeError) throw new Error("Unable to load General Academic mock learning state.");
  return {
    bookmarkKeys: (bookmarks ?? []).map((row) => `${row.source_pack_id as string}:${row.question_id as string}`),
    mistakes: (mistakes ?? []).map((row) => ({ key: `${row.source_pack_id as string}:${row.question_id as string}`, status: row.status as "active" | "resolved" })),
  };
}

async function loadInventory() {
  const admin = createSupabaseAdminClient();
  const { data: packs, error } = await admin.from("general_academic_source_packs")
    .select("id, domain").eq("review_status", "published").is("deleted_at", null).limit(250)
    .overrideTypes<Array<{ id: string; domain: GeneralAcademicDomain }>, { merge: false }>();
  if (error) throw new Error("Unable to load General Academic practice inventory.");
  const packIds = (packs ?? []).map((pack) => pack.id);
  const { data: questions, error: questionError } = packIds.length
    ? await admin.from("general_academic_questions").select("skill").in("source_pack_id", packIds).limit(5000)
      .overrideTypes<Array<{ skill: GeneralAcademicSkill }>, { merge: false }>()
    : { data: [], error: null };
  if (questionError) throw new Error("Unable to load General Academic practice inventory.");
  return {
    domains: GENERAL_ACADEMIC_DOMAINS.filter((domain) => (packs ?? []).some((pack) => pack.domain === domain)),
    skills: GENERAL_ACADEMIC_SKILLS.filter((skill) => (questions ?? []).some((question) => question.skill === skill)),
  };
}

export async function getGeneralAcademicLearningOverview(userId: string, includeActivity = true): Promise<GeneralAcademicLearningOverview> {
  validateUserId(userId);
  const admin = createSupabaseAdminClient();
  const [{ data: rawAnalytics, error: analyticsError }, inventory, { data: mistakes, error: mistakeError }, activity] = await Promise.all([
    admin.rpc("get_general_academic_learning_analytics", { p_user_id: userId }),
    loadInventory(),
    admin.from("general_academic_mistakes").select("skill, last_missed_at").eq("user_id", userId).eq("status", "active").limit(1000)
      .overrideTypes<Array<{ skill: GeneralAcademicSkill; last_missed_at: string }>, { merge: false }>(),
    includeActivity ? getGeneralAcademicDashboardActivity(userId) : Promise.resolve({ active: null, recent: [] }),
  ]);
  if (analyticsError || mistakeError) throw new Error("Unable to load General Academic progress.");
  const analytics = parseGeneralAcademicLearningAnalytics(rawAnalytics);
  const groupedMistakes = new Map<GeneralAcademicSkill, { count: number; lastMissedAt: string }>();
  for (const mistake of mistakes ?? []) {
    const current = groupedMistakes.get(mistake.skill);
    groupedMistakes.set(mistake.skill, {
      count: (current?.count ?? 0) + 1,
      lastMissedAt: current && current.lastMissedAt > mistake.last_missed_at ? current.lastMissedAt : mistake.last_missed_at,
    });
  }
  const activeMistakes = [...groupedMistakes.entries()].map(([skill, value]) => ({ skill, ...value }));
  return {
    analytics,
    recommendations: getGeneralAcademicPracticeRecommendations(analytics, inventory, activeMistakes),
    activeMistakeCount: activeMistakes.reduce((sum, item) => sum + item.count, 0),
    recent: activity.recent,
  };
}

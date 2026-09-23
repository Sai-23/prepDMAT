import { z } from "zod";

import {
  GENERAL_ACADEMIC_OPTION_IDS,
  type GeneralAcademicDifficulty,
  type GeneralAcademicDomain,
  type GeneralAcademicSkill,
} from "./registries";
import {
  privateGeneralAcademicSnapshotSchema,
  studentGeneralAcademicPackSchema,
  toPrivateGeneralAcademicSnapshot,
  toStudentGeneralAcademicPack,
  type GeneralAcademicOptionId,
  type GeneralAcademicPublishedCandidate,
  type PrivateGeneralAcademicSnapshot,
  type StudentGeneralAcademicPack,
} from "./practice";

export const GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION = "general-academic-mock-composition@1" as const;
export const GENERAL_ACADEMIC_MOCK_DURATION_SECONDS = 90 * 60;
export const GENERAL_ACADEMIC_MOCK_TARGET_MIN_QUESTIONS = 24;
export const GENERAL_ACADEMIC_MOCK_TARGET_MAX_QUESTIONS = 32;
export const GENERAL_ACADEMIC_MOCK_MINIMUM_QUESTIONS = 18;
export const GENERAL_ACADEMIC_MOCK_MINIMUM_PACKS = 3;
export const GENERAL_ACADEMIC_MOCK_RECENT_HISTORY_WINDOW = 2;

export const generalAcademicMockStatusSchema = z.enum(["in_progress", "submitted"]);

export const generalAcademicMockPublicSnapshotSchema = z.object({
  compositionVersion: z.literal(GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION),
  seed: z.string().min(1).max(128),
  durationSeconds: z.literal(GENERAL_ACADEMIC_MOCK_DURATION_SECONDS),
  packs: z.array(studentGeneralAcademicPackSchema).min(GENERAL_ACADEMIC_MOCK_MINIMUM_PACKS),
}).strict();

export const generalAcademicMockPrivateSnapshotSchema = z.object({
  packs: z.array(z.object({
    id: z.string().uuid(),
    snapshot: privateGeneralAcademicSnapshotSchema,
  }).strict()).min(GENERAL_ACADEMIC_MOCK_MINIMUM_PACKS),
}).strict();

export const generalAcademicMockAnswerInputSchema = z.object({
  attemptId: z.string().uuid(),
  packId: z.string().uuid(),
  questionId: z.string().min(1).max(64),
  selectedOption: z.enum(GENERAL_ACADEMIC_OPTION_IDS).nullable(),
  isFlagged: z.boolean(),
  currentPackIndex: z.number().int().min(0).max(99),
  currentQuestionId: z.string().min(1).max(64),
}).strict();

export const generalAcademicMockIdentitySchema = z.object({ attemptId: z.string().uuid() }).strict();

export type GeneralAcademicMockStatus = z.infer<typeof generalAcademicMockStatusSchema>;
export type GeneralAcademicMockPublicSnapshot = z.infer<typeof generalAcademicMockPublicSnapshotSchema>;
export type GeneralAcademicMockPrivateSnapshot = z.infer<typeof generalAcademicMockPrivateSnapshotSchema>;

export type GeneralAcademicMockAnswer = {
  packId: string;
  questionId: string;
  selectedOption: GeneralAcademicOptionId | null;
  isFlagged: boolean;
  responseSeconds: number;
  answeredAt: string | null;
};

export type GeneralAcademicMockAttempt = {
  id: string;
  status: GeneralAcademicMockStatus;
  compositionVersion: typeof GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION;
  seed: string;
  durationSeconds: typeof GENERAL_ACADEMIC_MOCK_DURATION_SECONDS;
  currentPackIndex: number;
  currentQuestionId: string;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  elapsedSeconds: number;
  submissionReason: "manual" | "expired" | null;
  serverNow: string;
  packs: StudentGeneralAcademicPack[];
  answers: GeneralAcademicMockAnswer[];
};

export type GeneralAcademicMockComposition = {
  version: typeof GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION;
  seed: string;
  packs: GeneralAcademicPublishedCandidate[];
  questionCount: number;
};

export type GeneralAcademicMockReviewItem = {
  pack: StudentGeneralAcademicPack;
  question: StudentGeneralAcademicPack["questions"][number];
  selectedOption: GeneralAcademicOptionId | null;
  correctOption: GeneralAcademicOptionId;
  isCorrect: boolean;
  isFlagged: boolean;
  explanation: PrivateGeneralAcademicSnapshot["questions"][number]["explanation"];
};

export type GeneralAcademicMockReview = {
  attempt: GeneralAcademicMockAttempt;
  summary: { total: number; correct: number; incorrect: number; unanswered: number; accuracy: number; timeUsedSeconds: number };
  packs: Array<{ packId: string; title: string; domain: GeneralAcademicDomain; total: number; correct: number; accuracy: number }>;
  domains: Array<{ domain: GeneralAcademicDomain; total: number; correct: number; accuracy: number }>;
  skills: Array<{ skill: GeneralAcademicSkill; total: number; correct: number; accuracy: number }>;
  items: GeneralAcademicMockReviewItem[];
};

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRank(seed: string, id: string) {
  return hashSeed(`${seed}:${id}`) / 0xffffffff;
}

function representations(candidate: GeneralAcademicPublishedCandidate) {
  const result = new Set<string>();
  if (candidate.pack.stimulus.text) result.add("text");
  if (candidate.pack.stimulus.formulas.length) result.add("formula");
  if (candidate.pack.stimulus.tables.length) result.add("table");
  if (candidate.pack.stimulus.graphs.length) result.add("graph");
  if (candidate.pack.stimulus.figures.length) result.add("figure");
  return result;
}

export function composeGeneralAcademicMock(
  candidates: readonly GeneralAcademicPublishedCandidate[],
  seed: string,
  recentPackIds: readonly string[] = [],
): GeneralAcademicMockComposition | null {
  const eligible = candidates
    .filter((candidate) => candidate.pack.review.status === "published")
    .sort((left, right) => left.id.localeCompare(right.id));
  const totalAvailable = eligible.reduce((sum, candidate) => sum + candidate.pack.questions.length, 0);
  if (eligible.length < GENERAL_ACADEMIC_MOCK_MINIMUM_PACKS || totalAvailable < GENERAL_ACADEMIC_MOCK_MINIMUM_QUESTIONS) return null;

  const selected: GeneralAcademicPublishedCandidate[] = [];
  const domains = new Set<GeneralAcademicDomain>();
  const skills = new Set<GeneralAcademicSkill>();
  const difficulties = new Set<GeneralAcademicDifficulty>();
  const media = new Set<string>();
  const recent = new Set(recentPackIds);
  let questionCount = 0;

  while (questionCount < GENERAL_ACADEMIC_MOCK_TARGET_MIN_QUESTIONS || selected.length < GENERAL_ACADEMIC_MOCK_MINIMUM_PACKS) {
    const remaining = eligible.filter((candidate) => !selected.some((item) => item.id === candidate.id));
    if (!remaining.length) break;
    const unseen = remaining.filter((candidate) => !recent.has(candidate.id));
    const repeatSafe = unseen.length ? unseen : remaining;
    const fitting = repeatSafe.filter((candidate) => questionCount + candidate.pack.questions.length <= GENERAL_ACADEMIC_MOCK_TARGET_MAX_QUESTIONS);
    const pool = fitting.length ? fitting : repeatSafe;
    const ranked = pool.map((candidate) => {
      const candidateSkills = new Set(candidate.pack.questions.map((question) => question.skill));
      const candidateMedia = representations(candidate);
      const diversity = (domains.has(candidate.pack.domain) ? 0 : 12)
        + [...candidateSkills].filter((skill) => !skills.has(skill)).length * 2
        + [...candidateMedia].filter((item) => !media.has(item)).length * 2
        + (difficulties.has(candidate.pack.difficulty) ? 0 : 3);
      return { candidate, score: diversity + seededRank(seed, candidate.id) };
    }).sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id));
    const next = ranked[0].candidate;
    selected.push(next);
    questionCount += next.pack.questions.length;
    domains.add(next.pack.domain);
    difficulties.add(next.pack.difficulty);
    next.pack.questions.forEach((question) => skills.add(question.skill));
    representations(next).forEach((item) => media.add(item));
  }

  if (selected.length < GENERAL_ACADEMIC_MOCK_MINIMUM_PACKS || questionCount < GENERAL_ACADEMIC_MOCK_MINIMUM_QUESTIONS) return null;
  return { version: GENERAL_ACADEMIC_MOCK_COMPOSITION_VERSION, seed, packs: selected, questionCount };
}

export function buildGeneralAcademicMockSnapshots(composition: GeneralAcademicMockComposition) {
  const publicSnapshot: GeneralAcademicMockPublicSnapshot = {
    compositionVersion: composition.version,
    seed: composition.seed,
    durationSeconds: GENERAL_ACADEMIC_MOCK_DURATION_SECONDS,
    packs: composition.packs.map(toStudentGeneralAcademicPack),
  };
  const privateSnapshot: GeneralAcademicMockPrivateSnapshot = {
    packs: composition.packs.map((candidate) => ({ id: candidate.id, snapshot: toPrivateGeneralAcademicSnapshot(candidate) })),
  };
  return { publicSnapshot, privateSnapshot };
}

export function remainingGeneralAcademicMockSeconds(expiresAt: string, serverNow: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - new Date(serverNow).getTime()) / 1000));
}

export function buildGeneralAcademicMockReview(
  attempt: GeneralAcademicMockAttempt,
  privateSnapshot: GeneralAcademicMockPrivateSnapshot,
): GeneralAcademicMockReview {
  const answers = new Map(attempt.answers.map((answer) => [`${answer.packId}:${answer.questionId}`, answer]));
  const privatePacks = new Map(privateSnapshot.packs.map((pack) => [pack.id, pack.snapshot]));
  const items: GeneralAcademicMockReviewItem[] = attempt.packs.flatMap((pack) => {
    const privatePack = privatePacks.get(pack.id);
    if (!privatePack) throw new Error("Mock answer snapshot is incomplete.");
    const privateQuestions = new Map(privatePack.questions.map((question) => [question.id, question]));
    return pack.questions.map((question) => {
      const privateQuestion = privateQuestions.get(question.id);
      if (!privateQuestion) throw new Error("Mock answer snapshot is incomplete.");
      const answer = answers.get(`${pack.id}:${question.id}`);
      const selectedOption = answer?.selectedOption ?? null;
      return { pack, question, selectedOption, correctOption: privateQuestion.correctOption, isCorrect: selectedOption === privateQuestion.correctOption, isFlagged: answer?.isFlagged ?? false, explanation: privateQuestion.explanation };
    });
  });
  const metric = <Key extends string>(values: readonly GeneralAcademicMockReviewItem[], key: (item: GeneralAcademicMockReviewItem) => Key) => {
    const groups = new Map<Key, GeneralAcademicMockReviewItem[]>();
    values.forEach((item) => groups.set(key(item), [...(groups.get(key(item)) ?? []), item]));
    return [...groups.entries()].map(([id, rows]) => {
      const correct = rows.filter((row) => row.isCorrect).length;
      return { id, total: rows.length, correct, accuracy: rows.length ? (correct / rows.length) * 100 : 0 };
    });
  };
  const correct = items.filter((item) => item.isCorrect).length;
  const unanswered = items.filter((item) => !item.selectedOption).length;
  return {
    attempt,
    summary: { total: items.length, correct, incorrect: items.length - correct - unanswered, unanswered, accuracy: items.length ? (correct / items.length) * 100 : 0, timeUsedSeconds: attempt.elapsedSeconds },
    packs: metric(items, (item) => item.pack.id).map(({ id, ...value }) => { const pack = attempt.packs.find((item) => item.id === id)!; return { packId: id, title: pack.title, domain: pack.domain, ...value }; }),
    domains: metric(items, (item) => item.pack.domain).map(({ id, ...value }) => ({ domain: id, ...value })),
    skills: metric(items, (item) => item.question.skill).map(({ id, ...value }) => ({ skill: id, ...value })),
    items,
  };
}

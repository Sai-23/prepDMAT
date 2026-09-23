import { z } from "zod";

import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_OPTION_IDS,
  GENERAL_ACADEMIC_SKILLS,
} from "./registries";
import {
  canonicalGeneralAcademicPackSchema,
  generalAcademicExplanationSchema,
  generalAcademicStimulusSchema,
  type CanonicalGeneralAcademicPack,
} from "./schemas";

export const GENERAL_ACADEMIC_PRACTICE_MODES = ["domain", "skill", "mixed"] as const;
export const GENERAL_ACADEMIC_PRACTICE_TIMING_MODES = ["untimed", "timed"] as const;
export const GENERAL_ACADEMIC_PRACTICE_DIFFICULTIES = ["mixed", ...GENERAL_ACADEMIC_DIFFICULTIES] as const;
export const GENERAL_ACADEMIC_PRACTICE_SECONDS_PER_QUESTION = 120;

export const generalAcademicPracticeConfigSchema = z.object({
  mode: z.enum(GENERAL_ACADEMIC_PRACTICE_MODES),
  domain: z.enum(GENERAL_ACADEMIC_DOMAINS).optional(),
  skill: z.enum(GENERAL_ACADEMIC_SKILLS).optional(),
  difficulty: z.enum(GENERAL_ACADEMIC_PRACTICE_DIFFICULTIES).default("mixed"),
  timingMode: z.enum(GENERAL_ACADEMIC_PRACTICE_TIMING_MODES).default("untimed"),
}).strict().superRefine((config, context) => {
  if (config.mode === "domain" && !config.domain) context.addIssue({ code: "custom", path: ["domain"], message: "Choose a domain." });
  if (config.mode === "skill" && !config.skill) context.addIssue({ code: "custom", path: ["skill"], message: "Choose a skill." });
  if (config.mode !== "domain" && config.domain) context.addIssue({ code: "custom", path: ["domain"], message: "Domain is only valid for domain practice." });
  if (config.mode !== "skill" && config.skill) context.addIssue({ code: "custom", path: ["skill"], message: "Skill is only valid for skill practice." });
});

export const generalAcademicAttemptIdentitySchema = z.object({
  attemptId: z.string().uuid(),
}).strict();

export const generalAcademicAutosaveSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().min(1).max(64),
  selectedOption: z.enum(GENERAL_ACADEMIC_OPTION_IDS).nullable(),
  isFlagged: z.boolean(),
  currentQuestionIndex: z.number().int().min(0).max(99),
}).strict();

export type GeneralAcademicPracticeConfig = z.infer<typeof generalAcademicPracticeConfigSchema>;
export type GeneralAcademicOptionId = typeof GENERAL_ACADEMIC_OPTION_IDS[number];
export type GeneralAcademicPracticeStatus = "in_progress" | "submitted" | "abandoned";

const studentGeneralAcademicQuestionSchema = z.object({
  id: z.string().min(1).max(64),
  order: z.number().int().min(1),
  skill: z.enum(GENERAL_ACADEMIC_SKILLS),
  difficulty: z.enum(GENERAL_ACADEMIC_DIFFICULTIES),
  prompt: z.string().min(1),
  options: z.array(z.object({ id: z.enum(GENERAL_ACADEMIC_OPTION_IDS), text: z.string().min(1) }).strict()).length(4),
}).strict();

export const studentGeneralAcademicPackSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  domain: z.enum(GENERAL_ACADEMIC_DOMAINS),
  topic: z.string().min(1),
  difficulty: z.enum(GENERAL_ACADEMIC_DIFFICULTIES),
  stimulus: generalAcademicStimulusSchema,
  questions: z.array(studentGeneralAcademicQuestionSchema).min(1),
}).strict();

export const privateGeneralAcademicSnapshotSchema = z.object({
  questions: z.array(z.object({
    id: z.string().min(1).max(64),
    correctOption: z.enum(GENERAL_ACADEMIC_OPTION_IDS),
    explanation: generalAcademicExplanationSchema,
    skill: z.enum(GENERAL_ACADEMIC_SKILLS),
    difficulty: z.enum(GENERAL_ACADEMIC_DIFFICULTIES),
  }).strict()).min(1),
}).strict();

export type StudentGeneralAcademicQuestion = {
  id: string;
  order: number;
  skill: CanonicalGeneralAcademicPack["questions"][number]["skill"];
  difficulty: CanonicalGeneralAcademicPack["questions"][number]["difficulty"];
  prompt: string;
  options: Array<{ id: GeneralAcademicOptionId; text: string }>;
};

export type StudentGeneralAcademicPack = {
  id: string;
  title: string;
  domain: CanonicalGeneralAcademicPack["domain"];
  topic: string;
  difficulty: CanonicalGeneralAcademicPack["difficulty"];
  stimulus: CanonicalGeneralAcademicPack["stimulus"];
  questions: StudentGeneralAcademicQuestion[];
};

export type PrivateGeneralAcademicSnapshot = {
  questions: Array<{
    id: string;
    correctOption: GeneralAcademicOptionId;
    explanation: CanonicalGeneralAcademicPack["questions"][number]["explanation"];
    skill: CanonicalGeneralAcademicPack["questions"][number]["skill"];
    difficulty: CanonicalGeneralAcademicPack["questions"][number]["difficulty"];
  }>;
};

export type GeneralAcademicPracticeAnswer = {
  questionId: string;
  selectedOption: GeneralAcademicOptionId | null;
  isFlagged: boolean;
  responseSeconds: number;
  answeredAt: string | null;
};

export type GeneralAcademicPracticeAttempt = {
  id: string;
  status: GeneralAcademicPracticeStatus;
  mode: GeneralAcademicPracticeConfig["mode"];
  timingMode: GeneralAcademicPracticeConfig["timingMode"];
  selectedDomain: CanonicalGeneralAcademicPack["domain"] | null;
  selectedSkill: CanonicalGeneralAcademicPack["questions"][number]["skill"] | null;
  selectedDifficulty: GeneralAcademicPracticeConfig["difficulty"];
  currentQuestionIndex: number;
  startedAt: string;
  expiresAt: string | null;
  elapsedSeconds: number;
  submittedAt: string | null;
  pack: StudentGeneralAcademicPack;
  answers: GeneralAcademicPracticeAnswer[];
};

export type GeneralAcademicPracticeReview = {
  attempt: GeneralAcademicPracticeAttempt;
  summary: {
    correct: number;
    incorrect: number;
    unanswered: number;
    total: number;
    accuracy: number;
  };
  skills: Array<{ skill: StudentGeneralAcademicQuestion["skill"]; correct: number; attempted: number; accuracy: number }>;
  items: Array<{
    question: StudentGeneralAcademicQuestion;
    selectedOption: GeneralAcademicOptionId | null;
    correctOption: GeneralAcademicOptionId;
    isCorrect: boolean;
    explanation: CanonicalGeneralAcademicPack["questions"][number]["explanation"];
    isFlagged: boolean;
  }>;
};

export type GeneralAcademicPublishedCandidate = { id: string; pack: CanonicalGeneralAcademicPack };

export function isStudentEligibleGeneralAcademicPack(candidate: GeneralAcademicPublishedCandidate) {
  const parsed = canonicalGeneralAcademicPackSchema.safeParse(candidate.pack);
  return parsed.success && parsed.data.review.status === "published";
}

export function toStudentGeneralAcademicPack(candidate: GeneralAcademicPublishedCandidate): StudentGeneralAcademicPack {
  if (!isStudentEligibleGeneralAcademicPack(candidate)) throw new Error("Published General Academic content is unavailable.");
  const pack = candidate.pack;
  return {
    id: candidate.id,
    title: pack.title,
    domain: pack.domain,
    topic: pack.topic,
    difficulty: pack.difficulty,
    stimulus: {
      text: pack.stimulus.text,
      formulas: pack.stimulus.formulas.map((formula) => ({
        id: formula.id,
        label: formula.label,
        expression: formula.expression,
        display: formula.display,
        variables: formula.variables.map((variable) => ({
          symbol: variable.symbol,
          displaySymbol: variable.displaySymbol,
          meaning: variable.meaning,
          unit: variable.unit,
        })),
      })),
      tables: pack.stimulus.tables.map((table) => ({ ...table, columns: [...table.columns], rows: table.rows.map((row) => [...row]) })),
      graphs: pack.stimulus.graphs.map((graph) => ({ ...graph, xAxis: { ...graph.xAxis }, yAxis: { ...graph.yAxis }, series: graph.series.map((series) => ({ ...series, points: series.points.map((point) => ({ ...point })) })) })),
      figures: pack.stimulus.figures.map((figure) => ({ ...figure })),
    },
    questions: pack.questions.map((question) => ({
      id: question.id,
      order: question.order,
      skill: question.skill,
      difficulty: question.difficulty,
      prompt: question.prompt,
      options: question.options.map((option) => ({ id: option.id, text: option.text })),
    })),
  };
}

export function toPrivateGeneralAcademicSnapshot(candidate: GeneralAcademicPublishedCandidate): PrivateGeneralAcademicSnapshot {
  if (!isStudentEligibleGeneralAcademicPack(candidate)) throw new Error("Published General Academic content is unavailable.");
  return {
    questions: candidate.pack.questions.map((question) => ({
      id: question.id,
      correctOption: question.correctOption,
      explanation: { ...question.explanation, steps: [...question.explanation.steps] },
      skill: question.skill,
      difficulty: question.difficulty,
    })),
  };
}

export function selectGeneralAcademicPack(
  candidates: GeneralAcademicPublishedCandidate[],
  config: GeneralAcademicPracticeConfig,
  recentPackIds: readonly string[] = [],
) {
  const eligible = candidates
    .filter(isStudentEligibleGeneralAcademicPack)
    .filter(({ pack }) => config.difficulty === "mixed" || pack.difficulty === config.difficulty)
    .filter(({ pack }) => config.mode !== "domain" || pack.domain === config.domain)
    .filter(({ pack }) => config.mode !== "skill" || pack.questions.some((question) => question.skill === config.skill))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (!eligible.length) return null;
  return eligible.find((candidate) => !recentPackIds.includes(candidate.id)) ?? eligible[0];
}

export function buildGeneralAcademicPracticeReview(
  attempt: GeneralAcademicPracticeAttempt,
  privateSnapshot: PrivateGeneralAcademicSnapshot,
): GeneralAcademicPracticeReview {
  const answers = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  const privateById = new Map(privateSnapshot.questions.map((question) => [question.id, question]));
  const skillTotals = new Map<StudentGeneralAcademicQuestion["skill"], { correct: number; attempted: number }>();
  const items = attempt.pack.questions.map((question) => {
    const answer = answers.get(question.id);
    const privateQuestion = privateById.get(question.id);
    if (!privateQuestion) throw new Error("Attempt answer snapshot is incomplete.");
    const selectedOption = answer?.selectedOption ?? null;
    const isCorrect = selectedOption === privateQuestion.correctOption;
    const totals = skillTotals.get(question.skill) ?? { correct: 0, attempted: 0 };
    if (selectedOption) totals.attempted += 1;
    if (isCorrect) totals.correct += 1;
    skillTotals.set(question.skill, totals);
    return { question, selectedOption, correctOption: privateQuestion.correctOption, isCorrect, explanation: privateQuestion.explanation, isFlagged: answer?.isFlagged ?? false };
  });
  const correct = items.filter((item) => item.isCorrect).length;
  const unanswered = items.filter((item) => !item.selectedOption).length;
  const incorrect = items.length - correct - unanswered;
  return {
    attempt,
    summary: { correct, incorrect, unanswered, total: items.length, accuracy: items.length ? (correct / items.length) * 100 : 0 },
    skills: [...skillTotals.entries()].map(([skill, totals]) => ({ skill, ...totals, accuracy: totals.attempted ? (totals.correct / totals.attempted) * 100 : 0 })),
    items,
  };
}

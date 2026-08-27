import { z } from "zod";

import { DIFFICULTIES, MODULES, QUESTION_TYPES } from "../../types/questions";
import { CORE_SKILLS } from "../progress/skills";
import type { EducationalExplanation } from "./educational-explanation";

export const PRACTICE_MODULES = QUESTION_TYPES;
export const PRACTICE_DIFFICULTIES = ["easy", "medium", "hard", "mixed"] as const;
export const PRACTICE_QUESTION_COUNTS = [5, 10, 20] as const;

export const practiceConfigSchema = z.object({
  questionId: z.string().uuid().optional(),
  module: z.enum(PRACTICE_MODULES),
  difficulty: z.enum(PRACTICE_DIFFICULTIES),
  questionCount: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal(20)]),
  timingMode: z.enum(["untimed", "timed"]),
  retryOfSessionId: z.string().uuid().optional(),
  sourceAttemptId: z.string().uuid().optional(),
  focusFamilies: z.array(z.enum(CORE_SKILLS.map((skill) => skill.id) as [
    (typeof CORE_SKILLS)[number]["id"],
    ...(typeof CORE_SKILLS)[number]["id"][],
  ])).max(3).optional(),
}).superRefine((value, context) => {
  if ((value.questionCount === 1) !== Boolean(value.questionId)) {
    context.addIssue({ code: "custom", message: "Single-question practice requires an exact question." });
  }
  if (value.questionId && value.sourceAttemptId) {
    context.addIssue({ code: "custom", message: "Exact review cannot also target a mock attempt." });
  }
});

const practiceAnswerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("single_choice"), optionId: z.string().min(1).max(200) }),
  z.object({ kind: z.literal("symbol_assignment"), values: z.record(z.string().regex(/^[A-Z]$/), z.number().int().min(1).max(20)) }),
  z.object({ kind: z.literal("two_stage_single_choice"), optionIds: z.tuple([z.string().min(1), z.string().min(1)]) }),
]);

export const answerSubmissionSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: practiceAnswerSchema,
});

export const practiceQuestionIdentitySchema = answerSubmissionSchema.pick({ sessionId: true, questionId: true });
export const completePracticeSchema = z.object({ sessionId: z.string().uuid() });
export const practiceReviewSchema = z.object({ sessionId: z.string().uuid() });

export const practiceReportSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  reason: z.enum(["incorrect_answer", "ambiguous_wording", "unclear_explanation", "formatting_problem", "technical_issue"]),
  details: z.string().trim().max(2000).optional().transform((value) => value || null),
});

export type PracticeConfig = z.infer<typeof practiceConfigSchema>;
export type PracticeModule = (typeof PRACTICE_MODULES)[number];
export type PracticeDifficulty = (typeof PRACTICE_DIFFICULTIES)[number];

export type PracticeQuestion = {
  id: string;
  module: (typeof MODULES)[number];
  questionType: (typeof QUESTION_TYPES)[number];
  topic: string;
  subtopic: string | null;
  difficulty: (typeof DIFFICULTIES)[number];
  questionText: string;
  passage: string | null;
  code: string | null;
  formula: string | null;
  tableData: unknown;
  imageUrl: string | null;
  estimatedTimeSeconds: number;
  structuredData?: unknown;
  response?: PracticeResponse;
  options: Array<{ id: string; label: string; content: string }>;
};

export type PracticeResponse =
  | { kind: "single_choice"; options: Array<{ id: string; label: string; content: string }> }
  | { kind: "symbol_assignment"; symbols: string[] }
  | { kind: "two_stage_single_choice" };

export type PracticeAnswer = z.infer<typeof practiceAnswerSchema>;

export type PracticeFeedback = {
  isCorrect: boolean;
  correctAnswer: unknown;
  explanation: string;
  explanationTrace?: unknown;
  educationalExplanation?: EducationalExplanation;
};

export type PracticeSessionState = {
  sessionId: string;
  module: PracticeModule;
  difficulty: PracticeDifficulty;
  questionCount: number;
  timingMode: "untimed" | "timed";
  expiresAt: string | null;
  currentPosition: number;
  correctCount: number;
  incorrectCount: number;
  totalTimeSeconds: number;
  question: PracticeQuestion;
  answer: PracticeAnswer | null;
  feedback: PracticeFeedback | null;
  targetPaceSeconds: number;
};

export type PracticeSummary = {
  sessionId: string;
  score: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  averageTimeSeconds: number;
  module: PracticeModule;
  difficulty: PracticeDifficulty;
  insight: string;
  incorrectFamilies: string[];
};

export type PracticeModulePerformance = {
  module: PracticeModule;
  completedSessions: number;
  accuracy: number | null;
  lastPracticedAt: string | null;
};

export type PracticeReviewItem = {
  position: number;
  question: PracticeQuestion;
  answer: PracticeAnswer;
  feedback: PracticeFeedback;
  timeSpentSeconds: number;
  reasoningFamily: string;
  reasoningClassification: string;
};

export type PracticeReview = {
  summary: PracticeSummary;
  items: PracticeReviewItem[];
};

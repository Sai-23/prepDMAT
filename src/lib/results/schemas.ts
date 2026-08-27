import { z } from "zod";

import type { PracticeAnswer, PracticeQuestion } from "@/lib/practice/schemas";
import type { EducationalExplanation } from "@/lib/practice/educational-explanation";
import type { FigureExplanationTrace } from "@/lib/practice/figure-sequence-explanation-trace";
import type { LatinExplanationTrace } from "@/lib/practice/latin-square-explanation-trace";
import type { EquationExplanationTrace } from "@/lib/practice/mathematical-equation-explanation";
import type { CoreSkillId } from "@/lib/progress/skills";

export const resultAttemptIdSchema = z.string().uuid();

export type ResultHistoryItem = {
  id: string;
  testTitle: string;
  origin: "curated" | "generated";
  status: "submitted" | "auto_submitted";
  startedAt: string;
  submittedAt: string | null;
  score: number;
  accuracy: number;
  totalTimeSeconds: number;
};

export type ResultBreakdown = {
  label: string;
  correct: number;
  total: number;
  accuracy: number;
  averageTimeSeconds: number;
};

export type ResultQuestion = Omit<
  PracticeQuestion,
  "estimatedTimeSeconds" | "imageUrl" | "tableData"
> & {
  sectionTitle: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  explanation: string;
  responseStatus: "unanswered" | "answered" | "skipped";
  isCorrect: boolean;
  markedForReview: boolean;
  isBookmarked: boolean;
  canBookmark?: boolean;
  timeSpentSeconds: number;
  answer?: PracticeAnswer | null;
  correctAnswer?: unknown;
  explanationTrace?: unknown;
  figureExplanationTrace?: FigureExplanationTrace;
  latinExplanationTrace?: LatinExplanationTrace;
  mathematicalExplanationTrace?: EquationExplanationTrace;
  educationalExplanation?: EducationalExplanation;
  questionNumber?: number;
  estimatedTimeSeconds?: number;
  skillIds?: CoreSkillId[];
};

export type AttemptResult = {
  id: string;
  testTitle: string;
  origin: "curated" | "generated";
  hasImmutableSnapshots: boolean;
  status: "submitted" | "auto_submitted";
  startedAt: string;
  submittedAt: string | null;
  totalTimeSeconds: number;
  score: number;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  answeredCount: number;
  topicBreakdown: ResultBreakdown[];
  difficultyBreakdown: ResultBreakdown[];
  questions: ResultQuestion[];
  recommendation: {
    title: string;
    description: string;
  };
};

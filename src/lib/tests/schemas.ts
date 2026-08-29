import { z } from "zod";

import type { PracticeQuestion } from "@/lib/practice/schemas";
import { answerSubmissionSchema, type PracticeAnswer } from "@/lib/practice/schemas";

export const testIdSchema = z.string().uuid();
export const generatedMockRequestSchema = z.object({
  generationRequestId: z.string().uuid(),
});

export const saveTestResponseSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: answerSubmissionSchema.shape.answer.nullable(),
  markedForReview: z.boolean(),
  timeSpentSeconds: z.number().int().min(0).max(86_400),
});

export const submitTestSchema = z.object({
  attemptId: z.string().uuid(),
  autoSubmitted: z.boolean().default(false),
});

export const advanceTestSectionSchema = z.object({
  attemptId: z.string().uuid(),
  currentSectionId: z.string().uuid(),
});

export type TestCatalogItem = {
  id: string;
  title: string;
  description: string | null;
  testType: "diagnostic" | "mini_mock" | "full_mock" | "sectional";
  module: "core" | null;
  moduleType: PracticeQuestion["questionType"] | null;
  durationSeconds: number;
  isPremium: boolean;
  sectionCount: number;
  questionCount: number;
  hasAccess: boolean;
  attemptSummary: {
    completed: boolean;
    attemptCount: number;
    bestScore: number | null;
    latestScore: number | null;
    latestCompletedAt: string | null;
    hasInProgress: boolean;
  };
};

export type TestOverview = Omit<TestCatalogItem, "moduleType" | "attemptSummary"> & {
  instructions: string | null;
  sections: Array<{
    id: string;
    title: string;
    durationSeconds: number;
    questionCount: number;
  }>;
};

export type TestQuestion = PracticeQuestion & {
  sectionId: string;
  sectionTitle: string;
  sectionPosition: number;
};

export type TestAttemptPayload = {
  attemptId: string;
  title: string;
  sectionExpiresAt: string;
  serverNow: string;
  currentSectionId: string;
  currentQuestionId: string;
  sections: Array<{ id: string; title: string; durationSeconds: number; sortOrder: number }>;
  questions: TestQuestion[];
  initialResponses: Array<{
    questionId: string;
    answer: PracticeAnswer | null;
    markedForReview: boolean;
    timeSpentSeconds: number;
  }>;
};

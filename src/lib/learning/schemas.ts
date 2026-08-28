import { z } from "zod";

import type { PracticeAnswer, PracticeQuestion } from "@/lib/practice/schemas";

export const bookmarkMutationSchema = z.object({
  questionId: z.string().uuid(),
  bookmarked: z.boolean(),
});

export const mistakeEntrySchema = z.object({
  sourceKind: z.enum([
    "canonical_question",
    "practice_session_item",
    "mock_attempt_item",
  ]),
  sourceId: z.string().uuid(),
  note: z.string().trim().max(2000, "Notes must be 2,000 characters or fewer."),
  isUnderstood: z.boolean(),
});

export type MistakeSourceKind = z.infer<
  typeof mistakeEntrySchema
>["sourceKind"];
export type MistakeSource = "practice" | "diagnostic" | "mock";

export type BookmarkQuestion = {
  id: string;
  module: PracticeQuestion["module"];
  questionType: PracticeQuestion["questionType"];
  topic: string;
  subtopic: string | null;
  difficulty: PracticeQuestion["difficulty"];
  questionText: string;
  bookmarkedAt: string;
};

export type MistakeQuestion = {
  id: string;
  sourceKind: MistakeSourceKind;
  source: MistakeSource;
  sourceQuestionId: string | null;
  question: PracticeQuestion;
  answer: PracticeAnswer | null;
  correctAnswer: unknown;
  answerText: string;
  correctAnswerText: string;
  explanation: string;
  occurrenceCount: number;
  lastIncorrectAt: string | null;
  note: string;
  isUnderstood: boolean;
  isBookmarked: boolean;
};

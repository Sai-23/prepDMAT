import { z } from "zod";

import {
  DIFFICULTIES,
  MODULES,
  QUESTION_TYPES,
  SOURCE_TYPES,
} from "../../types/questions";

const optionalText = z.string().trim().optional().transform((value) => value || null);

export const questionAuthoringSchema = z
  .object({
    module: z.enum(MODULES),
    questionType: z.enum(QUESTION_TYPES),
    subject: optionalText,
    topic: z.string().trim().min(2, "Enter a topic.").max(120),
    subtopic: optionalText,
    difficulty: z.enum(DIFFICULTIES),
    questionText: z.string().trim().min(10, "Question text is too short."),
    passage: optionalText,
    code: optionalText,
    formula: optionalText,
    structuredData: optionalText,
    imageUrl: z
      .union([z.literal(""), z.string().trim().url("Enter a valid image URL.")])
      .transform((value) => value || null),
    explanation: z.string().trim().min(10, "Provide a useful explanation."),
    estimatedTimeSeconds: z.coerce.number().int().min(10).max(3600),
    sourceType: z.enum(SOURCE_TYPES),
    options: z
      .array(z.string().trim().min(1, "All four options are required."))
      .length(4),
    correctOptionIndex: z.coerce.number().int().min(0).max(3),
    intent: z.enum(["draft", "review", "correction"]),
  })
  .superRefine((value, context) => {
    if (value.module !== "core") {
      context.addIssue({
        code: "custom",
        path: ["module"],
        message: "This question type belongs to the Core module.",
      });
    }
    if (new Set(value.options.map((option) => option.toLowerCase())).size !== 4) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Answer options must be unique.",
      });
    }
    if (value.structuredData) {
      try {
        JSON.parse(value.structuredData);
      } catch {
        context.addIssue({
          code: "custom",
          path: ["structuredData"],
          message: "Structured data must be valid JSON.",
        });
      }
    }
  });

export const questionReviewSchema = z.object({
  questionId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  comments: z.string().trim().max(2000).optional().transform((value) => value || null),
});

export const questionLifecycleSchema = z.object({
  questionId: z.string().uuid(),
  action: z.enum(["submit_review", "publish", "retire"]),
});

export const questionDeleteSchema = z.object({
  questionId: z.string().uuid(),
});

export const questionEditIdSchema = z.string().uuid();

export function canAdminEditQuestion(
  verificationStatus: string,
  publicationStatus: string,
) {
  return (
    publicationStatus === "published" ||
    (publicationStatus !== "published" &&
      ["draft", "rejected"].includes(verificationStatus))
  );
}

export type QuestionAuthoringInput = z.infer<typeof questionAuthoringSchema>;

export type ReviewQueueQuestion = {
  id: string;
  module: string;
  questionType: string;
  topic: string;
  subtopic: string | null;
  difficulty: string;
  questionText: string;
  passage: string | null;
  code: string | null;
  formula: string | null;
  sourceType: "manual" | "generated" | "imported";
  structuredData: unknown;
  metadata: unknown;
  explanation: string;
  correctOptionId: string | null;
  verificationStatus: "draft" | "under_review" | "approved" | "rejected";
  publicationStatus: "draft" | "published" | "flagged" | "retired";
  version: number;
  createdAt: string;
  options: Array<{ id: string; label: string; content: string }>;
};

export type AdminMetrics = {
  totalUsers: number;
  totalQuestions: number;
  underReview: number;
  approvedDrafts: number;
  publishedQuestions: number;
  openReports: number;
  publishedTests: number;
  generatedQuestions: number;
  generatedTodayUtc: number;
  totalAttempts: number;
  completedAttempts: number;
  generatedByType: Record<"figure_sequence" | "mathematical_equation" | "latin_square", number>;
  generatedByDifficulty: Record<"easy" | "medium" | "hard", number>;
};

export type EditableQuestion = {
  id: string;
  module: QuestionAuthoringInput["module"];
  questionType: QuestionAuthoringInput["questionType"];
  subject: string | null;
  topic: string;
  subtopic: string | null;
  difficulty: QuestionAuthoringInput["difficulty"];
  questionText: string;
  passage: string | null;
  code: string | null;
  formula: string | null;
  structuredData: string;
  imageUrl: string | null;
  explanation: string;
  estimatedTimeSeconds: number;
  sourceType: QuestionAuthoringInput["sourceType"];
  options: string[];
  correctOptionIndex: number;
  verificationStatus: ReviewQueueQuestion["verificationStatus"];
  publicationStatus: ReviewQueueQuestion["publicationStatus"];
};

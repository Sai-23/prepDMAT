import { z } from "zod";

import { MODULES } from "../../types/questions";

export const TEST_TYPES = [
  "diagnostic",
  "mini_mock",
  "full_mock",
  "sectional",
] as const;

const nullableModule = z
  .union([z.enum(MODULES), z.literal(""), z.null()])
  .transform((value) => value || null);

const testSectionSchema = z.object({
  title: z.string().trim().min(2, "Enter a section title.").max(120),
  module: nullableModule,
  sectionType: z.enum(["figure_sequence", "mathematical_equation", "latin_square", "mixed"]),
  durationSeconds: z.coerce.number().int().min(60).max(14_400),
  focusDifficulty: z
    .union([z.enum(["easy", "medium", "hard"]), z.literal(""), z.null()])
    .optional()
    .transform((value) => value || null),
  questionIds: z.array(z.string().uuid()).min(1).max(100),
});

export const adminTestBuilderSchema = z
  .object({
    title: z.string().trim().min(3, "Enter a mock title.").max(160),
    description: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((value) => value || null),
    testType: z.enum(TEST_TYPES),
    module: nullableModule,
    instructions: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .transform((value) => value || null),
    isPremium: z.boolean(),
    randomizeQuestions: z.boolean(),
    randomizeOptions: z.boolean(),
    intent: z.enum(["draft", "publish"]),
    sections: z.array(testSectionSchema).min(1).max(10),
  })
  .superRefine((value, context) => {
    const questionIds = value.sections.flatMap((section) => section.questionIds);
    if (questionIds.length > 200) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "A mock can contain at most 200 questions.",
      });
    }
    if (new Set(questionIds).size !== questionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "A question can only appear once in a mock.",
      });
    }
    value.sections.forEach((section, index) => {
      if (
        value.testType === "sectional" &&
        section.sectionType !== "mixed" &&
        !section.focusDifficulty
      ) {
        context.addIssue({
          code: "custom",
          path: ["sections", index, "focusDifficulty"],
          message: "Choose a difficulty for each focused sectional mock.",
        });
      }
      if (value.module && section.module && section.module !== value.module) {
        context.addIssue({
          code: "custom",
          path: ["sections", index, "module"],
          message: "The section module must match the mock module.",
        });
      }
    });
  });

export const adminTestIdSchema = z.string().uuid();

export const SMART_FILL_MAX_QUESTION_COUNT = 100;

export const smartFillTargetCountSchema = z.preprocess(
  (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
    return Number.NaN;
  },
  z.number()
    .finite("Enter a valid question count.")
    .int("Enter a whole-number question count.")
    .min(1, "Question count must be at least 1.")
    .max(
      SMART_FILL_MAX_QUESTION_COUNT,
      `Question count cannot exceed ${SMART_FILL_MAX_QUESTION_COUNT}.`,
    ),
);

export const adminSmartFillRequestSchema = z
  .object({
    testId: adminTestIdSchema.optional(),
    questionType: z.enum([
      "figure_sequence",
      "mathematical_equation",
      "latin_square",
    ]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    targetCount: smartFillTargetCountSchema,
    existingQuestionIds: z.array(z.string().uuid()).max(SMART_FILL_MAX_QUESTION_COUNT),
    otherQuestionIds: z.array(z.string().uuid()).max(200),
    allowPublishedFocusedReuse: z.boolean(),
    mode: z.enum(["fill", "regenerate"]),
    seed: z.string().trim().min(1).max(200),
  })
  .superRefine((value, context) => {
    if (new Set(value.existingQuestionIds).size !== value.existingQuestionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["existingQuestionIds"],
        message: "The current section contains duplicate questions.",
      });
    }
    const otherIds = new Set(value.otherQuestionIds);
    if (
      new Set(value.otherQuestionIds).size !== value.otherQuestionIds.length ||
      value.existingQuestionIds.some((questionId) => otherIds.has(questionId))
    ) {
      context.addIssue({
        code: "custom",
        path: ["otherQuestionIds"],
        message: "Questions must be unique across the mock.",
      });
    }
  });

export const adminTestLifecycleSchema = z.object({
  testId: adminTestIdSchema,
  action: z.enum(["publish", "unpublish"]),
});

export type AdminTestBuilderInput = z.infer<typeof adminTestBuilderSchema>;
export type AdminSmartFillRequest = z.infer<typeof adminSmartFillRequestSchema>;

export type AdminQuestionBankItem = {
  id: string;
  module: "core";
  questionType:
    | "figure_sequence"
    | "mathematical_equation"
    | "latin_square";
  topic: string;
  subtopic: string | null;
  difficulty: "easy" | "medium" | "hard";
  questionText: string;
  estimatedTimeSeconds: number;
  selectionFamily?: string | null;
  usedInPublishedFocusedMock?: boolean;
};

export type EditableAdminTest = {
  id: string;
  title: string;
  description: string | null;
  testType: (typeof TEST_TYPES)[number];
  module: "core" | null;
  instructions: string | null;
  isPremium: boolean;
  isPublished: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  sections: Array<{
    title: string;
    sectionType: "figure_sequence" | "mathematical_equation" | "latin_square" | "mixed";
    module: "core" | null;
    durationSeconds: number;
    focusDifficulty: "easy" | "medium" | "hard" | null;
    questionIds: string[];
  }>;
};

export type AdminTestListItem = {
  id: string;
  title: string;
  testType: (typeof TEST_TYPES)[number];
  module: "core" | null;
  durationSeconds: number;
  isPremium: boolean;
  isPublished: boolean;
  sectionCount: number;
  questionCount: number;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  sections: Array<{
    title: string;
    sectionType: "figure_sequence" | "mathematical_equation" | "latin_square" | "mixed";
    durationSeconds: number;
    questions: Array<{
      id: string;
      questionType: "figure_sequence" | "mathematical_equation" | "latin_square" | "unknown";
      difficulty: "easy" | "medium" | "hard" | "unknown";
      questionText: string;
      unavailable: boolean;
    }>;
  }>;
};

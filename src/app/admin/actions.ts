"use server";

import { revalidatePath } from "next/cache";

import {
  createPublishedGeneratedEquation,
  createPublishedGeneratedLatin,
  createPublishedGeneratedFigure,
  createQuestion,
  getGeneratedEquationNoveltyHistory,
  getGeneratedLatinNoveltyHistory,
  getGeneratedFigureNoveltyHistory,
  getGeneratedQuestionByFingerprint,
  reviewQuestion,
  softDeleteQuestion,
  updateQuestion,
} from "@/lib/admin/data";
import {
  equationGenerationRequestSchema,
  generatedEquationSaveSchema,
  generatedFigureSaveSchema,
  generatedLatinSaveSchema,
  generatedQuestionBatchInputSchema,
  generatedQuestionPublishItemSchema,
  type GeneratedQuestionPublishItem,
  figureGenerationRequestSchema,
  latinGenerationRequestSchema,
} from "@/lib/admin/generation-schemas";
import {
  generateValidatedMathematicalEquation,
  mathematicalEquationStructuralSignature,
  mathematicalEquationStructuralProfile,
  reproduceValidatedMathematicalEquation,
  type MathematicalEquationQuestion,
} from "@/lib/generation/mathematical-equations";
import {
  generateValidatedLatinSquare,
  reproduceValidatedLatinSquare,
  type LatinSquareQuestion,
  latinSquareStructuralProfile,
} from "@/lib/generation/latin-squares";
import {
  generateValidatedFigureSequence,
  reproduceValidatedFigureSequence,
  type FigureSequenceQuestion,
  figureSequenceStructuralProfile,
} from "@/lib/generation/figure-sequences";
import {
  saveAdminTest,
  selectAdminSmartFillQuestions,
  updateAdminTestPublication,
} from "@/lib/admin/test-data";
import {
  MockSaveError,
  type MockSaveDiagnostic,
} from "@/lib/admin/mock-persistence";
import {
  questionAuthoringSchema,
  questionDeleteSchema,
  questionEditIdSchema,
  questionReviewSchema,
} from "@/lib/admin/schemas";
import {
  adminTestBuilderSchema,
  adminTestIdSchema,
  adminTestLifecycleSchema,
  adminSmartFillRequestSchema,
} from "@/lib/admin/test-schemas";
import { requireRole } from "@/lib/auth/guards";
import {
  generatedPublishFailureMessage,
  runGeneratedQuestionBatch,
  type GeneratedBatchItemResult,
  type GeneratedBatchResult,
} from "@/lib/admin/generated-batch";
import {
  assessGeneratedQuestionEnvelope,
  type PublishableGeneratedQuestion,
} from "@/lib/admin/generated-publication";
import { safeActionFailure } from "@/lib/security/public-errors";

export type QuestionFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  questionId?: string;
  errors?: Record<string, string[] | undefined>;
};

export type AdminTestFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  testId?: string;
  errors?: Record<string, string[] | undefined>;
  diagnostic?: MockSaveDiagnostic;
};

export type EquationPreviewResponse =
  | {
      error: null;
      baseSeed: string;
      questions: MathematicalEquationQuestion[];
    }
  | { error: string; baseSeed?: undefined; questions?: undefined };

export async function generateEquationPreviewAction(
  input: unknown,
): Promise<EquationPreviewResponse> {
  await requireRole(["admin"]);
  const parsed = equationGenerationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid generation request." };
  }

  try {
    const baseSeed = parsed.data.seed ?? crypto.randomUUID();
    const history = await getGeneratedEquationNoveltyHistory();
    const fingerprints = history.fingerprints;
    const recentProfiles = [...history.structuralProfiles];
    const structuralSignatures = new Set<string>();
    const questions: MathematicalEquationQuestion[] = [];
    for (let index = 0; index < parsed.data.quantity; index += 1) {
      const seed =
        parsed.data.quantity === 1 ? baseSeed : `${baseSeed}:${index + 1}`;
      const question = generateValidatedMathematicalEquation(
        { seed, difficulty: parsed.data.difficulty },
        fingerprints,
        structuralSignatures,
        recentProfiles.slice(-3),
      );
      fingerprints.add(question.metadata.fingerprint);
      structuralSignatures.add(mathematicalEquationStructuralSignature(question));
      recentProfiles.push(mathematicalEquationStructuralProfile(question));
      questions.push(question);
    }
    return { error: null, baseSeed, questions };
  } catch {
    return { error: "Unable to generate a validated equation preview." };
  }
}

export async function publishGeneratedEquationAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = generatedEquationSaveSchema.safeParse(input);
  if (!parsed.success) return { error: "The equation preview provenance is invalid." };
  return publishIndividualGeneratedQuestion(user.id, {
    questionType: "mathematical_equation",
    ...parsed.data,
  });
}

export type LatinPreviewResponse =
  | { error: null; baseSeed: string; questions: LatinSquareQuestion[] }
  | { error: string; baseSeed?: undefined; questions?: undefined };

export async function generateLatinPreviewAction(
  input: unknown,
): Promise<LatinPreviewResponse> {
  await requireRole(["admin"]);
  const parsed = latinGenerationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid generation request." };
  }

  try {
    const baseSeed = parsed.data.seed ?? crypto.randomUUID();
    const history = await getGeneratedLatinNoveltyHistory();
    const fingerprints = history.fingerprints;
    const recentProfiles = [...history.structuralProfiles];
    const questions: LatinSquareQuestion[] = [];
    for (let index = 0; index < parsed.data.quantity; index += 1) {
      const seed = parsed.data.quantity === 1 ? baseSeed : `${baseSeed}:${index + 1}`;
      const question = generateValidatedLatinSquare(
        { seed, difficulty: parsed.data.difficulty },
        fingerprints,
        recentProfiles.slice(-3),
      );
      fingerprints.add(question.metadata.fingerprint);
      recentProfiles.push(latinSquareStructuralProfile(question));
      questions.push(question);
    }
    return { error: null, baseSeed, questions };
  } catch {
    return { error: "Unable to generate a validated Latin-square preview." };
  }
}

export async function publishGeneratedLatinAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = generatedLatinSaveSchema.safeParse(input);
  if (!parsed.success) return { error: "The Latin-square preview provenance is invalid." };

  return publishIndividualGeneratedQuestion(user.id, {
    questionType: "latin_square",
    ...parsed.data,
  });
}

export type FigurePreviewResponse =
  | { error: null; baseSeed: string; questions: FigureSequenceQuestion[] }
  | { error: string; baseSeed?: undefined; questions?: undefined };

export async function generateFigurePreviewAction(input: unknown): Promise<FigurePreviewResponse> {
  await requireRole(["admin"]);
  const parsed = figureGenerationRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid generation request." };
  try {
    const baseSeed = parsed.data.seed ?? crypto.randomUUID();
    const history = await getGeneratedFigureNoveltyHistory();
    const fingerprints = history.fingerprints;
    const recentProfiles = [...history.structuralProfiles];
    const questions: FigureSequenceQuestion[] = [];
    for (let index = 0; index < parsed.data.quantity; index += 1) {
      const seed = parsed.data.quantity === 1 ? baseSeed : `${baseSeed}:${index + 1}`;
      const question = generateValidatedFigureSequence({ seed, difficulty: parsed.data.difficulty }, fingerprints, recentProfiles.slice(-3));
      fingerprints.add(question.metadata.fingerprint);
      recentProfiles.push(figureSequenceStructuralProfile(question));
      questions.push(question);
    }
    return { error: null, baseSeed, questions };
  } catch {
    return { error: "Unable to generate a validated figure-sequence preview." };
  }
}

export async function publishGeneratedFigureAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = generatedFigureSaveSchema.safeParse(input);
  if (!parsed.success) return { error: "The figure-sequence preview provenance is invalid." };

  return publishIndividualGeneratedQuestion(user.id, {
    questionType: "figure_sequence",
    ...parsed.data,
  });
}

async function publishOneGeneratedQuestion(
  actorId: string,
  item: GeneratedQuestionPublishItem,
): Promise<GeneratedBatchItemResult> {
  const diagnostic = {
    id: item.fingerprint,
    questionType: item.questionType,
    difficulty: item.difficulty,
  } as const;
  try {
    const existing = await getGeneratedQuestionByFingerprint(item.fingerprint);
    if (existing) {
      const currentStatus = existing.deletedAt
        ? "deleted" as const
        : existing.publicationStatus === "published"
          ? "published" as const
          : existing.publicationStatus === "draft"
            ? "draft" as const
            : "unknown" as const;
      if (
        currentStatus === "published" &&
        existing.verificationStatus === "approved"
      ) {
        return {
          ...diagnostic,
          status: "already_published",
          questionId: existing.id,
          currentStatus,
          validationState: "passed",
          publishEligibility: "already_published",
        };
      }
      return {
        ...diagnostic,
        status: "failed",
        reason: "NOT_ELIGIBLE",
        currentStatus,
        validationState: existing.verificationStatus === "approved" ? "passed" : "not_checked",
        publishEligibility: "not_eligible",
      };
    }

    if (item.questionType === "latin_square") {
      const question = reproduceValidatedLatinSquare(
          { seed: item.seed, difficulty: item.difficulty },
          item.attemptCount,
        );
      return await publishValidatedReproduction(diagnostic, item.fingerprint, question, () =>
        createPublishedGeneratedLatin(actorId, question));
    }
    if (item.questionType === "figure_sequence") {
      const question = reproduceValidatedFigureSequence(
        { seed: item.seed, difficulty: item.difficulty },
        item.attemptCount,
      );
      return await publishValidatedReproduction(diagnostic, item.fingerprint, question, () =>
        createPublishedGeneratedFigure(actorId, question));
    }
    const question = reproduceValidatedMathematicalEquation(
      { seed: item.seed, difficulty: item.difficulty },
      item.attemptCount,
    );
    return await publishValidatedReproduction(diagnostic, item.fingerprint, question, () =>
      createPublishedGeneratedEquation(actorId, question));
  } catch (error) {
    const raced = await getGeneratedQuestionByFingerprint(item.fingerprint).catch(() => null);
    if (
      raced && !raced.deletedAt && raced.publicationStatus === "published" &&
      raced.verificationStatus === "approved"
    ) {
      return {
        ...diagnostic,
        status: "already_published",
        questionId: raced.id,
        currentStatus: "published",
        validationState: "passed",
        publishEligibility: "already_published",
      };
    }
    return {
      ...diagnostic,
      status: "failed",
      reason: "PUBLISH_FAILED",
      currentStatus: "preview",
      validationState: error instanceof GeneratedQuestionPersistenceError ? "passed" : "not_checked",
      publishEligibility: error instanceof GeneratedQuestionPersistenceError ? "eligible" : "unknown",
    };
  }
}

class GeneratedQuestionPersistenceError extends Error {
  constructor() {
    super("Generated question persistence failed.");
    this.name = "GeneratedQuestionPersistenceError";
  }
}

async function publishValidatedReproduction(
  diagnostic: Pick<GeneratedBatchItemResult, "id" | "questionType" | "difficulty">,
  expectedFingerprint: string,
  question: PublishableGeneratedQuestion,
  persist: () => Promise<string>,
): Promise<GeneratedBatchItemResult> {
  const assessment = assessGeneratedQuestionEnvelope(
    question,
    diagnostic.questionType ?? question.questionType,
    expectedFingerprint,
  );
  if (!assessment.eligible) {
    return {
      ...diagnostic,
      status: "failed",
      reason: assessment.reason,
      currentStatus: "preview",
      validationState: assessment.reason === "VALIDATION_FAILED" ? "failed" : "not_checked",
      publishEligibility: "not_eligible",
    };
  }
  let questionId: string;
  try {
    questionId = await persist();
  } catch {
    throw new GeneratedQuestionPersistenceError();
  }
  return {
    ...diagnostic,
    status: "published",
    questionId,
    currentStatus: "published",
    validationState: "passed",
    publishEligibility: "eligible",
  };
}

async function publishIndividualGeneratedQuestion(
  actorId: string,
  item: GeneratedQuestionPublishItem,
) {
  const result = await publishOneGeneratedQuestion(actorId, item);
  if (
    (result.status === "published" || result.status === "already_published") &&
    result.questionId
  ) {
    if (result.status === "published") revalidateGeneratedQuestionPaths();
    return { error: null, questionId: result.questionId, result };
  }
  return { error: generatedPublishFailureMessage(result.reason), result };
}

export type PublishGeneratedQuestionsResponse = GeneratedBatchResult & {
  error: string | null;
};

export async function publishGeneratedQuestionsAction(
  input: unknown,
): Promise<PublishGeneratedQuestionsResponse> {
  const { user } = await requireRole(["admin"]);
  const collection = generatedQuestionBatchInputSchema.safeParse(input);
  if (!collection.success) {
    return {
      error: "The batch publication request is invalid.",
      requested: 0,
      published: 0,
      alreadyPublished: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };
  }

  const validItems: GeneratedQuestionPublishItem[] = [];
  const invalidResults: GeneratedBatchItemResult[] = [];
  collection.data.forEach((candidate, index) => {
    const parsed = generatedQuestionPublishItemSchema.safeParse(candidate);
    if (parsed.success) validItems.push(parsed.data);
    else invalidResults.push({ id: `invalid-${index + 1}`, status: "failed", reason: "INVALID_INPUT" });
  });

  const batch = await runGeneratedQuestionBatch(
    validItems,
    (item) => publishOneGeneratedQuestion(user.id, item),
  );
  const results = [...batch.results, ...invalidResults];
  const published = results.filter((result) => result.status === "published").length;
  if (published > 0) revalidateGeneratedQuestionPaths();
  return {
    error: null,
    requested: collection.data.length,
    published,
    alreadyPublished: results.filter((result) => result.status === "already_published").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  };
}

function revalidateGeneratedQuestionPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/generate");
  revalidatePath("/admin/review");
  revalidatePath("/practice");
  revalidatePath("/tests");
}

export async function createQuestionAction(
  _state: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const { user } = await requireRole(["admin"]);
  const parsed = questionAuthoringSchema.safeParse({
    module: formData.get("module"),
    questionType: formData.get("questionType"),
    subject: formData.get("subject"),
    topic: formData.get("topic"),
    subtopic: formData.get("subtopic"),
    difficulty: formData.get("difficulty"),
    questionText: formData.get("questionText"),
    passage: formData.get("passage"),
    code: formData.get("code"),
    formula: formData.get("formula"),
    structuredData: formData.get("structuredData"),
    imageUrl: formData.get("imageUrl"),
    explanation: formData.get("explanation"),
    estimatedTimeSeconds: formData.get("estimatedTimeSeconds"),
    sourceType: formData.get("sourceType"),
    options: [0, 1, 2, 3].map((index) => formData.get(`option${index}`)),
    correctOptionIndex: formData.get("correctOptionIndex"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const questionId = formData.get("questionId");
    const parsedQuestionId =
      typeof questionId === "string" && questionId
        ? questionEditIdSchema.safeParse(questionId)
        : null;
    if (parsedQuestionId && !parsedQuestionId.success) {
      return { status: "error", message: "The question identifier is invalid." };
    }
    const result =
      parsedQuestionId?.success
        ? await updateQuestion(user.id, parsedQuestionId.data, parsed.data)
        : await createQuestion(user.id, parsed.data);
    revalidatePath("/admin");
    revalidatePath("/admin/review");
    revalidatePath("/practice");
    revalidatePath("/tests");
    return {
      status: "success",
      message:
        result.wasPublished
          ? `Published correction saved as version ${result.version}.`
          : result.status === "under_review"
          ? parsedQuestionId
            ? "Question updated and submitted for review."
            : "Question created and submitted for review."
          : parsedQuestionId
            ? "Question draft updated."
            : "Question draft created.",
      questionId: result.id,
    };
  } catch {
    return {
      status: "error",
      message: "Unable to save this question.",
    };
  }
}

export async function reviewQuestionAction(input: unknown) {
  const { user } = await requireRole(["reviewer", "admin"]);
  const parsed = questionReviewSchema.safeParse(input);
  if (!parsed.success) return { error: "The review decision is invalid." };

  try {
    await reviewQuestion(user.id, parsed.data);
    revalidatePath("/admin");
    revalidatePath("/admin/review");
    return { error: null, success: true };
  } catch (error) {
    return safeActionFailure(error, "Unable to save this review.");
  }
}

export async function deleteQuestionAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = questionDeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "The question identifier is invalid." };

  try {
    const result = await softDeleteQuestion(user.id, parsed.data.questionId);
    revalidateGeneratedQuestionPaths();
    return {
      error: null,
      status: result.status,
      message:
        result.status === "already_deleted"
          ? "Question was already removed from the active bank."
          : "Question removed from the active bank.",
    };
  } catch (error) {
    return {
      ...safeActionFailure(error, "Could not delete this question. Try again."),
      status: undefined,
      message: undefined,
    };
  }
}

export async function saveAdminTestAction(
  _state: AdminTestFormState,
  formData: FormData,
): Promise<AdminTestFormState> {
  const { user } = await requireRole(["admin"]);
  let sections: unknown;
  try {
    sections = JSON.parse(String(formData.get("sections") ?? "[]"));
  } catch {
    return {
      status: "error",
      message: "The mock section structure is invalid.",
    };
  }

  const parsed = adminTestBuilderSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    testType: formData.get("testType"),
    module: formData.get("module"),
    instructions: formData.get("instructions"),
    isPremium: formData.get("isPremium") === "on",
    randomizeQuestions: formData.get("randomizeQuestions") === "on",
    randomizeOptions: formData.get("randomizeOptions") === "on",
    intent: formData.get("intent"),
    sections,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ??
        "Check the mock details and sections.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const rawTestId = formData.get("testId");
  const parsedTestId =
    typeof rawTestId === "string" && rawTestId
      ? adminTestIdSchema.safeParse(rawTestId)
      : null;
  if (parsedTestId && !parsedTestId.success) {
    return { status: "error", message: "The mock identifier is invalid." };
  }

  try {
    const result = await saveAdminTest(
      user.id,
      parsed.data,
      parsedTestId?.success ? parsedTestId.data : undefined,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/tests");
    revalidatePath("/tests");
    return {
      status: "success",
      message: result.isPublished
        ? "Mock saved and published."
        : parsedTestId
          ? "Mock draft updated."
          : "Mock draft created.",
      testId: result.id,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof MockSaveError
        ? error.publicMessage
        : "Unable to save this mock.",
      diagnostic: error instanceof MockSaveError ? error.diagnostic : undefined,
    };
  }
}

export async function smartFillAdminQuestionsAction(input: unknown) {
  await requireRole(["admin"]);
  const parsed = adminSmartFillRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error" as const,
      message:
        parsed.error.issues[0]?.message ??
        "Check the Smart Fill settings and try again.",
    };
  }
  try {
    return await selectAdminSmartFillQuestions(parsed.data);
  } catch {
    return {
      status: "error" as const,
      message: "Unable to select eligible questions. Refresh the builder and try again.",
    };
  }
}

export async function adminTestLifecycleAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = adminTestLifecycleSchema.safeParse(input);
  if (!parsed.success) return { error: "The mock lifecycle request is invalid." };

  try {
    await updateAdminTestPublication(
      user.id,
      parsed.data.testId,
      parsed.data.action,
    );
    revalidatePath("/admin");
    revalidatePath("/admin/tests");
    revalidatePath("/tests");
    return { error: null, success: true };
  } catch (error) {
    return safeActionFailure(error, "Unable to update the mock lifecycle.");
  }
}

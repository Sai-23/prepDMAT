import type { GeneratedQuestionType, GenerationDifficulty } from "@/lib/generation";

export type GeneratedBatchFailureReason =
  | "INVALID_INPUT"
  | "REPRODUCTION_MISMATCH"
  | "VALIDATION_FAILED"
  | "NOT_ELIGIBLE"
  | "PUBLISH_FAILED"
  | "DUPLICATE_REQUEST";

export type GeneratedBatchItemResult = {
  id: string;
  status: "published" | "already_published" | "failed" | "skipped";
  questionId?: string;
  reason?: GeneratedBatchFailureReason;
  questionType?: GeneratedQuestionType;
  difficulty?: GenerationDifficulty;
  currentStatus?: "preview" | "draft" | "published" | "deleted" | "unknown";
  validationState?: "passed" | "failed" | "not_checked";
  publishEligibility?: "eligible" | "not_eligible" | "already_published" | "invalid_input" | "unknown";
};

export type GeneratedBatchResult = {
  requested: number;
  published: number;
  alreadyPublished: number;
  failed: number;
  skipped: number;
  results: GeneratedBatchItemResult[];
};

export function generatedPublishFailureMessage(reason?: GeneratedBatchFailureReason) {
  switch (reason) {
    case "INVALID_INPUT":
      return "The preview provenance is not valid for this question type.";
    case "REPRODUCTION_MISMATCH":
      return "The secure reproduction did not match the preview fingerprint.";
    case "VALIDATION_FAILED":
      return "The module validator did not approve this question.";
    case "NOT_ELIGIBLE":
      return "The question is not in an unpublished, publishable state.";
    case "DUPLICATE_REQUEST":
      return "The same preview was included more than once.";
    default:
      return "The validated question could not be persisted. Retry publication.";
  }
}

export async function runGeneratedQuestionBatch<T extends {
  fingerprint: string;
  questionType?: GeneratedQuestionType;
  difficulty?: GenerationDifficulty;
}>(
  items: readonly T[],
  publishOne: (item: T) => Promise<GeneratedBatchItemResult>,
): Promise<GeneratedBatchResult> {
  const seen = new Set<string>();
  const results: GeneratedBatchItemResult[] = [];

  for (const item of items) {
    if (seen.has(item.fingerprint)) {
      results.push({
        id: item.fingerprint,
        status: "skipped",
        reason: "DUPLICATE_REQUEST",
        questionType: item.questionType,
        difficulty: item.difficulty,
        currentStatus: "preview",
        validationState: "not_checked",
        publishEligibility: "not_eligible",
      });
      continue;
    }
    seen.add(item.fingerprint);
    try {
      results.push(await publishOne(item));
    } catch {
      results.push({
        id: item.fingerprint,
        status: "failed",
        reason: "PUBLISH_FAILED",
        questionType: item.questionType,
        difficulty: item.difficulty,
        currentStatus: "preview",
        validationState: "not_checked",
        publishEligibility: "unknown",
      });
    }
  }

  return {
    requested: items.length,
    published: results.filter((result) => result.status === "published").length,
    alreadyPublished: results.filter((result) => result.status === "already_published").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  };
}

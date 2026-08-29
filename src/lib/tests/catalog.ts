import type { PracticeQuestion } from "@/lib/practice/schemas";

export type CuratedAttemptSummaryRow = {
  attempt_count: number | string;
  best_score: number | string | null;
  latest_score: number | string | null;
  latest_completed_at: string | null;
  has_in_progress: boolean;
};

const MODULE_TYPES = new Set<PracticeQuestion["questionType"]>([
  "figure_sequence",
  "mathematical_equation",
  "latin_square",
]);

export function resolveCatalogModuleType(sectionTypes: readonly string[]) {
  const distinct = new Set(sectionTypes);
  if (distinct.size !== 1) return null;
  const [candidate] = distinct;
  return MODULE_TYPES.has(candidate as PracticeQuestion["questionType"])
    ? candidate as PracticeQuestion["questionType"]
    : null;
}

export function normalizeAttemptSummary(attempt?: CuratedAttemptSummaryRow) {
  const attemptCount = Number(attempt?.attempt_count ?? 0);
  return {
    completed: attemptCount > 0,
    attemptCount,
    bestScore: attempt?.best_score === null || attempt?.best_score === undefined
      ? null
      : Number(attempt.best_score),
    latestScore: attempt?.latest_score === null || attempt?.latest_score === undefined
      ? null
      : Number(attempt.latest_score),
    latestCompletedAt: attempt?.latest_completed_at ?? null,
    hasInProgress: attempt?.has_in_progress === true,
  };
}


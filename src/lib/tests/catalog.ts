import type { PracticeQuestion } from "@/lib/practice/schemas";
import type { TestCatalogItem } from "@/lib/tests/schemas";

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

export const MOCK_LIBRARY_CATEGORIES = [
  {
    key: "figure-sequences",
    moduleType: "figure_sequence",
    title: "Figure Sequences",
    description: "Practice pattern recognition under timed conditions.",
  },
  {
    key: "mathematical-equations",
    moduleType: "mathematical_equation",
    title: "Mathematical Equations",
    description: "Practise symbol rules, structure and precise calculation.",
  },
  {
    key: "latin-squares",
    moduleType: "latin_square",
    title: "Latin Squares",
    description: "Strengthen elimination, consistency and grid reasoning.",
  },
  {
    key: "mixed-core",
    moduleType: null,
    title: "Mixed Core",
    description: "Combine multiple Core formats in one timed challenge.",
  },
] as const;

export type MockCategoryKey = (typeof MOCK_LIBRARY_CATEGORIES)[number]["key"];
export type MockCategoryDefinition = (typeof MOCK_LIBRARY_CATEGORIES)[number];

export function getMockCategory(value: unknown): MockCategoryDefinition | null {
  if (typeof value !== "string") return null;
  return MOCK_LIBRARY_CATEGORIES.find((category) => category.key === value) ?? null;
}

export function getMocksForCategory(
  tests: readonly TestCatalogItem[],
  category: MockCategoryDefinition,
) {
  return tests.filter((test) => test.moduleType === category.moduleType);
}

export function calculateCatalogProgress(
  currentMockIds: readonly string[],
  completedMockIds: readonly string[],
) {
  const currentIds = new Set(currentMockIds);
  const completedIds = new Set(completedMockIds);
  const completedCount = [...currentIds].filter((id) => completedIds.has(id)).length;
  const totalCount = currentIds.size;
  return {
    completedCount,
    totalCount,
    percentage: totalCount === 0
      ? null
      : Math.round((completedCount / totalCount) * 100),
  };
}

export function summarizeMockCategories(tests: readonly TestCatalogItem[]) {
  return MOCK_LIBRARY_CATEGORIES.map((category) => {
    const categoryTests = getMocksForCategory(tests, category);
    const progress = calculateCatalogProgress(
      categoryTests.map((test) => test.id),
      categoryTests
        .filter((test) => test.attemptSummary.completed)
        .map((test) => test.id),
    );
    return { category, tests: categoryTests, progress };
  });
}

const DIFFICULTY_PRIORITY: Record<PracticeQuestion["difficulty"], number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

export function sortCategoryMocks(tests: readonly TestCatalogItem[]) {
  return tests
    .map((test, index) => ({ test, index }))
    .sort((first, second) => {
      const firstPriority = first.test.focusDifficulty
        ? DIFFICULTY_PRIORITY[first.test.focusDifficulty]
        : Number.POSITIVE_INFINITY;
      const secondPriority = second.test.focusDifficulty
        ? DIFFICULTY_PRIORITY[second.test.focusDifficulty]
        : Number.POSITIVE_INFINITY;
      return firstPriority - secondPriority || first.index - second.index;
    })
    .map(({ test }) => test);
}

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

import { EmptyState } from "@/components/shared/empty-state";
import { StartTestButton } from "@/components/tests/start-test-button";
import { MockCategoryCard } from "@/components/tests/mock-category-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getMocksForCategory,
  sortCategoryMocks,
  summarizeMockCategories,
  type MockCategoryDefinition,
} from "@/lib/tests/catalog";
import type { TestCatalogItem } from "@/lib/tests/schemas";

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`
    : `${minutes} min`;
}

export function MockCategoryGrid({
  tests,
}: {
  tests: readonly TestCatalogItem[];
}) {
  const summaries = summarizeMockCategories(tests).filter(
    ({ category }) => category.moduleType !== null,
  );
  return (
    <section
      aria-label="Focused Core mock categories"
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {summaries.map(({ category, progress }) => (
        <MockCategoryCard
          category={category}
          key={category.key}
          progress={progress}
        />
      ))}
    </section>
  );
}

function difficultyVariant(difficulty: TestCatalogItem["focusDifficulty"]) {
  if (difficulty === "easy") return "success" as const;
  if (difficulty === "hard") return "warning" as const;
  return "subtle" as const;
}

const DIFFICULTY_GUIDANCE: Record<
  NonNullable<TestCatalogItem["focusDifficulty"]>,
  string
> = {
  easy: "Best for building confidence",
  medium: "Build speed and consistency",
  hard: "Challenge yourself under exam pressure",
};

export function focusedMockGuidance(test: TestCatalogItem) {
  return test.focusDifficulty
    ? DIFFICULTY_GUIDANCE[test.focusDifficulty]
    : test.description;
}

export function bestScorePercentage(test: TestCatalogItem) {
  const bestScore = test.attemptSummary.bestScore;
  if (
    !test.attemptSummary.completed
    || bestScore === null
    || test.questionCount <= 0
  ) {
    return null;
  }
  return Math.max(
    0,
    Math.min(100, Math.round((bestScore / test.questionCount) * 100)),
  );
}

export function FocusedMockCard({ test }: { test: TestCatalogItem }) {
  const summary = test.attemptSummary;
  const status = summary.hasInProgress
    ? "In progress"
    : summary.completed
      ? "Completed"
      : "Not started";
  const actionLabel = summary.hasInProgress
    ? "Resume mock"
    : summary.completed
      ? "Try again"
      : "Start mock";
  const guidance = focusedMockGuidance(test);
  const bestPercentage = bestScorePercentage(test);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3 p-5 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant={difficultyVariant(test.focusDifficulty)}>
            {test.focusDifficulty ?? test.testType.replaceAll("_", " ")}
          </Badge>
          <Badge variant={summary.hasInProgress ? "default" : summary.completed ? "success" : "subtle"}>
            {status}
          </Badge>
        </div>
        <CardTitle className="text-lg text-on-surface">{test.title}</CardTitle>
        <p className="text-sm font-medium text-on-surface-variant">
          {test.questionCount} {test.questionCount === 1 ? "Question" : "Questions"}
          <span aria-hidden="true"> · </span>
          {formatDuration(test.durationSeconds)}
        </p>
        {guidance ? (
          <CardDescription>{guidance}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="mt-auto p-5 pt-0">
        <div className="flex flex-col gap-4 border-t border-workspace-separator pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {bestPercentage !== null ? (
              <p className="font-medium text-on-surface">
                Your best score: <strong className="text-primary">{bestPercentage}%</strong>
              </p>
            ) : summary.hasInProgress ? (
              <p className="font-medium text-on-surface-variant">No completed score yet</p>
            ) : (
              <p className="font-medium text-on-surface-variant">Not attempted yet</p>
            )}
            {bestPercentage !== null && summary.hasInProgress ? (
              <p className="mt-1 text-xs font-medium text-primary">In progress</p>
            ) : null}
          </div>
          <div className="w-full shrink-0 sm:w-auto sm:min-w-32">
            <StartTestButton label={actionLabel} testId={test.id} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ModuleMockList({
  category,
  tests,
}: {
  category: MockCategoryDefinition;
  tests: readonly TestCatalogItem[];
}) {
  const categoryTests = sortCategoryMocks(getMocksForCategory(tests, category));
  if (!categoryTests.length) {
    return (
      <EmptyState
        description={`Published ${category.title} mocks will appear here automatically.`}
        title="No mocks available yet"
      />
    );
  }
  return (
    <section aria-label={`${category.title} mocks`} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {categoryTests.map((test) => <FocusedMockCard key={test.id} test={test} />)}
    </section>
  );
}

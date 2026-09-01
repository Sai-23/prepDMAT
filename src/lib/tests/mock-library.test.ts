import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  MOCK_LIBRARY_CATEGORIES,
  calculateCatalogProgress,
  getMockCategory,
  getMocksForCategory,
  sortCategoryMocks,
  summarizeMockCategories,
} from "./catalog";
import type { TestCatalogItem } from "./schemas";

function catalogMock({
  id,
  moduleType,
  difficulty = null,
  completed = false,
  attemptCount = completed ? 1 : 0,
  hasInProgress = false,
  title = `Mock ${id}`,
}: {
  id: string;
  moduleType: TestCatalogItem["moduleType"];
  difficulty?: TestCatalogItem["focusDifficulty"];
  completed?: boolean;
  attemptCount?: number;
  hasInProgress?: boolean;
  title?: string;
}): TestCatalogItem {
  return {
    id,
    title,
    description: null,
    testType: moduleType ? "sectional" : "full_mock",
    module: "core",
    moduleType,
    focusDifficulty: difficulty,
    durationSeconds: 1500,
    isPremium: false,
    sectionCount: 1,
    questionCount: 20,
    hasAccess: true,
    attemptSummary: {
      completed,
      attemptCount,
      bestScore: completed ? 15 : null,
      latestScore: completed ? 15 : null,
      latestCompletedAt: completed ? "2026-09-01T00:00:00.000Z" : null,
      hasInProgress,
    },
  };
}

describe("current Mock Library progress", () => {
  it.each([
    [1, 3, 33],
    [1, 4, 25],
    [2, 3, 67],
    [3, 3, 100],
  ])("calculates %i of %i as %i%%", (completed, total, percentage) => {
    const currentIds = Array.from({ length: total }, (_, index) => `mock-${index + 1}`);
    expect(calculateCatalogProgress(
      currentIds,
      currentIds.slice(0, completed),
    )).toEqual({ completedCount: completed, totalCount: total, percentage });
  });

  it("deduplicates retakes and counts one completed mock once", () => {
    expect(calculateCatalogProgress(
      ["easy", "medium", "hard"],
      ["easy", "medium", "medium", "medium"],
    )).toEqual({ completedCount: 2, totalCount: 3, percentage: 67 });
  });

  it("does not count an in-progress-only attempt as completion", () => {
    const tests = [
      catalogMock({ id: "completed", moduleType: "figure_sequence", completed: true }),
      catalogMock({ id: "in-progress", moduleType: "figure_sequence", hasInProgress: true }),
      catalogMock({ id: "not-started", moduleType: "figure_sequence" }),
    ];
    const figure = summarizeMockCategories(tests).find(
      ({ category }) => category.key === "figure-sequences",
    );
    expect(figure?.progress).toEqual({
      completedCount: 1,
      totalCount: 3,
      percentage: 33,
    });
  });

  it("keeps not-started current mocks in the denominator", () => {
    expect(calculateCatalogProgress(
      ["completed", "not-started"],
      ["completed"],
    )).toEqual({ completedCount: 1, totalCount: 2, percentage: 50 });
  });

  it("removes unpublished or deleted mocks from current progress without changing history", () => {
    const historicalCompletedIds = ["completed-current", "completed-removed"];
    expect(calculateCatalogProgress(
      ["completed-current", "unfinished-current"],
      historicalCompletedIds,
    )).toEqual({ completedCount: 1, totalCount: 2, percentage: 50 });
    expect(historicalCompletedIds).toEqual([
      "completed-current",
      "completed-removed",
    ]);
  });

  it("recalculates when an unfinished mock is unpublished", () => {
    expect(calculateCatalogProgress(
      ["easy", "medium", "hard"],
      ["easy", "medium"],
    ).percentage).toBe(67);
    expect(calculateCatalogProgress(
      ["easy", "medium"],
      ["easy", "medium"],
    ).percentage).toBe(100);
  });

  it("removes a completed unpublished mock from the numerator and denominator", () => {
    expect(calculateCatalogProgress(
      ["easy", "medium", "hard"],
      ["easy", "medium"],
    )).toMatchObject({ completedCount: 2, totalCount: 3 });
    expect(calculateCatalogProgress(
      ["easy", "hard"],
      ["easy", "medium"],
    )).toEqual({ completedCount: 1, totalCount: 2, percentage: 50 });
  });

  it("automatically increases the denominator when a new current mock appears", () => {
    expect(calculateCatalogProgress(["easy", "medium", "hard"], ["easy"]))
      .toMatchObject({ totalCount: 3, percentage: 33 });
    expect(calculateCatalogProgress(
      ["easy", "medium", "hard", "expert"],
      ["easy"],
    )).toEqual({ completedCount: 1, totalCount: 4, percentage: 25 });
  });

  it("returns a safe zero-current-mock state", () => {
    expect(calculateCatalogProgress([], ["historical-mock"])).toEqual({
      completedCount: 0,
      totalCount: 0,
      percentage: null,
    });
  });

  it("calculates progress independently across all four categories", () => {
    const tests = [
      catalogMock({ id: "f1", moduleType: "figure_sequence", completed: true }),
      catalogMock({ id: "f2", moduleType: "figure_sequence" }),
      catalogMock({ id: "e1", moduleType: "mathematical_equation" }),
      catalogMock({ id: "l1", moduleType: "latin_square", completed: true, attemptCount: 3 }),
      catalogMock({ id: "m1", moduleType: null, completed: true }),
    ];
    const summary = new Map(
      summarizeMockCategories(tests).map(({ category, progress }) => [category.key, progress]),
    );
    expect(summary.get("figure-sequences")).toMatchObject({ completedCount: 1, totalCount: 2 });
    expect(summary.get("mathematical-equations")).toMatchObject({ completedCount: 0, totalCount: 1 });
    expect(summary.get("latin-squares")).toMatchObject({ completedCount: 1, totalCount: 1 });
    expect(summary.get("mixed-core")).toMatchObject({ completedCount: 1, totalCount: 1 });
  });
});

describe("Mock Library category membership and ordering", () => {
  it("defines the four category-first navigation choices", () => {
    expect(MOCK_LIBRARY_CATEGORIES.map((category) => category.title)).toEqual([
      "Figure Sequences",
      "Mathematical Equations",
      "Latin Squares",
      "Mixed Core",
    ]);
  });

  it("resolves only supported category query values", () => {
    expect(getMockCategory("figure-sequences")?.moduleType).toBe("figure_sequence");
    expect(getMockCategory("unknown")).toBeNull();
    expect(getMockCategory(["figure-sequences"])).toBeNull();
  });

  it.each([
    ["figure-sequences", "figure_sequence"],
    ["mathematical-equations", "mathematical_equation"],
    ["latin-squares", "latin_square"],
    ["mixed-core", null],
  ] as const)("filters %s from authoritative module metadata", (key, moduleType) => {
    const category = getMockCategory(key)!;
    const tests = [
      catalogMock({ id: "figure", moduleType: "figure_sequence" }),
      catalogMock({ id: "equation", moduleType: "mathematical_equation" }),
      catalogMock({ id: "latin", moduleType: "latin_square" }),
      catalogMock({ id: "mixed", moduleType: null }),
    ];
    expect(getMocksForCategory(tests, category).map((test) => test.moduleType))
      .toEqual([moduleType]);
  });

  it("sorts recognized focused difficulties Easy, Medium, Hard", () => {
    const tests = [
      catalogMock({ id: "hard", moduleType: "figure_sequence", difficulty: "hard" }),
      catalogMock({ id: "easy", moduleType: "figure_sequence", difficulty: "easy" }),
      catalogMock({ id: "future", moduleType: "figure_sequence", title: "Expert Challenge" }),
      catalogMock({ id: "medium", moduleType: "figure_sequence", difficulty: "medium" }),
    ];
    expect(sortCategoryMocks(tests).map((test) => test.id)).toEqual([
      "easy",
      "medium",
      "hard",
      "future",
    ]);
  });

  it("includes future mocks from metadata without a hardcoded title list", () => {
    const future = catalogMock({
      id: "future-speed",
      moduleType: "mathematical_equation",
      title: "Mathematical Equations — Speed Practice",
    });
    expect(getMocksForCategory(
      [future],
      getMockCategory("mathematical-equations")!,
    )).toEqual([future]);
  });

  it("contains no hardcoded catalog totals or percentages in the category UI", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/tests/mock-category-card.tsx"),
      "utf8",
    );
    expect(source).not.toContain("3 MOCKS");
    expect(source).not.toContain("33%");
    expect(source).not.toContain("67%");
    expect(source).toContain("progress.totalCount");
    expect(source).toContain("progress.percentage");
  });
});

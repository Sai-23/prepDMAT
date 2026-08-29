import { describe, expect, it } from "vitest";

import { normalizeAttemptSummary, resolveCatalogModuleType } from "./catalog";

describe("mock catalog grouping and attempt summaries", () => {
  it.each([
    ["figure_sequence"],
    ["mathematical_equation"],
    ["latin_square"],
  ])("classifies a single-module mock exactly once", (moduleType) => {
    expect(resolveCatalogModuleType([moduleType, moduleType])).toBe(moduleType);
  });

  it("places mixed and unsupported section collections outside module-specific groups", () => {
    expect(resolveCatalogModuleType(["figure_sequence", "latin_square"])).toBeNull();
    expect(resolveCatalogModuleType(["mixed"])).toBeNull();
    expect(resolveCatalogModuleType([])).toBeNull();
  });

  it("normalizes persisted best, latest, and attempt-count metadata", () => {
    expect(normalizeAttemptSummary({
      attempt_count: "3",
      best_score: "9",
      latest_score: "8",
      latest_completed_at: "2026-08-29T10:00:00.000Z",
      has_in_progress: false,
    })).toEqual({
      completed: true,
      attemptCount: 3,
      bestScore: 9,
      latestScore: 8,
      latestCompletedAt: "2026-08-29T10:00:00.000Z",
      hasInProgress: false,
    });
    expect(normalizeAttemptSummary()).toEqual({
      completed: false,
      attemptCount: 0,
      bestScore: null,
      latestScore: null,
      latestCompletedAt: null,
      hasInProgress: false,
    });
  });
});


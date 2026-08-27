import { beforeAll, describe, expect, it } from "vitest";

import { DMAT_CURRENT_CORE_PROTOCOL } from "../protocol";
import {
  DEVELOPMENT_CORE_MOCK_POLICY,
  assembleCoreMock,
  coreMockDeterministicSnapshot,
  type CoreMock,
} from "./core-mock";

function longestRun(values: readonly string[]): number {
  let longest = 0;
  let current = 0;
  let previous = "";
  values.forEach((value) => {
    current = value === previous ? current + 1 : 1;
    previous = value;
    longest = Math.max(longest, current);
  });
  return longest;
}

describe("Core mock assembly", () => {
  let mock: CoreMock;

  beforeAll(() => {
    mock = assembleCoreMock({
      mockSeed: "phase-5-integration-fixture",
      createdAt: "2026-08-22T00:00:00.000Z",
    });
  }, 120_000);

  it("assembles the authoritative 20/20/20 Core protocol", () => {
    expect(mock.protocolVersion).toBe(DMAT_CURRENT_CORE_PROTOCOL.version);
    expect(mock.sections.map((section) => ({
      sectionType: section.sectionType,
      durationSeconds: section.durationSeconds,
      questionCount: section.questions.length,
    }))).toEqual(DMAT_CURRENT_CORE_PROTOCOL.core.map((section) => ({
      sectionType: section.sectionType,
      durationSeconds: section.durationSeconds,
      questionCount: section.questionCount,
    })));
    expect(mock.sections.flatMap((section) => section.questions)).toHaveLength(60);
    expect(mock.quality.passed).toBe(true);
  });

  it("enforces development difficulty balance, neutral pacing, and within-section novelty", () => {
    mock.sections.forEach((section) => {
      const counts = { easy: 0, medium: 0, hard: 0 };
      section.questions.forEach((question) => { counts[question.difficulty] += 1; });
      expect(counts).toEqual(DEVELOPMENT_CORE_MOCK_POLICY.difficultyProfile[section.sectionType]);
      expect(longestRun(section.difficultyOrder)).toBeLessThanOrEqual(DEVELOPMENT_CORE_MOCK_POLICY.maximumDifficultyStreak);
      expect(Math.max(...section.questions.map((question) => question.diagnostics.maximumWithinSectionSimilarity)))
        .toBeLessThan(DEVELOPMENT_CORE_MOCK_POLICY.withinMockSimilarityThreshold[section.sectionType]);
      expect(new Set(section.questions.map((question) => question.fingerprint)).size).toBe(20);
    });
  });

  it("records per-question and mock-level reconstruction provenance", () => {
    expect(mock.mockSeed).toBe("phase-5-integration-fixture");
    expect(Object.values(mock.generatorVersions).every((version) => version.includes("@"))).toBe(true);
    mock.sections.forEach((section) => section.questions.forEach((question) => {
      expect(question.seed).toContain(`/${section.sectionType}/`);
      expect(question.generatorVersion).toBe(mock.generatorVersions[section.sectionType]);
      expect(question.fingerprint).toBe(question.question.metadata.fingerprint);
      expect(question.structuralFingerprint).not.toBe("missing");
    }));
  });

  it("reconstructs structure, answers, order, difficulty, fingerprints, and versions deterministically", () => {
    const reproduced = assembleCoreMock({
      mockSeed: "phase-5-integration-fixture",
      createdAt: "2030-01-01T00:00:00.000Z",
    });
    expect(coreMockDeterministicSnapshot(reproduced)).toEqual(coreMockDeterministicSnapshot(mock));
  }, 120_000);

  it("rejects an invalid development profile before generating questions", () => {
    expect(() => assembleCoreMock({
      mockSeed: "invalid-profile",
      policy: {
        ...DEVELOPMENT_CORE_MOCK_POLICY,
        difficultyProfile: {
          ...DEVELOPMENT_CORE_MOCK_POLICY.difficultyProfile,
          figure_sequence: { easy: 1, medium: 1, hard: 1 },
        },
      },
    })).toThrow(/totalling 20/);
  });
});


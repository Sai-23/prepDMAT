import { describe, expect, it } from "vitest";

import { analyzeLatinDeductions, calculateLatinDifficulty } from "./difficulty";
import { generateValidatedLatinSquare } from "./pipeline";

describe("Latin-square target difficulty", () => {
  it.each([
    ["easy", 0],
    ["medium", 1],
    ["hard", 5],
  ] as const)(
    "reproduces the calibrated %s fixture",
    (difficulty, minimumIntermediates) => {
      const configuration = {
        seed: `latin-calibrated-fixture-${difficulty}`,
        difficulty,
        maxAttempts: 5_000,
      } as const;
      const first = generateValidatedLatinSquare(configuration);
      const second = generateValidatedLatinSquare(configuration);
      expect(second.structuredData).toEqual(first.structuredData);
      expect(second.correctAnswer).toBe(first.correctAnswer);
      expect(second.deductionTrace).toEqual(first.deductionTrace);
      expect(second.metadata.attemptCount).toBe(first.metadata.attemptCount);
      expect(second.metadata.fingerprint).toBe(first.metadata.fingerprint);

      const analysis = analyzeLatinDeductions(first);
      const calculated = calculateLatinDifficulty(first, analysis);
      expect(calculated?.difficulty).toBe(difficulty);
      expect(calculated?.metrics.requiredIntermediateCells).toBeGreaterThanOrEqual(minimumIntermediates);
      expect(calculated?.metrics.reasoningClassification).toMatch(
        difficulty === "easy"
          ? /^DIRECT_|^ROW_COLUMN_INTERSECTION$/
          : difficulty === "medium"
            ? /SINGLE_INTERMEDIATE|CHAINED_INTERMEDIATE/
            : /CHAINED_INTERMEDIATE|MULTI_STAGE_DEDUCTION/,
      );
      expect(calculated?.metrics.essentialClueCount).toBeGreaterThan(0);
      expect(calculated?.metrics.redundancyRatio).toBeGreaterThanOrEqual(0);
    },
    30_000,
  );

  it("records visible-clue and prior-deduction causes separately", () => {
    const question = generateValidatedLatinSquare({ seed: "latin-causal-graph", difficulty: "hard" });
    const analysis = analyzeLatinDeductions(question);
    expect(analysis.deductions.some((deduction) => deduction.clueDependencies.length > 0)).toBe(true);
    const targetIndex = analysis.deductions.findIndex((deduction) =>
      deduction.coordinate.row === question.structuredData.target.row && deduction.coordinate.column === question.structuredData.target.column);
    expect(targetIndex).toBeGreaterThan(0);
    analysis.deductions.slice(0, targetIndex + 1).forEach((deduction, index) => {
      deduction.dependencies.forEach((dependency) => expect(analysis.deductions.slice(0, index).some((prior) =>
        prior.coordinate.row === dependency.row && prior.coordinate.column === dependency.column)).toBe(true));
    });
  });
});

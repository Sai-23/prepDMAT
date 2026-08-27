import { describe, expect, it } from "vitest";

import { latinSquareGenerator } from "./generator";
import { generateValidatedLatinSquare } from "./pipeline";
import { latinSquareValidator } from "./validator";

describe("LatinSquareValidator", () => {
  it("accepts a direct, uniquely deducible target", () => {
    const configuration = { seed: "validator-direct", difficulty: "easy" as const };
    const accepted = generateValidatedLatinSquare(configuration);
    const candidate = latinSquareGenerator.generate(configuration, accepted.metadata.attemptCount);
    const result = latinSquareValidator.validate(candidate, "easy");
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.solution.targetSymbol).toBe(candidate.correctAnswer);
      expect(result.solution.metrics.requiredIntermediateCells).toBe(0);
    }
  });

  it("rejects an ambiguous target", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "validator-ambiguous", difficulty: "hard" },
      1,
    );
    candidate.structuredData.grid = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => null),
    );
    const result = latinSquareValidator.validate(candidate, "hard");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0].code).toBe("ambiguous_target");
  });

  it("rejects a stored answer inconsistent with the completed grid", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "validator-answer", difficulty: "easy" },
      1,
    );
    candidate.correctAnswer = candidate.correctAnswer === "A" ? "B" : "A";
    const result = latinSquareValidator.validate(candidate, "easy");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0].code).toBe("invalid_latin_domain");
  });
});

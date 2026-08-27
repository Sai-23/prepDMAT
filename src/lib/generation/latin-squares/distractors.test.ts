import { describe, expect, it } from "vitest";
import { analyzeLatinDistractors } from "./distractors";
import { generateValidatedLatinSquare } from "./pipeline";

describe("Latin mandatory A-E distractors", () => {
  it("assigns every wrong symbol a row, column, or early-stop error", () => {
    const question = generateValidatedLatinSquare({ seed: "latin-distractors", difficulty: "medium" });
    const diagnostics = analyzeLatinDistractors(question);
    expect(diagnostics).toHaveLength(4);
    expect(new Set(diagnostics.map((entry) => entry.symbol)).size).toBe(4);
    expect(diagnostics.every((entry) => entry.symbol !== question.correctAnswer)).toBe(true);
  });
});

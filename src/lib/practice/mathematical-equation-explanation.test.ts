import { describe, expect, it } from "vitest";

import {
  evaluateExpression,
  generateValidatedMathematicalEquation,
} from "../generation/mathematical-equations";
import { buildMathematicalEquationWalkthrough } from "./mathematical-equation-explanation";

function fixture(difficulty: "easy" | "medium" | "hard") {
  return generateValidatedMathematicalEquation({
    seed: `equation-practice-explanation-${difficulty}`,
    difficulty,
  });
}

describe("Mathematical Equation Practice explanation mapping", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "creates a verified %s substitution walkthrough",
    (difficulty) => {
      const question = fixture(difficulty);
      const walkthrough = buildMathematicalEquationWalkthrough(
        question.structuredData,
        question.solutionPath,
        question.correctAnswer,
      );
      expect(walkthrough.valid).toBe(true);
      expect(walkthrough.steps).toHaveLength(question.structuredData.variables.length);
      expect(walkthrough.steps.at(-1)?.isFinal).toBe(true);
      expect(walkthrough.steps.at(-1)?.solvedValues).toEqual(question.correctAnswer);
      walkthrough.steps.forEach((step, index) => {
        expect(step.targetSymbol).toBe(question.solutionPath[index].targetSymbol);
        expect(step.solvedValue).toBe(question.correctAnswer[step.targetSymbol]);
        expect(step.activeEquationIndex).toBe(question.solutionPath[index].equationIndex);
        expect(Object.keys(step.solvedValues)).toHaveLength(index + 1);
      });
      for (const equation of question.structuredData.equations) {
        const left = evaluateExpression(equation.left, question.correctAnswer);
        const right = evaluateExpression(equation.right, question.correctAnswer);
        expect(left.known && left.valid ? left.value : null).toBe(
          right.known && right.valid ? right.value : null,
        );
      }
    },
  );

  it("shows actual known values in substitution steps", () => {
    const question = fixture("hard");
    const walkthrough = buildMathematicalEquationWalkthrough(
      question.structuredData,
      question.solutionPath,
      question.correctAnswer,
    );
    const substitutionSteps = walkthrough.steps.filter((step) => step.type === "substitute");
    expect(substitutionSteps.length).toBeGreaterThanOrEqual(2);
    substitutionSteps.forEach((step) => {
      Object.entries(step.knownValues).forEach(([symbol, value]) => {
        expect(step.instruction).toContain(`${symbol} = ${value}`);
      });
      expect(step.substitutedEquation).not.toBe(step.originalEquation);
    });
  });

  it("uses only a verified concise fallback for an invalid solve path", () => {
    const question = fixture("medium");
    const walkthrough = buildMathematicalEquationWalkthrough(
      question.structuredData,
      [{ equationIndex: 99, targetSymbol: "A", knownSymbols: [] }],
      question.correctAnswer,
    );
    expect(walkthrough.valid).toBe(false);
    expect(walkthrough.steps).toEqual([]);
    expect(walkthrough.fallbackMessage).toContain("Verified solution:");
  });

  it("renders an indirect entry as a verified combine-equations step", () => {
    let question = fixture("hard");
    for (let attempt = 1; !question.solutionPath.some((step) => step.reasoning === "combine_equations"); attempt += 1) {
      question = generateValidatedMathematicalEquation({
        seed: `equation-practice-indirect-${attempt}`,
        difficulty: "hard",
      });
    }
    const walkthrough = buildMathematicalEquationWalkthrough(
      question.structuredData,
      question.solutionPath,
      question.correctAnswer,
    );
    const combined = walkthrough.steps.find((step) => step.type === "combine_equations");
    expect(combined?.activeEquationIndices.length).toBeGreaterThanOrEqual(2);
    expect(combined?.eyebrow).toBe("COMBINE RELATIONSHIPS");
    expect(combined?.instruction).toMatch(/equations (?:\d and ){1,}\d together/);
  });
});

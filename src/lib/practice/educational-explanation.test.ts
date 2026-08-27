import { describe, expect, it } from "vitest";

import { generateValidatedFigureSequence } from "../generation/figure-sequences";
import { generateValidatedMathematicalEquation } from "../generation/mathematical-equations";
import { DEFAULT_LATIN_SYMBOLS, generateValidatedLatinSquare } from "../generation/latin-squares";
import {
  buildEquationEducationalExplanation,
  buildFigureEducationalExplanation,
  buildLatinEducationalExplanation,
  diagnoseEquationMistake,
  diagnoseFigureMistake,
  diagnoseLatinMistake,
  isEducationalExplanation,
} from "./educational-explanation";
import { createVerifiedEquationExplanationTrace } from "./mathematical-equation-explanation-trace";
import { createVerifiedFigureExplanationTrace } from "./figure-sequence-explanation-trace";
import { createVerifiedLatinExplanationTrace } from "./latin-square-explanation-trace";

describe("educational explanation contract", () => {
  it.each(["easy", "medium", "hard"] as const)("builds replayable %s explanations for all Core modules", (difficulty) => {
    const figure = generateValidatedFigureSequence({
      seed: `phase7-contract-figure-${difficulty}`,
      difficulty,
      maxAttempts: 5_000,
    });
    const equation = generateValidatedMathematicalEquation({
      seed: `phase7-contract-equation-${difficulty}`,
      difficulty,
      maxAttempts: 100,
    });
    const latin = generateValidatedLatinSquare({
      seed: `phase7-contract-latin-${difficulty}`,
      difficulty,
      maxAttempts: 5_000,
    });
    const explanations = [
      buildFigureEducationalExplanation(figure.sequence, createVerifiedFigureExplanationTrace(figure.sequence, { rules: figure.structuredData.rules }, figure.correctAnswer, figure.solutionFrames), figure.correctAnswer, difficulty),
      buildEquationEducationalExplanation(equation.structuredData, createVerifiedEquationExplanationTrace(equation.structuredData, equation.solutionPath, equation.correctAnswer), equation.correctAnswer, difficulty),
      buildLatinEducationalExplanation(latin.structuredData, createVerifiedLatinExplanationTrace(latin.structuredData, latin.deductionTrace, latin.correctAnswer, latin.completedGrid), latin.correctAnswer, difficulty),
    ];
    expect(explanations.every(isEducationalExplanation)).toBe(true);
    for (const explanation of explanations) {
      expect(explanation?.steps.length).toBeGreaterThan(0);
      expect(explanation?.summary).not.toContain("_");
      expect(explanation?.takeaway).not.toContain("_");
      expect(explanation?.validation.replayable).toBe(true);
    }
  });

  it("diagnoses only mechanically supported answer differences", () => {
    const figure = generateValidatedFigureSequence({ seed: "phase7-diagnosis-figure", difficulty: "hard", maxAttempts: 5_000 });
    const figureWrong = figure.sequence.missingMatrices.map((matrix, index) =>
      matrix.candidates.find((candidate) => candidate.id !== figure.correctAnswer[index])!.id,
    );
    expect(diagnoseFigureMistake(figure.sequence, figureWrong, figure.correctAnswer)?.supported).toBe(true);

    const equation = generateValidatedMathematicalEquation({ seed: "phase7-diagnosis-equation", difficulty: "hard", maxAttempts: 100 });
    const equationWrong = { ...equation.correctAnswer };
    const first = equation.structuredData.variables[0];
    equationWrong[first] += 1;
    expect(diagnoseEquationMistake(equation.structuredData, createVerifiedEquationExplanationTrace(equation.structuredData, equation.solutionPath, equation.correctAnswer), equationWrong, equation.correctAnswer)?.supported).toBe(true);

    const latin = generateValidatedLatinSquare({ seed: "phase7-diagnosis-latin", difficulty: "hard", maxAttempts: 5_000 });
    const latinWrong = DEFAULT_LATIN_SYMBOLS.find((symbol) => symbol !== latin.correctAnswer)!;
    const diagnosis = diagnoseLatinMistake(latin.structuredData, latin.deductionTrace, latinWrong, latin.correctAnswer);
    expect(diagnosis).not.toBeNull();
    expect(diagnosis?.description).not.toMatch(/careless|rushed|too slow/i);
  });

  it("rejects invalid reasoning metadata instead of inventing an explanation", () => {
    const equation = generateValidatedMathematicalEquation({ seed: "phase7-invalid-trace", difficulty: "medium" });
    expect(buildEquationEducationalExplanation(equation.structuredData, [], equation.correctAnswer, "medium")).toBeNull();
  });
});

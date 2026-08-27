import { describe, expect, it } from "vitest";

import { mathematicalEquationGenerator } from "./generator";
import { renderMathematicalEquation } from "./presentation";
import { inspectMathematicalEquationStyle } from "./style";
import { mathematicalEquationValidator } from "./validator";

describe("MathematicalEquationValidator", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "accepts independently verified %s candidates",
    (difficulty) => {
      for (let seed = 0; seed < 200; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate(
          { seed: `validator-${seed}`, difficulty },
          1,
        );
        const result = mathematicalEquationValidator.validate(candidate, difficulty);
        expect(
          result.valid,
          result.valid
            ? undefined
            : `${difficulty}/${seed}/${candidate.structuredData.dependencyModel.family}: ${JSON.stringify(result.issues)} ${JSON.stringify(result.checks.at(-1)?.details)}`,
        ).toBe(true);
        if (result.valid) {
          expect(result.solution.assignment).toEqual(candidate.correctAnswer);
          expect(result.solution.calculatedDifficulty).toBe(difficulty);
        }
      }
    },
    15_000,
  );

  it("rejects an incorrect stored answer", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "wrong-answer", difficulty: "easy" },
      1,
    );
    candidate.correctAnswer.A = candidate.correctAnswer.A === 20 ? 19 : 20;
    const result = mathematicalEquationValidator.validate(candidate, "easy");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0].code).toBe("stored_answer_mismatch");
  });

  it("rejects ambiguity rather than trusting construction", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "ambiguous", difficulty: "easy" },
      1,
    );
    candidate.structuredData.equations[1] = candidate.structuredData.equations[0];
    const result = mathematicalEquationValidator.validate(candidate, "easy");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((item) =>
        item.code === "multiple_solutions" || item.code === "redundant_equation",
      )).toBe(true);
    }
  });

  it("rejects division by zero structurally", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "zero", difficulty: "easy" },
      1,
    );
    candidate.structuredData.equations[0] = {
      left: {
        kind: "operation",
        operator: "divide",
        left: { kind: "variable", symbol: "A" },
        right: { kind: "constant", value: 0 },
      },
      right: { kind: "constant", value: 1 },
    };
    const result = mathematicalEquationValidator.validate(candidate, "easy");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.some((item) => item.code === "invalid_divisor")).toBe(true);
  });

  it("permanently rejects the observed out-of-range visible-total failure class", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "observed-visible-total-regression", difficulty: "easy" },
      1,
    );
    candidate.structuredData.equations[0].right = { kind: "constant", value: 31 };
    candidate.presentation.blocks[0] = {
      kind: "formula",
      expression: renderMathematicalEquation(candidate.structuredData.equations[0]),
    };
    const result = mathematicalEquationValidator.validate(candidate, "easy");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.map((entry) => entry.code)).toContain("VISIBLE_CONSTANT_OUT_OF_RANGE");
    }
  });

  it("rejects public formula tampering independently of structured metadata", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "public-formula-regression", difficulty: "medium" },
      1,
    );
    candidate.presentation.blocks[0] = { kind: "formula", expression: "A + B = 31" };
    const result = mathematicalEquationValidator.validate(candidate, "medium");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
        "PUBLIC_PRESENTATION_MISMATCH",
        "VISIBLE_CONSTANT_OUT_OF_RANGE",
      ]));
    }
  });

  it("enforces the strict visible and hidden domains across generated candidates", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      for (let seed = 0; seed < 100; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate(
          { seed: `strict-domain-${difficulty}-${seed}`, difficulty },
          1,
        );
        expect(Object.values(candidate.correctAnswer).every((value) =>
          Number.isSafeInteger(value) && value >= 1 && value <= 20)).toBe(true);
        expect(inspectMathematicalEquationStyle(candidate).visibleConstants.every((value) =>
          Number.isSafeInteger(value) && value >= 1 && value <= 20)).toBe(true);
      }
    }
  }, 20_000);

  it("rejects a solution explanation that does not reproduce its result", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "explanation", difficulty: "medium" },
      1,
    );
    candidate.solutionPath[1].knownSymbols = [];
    const result = mathematicalEquationValidator.validate(candidate, "medium");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0].stage).toBe("explanation");
  });

  it("requires both equations for an indirect first deduction", () => {
    let seed = 0;
    let candidate = mathematicalEquationGenerator.generate(
      { seed: `indirect-trace-${seed}`, difficulty: "hard" },
      1,
    );
    while (!candidate.solutionPath.some((step) => step.reasoning === "combine_equations")) {
      seed += 1;
      candidate = mathematicalEquationGenerator.generate(
        { seed: `indirect-trace-${seed}`, difficulty: "hard" },
        1,
      );
    }
    const combineStep = candidate.solutionPath.find((step) => step.reasoning === "combine_equations");
    expect(combineStep?.supportingEquationIndices?.length).toBeGreaterThanOrEqual(1);
    combineStep!.supportingEquationIndices = [];
    const result = mathematicalEquationValidator.validate(candidate, "hard");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((item) =>
        item.code === "non_deductive_step" || item.code === "missing_supporting_equation",
      )).toBe(true);
    }
  });

  it("rejects dependency metadata that disagrees with the verified solve path", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "dependency-model", difficulty: "hard" },
      1,
    );
    candidate.structuredData.dependencyModel.edges = [];
    const result = mathematicalEquationValidator.validate(candidate, "hard");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.some((item) => item.code === "dependency_model_mismatch")).toBe(true);
    }
  });

  it("rejects requested and calculated difficulty mismatch", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "difficulty", difficulty: "easy" },
      1,
    );
    const result = mathematicalEquationValidator.validate(candidate, "hard");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0].code).toBe("difficulty_mismatch");
  });
});

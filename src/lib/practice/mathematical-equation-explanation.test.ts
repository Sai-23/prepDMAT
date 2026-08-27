import { describe, expect, it } from "vitest";

import {
  evaluateExpression,
  generateValidatedMathematicalEquation,
  type EquationSolveTraceOperation,
  type MathematicalEquationQuestion,
} from "../generation/mathematical-equations";
import {
  buildMathematicalEquationWalkthrough,
  EQUATION_EXPLANATION_TRACE_VERSION,
  type EquationExplanationTrace,
} from "./mathematical-equation-explanation";
import { createVerifiedEquationExplanationTrace } from "./mathematical-equation-explanation-trace";

function fixture(difficulty: "easy" | "medium" | "hard", suffix = "default") {
  return generateValidatedMathematicalEquation({
    seed: `equation-practice-explanation-${difficulty}-${suffix}`,
    difficulty,
  });
}

function verifiedTrace(question: MathematicalEquationQuestion): EquationExplanationTrace {
  const trace = createVerifiedEquationExplanationTrace(
    question.structuredData,
    question.solutionPath,
    question.correctAnswer,
  );
  if (!trace) throw new Error("Expected a verified canonical explanation trace.");
  return trace;
}

describe("Mathematical Equation canonical explanation mapping", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "creates a fine-grained, verified %s walkthrough",
    (difficulty) => {
      const question = fixture(difficulty);
      const trace = verifiedTrace(question);
      const walkthrough = buildMathematicalEquationWalkthrough(
        question.structuredData,
        trace,
        question.correctAnswer,
      );
      expect(walkthrough.valid).toBe(true);
      expect(walkthrough.steps.length).toBeGreaterThan(question.structuredData.variables.length);
      expect(walkthrough.steps.at(-1)?.isFinal).toBe(true);
      expect(walkthrough.steps.at(-1)?.solvedValues).toEqual(question.correctAnswer);
      expect(new Set(walkthrough.steps.flatMap((step) => step.canonicalStepIndices)).size)
        .toBeGreaterThanOrEqual(question.structuredData.variables.length * 2);
      question.structuredData.variables.forEach((symbol) => {
        expect(walkthrough.steps.some((step) => step.resolvedVariable === symbol)).toBe(true);
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

  it("maps every displayed transformation back to canonical trace expressions", () => {
    const question = fixture("hard", "canonical-correspondence");
    const trace = verifiedTrace(question);
    const walkthrough = buildMathematicalEquationWalkthrough(
      question.structuredData,
      trace,
      question.correctAnswer,
    );
    walkthrough.steps.forEach((step) => {
      const canonical = trace.solveTrace.steps[step.canonicalStepIndices[0]];
      expect(canonical.operation).toBe(step.operation);
      expect(canonical.expressionBefore).toContain(step.expressionBefore.split(";")[0]);
      if (canonical.operation !== "DIRECT_REWRITE") {
        expect(step.expressionAfter).toBe(canonical.expressionAfter);
      } else {
        expect(trace.solveTrace.steps.some((item) =>
          item.expressionBefore.includes(step.expressionAfter))).toBe(true);
      }
    });
  });

  it("shows solved-value propagation as explicit substitution", () => {
    let question = fixture("hard", "propagation-1");
    for (let attempt = 2; attempt < 40; attempt += 1) {
      const trace = verifiedTrace(question);
      const walkthrough = buildMathematicalEquationWalkthrough(
        question.structuredData,
        trace,
        question.correctAnswer,
      );
      const substitutions = walkthrough.steps.filter((step) => step.operation === "SUBSTITUTION");
      if (substitutions.length >= 2) {
        substitutions.forEach((step) => {
          expect(step.replacements.length).toBeGreaterThan(0);
          step.replacements.forEach(({ before, after }) => {
            expect(step.expressionBefore).toContain(before);
            expect(step.expressionAfter).toContain(after);
            expect(step.instruction).toContain(`${before} = ${after}`);
          });
        });
        return;
      }
      question = fixture("hard", `propagation-${attempt}`);
    }
    throw new Error("Unable to find the expected nested substitution fixture.");
  });

  it("renders direct rewrite, expansion, collect, division rewrite, both-side, same-target, and weighted elimination operations", () => {
    const operations: EquationSolveTraceOperation[] = [
      "DIRECT_REWRITE",
      "MULTIPLY",
      "COLLECT_TERMS",
      "REARRANGE",
      "ELIMINATION",
      "ELIMINATION",
      "DIRECT_REWRITE",
      "DIVIDE",
      "RESOLVE_VARIABLE",
    ];
    const data = {
      variables: ["A"],
      equations: [{
        left: { kind: "variable" as const, symbol: "A" },
        right: { kind: "constant" as const, value: 6 },
      }],
      domain: { minimum: 1, maximum: 20, integersOnly: true as const },
    };
    const expressions = [
      ["2(A + 3) = 18", "2A + 6 = 18"],
      ["2 × (A + 3) = 18", "2A + 6 = 18"],
      ["A + A + 6 = 18", "2A + 6 = 18"],
      ["2A + B = A + 9", "A + B = 9"],
      ["2A + B = 13; 3A - B = 17", "5A = 30"],
      ["A = 2B + 1; A = C + 4", "2B + 1 = C + 4"],
      ["B ÷ 2 = A", "B = 2A"],
      ["2A = 12", "A = 6"],
      ["A = 6", "A = 6"],
    ];
    const trace: EquationExplanationTrace = {
      version: EQUATION_EXPLANATION_TRACE_VERSION,
      solutionPath: [{ equationIndex: 0, targetSymbol: "A", knownSymbols: [] }],
      solveTrace: {
        steps: [
          ...operations.map((operation, index) => ({
            operation,
            expressionBefore: expressions[index][0],
            expressionAfter: expressions[index][1],
            evaluatedNumbers: [6, 12, 18],
            ...(operation === "DIVIDE"
              ? { division: { dividend: 12, divisor: 2, quotient: 6, exact: true } }
              : {}),
            ...(operation === "RESOLVE_VARIABLE" ? { resolvedVariable: "A" } : {}),
          })),
          {
            operation: "PROPAGATE_VALUE",
            expressionBefore: "A = 6",
            expressionAfter: "Use A = 6 in later relationships.",
            evaluatedNumbers: [6],
            resolvedVariable: "A",
          },
        ],
        resolvedAssignment: { A: 6 },
        maximumEvaluatedIntermediate: 18,
        minimumEvaluatedIntermediate: 6,
        hasNegativeIntermediate: false,
        hasFractionalIntermediate: false,
      },
    };
    const walkthrough = buildMathematicalEquationWalkthrough(data, trace, { A: 6 });
    expect(walkthrough.steps.map((step) => step.operation)).toEqual(operations);
    expect(walkthrough.steps[0].title).toContain("Expand");
    expect(walkthrough.steps.find((step) => step.operation === "COLLECT_TERMS")?.instruction)
      .toContain("same letter");
    expect(walkthrough.steps.find((step) => step.operation === "DIVIDE")?.operationLabel)
      .toContain("2");
    expect(walkthrough.steps.find((step) => step.title === "Rewrite the division relationship"))
      .toBeDefined();
    expect(walkthrough.steps.filter((step) => step.operation === "ELIMINATION"))
      .toHaveLength(2);
    expect(walkthrough.steps.some((step) => step.supportingExpressions.includes("A = 2B + 1")))
      .toBe(true);
  });

  it("renders elimination and weighted elimination as aligned equation operations", () => {
    let question = fixture("hard", "elimination-1");
    for (let attempt = 2; attempt < 80; attempt += 1) {
      const trace = verifiedTrace(question);
      const walkthrough = buildMathematicalEquationWalkthrough(question.structuredData, trace, question.correctAnswer);
      const combined = walkthrough.steps.find((step) =>
        step.operation === "ADD_EQUATIONS" || step.operation === "SUBTRACT_EQUATIONS");
      if (combined) {
        expect(combined.activeEquationIndices.length).toBeGreaterThanOrEqual(2);
        expect(combined.supportingExpressions.length).toBeGreaterThanOrEqual(2);
        expect(combined.instruction).toContain("line by line");
        expect(combined.expressionAfter).toMatch(/=/);
        return;
      }
      question = fixture("hard", `elimination-${attempt}`);
    }
    throw new Error("Unable to find the expected elimination fixture.");
  });

  it.each([
    ["three-variable", "medium", 3],
    ["four-variable", "hard", 4],
  ] as const)("supports %s systems", (_label, difficulty, variableCount) => {
    const question = fixture(difficulty, `${variableCount}-variables`);
    expect(question.structuredData.variables).toHaveLength(variableCount);
    const walkthrough = buildMathematicalEquationWalkthrough(
      question.structuredData,
      verifiedTrace(question),
      question.correctAnswer,
    );
    expect(walkthrough.valid).toBe(true);
    expect(walkthrough.steps.at(-1)?.solvedValues).toEqual(question.correctAnswer);
  });

  it("does not accept an older path directly in the client presentation adapter", () => {
    const question = fixture("medium", "compatibility-boundary");
    const walkthrough = buildMathematicalEquationWalkthrough(
      question.structuredData,
      question.solutionPath,
      question.correctAnswer,
    );
    expect(walkthrough.valid).toBe(false);
    expect(walkthrough.steps).toEqual([]);
    expect(walkthrough.fallbackMessage).toContain("Verified solution:");
    expect(createVerifiedEquationExplanationTrace(
      question.structuredData,
      question.solutionPath,
      question.correctAnswer,
    )).not.toBeNull();
  });
});

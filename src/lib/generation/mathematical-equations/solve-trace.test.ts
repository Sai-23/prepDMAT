import { describe, expect, it } from "vitest";

import { buildCanonicalSolveTrace, validateSolveTraceRange } from "./solve-trace";
import {
  MATHEMATICAL_EQUATION_DOMAIN,
  type EquationSolveTrace,
  type EquationSolveTraceStep,
  type MathematicalEquation,
  type MathematicalExpression,
} from "./types";

const constant = (value: number): MathematicalExpression => ({ kind: "constant", value });
const variable = (symbol: string): MathematicalExpression => ({ kind: "variable", symbol });
const operation = (
  operator: "add" | "subtract" | "multiply" | "divide",
  left: MathematicalExpression,
  right: MathematicalExpression,
): MathematicalExpression => ({ kind: "operation", operator, left, right });

function traceFor(step: EquationSolveTraceStep): EquationSolveTrace {
  const values = step.evaluatedNumbers;
  return {
    steps: [step],
    resolvedAssignment: {},
    maximumEvaluatedIntermediate: Math.max(0, ...values),
    minimumEvaluatedIntermediate: values.length ? Math.min(...values) : 0,
    hasNegativeIntermediate: values.some((value) => value < 0),
    hasFractionalIntermediate: values.some((value) => !Number.isInteger(value)),
  };
}

function arithmeticStep(evaluatedNumbers: number[]): EquationSolveTraceStep {
  return {
    operation: "REARRANGE",
    expressionBefore: "arithmetic",
    expressionAfter: "result",
    evaluatedNumbers,
  };
}

describe("canonical mathematical-equation solve-trace safety", () => {
  it.each([
    ["addition", [8, 7, 15]],
    ["subtraction", [17, 6, 11]],
    ["multiplication", [5, 4, 20]],
    ["elimination", [13, 5, 18, 9]],
  ])("accepts safe %s arithmetic", (_name, values) => {
    expect(validateSolveTraceRange(traceFor(arithmeticStep(values as number[])), MATHEMATICAL_EQUATION_DOMAIN).valid).toBe(true);
  });

  it.each([
    ["addition", [14, 9, 23], "INTERMEDIATE_ABOVE_MAX"],
    ["negative subtraction", [4, 9, -5], "NEGATIVE_INTERMEDIATE"],
    ["multiplication", [5, 6, 30], "INTERMEDIATE_ABOVE_MAX"],
    ["elimination", [16, 16, 32], "INTERMEDIATE_ABOVE_MAX"],
  ])("rejects unsafe %s arithmetic", (_name, values, code) => {
    const result = validateSolveTraceRange(traceFor(arithmeticStep(values as number[])), MATHEMATICAL_EQUATION_DOMAIN);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.failures.map((failure) => failure.code)).toContain(code);
  });

  it("accepts exact integer division and rejects fractional division", () => {
    const exact = traceFor({
      operation: "DIVIDE",
      expressionBefore: "3A = 18",
      expressionAfter: "A = 6",
      evaluatedNumbers: [18, 6],
      division: { dividend: 18, divisor: 3, quotient: 6, exact: true },
    });
    const fractional = traceFor({
      operation: "DIVIDE",
      expressionBefore: "3A = 17",
      expressionAfter: "A = 17/3",
      evaluatedNumbers: [17, 17 / 3],
      division: { dividend: 17, divisor: 3, quotient: 17 / 3, exact: false },
    });
    expect(validateSolveTraceRange(exact, MATHEMATICAL_EQUATION_DOMAIN).valid).toBe(true);
    const result = validateSolveTraceRange(fractional, MATHEMATICAL_EQUATION_DOMAIN);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.failures.map((failure) => failure.code)).toEqual(expect.arrayContaining([
        "NON_INTEGER_INTERMEDIATE",
        "NON_EXACT_DIVISION",
      ]));
    }
  });

  it("allows semantic cancellation zero but rejects zero as a resolved calculation", () => {
    const cancellation = traceFor({
      ...arithmeticStep([0, 12]),
      operation: "ELIMINATION",
      algebraicCancellation: true,
    });
    expect(validateSolveTraceRange(cancellation, MATHEMATICAL_EQUATION_DOMAIN).valid).toBe(true);
    const resolvedZero = validateSolveTraceRange(traceFor(arithmeticStep([0])), MATHEMATICAL_EQUATION_DOMAIN);
    expect(resolvedZero.valid).toBe(false);
    if (!resolvedZero.valid) {
      expect(resolvedZero.failures.map((failure) => failure.code)).toContain("INTERMEDIATE_BELOW_MIN");
    }
  });

  it("rejects the general unsafe 4A = 56 substitution path", () => {
    const equations: MathematicalEquation[] = [
      { left: operation("add", variable("A"), operation("multiply", constant(3), variable("C"))), right: constant(20) },
      { left: constant(19), right: operation("add", operation("add", operation("multiply", constant(3), variable("B")), variable("A")), variable("C")) },
      { left: variable("C"), right: operation("subtract", variable("A"), constant(12)) },
    ];
    const trace = buildCanonicalSolveTrace({
      structuredData: { equations },
      solutionPath: [
        { equationIndex: 0, supportingEquationIndices: [2], targetSymbol: "A", knownSymbols: [], dependencySymbols: [], reasoning: "combine_equations" },
        { equationIndex: 2, targetSymbol: "C", knownSymbols: ["A"], dependencySymbols: ["A"], reasoning: "substitute" },
        { equationIndex: 1, targetSymbol: "B", knownSymbols: ["A", "C"], dependencySymbols: ["A", "C"], reasoning: "substitute" },
      ],
    }, { A: 14, B: 1, C: 2 });
    const result = validateSolveTraceRange(trace, MATHEMATICAL_EQUATION_DOMAIN);
    expect(trace.maximumEvaluatedIntermediate).toBe(56);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.failures.map((failure) => failure.code)).toContain("INTERMEDIATE_ABOVE_MAX");
  });

  it("accepts the safe 3A = 18 substitution path", () => {
    const equations: MathematicalEquation[] = [
      { left: operation("add", variable("A"), operation("multiply", constant(2), variable("C"))), right: constant(10) },
      { left: variable("C"), right: operation("subtract", variable("A"), constant(4)) },
    ];
    const trace = buildCanonicalSolveTrace({
      structuredData: { equations },
      solutionPath: [
        { equationIndex: 0, supportingEquationIndices: [1], targetSymbol: "A", knownSymbols: [], dependencySymbols: [], reasoning: "combine_equations" },
        { equationIndex: 1, targetSymbol: "C", knownSymbols: ["A"], dependencySymbols: ["A"], reasoning: "substitute" },
      ],
    }, { A: 6, C: 2 });
    expect(trace.maximumEvaluatedIntermediate).toBe(18);
    expect(validateSolveTraceRange(trace, MATHEMATICAL_EQUATION_DOMAIN).valid).toBe(true);
  });
});

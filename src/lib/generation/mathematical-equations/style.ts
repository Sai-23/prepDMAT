import { evaluateExpression } from "./solver";
import {
  MATHEMATICAL_EQUATION_DOMAIN,
  type MathematicalEquation,
  type MathematicalEquationCandidate,
  type MathematicalExpression,
  type VariableAssignment,
} from "./types";
export const MATHEMATICAL_EQUATION_STYLE_POLICY = {
  strictDmatFidelity: true,
  preferredVisibleConstantMin: MATHEMATICAL_EQUATION_DOMAIN.minimum,
  preferredVisibleConstantMax: MATHEMATICAL_EQUATION_DOMAIN.maximum,
  hardVisibleConstantMin: MATHEMATICAL_EQUATION_DOMAIN.minimum,
  hardVisibleConstantMax: MATHEMATICAL_EQUATION_DOMAIN.maximum,
  /** Compatibility name retained for audit consumers; strict production value is 20. */
  hardVisibleConstantLimit: MATHEMATICAL_EQUATION_DOMAIN.maximum,
  preferredCoefficients: [2, 3, 4, 5] as const,
  hardCoefficientLimit: 6,
} as const;

export type EquationStyleMetrics = {
  visibleConstants: number[];
  coefficients: number[];
  negativeDisplayedConstantCount: number;
  preferredConstantExceedanceCount: number;
  maximumDisplayedConstant: number;
  averageDisplayedConstant: number;
  maximumCoefficient: number;
  averageCoefficient: number;
  mentalArithmeticCost: number;
  presentationPenalty: number;
};

function collect(
  expression: MathematicalExpression,
  constants: number[],
  coefficients: number[],
  coefficientContext = false,
): void {
  if (expression.kind === "constant") {
    constants.push(expression.value);
    if (coefficientContext) coefficients.push(Math.abs(expression.value));
    return;
  }
  if (expression.kind === "variable") return;
  const coefficientOperation = expression.operator === "multiply" || expression.operator === "divide";
  collect(expression.left, constants, coefficients, coefficientOperation);
  collect(expression.right, constants, coefficients, coefficientOperation);
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function inspectMathematicalEquationStyle(
  candidate: MathematicalEquationCandidate,
): EquationStyleMetrics {
  return inspectEquationPresentation(candidate.structuredData.equations, candidate.correctAnswer);
}

function operationCost(
  expression: MathematicalExpression,
  assignment: Readonly<VariableAssignment>,
): number {
  if (expression.kind !== "operation") return 0;
  const leftCost = operationCost(expression.left, assignment);
  const rightCost = operationCost(expression.right, assignment);
  const left = evaluateExpression(expression.left, assignment);
  const right = evaluateExpression(expression.right, assignment);
  const result = evaluateExpression(expression, assignment);
  const leftMagnitude = left.known && left.valid ? Math.abs(left.value) : 0;
  const rightMagnitude = right.known && right.valid ? Math.abs(right.value) : 0;
  const resultMagnitude = result.known && result.valid ? Math.abs(result.value) : 0;
  let own = 1;
  if (expression.operator === "add") {
    own += Number(leftMagnitude >= 10 && rightMagnitude >= 10) * 0.7;
    own += Number(resultMagnitude > MATHEMATICAL_EQUATION_DOMAIN.maximum) * 0.6;
  } else if (expression.operator === "subtract") {
    own += Number(leftMagnitude >= MATHEMATICAL_EQUATION_DOMAIN.maximum || rightMagnitude >= 10) * 0.5;
    own += Number(result.known && result.valid && result.value < 0) * 0.8;
  } else if (expression.operator === "multiply") {
    const coefficient = expression.left.kind === "constant"
      ? Math.abs(expression.left.value)
      : expression.right.kind === "constant"
        ? Math.abs(expression.right.value)
        : Math.max(leftMagnitude, rightMagnitude);
    own += ({ 2: 0, 3: 0.25, 4: 0.45, 5: 0.35 }[coefficient] ?? 0.8);
    own += Number(resultMagnitude > MATHEMATICAL_EQUATION_DOMAIN.maximum) * 0.7;
  } else {
    const divisor = expression.right.kind === "constant" ? Math.abs(expression.right.value) : rightMagnitude;
    own += divisor <= 3 ? 0 : 0.35;
  }
  return leftCost + rightCost + own;
}

export function inspectEquationPresentation(
  equations: readonly MathematicalEquation[],
  assignment: Readonly<VariableAssignment>,
): EquationStyleMetrics {
  const visibleConstants: number[] = [];
  const coefficients: number[] = [];
  equations.forEach((equation) => {
    collect(equation.left, visibleConstants, coefficients);
    collect(equation.right, visibleConstants, coefficients);
  });
  const negativeDisplayedConstantCount = visibleConstants.filter((value) => value < 0).length;
  const preferredConstantExceedanceCount = visibleConstants.filter((value) =>
    value > MATHEMATICAL_EQUATION_STYLE_POLICY.preferredVisibleConstantMax,
  ).length;
  const mentalArithmeticCost = equations.reduce((total, equation) =>
    total + operationCost(equation.left, assignment) + operationCost(equation.right, assignment), 0);
  const presentationPenalty = visibleConstants.reduce((total, value) => {
    if (value < 0) return total + 12 + Math.abs(value) * 0.2;
    if (value <= MATHEMATICAL_EQUATION_DOMAIN.maximum) return total + Math.max(0, value - 15) * 0.04;
    if (value <= MATHEMATICAL_EQUATION_DOMAIN.maximum + 10) {
      return total + 1.25 + (value - MATHEMATICAL_EQUATION_DOMAIN.maximum) * 0.12;
    }
    if (value <= MATHEMATICAL_EQUATION_DOMAIN.maximum + 20) {
      return total + 2.75 + (value - MATHEMATICAL_EQUATION_DOMAIN.maximum - 10) * 0.2;
    }
    return total + 10 + (value - MATHEMATICAL_EQUATION_DOMAIN.maximum - 20) * 0.5;
  }, 0) + coefficients.reduce((total, coefficient) =>
    total + ({ 2: 0, 3: 0.12, 4: 0.28, 5: 0.24 }[coefficient] ?? 0.8), 0);
  return {
    visibleConstants,
    coefficients,
    negativeDisplayedConstantCount,
    preferredConstantExceedanceCount,
    maximumDisplayedConstant: Math.max(0, ...visibleConstants),
    averageDisplayedConstant: average(visibleConstants),
    maximumCoefficient: Math.max(0, ...coefficients),
    averageCoefficient: average(coefficients),
    mentalArithmeticCost: Number(mentalArithmeticCost.toFixed(3)),
    presentationPenalty: Number(presentationPenalty.toFixed(3)),
  };
}

export function mathematicalEquationStyleIssues(
  candidate: MathematicalEquationCandidate,
): Array<{ code: string; message: string }> {
  const metrics = inspectMathematicalEquationStyle(candidate);
  const issues: Array<{ code: string; message: string }> = [];
  const invalidVisibleConstant = metrics.visibleConstants.find((value) =>
    !Number.isSafeInteger(value) ||
    value < MATHEMATICAL_EQUATION_STYLE_POLICY.hardVisibleConstantMin ||
    value > MATHEMATICAL_EQUATION_STYLE_POLICY.hardVisibleConstantMax,
  );
  if (invalidVisibleConstant !== undefined) {
    issues.push({
      code: "VISIBLE_CONSTANT_OUT_OF_RANGE",
      message: `Every displayed constant must be an integer from ${MATHEMATICAL_EQUATION_STYLE_POLICY.hardVisibleConstantMin} through ${MATHEMATICAL_EQUATION_STYLE_POLICY.hardVisibleConstantMax}.`,
    });
  }
  if (metrics.maximumCoefficient > MATHEMATICAL_EQUATION_STYLE_POLICY.hardCoefficientLimit) {
    issues.push({ code: "style_coefficient_too_large", message: `Coefficients must not exceed ${MATHEMATICAL_EQUATION_STYLE_POLICY.hardCoefficientLimit}.` });
  }
  return issues;
}

import type { PresentationBlock } from "../types";
import type {
  EquationOperator,
  MathematicalEquation,
  MathematicalExpression,
} from "./types";

function expressionPrecedence(expression: MathematicalExpression): number {
  if (expression.kind !== "operation") return 3;
  return expression.operator === "multiply" || expression.operator === "divide" ? 2 : 1;
}

export function renderMathematicalExpression(
  expression: MathematicalExpression,
  parentPrecedence = 0,
  isRight = false,
): string {
  if (expression.kind === "constant") return String(expression.value);
  if (expression.kind === "variable") return expression.symbol;
  const operators: Record<EquationOperator, string> = {
    add: "+",
    subtract: "−",
    multiply: "×",
    divide: "÷",
  };
  const precedence = expressionPrecedence(expression);
  const text = `${renderMathematicalExpression(expression.left, precedence)} ${operators[expression.operator]} ${renderMathematicalExpression(expression.right, precedence, true)}`;
  const needsParentheses = precedence < parentPrecedence ||
    (isRight && precedence === parentPrecedence &&
      (expression.operator === "subtract" || expression.operator === "divide"));
  return needsParentheses ? `(${text})` : text;
}

export function renderMathematicalEquation(equation: MathematicalEquation): string {
  return `${renderMathematicalExpression(equation.left)} = ${renderMathematicalExpression(equation.right)}`;
}

export type PublicEquationPresentationInspection = {
  validFormulaShape: boolean;
  formulae: string[];
  visibleConstants: number[];
};

/** Inspects the exact formula strings sent to student renderers. */
export function inspectPublicEquationPresentation(
  blocks: readonly PresentationBlock[],
  equations: readonly MathematicalEquation[],
): PublicEquationPresentationInspection {
  const formulae = blocks.flatMap((block) =>
    block.kind === "formula" ? [block.expression] : []);
  const expected = equations.map(renderMathematicalEquation);
  const visibleConstants = formulae.flatMap((formula) =>
    [...formula.matchAll(/\d+/g)].map((match) => Number(match[0])));
  return {
    validFormulaShape:
      blocks.length === equations.length &&
      formulae.length === equations.length &&
      formulae.every((formula, index) => formula === expected[index]),
    formulae,
    visibleConstants,
  };
}

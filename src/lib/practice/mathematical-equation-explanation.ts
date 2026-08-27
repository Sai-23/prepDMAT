import {
  evaluateExpression,
  type EquationSolutionStep,
  type EquationSolveTrace,
  type EquationSolveTraceOperation,
  type EquationSolveTraceStep,
  type MathematicalEquation,
  type MathematicalEquationStructuredData,
  type MathematicalExpression,
  type VariableAssignment,
} from "../generation/mathematical-equations";

export const EQUATION_EXPLANATION_TRACE_VERSION =
  "mathematical-equation-explanation-trace@1" as const;

type EquationExplanationData = Pick<
  MathematicalEquationStructuredData,
  "variables" | "equations" | "domain"
>;

export type EquationExplanationTrace = {
  version: typeof EQUATION_EXPLANATION_TRACE_VERSION;
  solveTrace: EquationSolveTrace;
  solutionPath: EquationSolutionStep[];
};

export type EquationTermReplacement = {
  before: string;
  after: string;
};

export type EquationExplanationStep = {
  id: string;
  operation: EquationSolveTraceOperation;
  eyebrow: string;
  title: string;
  instruction: string;
  operationLabel: string;
  activeEquationIndex: number;
  activeEquationIndices: number[];
  expressionBefore: string;
  supportingExpressions: string[];
  expressionAfter: string;
  replacements: EquationTermReplacement[];
  targetSymbol: string;
  resolvedVariable: string | null;
  solvedValue: number;
  knownValues: VariableAssignment;
  solvedValues: VariableAssignment;
  canonicalStepIndices: number[];
  isFinal: boolean;
};

export type EquationWalkthrough = {
  valid: boolean;
  steps: EquationExplanationStep[];
  fallbackMessage: string | null;
  assignment: VariableAssignment | null;
};

const operatorText = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
} as const;

function precedence(expression: MathematicalExpression): number {
  if (expression.kind !== "operation") return 3;
  return expression.operator === "multiply" || expression.operator === "divide" ? 2 : 1;
}

export function equationExpressionText(
  expression: MathematicalExpression,
  parentPrecedence = 0,
  isRight = false,
): string {
  if (expression.kind === "constant") return String(expression.value);
  if (expression.kind === "variable") return expression.symbol;
  const currentPrecedence = precedence(expression);
  const left = equationExpressionText(expression.left, currentPrecedence);
  const right = equationExpressionText(expression.right, currentPrecedence, true);
  const text = `${left} ${operatorText[expression.operator]} ${right}`;
  const needsParentheses = currentPrecedence < parentPrecedence ||
    (isRight && currentPrecedence === parentPrecedence &&
      (expression.operator === "subtract" || expression.operator === "divide"));
  return needsParentheses ? `(${text})` : text;
}

export function presentationEquationText(equation: MathematicalEquation): string {
  return `${equationExpressionText(equation.left)} = ${equationExpressionText(equation.right)}`;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function parseEquationAssignment(
  data: EquationExplanationData,
  value: unknown,
): VariableAssignment | null {
  const input = record(value);
  if (!input) return null;
  const assignment: VariableAssignment = {};
  for (const symbol of data.variables) {
    const number = input[symbol];
    if (
      !Number.isInteger(number) ||
      Number(number) < data.domain.minimum ||
      Number(number) > data.domain.maximum
    ) return null;
    assignment[symbol] = Number(number);
  }
  return Object.keys(input).length === data.variables.length ? assignment : null;
}

function parseSolutionStep(value: unknown): EquationSolutionStep | null {
  const step = record(value);
  if (
    !step ||
    !Number.isInteger(step.equationIndex) ||
    typeof step.targetSymbol !== "string" ||
    !Array.isArray(step.knownSymbols) ||
    !step.knownSymbols.every((symbol) => typeof symbol === "string") ||
    (step.supportingEquationIndices !== undefined &&
      (!Array.isArray(step.supportingEquationIndices) ||
        !step.supportingEquationIndices.every((index) => Number.isInteger(index)))) ||
    (step.dependencySymbols !== undefined &&
      (!Array.isArray(step.dependencySymbols) ||
        !step.dependencySymbols.every((symbol) => typeof symbol === "string"))) ||
    (step.reasoning !== undefined &&
      !["solve_variable", "substitute", "combine_equations"].includes(String(step.reasoning)))
  ) return null;
  return {
    equationIndex: Number(step.equationIndex),
    ...(step.supportingEquationIndices === undefined
      ? {}
      : { supportingEquationIndices: step.supportingEquationIndices.map(Number) }),
    targetSymbol: step.targetSymbol,
    knownSymbols: step.knownSymbols,
    ...(step.dependencySymbols === undefined
      ? {}
      : { dependencySymbols: step.dependencySymbols as string[] }),
    ...(step.reasoning === undefined
      ? {}
      : { reasoning: step.reasoning as EquationSolutionStep["reasoning"] }),
  };
}

export function parseEquationSolutionPath(
  data: EquationExplanationData,
  value: unknown,
): EquationSolutionStep[] | null {
  if (!Array.isArray(value) || value.length !== data.variables.length) return null;
  const parsed = value.map(parseSolutionStep);
  if (parsed.some((step) => step === null)) return null;
  const steps = parsed as EquationSolutionStep[];
  const targets = new Set<string>();
  for (const step of steps) {
    const indices = [step.equationIndex, ...(step.supportingEquationIndices ?? [])];
    if (
      !data.variables.includes(step.targetSymbol) ||
      targets.has(step.targetSymbol) ||
      new Set(indices).size !== indices.length ||
      indices.some((index) => !data.equations[index])
    ) return null;
    targets.add(step.targetSymbol);
  }
  return targets.size === data.variables.length ? steps : null;
}

function parseSolveTraceStep(value: unknown): EquationSolveTraceStep | null {
  const step = record(value);
  const operations: EquationSolveTraceOperation[] = [
    "DIRECT_REWRITE",
    "SUBSTITUTION",
    "ELIMINATION",
    "COLLECT_TERMS",
    "ADD_EQUATIONS",
    "SUBTRACT_EQUATIONS",
    "MULTIPLY",
    "DIVIDE",
    "REARRANGE",
    "RESOLVE_VARIABLE",
    "PROPAGATE_VALUE",
  ];
  if (
    !step ||
    !operations.includes(step.operation as EquationSolveTraceOperation) ||
    typeof step.expressionBefore !== "string" ||
    typeof step.expressionAfter !== "string" ||
    !Array.isArray(step.evaluatedNumbers) ||
    !step.evaluatedNumbers.every((number) => typeof number === "number" && Number.isFinite(number)) ||
    (step.resolvedVariable !== undefined && typeof step.resolvedVariable !== "string")
  ) return null;
  const division = record(step.division);
  if (division && (
    typeof division.dividend !== "number" ||
    typeof division.divisor !== "number" ||
    typeof division.quotient !== "number" ||
    typeof division.exact !== "boolean"
  )) return null;
  return {
    operation: step.operation as EquationSolveTraceOperation,
    expressionBefore: step.expressionBefore,
    expressionAfter: step.expressionAfter,
    evaluatedNumbers: step.evaluatedNumbers as number[],
    ...(step.resolvedVariable === undefined ? {} : { resolvedVariable: step.resolvedVariable }),
    ...(division
      ? {
          division: {
            dividend: Number(division.dividend),
            divisor: Number(division.divisor),
            quotient: Number(division.quotient),
            exact: Boolean(division.exact),
          },
        }
      : {}),
    ...(step.algebraicCancellation === true ? { algebraicCancellation: true } : {}),
  };
}

function parseSolveTrace(value: unknown): EquationSolveTrace | null {
  const source = record(value);
  const resolvedAssignment = record(source?.resolvedAssignment);
  if (
    !source ||
    !Array.isArray(source.steps) ||
    !resolvedAssignment ||
    typeof source.maximumEvaluatedIntermediate !== "number" ||
    typeof source.minimumEvaluatedIntermediate !== "number" ||
    typeof source.hasNegativeIntermediate !== "boolean" ||
    typeof source.hasFractionalIntermediate !== "boolean"
  ) return null;
  const steps = source.steps.map(parseSolveTraceStep);
  if (steps.some((step) => step === null)) return null;
  const assignment: VariableAssignment = {};
  for (const [symbol, raw] of Object.entries(resolvedAssignment)) {
    if (!Number.isInteger(raw)) return null;
    assignment[symbol] = Number(raw);
  }
  return {
    steps: steps as EquationSolveTraceStep[],
    resolvedAssignment: assignment,
    maximumEvaluatedIntermediate: source.maximumEvaluatedIntermediate,
    minimumEvaluatedIntermediate: source.minimumEvaluatedIntermediate,
    hasNegativeIntermediate: source.hasNegativeIntermediate,
    hasFractionalIntermediate: source.hasFractionalIntermediate,
  };
}

export function parseEquationExplanationTrace(
  data: EquationExplanationData,
  value: unknown,
): EquationExplanationTrace | null {
  const source = record(value);
  if (source?.version !== EQUATION_EXPLANATION_TRACE_VERSION) return null;
  const solveTrace = parseSolveTrace(source.solveTrace);
  const solutionPath = parseEquationSolutionPath(data, source.solutionPath);
  if (!solveTrace || !solutionPath) return null;
  return { version: EQUATION_EXPLANATION_TRACE_VERSION, solveTrace, solutionPath };
}

function equationIsTrue(
  equation: MathematicalEquation,
  assignment: Readonly<VariableAssignment>,
): boolean {
  const left = evaluateExpression(equation.left, assignment);
  const right = evaluateExpression(equation.right, assignment);
  return Boolean(
    left.known && left.valid && right.known && right.valid && left.value === right.value,
  );
}

export function equationAssignmentIsValid(
  data: EquationExplanationData,
  assignment: Readonly<VariableAssignment>,
): boolean {
  return data.equations.every((equation) => equationIsTrue(equation, assignment));
}

function sameAssignment(
  first: Readonly<VariableAssignment>,
  second: Readonly<VariableAssignment>,
  variables: readonly string[],
): boolean {
  return variables.every((symbol) => first[symbol] === second[symbol]) &&
    Object.keys(first).length === variables.length &&
    Object.keys(second).length === variables.length;
}

function fallback(
  data: EquationExplanationData,
  assignment: VariableAssignment | null,
): EquationWalkthrough {
  if (!assignment || !equationAssignmentIsValid(data, assignment)) {
    return {
      valid: false,
      steps: [],
      fallbackMessage: "The verified solution is unavailable.",
      assignment: null,
    };
  }
  return {
    valid: false,
    steps: [],
    fallbackMessage: `Verified solution: ${data.variables.map((symbol) => `${symbol} = ${assignment[symbol]}`).join(", ")}.`,
    assignment,
  };
}

type CanonicalGroup = {
  path: EquationSolutionStep;
  steps: Array<{ step: EquationSolveTraceStep; canonicalIndex: number }>;
};

function canonicalGroups(
  trace: EquationSolveTrace,
  solutionPath: readonly EquationSolutionStep[],
): CanonicalGroup[] | null {
  const groups: CanonicalGroup[] = [];
  let cursor = 0;
  for (const path of solutionPath) {
    const steps: CanonicalGroup["steps"] = [];
    let complete = false;
    while (cursor < trace.steps.length) {
      const step = trace.steps[cursor];
      steps.push({ step, canonicalIndex: cursor });
      cursor += 1;
      if (
        step.operation === "PROPAGATE_VALUE" &&
        step.resolvedVariable === path.targetSymbol
      ) {
        complete = true;
        break;
      }
    }
    if (!complete) return null;
    groups.push({ path, steps });
  }
  return cursor === trace.steps.length ? groups : null;
}

function directRewriteAfter(group: CanonicalGroup, position: number): string {
  const directPosition = group.steps
    .slice(0, position + 1)
    .filter(({ step }) => step.operation === "DIRECT_REWRITE").length - 1;
  const combined = group.steps.find(({ step }) =>
    step.operation === "ADD_EQUATIONS" ||
    step.operation === "SUBTRACT_EQUATIONS" ||
    step.operation === "ELIMINATION");
  const combinedInputs = combined?.step.expressionBefore
    .split(";")
    .map((expression) => expression.trim())
    .filter(Boolean) ?? [];
  if (combinedInputs[directPosition]) return combinedInputs[directPosition];
  const nextMeaningful = group.steps.slice(position + 1).find(({ step }) =>
    step.operation !== "DIRECT_REWRITE" && step.operation !== "PROPAGATE_VALUE");
  return nextMeaningful?.step.expressionBefore ?? group.steps[position].step.expressionBefore;
}

function replacementsFor(
  expressionBefore: string,
  expressionAfter: string,
  knownValues: Readonly<VariableAssignment>,
): EquationTermReplacement[] {
  return Object.entries(knownValues).flatMap(([symbol, value]) => {
    const token = new RegExp(`(^|[^A-Z])${symbol}([^A-Z]|$)`);
    return token.test(expressionBefore) && !token.test(expressionAfter)
      ? [{ before: symbol, after: String(value) }]
      : [];
  });
}

function operationCopy(
  operation: EquationSolveTraceOperation,
  targetSymbol: string,
  replacements: readonly EquationTermReplacement[],
  step: EquationSolveTraceStep,
  before: string,
  after: string,
): Pick<EquationExplanationStep, "eyebrow" | "title" | "instruction" | "operationLabel"> {
  if (operation === "DIRECT_REWRITE") {
    const expands = /[×*]\s*\(|\([^=]+[+−-][^=]+\)/.test(before);
    const rewritesDivision = before.includes("÷") || before.includes("/");
    return {
      eyebrow: "START HERE",
      title: rewritesDivision
        ? "Rewrite the division relationship"
        : expands ? "Expand and collect the relationship" : "Rewrite a useful relationship",
      instruction: rewritesDivision
        ? "Undo the division with the matching multiplication so the relationship is easier to combine."
        : expands
        ? "Open the bracket and combine matching terms. The equivalent equation is shown below."
        : "Put the relationship into a clean linear form without changing its meaning.",
      operationLabel: rewritesDivision
        ? "Rewrite without division"
        : expands ? "Expand and combine like terms" : "Rewrite equivalently",
    };
  }
  if (operation === "SUBSTITUTION" || operation === "PROPAGATE_VALUE") {
    const replacementText = replacements.length
      ? replacements.map(({ before: symbol, after: value }) => `${symbol} = ${value}`).join(" and ")
      : `the value already found for ${targetSymbol}`;
    return {
      eyebrow: "SUBSTITUTE",
      title: "Use a value we already know",
      instruction: `Replace ${replacementText}. Keep every other term unchanged.`,
      operationLabel: replacements.length
        ? `Substitute ${replacements.map(({ before: symbol, after: value }) => `${symbol} = ${value}`).join(", ")}`
        : "Substitute the solved value",
    };
  }
  if (operation === "ADD_EQUATIONS" || operation === "SUBTRACT_EQUATIONS" || operation === "ELIMINATION") {
    const add = operation === "ADD_EQUATIONS";
    return {
      eyebrow: "ELIMINATE",
      title: "Combine the relationships",
      instruction: `${add ? "Add" : "Subtract"} the equations line by line. Matching opposite terms cancel, leaving a simpler relationship.`,
      operationLabel: add ? "Add the equations" : "Subtract the equations",
    };
  }
  if (operation === "COLLECT_TERMS") {
    return {
      eyebrow: "SIMPLIFY",
      title: "Combine like terms",
      instruction: "Add together the terms that contain the same letter.",
      operationLabel: "Collect like terms",
    };
  }
  if (operation === "MULTIPLY") {
    return {
      eyebrow: "SIMPLIFY",
      title: "Multiply through",
      instruction: "Apply the multiplication to every term shown.",
      operationLabel: "Multiply both sides",
    };
  }
  if (operation === "DIVIDE") {
    const divisor = step.division?.divisor;
    return {
      eyebrow: "ISOLATE THE VARIABLE",
      title: `Solve for ${targetSymbol}`,
      instruction: divisor
        ? `Divide both sides by ${divisor}. The division is exact.`
        : "Divide both sides by the coefficient of the variable.",
      operationLabel: divisor ? `Divide both sides by ${divisor}` : "Divide both sides",
    };
  }
  if (operation === "REARRANGE") {
    return {
      eyebrow: "REARRANGE",
      title: "Move matching terms",
      instruction: "Use the same inverse operation on both sides of the equation.",
      operationLabel: "Apply the inverse operation",
    };
  }
  return {
    eyebrow: "VALUE FOUND",
    title: `We found ${targetSymbol}`,
    instruction: before === after
      ? `${targetSymbol} is isolated, so its value is now known.`
      : `Read the isolated value for ${targetSymbol}.`,
    operationLabel: `Resolve ${targetSymbol}`,
  };
}

function presentationSteps(
  groups: readonly CanonicalGroup[],
  assignment: Readonly<VariableAssignment>,
): EquationExplanationStep[] {
  const solvedValues: VariableAssignment = {};
  const result: EquationExplanationStep[] = [];
  for (const group of groups) {
    const indices = [group.path.equationIndex, ...(group.path.supportingEquationIndices ?? [])];
    const knownValues = { ...solvedValues };
    group.steps.forEach(({ step, canonicalIndex }, position) => {
      if (step.operation === "PROPAGATE_VALUE") return;
      const supportingExpressions = (
        step.operation === "ADD_EQUATIONS" ||
        step.operation === "SUBTRACT_EQUATIONS" ||
        step.operation === "ELIMINATION"
      )
        ? step.expressionBefore.split(";").map((expression) => expression.trim()).filter(Boolean)
        : [];
      const expressionBefore = supportingExpressions[0] ?? step.expressionBefore;
      const expressionAfter = step.operation === "DIRECT_REWRITE"
        ? directRewriteAfter(group, position)
        : step.expressionAfter;
      if (
        step.operation === "DIRECT_REWRITE" &&
        expressionBefore === expressionAfter &&
        group.steps.length > 2
      ) return;
      const replacements = replacementsFor(expressionBefore, expressionAfter, knownValues);
      const resolvedVariable = step.resolvedVariable ?? null;
      if (resolvedVariable) solvedValues[resolvedVariable] = assignment[resolvedVariable];
      const copy = operationCopy(
        step.operation,
        group.path.targetSymbol,
        replacements,
        step,
        expressionBefore,
        expressionAfter,
      );
      const entry: EquationExplanationStep = {
        id: `${canonicalIndex}:${step.operation}:${group.path.targetSymbol}`,
        operation: step.operation,
        ...copy,
        activeEquationIndex: group.path.equationIndex,
        activeEquationIndices: indices,
        expressionBefore,
        supportingExpressions,
        expressionAfter,
        replacements,
        targetSymbol: group.path.targetSymbol,
        resolvedVariable,
        solvedValue: assignment[group.path.targetSymbol],
        knownValues,
        solvedValues: { ...solvedValues },
        canonicalStepIndices: [canonicalIndex],
        isFinal: false,
      };
      const previous = result.at(-1);
      if (
        previous &&
        previous.operation === entry.operation &&
        previous.expressionBefore === entry.expressionBefore &&
        previous.expressionAfter === entry.expressionAfter &&
        previous.targetSymbol === entry.targetSymbol
      ) {
        previous.canonicalStepIndices.push(canonicalIndex);
        previous.solvedValues = entry.solvedValues;
        previous.resolvedVariable ||= entry.resolvedVariable;
      } else {
        result.push(entry);
      }
    });
  }
  if (result.length) result[result.length - 1].isFinal = true;
  return result;
}

export function buildMathematicalEquationWalkthrough(
  data: EquationExplanationData,
  rawTrace: unknown,
  correctAnswer: unknown,
): EquationWalkthrough {
  const assignment = parseEquationAssignment(data, correctAnswer);
  const explanationTrace = parseEquationExplanationTrace(data, rawTrace);
  if (
    !assignment ||
    !equationAssignmentIsValid(data, assignment) ||
    !explanationTrace ||
    !sameAssignment(
      explanationTrace.solveTrace.resolvedAssignment,
      assignment,
      data.variables,
    )
  ) return fallback(data, assignment);
  const groups = canonicalGroups(
    explanationTrace.solveTrace,
    explanationTrace.solutionPath,
  );
  if (!groups) return fallback(data, assignment);
  const steps = presentationSteps(groups, assignment);
  if (
    !steps.length ||
    data.variables.some((symbol) =>
      !steps.some((step) => step.resolvedVariable === symbol && step.solvedValues[symbol] === assignment[symbol]))
  ) return fallback(data, assignment);
  return { valid: true, steps, fallbackMessage: null, assignment };
}

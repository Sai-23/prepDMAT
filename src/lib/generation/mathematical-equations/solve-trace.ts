import { renderMathematicalEquation } from "./presentation";
import type {
  EquationSolveTrace,
  EquationSolveTraceStep,
  MathematicalEquation,
  MathematicalEquationCandidate,
  MathematicalExpression,
  SolveTraceRangeFailureCode,
  SolveTraceRangeValidation,
  VariableAssignment,
} from "./types";

type Rational = { numerator: number; denominator: number };
type LinearForm = {
  coefficients: Map<string, Rational>;
  constant: Rational;
};
type IntegerRow = {
  coefficients: Map<string, number>;
  right: number;
  derivation: EquationSolveTraceStep[];
};

const ZERO: Rational = { numerator: 0, denominator: 1 };

function greatestCommonDivisor(first: number, second: number): number {
  let left = Math.abs(first);
  let right = Math.abs(second);
  while (right !== 0) [left, right] = [right, left % right];
  return left || 1;
}

function leastCommonMultiple(first: number, second: number): number {
  return Math.abs(first * second) / greatestCommonDivisor(first, second);
}

function rational(numerator: number, denominator = 1): Rational {
  if (denominator === 0) throw new Error("A solve trace cannot divide by zero.");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = greatestCommonDivisor(numerator, denominator);
  return {
    numerator: sign * numerator / divisor,
    denominator: Math.abs(denominator) / divisor,
  };
}

function add(first: Rational, second: Rational): Rational {
  return rational(
    first.numerator * second.denominator + second.numerator * first.denominator,
    first.denominator * second.denominator,
  );
}

function scale(value: Rational, multiplier: Rational): Rational {
  return rational(
    value.numerator * multiplier.numerator,
    value.denominator * multiplier.denominator,
  );
}

function combineForms(first: LinearForm, second: LinearForm, multiplier: Rational): LinearForm {
  const coefficients = new Map(first.coefficients);
  second.coefficients.forEach((value, symbol) => {
    coefficients.set(symbol, add(coefficients.get(symbol) ?? ZERO, scale(value, multiplier)));
  });
  return {
    coefficients,
    constant: add(first.constant, scale(second.constant, multiplier)),
  };
}

function linearize(expression: MathematicalExpression): LinearForm {
  if (expression.kind === "constant") {
    return { coefficients: new Map(), constant: rational(expression.value) };
  }
  if (expression.kind === "variable") {
    return { coefficients: new Map([[expression.symbol, rational(1)]]), constant: ZERO };
  }
  const left = linearize(expression.left);
  const right = linearize(expression.right);
  if (expression.operator === "add") return combineForms(left, right, rational(1));
  if (expression.operator === "subtract") return combineForms(left, right, rational(-1));
  if (expression.operator === "multiply") {
    if (expression.left.kind === "constant") return scaleForm(right, rational(expression.left.value));
    if (expression.right.kind === "constant") return scaleForm(left, rational(expression.right.value));
    throw new Error("Canonical solve traces support only linear constant multiplication.");
  }
  if (expression.right.kind !== "constant") {
    throw new Error("Canonical solve traces support only division by a constant.");
  }
  return scaleForm(left, rational(1, expression.right.value));
}

function scaleForm(form: LinearForm, multiplier: Rational): LinearForm {
  return {
    coefficients: new Map([...form.coefficients].map(([symbol, value]) => [symbol, scale(value, multiplier)])),
    constant: scale(form.constant, multiplier),
  };
}

function normalizeRow(row: IntegerRow): IntegerRow {
  const populated = [...row.coefficients].filter(([, coefficient]) => coefficient !== 0);
  const divisor = [...populated.map(([, coefficient]) => coefficient), row.right]
    .reduce((current, value) => greatestCommonDivisor(current, value), 0) || 1;
  const coefficients = new Map(populated.map(([symbol, coefficient]) => [symbol, coefficient / divisor]));
  let right = row.right / divisor;
  const firstCoefficient = [...coefficients].sort(([first], [second]) => first.localeCompare(second))[0]?.[1] ?? 1;
  const orientation = right < 0 || (right === 0 && firstCoefficient < 0) ? -1 : 1;
  if (orientation < 0) {
    coefficients.forEach((coefficient, symbol) => coefficients.set(symbol, -coefficient));
    right = -right;
  }
  return { coefficients, right, derivation: row.derivation };
}

function equationRow(equation: MathematicalEquation): IntegerRow {
  const difference = combineForms(linearize(equation.left), linearize(equation.right), rational(-1));
  const denominators = [
    difference.constant.denominator,
    ...[...difference.coefficients.values()].map((value) => value.denominator),
  ];
  const multiplier = denominators.reduce(leastCommonMultiple, 1);
  return normalizeRow({
    coefficients: new Map([...difference.coefficients].map(([symbol, value]) => [
      symbol,
      value.numerator * (multiplier / value.denominator),
    ])),
    right: -difference.constant.numerator * (multiplier / difference.constant.denominator),
    derivation: [{
      operation: "DIRECT_REWRITE",
      expressionBefore: renderMathematicalEquation(equation),
      expressionAfter: "Convert the relationship to an equivalent integer linear equation.",
      evaluatedNumbers: [],
      algebraicCancellation: true,
    }],
  });
}

function formatTerm(symbol: string, coefficient: number, first: boolean): string {
  const magnitude = Math.abs(coefficient);
  const term = `${magnitude === 1 ? "" : magnitude}${symbol}`;
  if (first) return coefficient < 0 ? `-${term}` : term;
  return `${coefficient < 0 ? " - " : " + "}${term}`;
}

function formatRow(row: IntegerRow): string {
  const terms = [...row.coefficients]
    .filter(([, coefficient]) => coefficient !== 0)
    .sort(([first], [second]) => first.localeCompare(second));
  return `${terms.map(([symbol, coefficient], index) => formatTerm(symbol, coefficient, index === 0)).join("") || "0"} = ${row.right}`;
}

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length <= 1) return [[...values]];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [value, ...rest]),
  );
}

function traceMaximum(steps: readonly EquationSolveTraceStep[]): number {
  return Math.max(0, ...steps.flatMap((step) => step.evaluatedNumbers.map(Math.abs)));
}

function substituteKnownValues(
  row: IntegerRow,
  known: Readonly<VariableAssignment>,
): IntegerRow {
  const substitutable = [...row.coefficients]
    .filter(([symbol, coefficient]) => coefficient !== 0 && Object.hasOwn(known, symbol));
  if (substitutable.length === 0) return row;

  const candidates = permutations(substitutable).map((order) => {
    const coefficients = new Map(row.coefficients);
    let right = row.right;
    const steps = [...row.derivation];
    for (const [symbol, coefficient] of order) {
      const value = known[symbol];
      const product = Math.abs(coefficient * value);
      const before = formatRow({ coefficients, right, derivation: [] });
      right -= coefficient * value;
      coefficients.delete(symbol);
      steps.push({
        operation: "SUBSTITUTION",
        expressionBefore: before,
        expressionAfter: formatRow(normalizeRow({ coefficients, right, derivation: [] })),
        evaluatedNumbers: [product, Math.abs(right)].filter((number) => number !== 0),
      });
    }
    return normalizeRow({ coefficients, right, derivation: steps });
  });
  return candidates.sort((first, second) =>
    traceMaximum(first.derivation) - traceMaximum(second.derivation) ||
    first.derivation.length - second.derivation.length,
  )[0];
}

function betterRow(first: IntegerRow, second: IntegerRow): IntegerRow {
  const firstMaximum = traceMaximum(first.derivation);
  const secondMaximum = traceMaximum(second.derivation);
  if (firstMaximum !== secondMaximum) return firstMaximum < secondMaximum ? first : second;
  return first.derivation.length <= second.derivation.length ? first : second;
}

function combineRows(first: IntegerRow, second: IntegerRow, symbol: string): IntegerRow | null {
  const firstCoefficient = first.coefficients.get(symbol) ?? 0;
  const secondCoefficient = second.coefficients.get(symbol) ?? 0;
  if (firstCoefficient === 0 || secondCoefficient === 0) return null;
  const divisor = greatestCommonDivisor(firstCoefficient, secondCoefficient);
  let firstMultiplier = Math.abs(secondCoefficient / divisor);
  let secondMultiplier = -Math.sign(firstCoefficient * secondCoefficient) * Math.abs(firstCoefficient / divisor);
  let right = first.right * firstMultiplier + second.right * secondMultiplier;
  if (right < 0) {
    firstMultiplier *= -1;
    secondMultiplier *= -1;
    right *= -1;
  }
  const coefficients = new Map<string, number>();
  new Set([...first.coefficients.keys(), ...second.coefficients.keys()]).forEach((variable) => {
    const coefficient = (first.coefficients.get(variable) ?? 0) * firstMultiplier +
      (second.coefficients.get(variable) ?? 0) * secondMultiplier;
    if (coefficient !== 0) coefficients.set(variable, coefficient);
  });
  if (coefficients.size === 0) return null;
  const firstProduct = Math.abs(first.right * firstMultiplier);
  const secondProduct = Math.abs(second.right * secondMultiplier);
  const operation = firstProduct === 0 || secondProduct === 0 || secondMultiplier > 0
    ? "ADD_EQUATIONS"
    : "SUBTRACT_EQUATIONS";
  const raw: IntegerRow = { coefficients, right, derivation: [] };
  const normalized = normalizeRow(raw);
  const evaluatedNumbers = [firstProduct, secondProduct, Math.abs(right)]
    .filter((number) => number !== 0);
  const steps = [
    ...first.derivation,
    ...second.derivation,
    {
      operation,
      expressionBefore: `${formatRow(first)}; ${formatRow(second)}`,
      expressionAfter: formatRow(normalized),
      evaluatedNumbers,
      algebraicCancellation: true,
    } satisfies EquationSolveTraceStep,
  ];
  return { ...normalized, derivation: steps };
}

function deriveTargetRow(
  equations: readonly MathematicalEquation[],
  targetSymbol: string,
  known: Readonly<VariableAssignment>,
): IntegerRow {
  const initial = equations.map((equation) => substituteKnownValues(equationRow(equation), known));
  const nonTargetSymbols = [...new Set(initial.flatMap((row) => [...row.coefficients.keys()]))]
    .filter((symbol) => symbol !== targetSymbol);
  let bestTarget: IntegerRow | null = null;

  const inspect = (rows: readonly IntegerRow[]) => {
    rows.filter((row) => {
      const remaining = [...row.coefficients].filter(([, coefficient]) => coefficient !== 0);
      return remaining.length === 1 && remaining[0][0] === targetSymbol;
    }).forEach((row) => {
      bestTarget = bestTarget ? betterRow(bestTarget, row) : row;
    });
  };

  const eliminate = (
    rows: readonly IntegerRow[],
    symbolOrder: readonly string[],
    symbolIndex: number,
  ): void => {
    inspect(rows);
    if (symbolIndex === symbolOrder.length) return;
    const symbol = symbolOrder[symbolIndex];
    const pivotIndices = rows.flatMap((row, index) =>
      (row.coefficients.get(symbol) ?? 0) !== 0 ? [index] : [],
    );
    if (pivotIndices.length < 2) {
      eliminate(rows, symbolOrder, symbolIndex + 1);
      return;
    }
    for (const pivotIndex of pivotIndices) {
      const pivot = rows[pivotIndex];
      const nextRows: IntegerRow[] = [];
      let failed = false;
      rows.forEach((row, rowIndex) => {
        if (failed || rowIndex === pivotIndex || (row.coefficients.get(symbol) ?? 0) === 0) {
          nextRows.push(row);
          return;
        }
        const combined = combineRows(row, pivot, symbol);
        if (!combined || traceMaximum(combined.derivation) > 400) {
          failed = true;
          return;
        }
        nextRows.push(combined);
      });
      if (!failed) eliminate(nextRows, symbolOrder, symbolIndex + 1);
    }
  };

  for (const order of permutations(nonTargetSymbols)) eliminate(initial, order, 0);
  if (!bestTarget) throw new Error(`Unable to derive ${targetSymbol} from the declared canonical step.`);
  return bestTarget;
}

function resolveTarget(row: IntegerRow, targetSymbol: string): EquationSolveTraceStep {
  let coefficient = row.coefficients.get(targetSymbol) ?? 0;
  let right = row.right;
  if (coefficient < 0) {
    coefficient *= -1;
    right *= -1;
  }
  const quotient = coefficient === 0 ? Number.NaN : right / coefficient;
  return {
    operation: coefficient === 1 ? "RESOLVE_VARIABLE" : "DIVIDE",
    expressionBefore: formatRow(row),
    expressionAfter: `${targetSymbol} = ${quotient}`,
    evaluatedNumbers: [Math.abs(right), quotient].filter((number) => number !== 0),
    resolvedVariable: targetSymbol,
    ...(coefficient === 1
      ? {}
      : {
          division: {
            dividend: right,
            divisor: coefficient,
            quotient,
            exact: Number.isInteger(quotient),
          },
        }),
  };
}

export function buildCanonicalSolveTrace(
  candidate: {
    structuredData: { equations: readonly MathematicalEquation[] };
    solutionPath: MathematicalEquationCandidate["solutionPath"];
  },
  assignment: Readonly<VariableAssignment>,
): EquationSolveTrace {
  const known: VariableAssignment = {};
  const steps: EquationSolveTraceStep[] = [];
  for (const solutionStep of candidate.solutionPath) {
    const indices = [solutionStep.equationIndex, ...(solutionStep.supportingEquationIndices ?? [])];
    const equations = indices.map((index) => candidate.structuredData.equations[index]).filter(Boolean);
    if (equations.length !== indices.length) throw new Error("A canonical step references a missing equation.");
    const row = deriveTargetRow(equations, solutionStep.targetSymbol, known);
    const resolve = resolveTarget(row, solutionStep.targetSymbol);
    steps.push(...row.derivation, resolve, {
      operation: "PROPAGATE_VALUE",
      expressionBefore: resolve.expressionAfter,
      expressionAfter: `Use ${solutionStep.targetSymbol} = ${assignment[solutionStep.targetSymbol]} in later relationships.`,
      evaluatedNumbers: [assignment[solutionStep.targetSymbol]],
      resolvedVariable: solutionStep.targetSymbol,
    });
    known[solutionStep.targetSymbol] = assignment[solutionStep.targetSymbol];
  }
  const numbers = steps.flatMap((step) => step.evaluatedNumbers);
  return {
    steps,
    resolvedAssignment: known,
    maximumEvaluatedIntermediate: Math.max(0, ...numbers),
    minimumEvaluatedIntermediate: numbers.length ? Math.min(...numbers) : 0,
    hasNegativeIntermediate: numbers.some((number) => number < 0),
    hasFractionalIntermediate: numbers.some((number) => !Number.isInteger(number)) ||
      steps.some((step) => step.division && !step.division.exact),
  };
}

export function validateSolveTraceRange(
  trace: EquationSolveTrace,
  domain: { minimum: number; maximum: number },
): SolveTraceRangeValidation {
  const failures: Array<{ code: SolveTraceRangeFailureCode; value: number; stepIndex: number }> = [];
  trace.steps.forEach((step, stepIndex) => {
    step.evaluatedNumbers.forEach((value) => {
      if (!Number.isInteger(value)) failures.push({ code: "NON_INTEGER_INTERMEDIATE", value, stepIndex });
      if (value < 0) failures.push({ code: "NEGATIVE_INTERMEDIATE", value, stepIndex });
      if (value === 0 && !step.algebraicCancellation) {
        failures.push({ code: "INTERMEDIATE_BELOW_MIN", value, stepIndex });
      } else if (value > 0 && value < domain.minimum) {
        failures.push({ code: "INTERMEDIATE_BELOW_MIN", value, stepIndex });
      }
      if (value > domain.maximum) failures.push({ code: "INTERMEDIATE_ABOVE_MAX", value, stepIndex });
    });
    if (step.division && !step.division.exact) {
      failures.push({ code: "NON_EXACT_DIVISION", value: step.division.quotient, stepIndex });
    }
  });
  const unique = [...new Map(failures.map((failure) => [
    `${failure.code}:${failure.value}:${failure.stepIndex}`,
    failure,
  ])).values()];
  return unique.length === 0
    ? {
        valid: true,
        failures: [],
        maximum: trace.maximumEvaluatedIntermediate,
        minimum: trace.minimumEvaluatedIntermediate,
      }
    : {
        valid: false,
        failures: unique,
        maximum: trace.maximumEvaluatedIntermediate,
        minimum: trace.minimumEvaluatedIntermediate,
      };
}

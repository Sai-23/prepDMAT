import { canonicalize, createFingerprint } from "../fingerprint";
import type { StructuralProfile } from "../novelty";
import type {
  EquationRelationshipPrimitive,
  MathematicalEquationCandidate,
  MathematicalExpression,
} from "./types";

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length <= 1) return [[...values]];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [value, ...rest]),
  );
}

function normalizeExpression(
  expression: MathematicalExpression,
  symbols: ReadonlyMap<string, string>,
  includeConstants = true,
): unknown {
  if (expression.kind === "constant") return ["constant", includeConstants ? expression.value : "K"];
  if (expression.kind === "variable") return ["variable", symbols.get(expression.symbol)];
  const operands = [
    normalizeExpression(expression.left, symbols, includeConstants),
    normalizeExpression(expression.right, symbols, includeConstants),
  ];
  if (expression.operator === "add" || expression.operator === "multiply") {
    operands.sort((a, b) => canonicalize(a as never).localeCompare(canonicalize(b as never)));
  }
  return [expression.operator, ...operands];
}

type LinearForm = { coefficients: Map<string, number>; constant: number; valid: boolean };

function combine(first: LinearForm, second: LinearForm, multiplier: number): LinearForm {
  const coefficients = new Map(first.coefficients);
  second.coefficients.forEach((value, symbol) =>
    coefficients.set(symbol, (coefficients.get(symbol) ?? 0) + multiplier * value),
  );
  return {
    coefficients,
    constant: first.constant + multiplier * second.constant,
    valid: first.valid && second.valid,
  };
}

function scale(form: LinearForm, multiplier: number): LinearForm {
  return {
    coefficients: new Map([...form.coefficients].map(([symbol, value]) => [symbol, value * multiplier])),
    constant: form.constant * multiplier,
    valid: form.valid && Number.isFinite(multiplier),
  };
}

function linearize(expression: MathematicalExpression): LinearForm {
  if (expression.kind === "constant") return { coefficients: new Map(), constant: expression.value, valid: true };
  if (expression.kind === "variable") return { coefficients: new Map([[expression.symbol, 1]]), constant: 0, valid: true };
  const left = linearize(expression.left);
  const right = linearize(expression.right);
  if (expression.operator === "add") return combine(left, right, 1);
  if (expression.operator === "subtract") return combine(left, right, -1);
  if (expression.operator === "multiply") {
    if (expression.left.kind === "constant") return scale(right, expression.left.value);
    if (expression.right.kind === "constant") return scale(left, expression.right.value);
    return { coefficients: new Map(), constant: 0, valid: false };
  }
  if (expression.right.kind !== "constant" || expression.right.value === 0) {
    return { coefficients: new Map(), constant: 0, valid: false };
  }
  return scale(left, 1 / expression.right.value);
}

function coefficientClass(value: number): string {
  const magnitude = Math.abs(value);
  return `${value < 0 ? "negative" : "positive"}:${Math.abs(magnitude - 1) < 1e-9 ? "unit" : "scaled"}`;
}

function normalizedLinearEquation(
  equation: MathematicalEquationCandidate["structuredData"]["equations"][number],
  symbols: ReadonlyMap<string, string>,
): unknown {
  const form = combine(linearize(equation.left), linearize(equation.right), -1);
  if (!form.valid) {
    const sides = [
      normalizeExpression(equation.left, symbols, false),
      normalizeExpression(equation.right, symbols, false),
    ].sort((first, second) => canonicalize(first as never).localeCompare(canonicalize(second as never)));
    return { nonlinearFallback: sides };
  }
  const rawTerms = [...form.coefficients]
    .filter(([, value]) => Math.abs(value) > 1e-9)
    .map(([symbol, value]) => ({ symbol: symbols.get(symbol) ?? symbol, value }))
    .sort((first, second) => first.symbol.localeCompare(second.symbol));
  const firstNonZero = rawTerms[0]?.value ?? form.constant;
  const orientation = firstNonZero < 0 ? -1 : 1;
  return {
    terms: rawTerms.map((term) => [term.symbol, coefficientClass(term.value * orientation)]),
    constant: Math.abs(form.constant) < 1e-9
      ? "none"
      : form.constant * orientation < 0 ? "negative" : "positive",
  };
}

export function mathematicalEquationSemanticValue(
  candidate: MathematicalEquationCandidate,
): { domain: MathematicalEquationCandidate["structuredData"]["domain"]; equations: unknown[] } {
  const variants = permutations(candidate.structuredData.variables).map((order) => {
    const symbols = new Map(order.map((symbol, index) => [symbol, `V${index}`]));
    const equations = candidate.structuredData.equations.map((equation) => {
      const sides = [
        normalizeExpression(equation.left, symbols),
        normalizeExpression(equation.right, symbols),
      ].sort((a, b) => canonicalize(a as never).localeCompare(canonicalize(b as never)));
      return sides;
    });
    equations.sort((a, b) => canonicalize(a as never).localeCompare(canonicalize(b as never)));
    return equations;
  });
  variants.sort((a, b) => canonicalize(a as never).localeCompare(canonicalize(b as never)));
  return { domain: candidate.structuredData.domain, equations: variants[0] };
}

export function mathematicalEquationStructuralValue(candidate: MathematicalEquationCandidate): unknown {
  const variants = permutations(candidate.structuredData.variables).map((order) => {
    const symbols = new Map(order.map((symbol, index) => [symbol, `V${index}`]));
    const normalizedByIndex = candidate.structuredData.equations.map((equation) =>
      normalizedLinearEquation(equation, symbols),
    );
    const equations = [...normalizedByIndex]
      .sort((first, second) => canonicalize(first as never).localeCompare(canonicalize(second as never)));
    const dependencyGraph = candidate.structuredData.dependencyModel.edges
      .map((edge) => [symbols.get(edge.source), symbols.get(edge.target)])
      .sort((first, second) => canonicalize(first as never).localeCompare(canonicalize(second as never)));
    const solvePath = candidate.solutionPath.map((step) => ({
      target: symbols.get(step.targetSymbol),
      dependencies: (step.dependencySymbols ?? []).map((symbol) => symbols.get(symbol)).sort(),
      reasoning: step.reasoning ?? "solve_variable",
      equations: [step.equationIndex, ...(step.supportingEquationIndices ?? [])]
        .map((index) => normalizedByIndex[index])
        .filter(Boolean)
        .sort((first, second) => canonicalize(first as never).localeCompare(canonicalize(second as never))),
    }));
    return {
      version: 3,
      rootStrategy: candidate.structuredData.dependencyModel.rootStrategy ?? "unknown",
      target: symbols.get(candidate.structuredData.dependencyModel.targetSymbol ?? ""),
      equations,
      dependencyGraph,
      solvePath,
    };
  });
  variants.sort((first, second) => canonicalize(first as never).localeCompare(canonicalize(second as never)));
  return variants[0];
}

export function mathematicalEquationStructuralSignature(candidate: MathematicalEquationCandidate): string {
  return createFingerprint("mathematical-equation-structure-v3", mathematicalEquationStructuralValue(candidate) as never);
}

export function fingerprintMathematicalEquation(candidate: MathematicalEquationCandidate): string {
  return createFingerprint("mathematical-equation", mathematicalEquationSemanticValue(candidate) as never);
}

function relationshipClass(relationship: EquationRelationshipPrimitive): string {
  if (relationship === "offset_add" || relationship === "offset_subtract" || relationship === "difference") {
    return "offset_difference";
  }
  if (relationship === "scale" || relationship === "divide_by_constant") return "scale_divide";
  if (relationship === "scale_offset_add" || relationship === "scale_offset_subtract") return "scale_offset";
  if (relationship === "sum" || relationship === "complement" || relationship === "reverse_difference") return "sum_complement";
  if (relationship === "multi_variable_balance" || relationship === "three_variable_difference") return "multi_variable_balance";
  if (relationship === "mixed_three_variable") return "weighted_sum";
  return relationship;
}

function graphMetrics(candidate: MathematicalEquationCandidate): {
  dependencyDepth: number;
  branchCount: number;
  recombinationCount: number;
  targetDepth: number;
} {
  const depth = new Map(candidate.structuredData.variables.map((symbol) => [symbol, 0]));
  const outgoing = new Map(candidate.structuredData.variables.map((symbol) => [symbol, 0]));
  let recombinationCount = 0;
  candidate.solutionPath.forEach((step) => {
    const dependencies = step.dependencySymbols ?? [];
    const nextDepth = dependencies.length
      ? Math.max(...dependencies.map((symbol) => depth.get(symbol) ?? 0)) + 1
      : 0;
    depth.set(step.targetSymbol, nextDepth);
    if (dependencies.length >= 2) recombinationCount += 1;
    dependencies.forEach((symbol) => outgoing.set(symbol, (outgoing.get(symbol) ?? 0) + 1));
  });
  return {
    dependencyDepth: Math.max(0, ...depth.values()),
    branchCount: [...outgoing.values()].filter((count) => count >= 2).length,
    recombinationCount,
    targetDepth: depth.get(candidate.structuredData.dependencyModel.targetSymbol ?? "") ?? 0,
  };
}

function equationTermCounts(candidate: MathematicalEquationCandidate): string[] {
  const countVariables = (expression: MathematicalExpression): number => {
    if (expression.kind === "constant") return 0;
    if (expression.kind === "variable") return 1;
    return countVariables(expression.left) + countVariables(expression.right);
  };
  return candidate.structuredData.equations.map((equation) =>
    String(countVariables(equation.left) + countVariables(equation.right)),
  ).sort();
}

function equationShapeClasses(candidate: MathematicalEquationCandidate): string[] {
  return candidate.structuredData.equations.map((equation) => {
    const form = combine(linearize(equation.left), linearize(equation.right), -1);
    if (!form.valid) return "nonlinear";
    const positive = [...form.coefficients.values()].map(coefficientClass).sort();
    const negative = [...form.coefficients.values()].map((value) => coefficientClass(-value)).sort();
    const first = `${positive.join(",")}|constant:${form.constant === 0 ? "none" : form.constant < 0 ? "negative" : "positive"}`;
    const second = `${negative.join(",")}|constant:${form.constant === 0 ? "none" : form.constant > 0 ? "negative" : "positive"}`;
    return first.localeCompare(second) <= 0 ? first : second;
  }).sort();
}

function operators(candidate: MathematicalEquationCandidate): Set<string> {
  const result = new Set<string>();
  const visit = (expression: MathematicalExpression): void => {
    if (expression.kind !== "operation") return;
    result.add(expression.operator);
    visit(expression.left);
    visit(expression.right);
  };
  candidate.structuredData.equations.forEach((equation) => {
    visit(equation.left);
    visit(equation.right);
  });
  return result;
}

export const MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS = {
  graph: 0,
  graphShape: 6,
  relationships: 5,
  variableCount: 2,
  equationCount: 2,
  dependencyDepth: 3,
  substitutionDepth: 2,
  branchCount: 3,
  recombinationCount: 3,
  constraintType: 3,
  targetDepth: 2,
  termCounts: 2,
  rootStrategy: 3,
  stepRoles: 4,
  equationShapes: 3,
  reasoningModes: 2,
  operatorVariety: 1,
  directEntryPointCount: 1,
} as const;

export function mathematicalEquationStructuralProfile(candidate: MathematicalEquationCandidate): StructuralProfile {
  const graph = graphMetrics(candidate);
  const relationships = (candidate.structuredData.dependencyModel.relationshipPrimitives ?? [])
    .map(relationshipClass)
    .sort();
  const constraintType = relationships.find((relationship) =>
    relationship === "multi_variable_sum" || relationship === "multi_variable_balance" || relationship === "weighted_sum",
  ) ?? relationships.at(-1) ?? "unknown";
  const depths = new Map<string, number>();
  const relationshipPrimitives = candidate.structuredData.dependencyModel.relationshipPrimitives ?? [];
  const stepRoles = candidate.solutionPath.map((step, index) => {
    const dependencies = step.dependencySymbols ?? [];
    const depth = dependencies.length
      ? Math.max(...dependencies.map((symbol) => depths.get(symbol) ?? 0)) + 1
      : 0;
    depths.set(step.targetSymbol, depth);
    const relationship = relationshipPrimitives[step.equationIndex];
    return `step${index}:depth${depth}:parents${dependencies.length}:support${step.supportingEquationIndices?.length ?? 0}:${step.reasoning ?? "solve_variable"}:${relationship ? relationshipClass(relationship) : "unknown"}`;
  });
  return {
    namespace: "mathematical_equation",
    features: {
      fingerprintVersion: "v3",
      variableCount: candidate.structuredData.variables.length,
      equationCount: candidate.structuredData.equations.length,
      graph: candidate.structuredData.dependencyModel.family,
      graphShape: `depth-${graph.dependencyDepth}/branches-${graph.branchCount}/recombine-${graph.recombinationCount}`,
      relationships,
      dependencyDepth: graph.dependencyDepth,
      substitutionDepth: Math.max(0, ...candidate.solutionPath.map((step) => step.knownSymbols.length)),
      branchCount: graph.branchCount,
      recombinationCount: graph.recombinationCount,
      constraintType,
      targetDepth: graph.targetDepth,
      termCounts: equationTermCounts(candidate),
      rootStrategy: candidate.structuredData.dependencyModel.rootStrategy ?? "unknown",
      stepRoles,
      equationShapes: equationShapeClasses(candidate),
      reasoningModes: candidate.solutionPath.map((step) => step.reasoning ?? "solve_variable"),
      operatorVariety: operators(candidate).size,
      directEntryPointCount: candidate.structuredData.equations.filter((equation) => {
        const form = combine(linearize(equation.left), linearize(equation.right), -1);
        return [...form.coefficients.values()].filter((value) => Math.abs(value) > 1e-9).length === 1;
      }).length,
    },
  };
}

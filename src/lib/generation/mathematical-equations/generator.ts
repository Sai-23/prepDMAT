import { canonicalize } from "../fingerprint";
import { SeededRandom } from "../random";
import type { QuestionGenerator } from "../types";
import {
  EQUATION_GRAPH_REGISTRY,
  EQUATION_RELATIONSHIP_REGISTRY,
  type GraphDefinition,
} from "./taxonomy";
import { renderMathematicalEquation } from "./presentation";
import {
  inspectEquationPresentation,
  MATHEMATICAL_EQUATION_STYLE_POLICY,
} from "./style";
import {
  MATHEMATICAL_EQUATION_DOMAIN,
  MATHEMATICAL_EQUATION_GENERATOR_VERSION,
  type EquationEvidenceLevel,
  type EquationOperator,
  type EquationRelationshipPrimitive,
  type EquationSolutionStep,
  type EquationStructuralFamily,
  type MathematicalEquation,
  type MathematicalEquationCandidate,
  type MathematicalEquationGenerationConfiguration,
  type MathematicalExpression,
  type VariableAssignment,
} from "./types";

const ESTIMATED_SECONDS = { easy: 18, medium: 38, hard: 60 } as const;
const SYMBOLS = ["A", "B", "C", "D"] as const;
const COEFFICIENTS = [2, 3, 4, 5] as const;
const STRICT_VISIBLE_MAX = MATHEMATICAL_EQUATION_STYLE_POLICY.hardVisibleConstantMax;

type Difficulty = MathematicalEquationGenerationConfiguration["difficulty"];
type BuiltEquation = {
  equation: MathematicalEquation;
  symbols: string[];
  relationship: EquationRelationshipPrimitive;
  coefficients: Readonly<Record<string, number>>;
};

type BuiltModel = {
  family: EquationStructuralFamily;
  evidenceLevel: EquationEvidenceLevel;
  rootStrategy: GraphDefinition["rootStrategy"];
  variables: string[];
  values: VariableAssignment;
  equations: MathematicalEquation[];
  relationships: EquationRelationshipPrimitive[];
  steps: EquationSolutionStep[];
  reasoningPath: string[];
  hiddenGroupingCount: number;
  relationshipReversalCount: number;
  meaningfulReasoningSteps: number;
  targetSymbol: string;
};

type PlannedRelationship = {
  relationship: EquationRelationshipPrimitive;
  coefficient?: (typeof COEFFICIENTS)[number];
};

type RelationshipPlan = {
  rootStrategy: GraphDefinition["rootStrategy"];
  coupledRoots: readonly [PlannedRelationship, PlannedRelationship] | null;
  derived: ReadonlyMap<number, PlannedRelationship>;
  global: PlannedRelationship | null;
};

const UNARY_RELATIONSHIP_WEIGHTS = [
  ["offset_add", 9],
  ["offset_subtract", 9],
  ["scale", 6],
  ["divide_by_constant", 6],
  ["sum", 9],
  ["difference", 9],
  ["complement", 9],
  ["weighted_sum", 7],
] as const satisfies readonly (readonly [EquationRelationshipPrimitive, number])[];

const MULTI_RELATIONSHIP_WEIGHTS = [
  ["multi_variable_sum", 4],
  ["multi_variable_balance", 12],
  ["weighted_sum", 7],
] as const satisfies readonly (readonly [EquationRelationshipPrimitive, number])[];

const COEFFICIENT_WEIGHTS = [
  [2, 4],
  [3, 3],
  [4, 2],
  [5, 2],
] as const;
const WEIGHTED_PAIR_COEFFICIENTS = [
  [2, 1], [1, 2], [3, 1], [1, 3], [2, 3], [3, 2],
  [4, 1], [1, 4], [5, 1], [1, 5], [2, 4], [4, 2], [2, 5], [5, 2],
] as const;

const constant = (value: number): MathematicalExpression => ({ kind: "constant", value });
const variable = (symbol: string): MathematicalExpression => ({ kind: "variable", symbol });
const operation = (
  operator: EquationOperator,
  left: MathematicalExpression,
  right: MathematicalExpression,
): MathematicalExpression => ({ kind: "operation", operator, left, right });

function createRandom(
  configuration: MathematicalEquationGenerationConfiguration,
  attempt: number,
): SeededRandom {
  if (!configuration.seed.trim()) throw new Error("A non-empty mathematical-equation seed is required.");
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new RangeError("Generation attempt must be a positive safe integer.");
  }
  return new SeededRandom(
    `${MATHEMATICAL_EQUATION_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${canonicalize(configuration.options ?? {})}\u001f${attempt}`,
  );
}

function graphFor(configuration: MathematicalEquationGenerationConfiguration): GraphDefinition {
  const eligible = EQUATION_GRAPH_REGISTRY.filter((definition) =>
    definition.productionEnabled && definition.difficulties.includes(configuration.difficulty),
  );
  const selector = new SeededRandom(
    `${MATHEMATICAL_EQUATION_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001fgraph`,
  );
  if (configuration.difficulty === "hard") {
    const recombiningFamilies = new Set<EquationStructuralFamily>([
      "branch_recombine",
      "merged",
      "mixed",
    ]);
    return weightedPick(
      eligible.map((definition) => [
        definition,
        recombiningFamilies.has(definition.id) ? 4 : 3,
      ] as const),
      selector,
    );
  }
  return eligible[selector.integer(0, eligible.length - 1)];
}

function parentsFor(family: EquationStructuralFamily, count: number): number[][] {
  if (family === "direct") return [[], [0]];
  if (family === "chain" || family === "reverse_chain" || family === "cascade") {
    return Array.from({ length: count }, (_, index) => index === 0 ? [] : [index - 1]);
  }
  if (family === "star") return Array.from({ length: count }, (_, index) => index === 0 ? [] : [0]);
  if (family === "triangle") return [[], [], [0, 1]];
  if (family === "branch") {
    return count === 3 ? [[], [0], [0]] : [[], [0], [0], [2]];
  }
  if (family === "branch_recombine" || family === "mixed") return [[], [0], [0], [1, 2]];
  if (family === "merged") return count === 3 ? [[], [], [0, 1]] : [[], [], [0, 1], [2]];
  return Array.from({ length: count }, (_, index) => index === 0 ? [] : [index - 1]);
}

function weightedPick<T>(
  values: readonly (readonly [T, number])[],
  random: SeededRandom,
): T {
  const total = values.reduce((sum, [, weight]) => sum + weight, 0);
  let selection = random.integer(1, total);
  for (const [value, weight] of values) {
    selection -= weight;
    if (selection <= 0) return value;
  }
  return values.at(-1)![0];
}

function rankBiasedSample<T>(
  ranked: readonly T[],
  count: number,
  random: SeededRandom,
): T[] {
  const remaining = [...ranked];
  const selected: T[] = [];
  while (remaining.length > 0 && selected.length < count) {
    const picked = weightedPick(
      remaining.map((item, index) => [item, (remaining.length - index) ** 2] as const),
      random.fork(`rank-${selected.length}`),
    );
    selected.push(picked);
    remaining.splice(remaining.indexOf(picked), 1);
  }
  return selected;
}

function plannedRelationship(
  parentCount: number,
  random: SeededRandom,
): PlannedRelationship {
  const relationship = weightedPick(
    parentCount === 1 ? UNARY_RELATIONSHIP_WEIGHTS : MULTI_RELATIONSHIP_WEIGHTS,
    random,
  );
  const coefficient = relationship === "scale" || relationship === "divide_by_constant" ||
    (relationship === "weighted_sum" && parentCount > 1)
    ? weightedPick(COEFFICIENT_WEIGHTS, random)
    : undefined;
  return { relationship, ...(coefficient ? { coefficient } : {}) };
}

function relationshipPlan(
  rootStrategy: GraphDefinition["rootStrategy"],
  variables: readonly string[],
  parents: readonly (readonly number[])[],
  random: SeededRandom,
): RelationshipPlan {
  const coupledRoots = rootStrategy === "coupled"
    ? [plannedRelationship(1, random.fork("coupled-0")), plannedRelationship(1, random.fork("coupled-1"))] as const
    : null;
  const derived = new Map<number, PlannedRelationship>();
  const startingIndex = rootStrategy === "coupled" ? 2 : 1;
  for (let index = startingIndex; index < variables.length; index += 1) {
    if (rootStrategy === "direct" && parents[index].length === 0) continue;
    derived.set(index, plannedRelationship(parents[index].length, random.fork(`derived-${index}`)));
  }
  const global = rootStrategy === "global_balance"
    ? plannedRelationship(variables.length - 1, random.fork("global"))
    : null;
  return { rootStrategy, coupledRoots, derived, global };
}

function plannedCoefficientMatches(
  candidate: BuiltEquation,
  planned: PlannedRelationship,
  target: string,
  parents: readonly string[],
): boolean {
  if (candidate.relationship !== planned.relationship) return false;
  if (!planned.coefficient) return true;
  if (planned.relationship === "scale") {
    return parents.length === 1 && candidate.coefficients[parents[0]] === planned.coefficient;
  }
  if (planned.relationship === "divide_by_constant") {
    return Math.abs(candidate.coefficients[target] ?? 0) === planned.coefficient;
  }
  if (planned.relationship === "weighted_sum" && parents.length > 1) {
    return candidate.coefficients[target] === planned.coefficient;
  }
  return true;
}

function relationshipPossible(
  planned: PlannedRelationship,
  target: string,
  parents: readonly string[],
  values: Readonly<VariableAssignment>,
): boolean {
  const targetValue = values[target];
  const parentValues = parents.map((parent) => values[parent]);
  if (targetValue === undefined || parentValues.some((value) => value === undefined)) return true;
  if (planned.relationship === "direct_value") return true;
  if (parents.length === 1) {
    const parentValue = parentValues[0];
    if (planned.relationship === "offset_add") return targetValue > parentValue;
    if (planned.relationship === "offset_subtract") return parentValue > targetValue;
    if (planned.relationship === "scale") return targetValue === parentValue * (planned.coefficient ?? 2);
    if (planned.relationship === "divide_by_constant") return parentValue === targetValue * (planned.coefficient ?? 2);
    if (planned.relationship === "difference") return targetValue !== parentValue;
    if (planned.relationship === "sum" || planned.relationship === "complement") {
      return targetValue + parentValue <= STRICT_VISIBLE_MAX;
    }
    if (planned.relationship === "weighted_sum") {
      return WEIGHTED_PAIR_COEFFICIENTS.some(
        ([parentCoefficient, targetCoefficient]) =>
          parentCoefficient * parentValue + targetCoefficient * targetValue <= STRICT_VISIBLE_MAX,
      );
    }
    return false;
  }

  const allValues = [targetValue, ...parentValues];
  if (planned.relationship === "multi_variable_sum") {
    return allValues.reduce((sum, value) => sum + value, 0) <= STRICT_VISIBLE_MAX;
  }
  if (planned.relationship === "weighted_sum") {
    return (planned.coefficient ?? 2) * targetValue + parentValues.reduce((sum, value) => sum + value, 0) <= STRICT_VISIBLE_MAX;
  }
  if (planned.relationship === "multi_variable_balance") {
    return [
      [1, -1, 1, -1], [1, 1, -1, 1], [1, -1, -1, 1],
      [1, 1, 1, -1], [1, -1, 1, 1], [1, 1, -1, -1],
    ].some((pattern) => {
      const total = allValues.reduce((sum, value, index) => sum + value * (pattern[index] ?? 1), 0);
      return total >= 1 && total <= STRICT_VISIBLE_MAX;
    });
  }
  return false;
}

function planConstraints(
  plan: RelationshipPlan,
  variables: readonly string[],
  parents: readonly (readonly number[])[],
): Array<{ target: string; parents: string[]; planned: PlannedRelationship }> {
  const constraints: Array<{ target: string; parents: string[]; planned: PlannedRelationship }> = [];
  if (plan.coupledRoots) {
    plan.coupledRoots.forEach((planned) => constraints.push({
      target: variables[1],
      parents: [variables[0]],
      planned,
    }));
  }
  plan.derived.forEach((planned, index) => constraints.push({
    target: variables[index],
    parents: parents[index].map((parent) => variables[parent]),
    planned,
  }));
  if (plan.global) constraints.push({
    target: variables[0],
    parents: variables.slice(1),
    planned: plan.global,
  });
  return constraints;
}

function visibleConstantPenalty(value: number): number {
  if (value < 1 || value > STRICT_VISIBLE_MAX) return Number.POSITIVE_INFINITY;
  return Math.max(0, value - 15) * 0.04;
}

function plannedVisibleConstant(
  planned: PlannedRelationship,
  targetValue: number,
  parentValues: readonly number[],
): number {
  if (planned.relationship === "scale" || planned.relationship === "divide_by_constant") {
    return planned.coefficient ?? 2;
  }
  if (parentValues.length === 1) {
    const parentValue = parentValues[0];
    if (planned.relationship === "offset_add" || planned.relationship === "offset_subtract" || planned.relationship === "difference") {
      return Math.abs(targetValue - parentValue);
    }
    if (planned.relationship === "sum" || planned.relationship === "complement") return targetValue + parentValue;
    if (planned.relationship === "weighted_sum") {
      return Math.min(...WEIGHTED_PAIR_COEFFICIENTS
        .map(([parentCoefficient, targetCoefficient]) =>
          parentCoefficient * parentValue + targetCoefficient * targetValue,
        ).filter((total) => total <= STRICT_VISIBLE_MAX));
    }
  }
  const allValues = [targetValue, ...parentValues];
  if (planned.relationship === "multi_variable_sum") return allValues.reduce((sum, value) => sum + value, 0);
  if (planned.relationship === "weighted_sum") {
    return (planned.coefficient ?? 2) * targetValue + parentValues.reduce((sum, value) => sum + value, 0);
  }
  if (planned.relationship === "multi_variable_balance") {
    return Math.min(...[
      [1, -1, 1, -1], [1, 1, -1, 1], [1, -1, -1, 1],
      [1, 1, 1, -1], [1, -1, 1, 1], [1, 1, -1, -1],
    ].map((pattern) => allValues.reduce((sum, value, index) => sum + value * (pattern[index] ?? 1), 0))
      .filter((total) => total >= 1 && total <= STRICT_VISIBLE_MAX));
  }
  return targetValue;
}

function assignmentPlanningScore(
  assignment: Readonly<VariableAssignment>,
  variables: readonly string[],
  parents: readonly (readonly number[])[],
  plan: RelationshipPlan,
): number {
  const values = variables.map((symbol) => assignment[symbol]);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const lowCount = values.filter((value) => value <= 4).length;
  const highCount = values.filter((value) => value >= 15).length;
  const plannedPenalty = planConstraints(plan, variables, parents).reduce((sum, constraint) =>
    sum + visibleConstantPenalty(plannedVisibleConstant(
      constraint.planned,
      assignment[constraint.target],
      constraint.parents.map((parent) => assignment[parent]),
    )), 0);
  const directRootPenalty = plan.rootStrategy === "direct"
    ? parents.reduce((sum, parentIndices, index) =>
        parentIndices.length === 0 ? sum + visibleConstantPenalty(assignment[variables[index]]) : sum, 0)
    : 0;
  return plannedPenalty + directRootPenalty + Math.abs(mean - 10.5) * 1.25 +
    Math.max(0, lowCount - highCount) * 0.65;
}

function constraintAwareAssignments(
  variables: readonly string[],
  parents: readonly (readonly number[])[],
  plan: RelationshipPlan,
  random: SeededRandom,
  limit = 24,
): VariableAssignment[] {
  const constraints = planConstraints(plan, variables, parents);
  const assignments: VariableAssignment[] = [];
  const seen = new Set<string>();
  for (let traversal = 0; traversal < limit * 3 && assignments.length < limit; traversal += 1) {
    const values: VariableAssignment = {};
    const traversalRandom = random.fork(`traversal-${traversal}`);
    const domains = Object.fromEntries(variables.map((symbol) => [
      symbol,
      traversalRandom.fork(`domain-${symbol}`).shuffle(Array.from({ length: 20 }, (_, index) => index + 1)),
    ])) as Record<string, number[]>;
    let found = false;
    const search = (index: number): void => {
      if (found) return;
      if (index === variables.length) {
        if (constraints.every((constraint) =>
          relationshipPossible(constraint.planned, constraint.target, constraint.parents, values),
        )) {
          const key = variables.map((symbol) => values[symbol]).join(":");
          if (!seen.has(key)) {
            seen.add(key);
            assignments.push({ ...values });
          }
          found = true;
        }
        return;
      }
      const symbol = variables[index];
      for (const value of domains[symbol]) {
        values[symbol] = value;
        if (constraints.every((constraint) =>
          relationshipPossible(constraint.planned, constraint.target, constraint.parents, values),
        )) search(index + 1);
        delete values[symbol];
        if (found) return;
      }
    };
    search(0);
  }
  return assignments;
}

function scaledTerm(symbol: string, coefficient: number): MathematicalExpression {
  if (Math.abs(coefficient) === 1) return variable(symbol);
  return operation("multiply", constant(Math.abs(coefficient)), variable(symbol));
}

function linearExpression(terms: readonly { symbol: string; coefficient: number }[]): MathematicalExpression {
  const ordered = [...terms].sort((first, second) =>
    Number(second.coefficient > 0) - Number(first.coefficient > 0),
  );
  const [first, ...rest] = ordered;
  let expression = scaledTerm(first.symbol, first.coefficient);
  if (first.coefficient < 0) expression = operation("subtract", constant(0), expression);
  rest.forEach((term) => {
    expression = operation(
      term.coefficient < 0 ? "subtract" : "add",
      expression,
      scaledTerm(term.symbol, term.coefficient),
    );
  });
  return expression;
}

function oriented(
  equation: MathematicalEquation,
  random: SeededRandom,
  probability: number,
): { equation: MathematicalEquation; reversed: boolean } {
  if (!random.boolean(probability)) return { equation, reversed: false };
  return { equation: { left: equation.right, right: equation.left }, reversed: true };
}

function built(
  equation: MathematicalEquation,
  relationship: EquationRelationshipPrimitive,
  coefficients: Readonly<Record<string, number>>,
  random: SeededRandom,
  orientationProbability: number,
): BuiltEquation & { reversed: boolean } {
  const displayed = oriented(equation, random, orientationProbability);
  return {
    equation: displayed.equation,
    symbols: Object.keys(coefficients),
    relationship,
    coefficients,
    reversed: displayed.reversed,
  };
}

function relationCandidates(
  target: string,
  parents: readonly string[],
  values: Readonly<VariableAssignment>,
  random: SeededRandom,
  orientationProbability: number,
): Array<BuiltEquation & { reversed: boolean }> {
  if (parents.length === 0) {
    return [built(
      { left: variable(target), right: constant(values[target]) },
      "direct_value",
      { [target]: 1 },
      random,
      orientationProbability,
    )];
  }

  const candidates: Array<BuiltEquation & { reversed: boolean }> = [];
  if (parents.length === 1) {
    const parent = parents[0];
    const parentValue = values[parent];
    const targetValue = values[target];
    const sum = parentValue + targetValue;
    const difference = Math.abs(parentValue - targetValue);

    if (targetValue > parentValue) {
      const offset = targetValue - parentValue;
      candidates.push(built(
        { left: operation("add", variable(parent), constant(offset)), right: variable(target) },
        "offset_add",
        { [parent]: 1, [target]: -1 },
        random,
        orientationProbability,
      ));
    }
    if (parentValue > targetValue) {
      const offset = parentValue - targetValue;
      candidates.push(built(
        { left: operation("subtract", variable(parent), constant(offset)), right: variable(target) },
        "offset_subtract",
        { [parent]: 1, [target]: -1 },
        random,
        orientationProbability,
      ));
    }
    if (targetValue % parentValue === 0 && COEFFICIENTS.includes((targetValue / parentValue) as never)) {
      const coefficient = targetValue / parentValue;
      candidates.push(built(
        { left: operation("multiply", constant(coefficient), variable(parent)), right: variable(target) },
        "scale",
        { [parent]: coefficient, [target]: -1 },
        random,
        orientationProbability,
      ));
    }
    if (parentValue % targetValue === 0 && COEFFICIENTS.includes((parentValue / targetValue) as never)) {
      const divisor = parentValue / targetValue;
      candidates.push(built(
        { left: operation("divide", variable(parent), constant(divisor)), right: variable(target) },
        "divide_by_constant",
        { [parent]: 1, [target]: -divisor },
        random,
        orientationProbability,
      ));
    }
    if (sum <= STRICT_VISIBLE_MAX) {
      candidates.push(built(
        { left: operation("add", variable(parent), variable(target)), right: constant(sum) },
        "sum",
        { [parent]: 1, [target]: 1 },
        random,
        orientationProbability,
      ));
      candidates.push(built(
        { left: operation("subtract", constant(sum), variable(parent)), right: variable(target) },
        "complement",
        { [parent]: 1, [target]: 1 },
        random,
        orientationProbability,
      ));
    }
    if (difference > 0) {
      const larger = parentValue > targetValue ? parent : target;
      const smaller = larger === parent ? target : parent;
      candidates.push(built(
        { left: operation("subtract", variable(larger), variable(smaller)), right: constant(difference) },
        "difference",
        { [larger]: 1, [smaller]: -1 },
        random,
        orientationProbability,
      ));
    }
    for (const [parentCoefficient, targetCoefficient] of random.shuffle(WEIGHTED_PAIR_COEFFICIENTS)) {
      const total = parentCoefficient * parentValue + targetCoefficient * targetValue;
      if (total <= STRICT_VISIBLE_MAX) {
        candidates.push(built(
          {
            left: operation(
              "add",
              scaledTerm(parent, parentCoefficient),
              scaledTerm(target, targetCoefficient),
            ),
            right: constant(total),
          },
          "weighted_sum",
          { [parent]: parentCoefficient, [target]: targetCoefficient },
          random,
          orientationProbability,
        ));
      }
    }
    return candidates;
  }

  const terms = [target, ...parents];
  const sum = terms.reduce((total, symbol) => total + values[symbol], 0);
  if (sum <= STRICT_VISIBLE_MAX) {
    candidates.push(built(
      { left: linearExpression(terms.map((symbol) => ({ symbol, coefficient: 1 }))), right: constant(sum) },
      "multi_variable_sum",
      Object.fromEntries(terms.map((symbol) => [symbol, 1])),
      random,
      orientationProbability,
    ));
  }
  const signPatterns = random.shuffle([
    [1, -1, 1, -1], [1, 1, -1, 1], [1, -1, -1, 1], [1, 1, 1, -1],
    [1, -1, 1, 1], [1, 1, -1, -1],
  ] as const);
  for (const pattern of signPatterns) {
    const coefficients = Object.fromEntries(terms.map((symbol, index) => [symbol, pattern[index] ?? 1]));
    const total = terms.reduce((result, symbol) => result + coefficients[symbol] * values[symbol], 0);
    if (total >= 1 && total <= STRICT_VISIBLE_MAX) {
      candidates.push(built(
        { left: linearExpression(terms.map((symbol) => ({ symbol, coefficient: coefficients[symbol] }))), right: constant(total) },
        "multi_variable_balance",
        coefficients,
        random,
        orientationProbability,
      ));
    }
  }
  for (const coefficient of COEFFICIENTS) {
    const coefficients = Object.fromEntries(terms.map((symbol, index) => [symbol, index === 0 ? coefficient : 1]));
    const total = terms.reduce((result, symbol) => result + coefficients[symbol] * values[symbol], 0);
    if (total <= STRICT_VISIBLE_MAX) {
      candidates.push(built(
        { left: linearExpression(terms.map((symbol) => ({ symbol, coefficient: coefficients[symbol] }))), right: constant(total) },
        "weighted_sum",
        coefficients,
        random,
        orientationProbability,
      ));
    }
  }
  return candidates;
}

function determinant(
  first: Readonly<Record<string, number>>,
  second: Readonly<Record<string, number>>,
  variables: readonly string[],
): number {
  return (first[variables[0]] ?? 0) * (second[variables[1]] ?? 0) -
    (first[variables[1]] ?? 0) * (second[variables[0]] ?? 0);
}

function chooseCoupledPair(
  variables: readonly string[],
  values: Readonly<VariableAssignment>,
  random: SeededRandom,
  orientationProbability: number,
  planned: readonly [PlannedRelationship, PlannedRelationship],
): [BuiltEquation & { reversed: boolean }, BuiltEquation & { reversed: boolean }] {
  const pool = relationCandidates(variables[1], [variables[0]], values, random, orientationProbability);
  const firstPool = pool.filter((candidate) =>
    plannedCoefficientMatches(candidate, planned[0], variables[1], [variables[0]]),
  );
  const secondPool = pool.filter((candidate) =>
    plannedCoefficientMatches(candidate, planned[1], variables[1], [variables[0]]),
  );
  const pairs = firstPool.flatMap((first) => secondPool.map((second) => [first, second] as const))
    .filter(([first, second]) => first !== second && determinant(first.coefficients, second.coefficients, variables) !== 0);
  if (pairs.length === 0) throw new Error("Unable to compose independent coupled constraints.");
  return [...random.pick(pairs)];
}

function selectRelationship(
  candidates: readonly (BuiltEquation & { reversed: boolean })[],
  random: SeededRandom,
  planned?: PlannedRelationship,
  target?: string,
  parents: readonly string[] = [],
): BuiltEquation & { reversed: boolean } {
  if (candidates.length === 0) throw new Error("No clean relationship fits the hidden assignment.");
  const preferred = candidates.filter((candidate) => {
    const definition = EQUATION_RELATIONSHIP_REGISTRY.find((item) => item.id === candidate.relationship);
    return definition?.productionEnabled;
  });
  const production = (preferred.length ? preferred : candidates).filter((candidate) =>
    !planned || plannedCoefficientMatches(candidate, planned, target ?? "", parents),
  );
  if (production.length === 0) throw new Error(`No clean ${planned?.relationship ?? "production"} relationship fits the hidden assignment.`);
  const maximumConstant = (expression: MathematicalExpression): number => {
    if (expression.kind === "constant") return expression.value;
    if (expression.kind === "variable") return 0;
    return Math.max(maximumConstant(expression.left), maximumConstant(expression.right));
  };
  const relationship = planned?.relationship ?? random.pick([...new Set(production.map((candidate) => candidate.relationship))]);
  const sameRelationship = production.filter((candidate) => candidate.relationship === relationship);
  const scored = sameRelationship.map((candidate) => ({
    candidate,
    maximum: Math.max(maximumConstant(candidate.equation.left), maximumConstant(candidate.equation.right)),
  })).sort((first, second) => first.maximum - second.maximum);
  const strict = scored.filter((item) => item.maximum >= 1 && item.maximum <= STRICT_VISIBLE_MAX);
  if (strict.length === 0) {
    throw new Error("No relationship satisfies the strict 1-20 visible-constant policy.");
  }
  return random.pick(strict.map((item) => item.candidate));
}

function evidenceRank(level: EquationEvidenceLevel): number {
  return ["official", "official_composition", "third_party_supported", "experimental"].indexOf(level);
}

function buildFromValues(
  definition: GraphDefinition,
  variables: string[],
  values: VariableAssignment,
  parents: number[][],
  difficulty: Difficulty,
  random: SeededRandom,
  rootStrategy: GraphDefinition["rootStrategy"],
  plan: RelationshipPlan,
): BuiltModel {
  const orientationProbability = difficulty === "easy" ? 0.2 : difficulty === "medium" ? 0.4 : 0.5;
  const constructed: Array<BuiltEquation & { reversed: boolean }> = [];
  const plannedSteps: Array<Omit<EquationSolutionStep, "equationIndex" | "supportingEquationIndices"> & {
    equation: BuiltEquation & { reversed: boolean };
    supporting?: Array<BuiltEquation & { reversed: boolean }>;
  }> = [];

  if (rootStrategy === "coupled") {
    if (!plan.coupledRoots) throw new Error("Coupled generation requires two planned entry relationships.");
    const roots = chooseCoupledPair(variables.slice(0, 2), values, random, orientationProbability, plan.coupledRoots);
    constructed.push(...roots);
    plannedSteps.push({
      equation: roots[0],
      supporting: [roots[1]],
      targetSymbol: variables[0],
      knownSymbols: [],
      dependencySymbols: [],
      reasoning: "combine_equations",
    });
    plannedSteps.push({
      equation: roots[0],
      targetSymbol: variables[1],
      knownSymbols: [variables[0]],
      dependencySymbols: [variables[0]],
      reasoning: "substitute",
    });
  } else if (rootStrategy === "direct") {
    const rootIndices = parents.flatMap((items, index) => items.length === 0 ? [index] : []);
    for (const index of rootIndices) {
      const equation = selectRelationship(
        relationCandidates(variables[index], [], values, random, orientationProbability),
        random,
      );
      constructed.push(equation);
      plannedSteps.push({
        equation,
        targetSymbol: variables[index],
        knownSymbols: plannedSteps.map((step) => step.targetSymbol),
        dependencySymbols: [],
        reasoning: "solve_variable",
      });
    }
  }

  const startingIndex = rootStrategy === "coupled" ? 2 : 1;
  const derived: Array<{ index: number; equation: BuiltEquation & { reversed: boolean } }> = [];
  for (let index = startingIndex; index < variables.length; index += 1) {
    if (rootStrategy === "direct" && parents[index].length === 0) continue;
    const parentSymbols = parents[index].map((parentIndex) => variables[parentIndex]);
    const planned = plan.derived.get(index);
    if (!planned) throw new Error(`Missing planned relationship for ${variables[index]}.`);
    const equation = selectRelationship(
      relationCandidates(variables[index], parentSymbols, values, random, orientationProbability),
      random,
      planned,
      variables[index],
      parentSymbols,
    );
    constructed.push(equation);
    derived.push({ index, equation });
  }

  if (rootStrategy === "global_balance") {
    const sensitivities = new Map<string, number>([[variables[0], 1]]);
    derived.forEach((item) => {
      const target = variables[item.index];
      const targetCoefficient = item.equation.coefficients[target] ?? 0;
      const parentContribution = parents[item.index].reduce((total, parentIndex) => {
        const parent = variables[parentIndex];
        return total + (item.equation.coefficients[parent] ?? 0) * (sensitivities.get(parent) ?? 0);
      }, 0);
      if (targetCoefficient === 0) throw new Error("Derived relationship does not constrain its target.");
      sensitivities.set(target, -parentContribution / targetCoefficient);
    });
    const globalCandidates = relationCandidates(
      variables[0],
      variables.slice(1),
      values,
      random,
      orientationProbability,
    ).filter((candidate) => {
      const rootCoefficient = variables.reduce((total, symbol) =>
        total + (candidate.coefficients[symbol] ?? 0) * (sensitivities.get(symbol) ?? 0), 0);
      return Math.abs(rootCoefficient) > 1e-9;
    });
    const global = selectRelationship(
      globalCandidates,
      random,
      plan.global ?? undefined,
      variables[0],
      variables.slice(1),
    );
    constructed.push(global);
    plannedSteps.push({
      equation: global,
      supporting: derived.map((item) => item.equation),
      targetSymbol: variables[0],
      knownSymbols: [],
      dependencySymbols: [],
      reasoning: "combine_equations",
    });
  }

  const solved = plannedSteps.map((step) => step.targetSymbol);
  for (const item of derived) {
    const parentSymbols = parents[item.index].map((parentIndex) => variables[parentIndex]);
    plannedSteps.push({
      equation: item.equation,
      targetSymbol: variables[item.index],
      knownSymbols: [...solved],
      dependencySymbols: parentSymbols,
      reasoning: "substitute",
    });
    solved.push(variables[item.index]);
  }

  if (constructed.length !== variables.length || plannedSteps.length !== variables.length) {
    throw new Error("Composed system must contain one independent equation and solve step per variable.");
  }

  const displayed = random.shuffle(constructed);
  const steps: EquationSolutionStep[] = plannedSteps.map((step) => ({
    equationIndex: displayed.indexOf(step.equation),
    ...(step.supporting?.length
      ? { supportingEquationIndices: step.supporting.map((equation) => displayed.indexOf(equation)) }
      : {}),
    targetSymbol: step.targetSymbol,
    knownSymbols: step.knownSymbols,
    dependencySymbols: step.dependencySymbols,
    reasoning: step.reasoning,
  }));
  const reasoningPath = steps.map((step) => {
    const dependencies = step.dependencySymbols ?? [];
    if (step.reasoning === "combine_equations") {
      return `Combine the linked constraints to isolate ${step.targetSymbol} = ${values[step.targetSymbol]}.`;
    }
    if (dependencies.length === 0) return `Read the direct constraint to obtain ${step.targetSymbol} = ${values[step.targetSymbol]}.`;
    return `Substitute ${dependencies.map((symbol) => `${symbol} = ${values[symbol]}`).join(" and ")} to obtain ${step.targetSymbol} = ${values[step.targetSymbol]}.`;
  });
  const depth = new Map<string, number>();
  steps.forEach((step) => depth.set(
    step.targetSymbol,
    (step.dependencySymbols ?? []).length
      ? Math.max(...(step.dependencySymbols ?? []).map((symbol) => depth.get(symbol) ?? 0)) + 1
      : 0,
  ));
  const deepest = Math.max(0, ...depth.values());
  const targetCandidates = difficulty === "easy"
    ? variables
    : variables.filter((symbol) => (depth.get(symbol) ?? 0) === deepest);
  const targetSymbol = random.pick(targetCandidates.length ? targetCandidates : variables);
  const relationshipDefinitions = displayed.map((item) =>
    EQUATION_RELATIONSHIP_REGISTRY.find((definition) => definition.id === item.relationship),
  );
  const evidenceLevel = relationshipDefinitions.reduce<EquationEvidenceLevel>(
    (highest, relationship) => relationship && evidenceRank(relationship.evidence) > evidenceRank(highest)
      ? relationship.evidence
      : highest,
    definition.evidence,
  );
  const multiVariableCount = displayed.filter((item) => item.symbols.length >= 3).length;

  return {
    family: definition.id,
    evidenceLevel,
    rootStrategy,
    variables,
    values,
    equations: displayed.map((item) => item.equation),
    relationships: displayed.map((item) => item.relationship),
    steps,
    reasoningPath,
    hiddenGroupingCount: multiVariableCount + Number(rootStrategy === "global_balance"),
    relationshipReversalCount: displayed.filter((item) => item.reversed).length,
    meaningfulReasoningSteps: steps.length + steps.reduce(
      (total, step) => total + (step.supportingEquationIndices?.length ?? 0),
      0,
    ),
    targetSymbol,
  };
}

function buildModel(
  configuration: MathematicalEquationGenerationConfiguration,
  random: SeededRandom,
): BuiltModel {
  const definition = graphFor(configuration);
  const count = definition.variableCounts[configuration.difficulty];
  if (!count) throw new Error(`Graph ${definition.id} does not support ${configuration.difficulty}.`);
  const variables = random.shuffle([...SYMBOLS.slice(0, count)]);
  const parents = parentsFor(definition.id, count);
  const rootStrategy = definition.id === "direct" && random.fork("root-strategy").boolean(0.45)
    ? "coupled"
    : definition.rootStrategy;
  let lastError: unknown = null;
  for (let planAttempt = 0; planAttempt < 12; planAttempt += 1) {
    const planRandom = random.fork(`relationship-plan-${planAttempt}`);
    const plan = relationshipPlan(rootStrategy, variables, parents, planRandom);
    const assignments = constraintAwareAssignments(
      variables,
      parents,
      plan,
      planRandom.fork("finite-domain-assignment"),
      configuration.difficulty === "easy" ? 40 : 24,
    );
    if (assignments.length === 0) {
      lastError = new Error("The planned relationship graph has no assignment in the 1-20 integer domain.");
      continue;
    }
    const rankedAssignments = [...assignments].sort((first, second) =>
        assignmentPlanningScore(first, variables, parents, plan) -
        assignmentPlanningScore(second, variables, parents, plan),
      );
    const shortlistedAssignments = rankBiasedSample(
      rankedAssignments,
      10,
      planRandom.fork("assignment-quality-sampling"),
    );
    const models = shortlistedAssignments.flatMap((values, assignmentIndex) => {
      try {
        const model = buildFromValues(
          definition,
          variables,
          values,
          parents,
          configuration.difficulty,
          planRandom.fork(`model-${assignmentIndex}`),
          rootStrategy,
          plan,
        );
        const style = inspectEquationPresentation(model.equations, model.values);
        if (configuration.difficulty === "easy" && style.mentalArithmeticCost > 9) return [];
        const solutionValues = Object.values(model.values);
        const solutionMean = solutionValues.reduce((sum, value) => sum + value, 0) / solutionValues.length;
        const lowValueCount = solutionValues.filter((value) => value <= 4).length;
        const highValueCount = solutionValues.filter((value) => value >= 15).length;
        const valueBalancePenalty = Math.abs(solutionMean - 10.5) * 1.25 +
          Math.max(0, lowValueCount - highValueCount) * 0.65;
        const quality = style.presentationPenalty + style.mentalArithmeticCost * 0.25 + valueBalancePenalty;
        return [{ model, quality }];
      } catch (error) {
        lastError = error;
        return [];
      }
    });
    if (models.length > 0) {
      models.sort((first, second) => first.quality - second.quality);
      return rankBiasedSample(models, 1, planRandom.fork("model-quality-sampling"))[0].model;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to compose a constraint-aware equation system for the selected graph.");
}

export class MathematicalEquationGenerator implements QuestionGenerator<MathematicalEquationGenerationConfiguration, MathematicalEquationCandidate> {
  readonly questionType = "mathematical_equation" as const;
  readonly version = MATHEMATICAL_EQUATION_GENERATOR_VERSION;

  generate(configuration: MathematicalEquationGenerationConfiguration, attempt: number): MathematicalEquationCandidate {
    const random = createRandom(configuration, attempt);
    const model = buildModel(configuration, random);
    const solvedBefore = new Set<string>();
    const edges = model.steps.flatMap((step) => {
      const stepEdges = (step.dependencySymbols ?? [])
        .filter((symbol) => solvedBefore.has(symbol))
        .map((source) => ({ source, target: step.targetSymbol }));
      solvedBefore.add(step.targetSymbol);
      return stepEdges;
    });
    const explanation = model.reasoningPath.map((step, index) => `${index + 1}. ${step}`).join("\n");
    return {
      questionType: "mathematical_equation",
      module: "core",
      topic: "Mathematical Equations",
      subtopic: "Composed linear relationship systems",
      presentation: {
        prompt: "Find the integer value of every letter so that all equations are true.",
        blocks: model.equations.map((equation) => ({ kind: "formula", expression: renderMathematicalEquation(equation) })),
      },
      structuredData: {
        variables: [...model.variables].sort(),
        equations: model.equations,
        domain: { ...MATHEMATICAL_EQUATION_DOMAIN, integersOnly: true },
        dependencyModel: {
          family: model.family,
          solveOrder: model.steps.map((step) => step.targetSymbol),
          edges,
          hiddenGroupingCount: model.hiddenGroupingCount,
          relationshipReversalCount: model.relationshipReversalCount,
          meaningfulReasoningSteps: model.meaningfulReasoningSteps,
          relationshipPrimitives: model.relationships,
          evidenceLevel: model.evidenceLevel,
          rootStrategy: model.rootStrategy,
          targetSymbol: model.targetSymbol,
        },
      },
      response: { kind: "symbol_assignment", symbols: [...model.variables].sort() },
      correctAnswer: Object.fromEntries([...model.variables].sort().map((symbol) => [symbol, model.values[symbol]])),
      explanation,
      reasoningPath: model.reasoningPath,
      fastestMethod: model.rootStrategy === "global_balance"
        ? "Express the dependent letters through the anchor, use the balance constraint once, then substitute forward through the graph."
        : model.rootStrategy === "coupled"
          ? "Combine the independent entry constraints, then substitute each solved value through the remaining dependency graph."
          : "Start from the cleanest direct constraint, then substitute through the composed relationships in dependency order.",
      estimatedSolveTimeSeconds: ESTIMATED_SECONDS[configuration.difficulty],
      solutionPath: model.steps,
    };
  }
}

export const mathematicalEquationGenerator = new MathematicalEquationGenerator();

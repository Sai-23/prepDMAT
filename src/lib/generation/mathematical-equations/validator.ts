import type {
  GenerationDifficulty,
  QuestionValidator,
  ValidationCheck,
  ValidationIssue,
  ValidationResult,
} from "../types";
import { calculateEquationDifficulty } from "./difficulty";
import {
  mathematicalEquationSemanticValue,
  mathematicalEquationStructuralSignature,
} from "./fingerprint";
import {
  equationVariables,
  evaluateExpression,
  mathematicalEquationSolver,
} from "./solver";
import {
  inspectMathematicalEquationStyle,
  mathematicalEquationStyleIssues,
} from "./style";
import { inspectPublicEquationPresentation } from "./presentation";
import {
  EQUATION_GRAPH_REGISTRY,
  EQUATION_RELATIONSHIP_REGISTRY,
  sharedEquationEvidence,
} from "./taxonomy";
import { validateEvidenceDefinition } from "../../evidence";
import {
  MATHEMATICAL_EQUATION_DOMAIN,
  MATHEMATICAL_EQUATION_VALIDATOR_VERSION,
  type MathematicalEquation,
  type MathematicalEquationCandidate,
  type MathematicalEquationValidationSolution,
  type MathematicalExpression,
  type VariableAssignment,
} from "./types";

function check(
  stage: ValidationCheck["stage"],
  passed: boolean,
  details?: ValidationCheck["details"],
): ValidationCheck {
  return {
    stage,
    passed,
    validatorVersion: MATHEMATICAL_EQUATION_VALIDATOR_VERSION,
    ...(details === undefined ? {} : { details }),
  };
}

function issue(
  stage: ValidationIssue["stage"],
  code: string,
  message: string,
  path?: string,
): ValidationIssue {
  return { stage, code, message, ...(path ? { path } : {}) };
}

function validateExpression(
  expression: MathematicalExpression,
  declared: ReadonlySet<string>,
  path: string,
  issues: ValidationIssue[],
): void {
  if (expression.kind === "constant") {
    if (!Number.isSafeInteger(expression.value) || expression.value < 1 || expression.value > 20) {
      issues.push(issue("format", "VISIBLE_CONSTANT_OUT_OF_RANGE", "Every displayed constant must be an integer from 1 through 20.", path));
    }
    return;
  }
  if (expression.kind === "variable") {
    if (!declared.has(expression.symbol)) {
      issues.push(issue("format", "undeclared_variable", `Variable ${expression.symbol} is not declared.`, path));
    }
    return;
  }
  validateExpression(expression.left, declared, `${path}.left`, issues);
  validateExpression(expression.right, declared, `${path}.right`, issues);
  if (expression.operator === "multiply") {
    if (expression.left.kind !== "constant" && expression.right.kind !== "constant") {
      issues.push(issue("format", "nonlinear_multiplication", "Multiplication must use an integer constant coefficient.", path));
    }
    const coefficient = expression.left.kind === "constant"
      ? expression.left.value
      : expression.right.kind === "constant"
        ? expression.right.value
        : 0;
    if (Math.abs(coefficient) < 2 || Math.abs(coefficient) > 6) {
      issues.push(issue("format", "coefficient_out_of_range", "Multiplication coefficients must be from 2 through 6.", path));
    }
  }
  if (expression.operator === "divide") {
    if (expression.right.kind !== "constant") {
      issues.push(issue("safety", "UNSUPPORTED_MECHANIC", "Division must use an exact integer divisor from 2 through 6.", path));
    } else if (expression.right.value < 2 || expression.right.value > 6) {
      issues.push(issue("safety", "invalid_divisor", "Division must use an exact integer divisor from 2 through 6.", path));
    }
  }
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

function sameAssignment(
  first: Readonly<VariableAssignment>,
  second: Readonly<VariableAssignment>,
  variables: readonly string[],
): boolean {
  return variables.every((symbol) => first[symbol] === second[symbol]);
}

function solutionStepEquationIndices(
  step: MathematicalEquationCandidate["solutionPath"][number],
): number[] {
  return [step.equationIndex, ...(step.supportingEquationIndices ?? [])];
}

function possibleTargetValues(
  equations: readonly MathematicalEquation[],
  targetSymbol: string,
  knownAssignment: Readonly<VariableAssignment>,
  domain: MathematicalEquationCandidate["structuredData"]["domain"],
): number[] {
  const unresolved = [...new Set(equations.flatMap((equation) => [...equationVariables(equation)]))]
    .filter((symbol) => !Object.hasOwn(knownAssignment, symbol));
  if (!unresolved.includes(targetSymbol)) return [];
  const possible = new Set<number>();
  const partial: VariableAssignment = { ...knownAssignment };
  const references = equations.map(equationVariables);
  const search = (): void => {
    if (possible.size >= 2) return;
    const unassigned = unresolved.filter((symbol) => !Object.hasOwn(partial, symbol));
    if (unassigned.length === 0) {
      if (equations.every((equation) => equationIsTrue(equation, partial))) {
        possible.add(partial[targetSymbol]);
      }
      return;
    }
    const symbol = [...unassigned].sort((first, second) => {
      const score = (value: string) => references.reduce((total, symbols) => {
        if (!symbols.has(value)) return total;
        const remaining = [...symbols].filter((item) =>
          item !== value && !Object.hasOwn(partial, item),
        ).length;
        return total + (remaining === 0 ? 100 : 1 / (remaining + 1));
      }, 0);
      return score(second) - score(first) || first.localeCompare(second);
    })[0];
    for (let value = domain.minimum; value <= domain.maximum; value += 1) {
      partial[symbol] = value;
      const contradicted = equations.some((equation, equationIndex) =>
        [...references[equationIndex]].every((item) => Object.hasOwn(partial, item)) &&
        !equationIsTrue(equation, partial),
      );
      if (!contradicted) search();
      if (possible.size >= 2) break;
    }
    delete partial[symbol];
  };
  search();
  return [...possible].sort((first, second) => first - second);
}

function validateSolutionPath(
  candidate: MathematicalEquationCandidate,
  assignment: Readonly<VariableAssignment>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const solved = new Set<string>();
  const { equations, domain, variables } = candidate.structuredData;
  if (candidate.solutionPath.length !== variables.length) {
    return [issue("explanation", "incomplete_solution_path", "The solution path must solve every variable exactly once.")];
  }

  const usedEquations = new Set<number>();

  candidate.solutionPath.forEach((step, stepIndex) => {
    const path = `solutionPath.${stepIndex}`;
    const equationIndices = solutionStepEquationIndices(step);
    const selectedEquations = equationIndices.map((index) => equations[index]);
    if (
      new Set(equationIndices).size !== equationIndices.length ||
      selectedEquations.some((equation) => !equation) ||
      !variables.includes(step.targetSymbol) ||
      solved.has(step.targetSymbol)
    ) {
      issues.push(issue("explanation", "invalid_solution_step", "A solution step has an invalid equation or target.", path));
      return;
    }
    equationIndices.forEach((index) => usedEquations.add(index));
    const reportedKnown = [...step.knownSymbols].sort();
    const actualKnown = [...solved].sort();
    if (reportedKnown.join("\u001f") !== actualKnown.join("\u001f")) {
      issues.push(issue("explanation", "incorrect_known_symbols", "The solution step does not accurately report prior deductions.", path));
      return;
    }
    const references = new Set(selectedEquations.flatMap((equation) => [...equationVariables(equation)]));
    if (!references.has(step.targetSymbol)) {
      issues.push(issue("explanation", "non_deductive_step", "The step does not constrain its target variable.", path));
      return;
    }
    const actualDependencies = [...references]
      .filter((symbol) => symbol !== step.targetSymbol && solved.has(symbol))
      .sort();
    if (
      step.dependencySymbols &&
      [...step.dependencySymbols].sort().join("\u001f") !== actualDependencies.join("\u001f")
    ) {
      issues.push(issue("explanation", "incorrect_dependencies", "The step does not accurately report the values it substitutes.", path));
      return;
    }
    const unresolvedOtherSymbols = [...references].filter((symbol) =>
      symbol !== step.targetSymbol && !solved.has(symbol),
    );
    const combinesEquations = equationIndices.length > 1 || step.reasoning === "combine_equations";
    if (unresolvedOtherSymbols.length > 0 && !combinesEquations) {
      issues.push(issue("explanation", "non_deductive_step", "An indirect deduction must explicitly combine its supporting equations.", path));
      return;
    }
    if (step.reasoning === "combine_equations" && equationIndices.length < 2) {
      issues.push(issue("explanation", "missing_supporting_equation", "A combine-equations step requires at least two equations.", path));
      return;
    }
    const knownAssignment = Object.fromEntries(
      [...solved].map((symbol) => [symbol, assignment[symbol]]),
    );
    // The independently verified unique full-system solution already proves an
    // initial step that explicitly combines every equation. Re-enumerating the
    // same 20^4 domain here would add cost without adding a distinct guarantee.
    const combinesWholeSystem = solved.size === 0 && equationIndices.length === equations.length;
    const possibleValues = combinesWholeSystem
      ? [assignment[step.targetSymbol]]
      : possibleTargetValues(
          selectedEquations as MathematicalEquation[],
          step.targetSymbol,
          knownAssignment,
          domain,
        );
    if (
      possibleValues.length !== 1 ||
      possibleValues[0] !== assignment[step.targetSymbol] ||
      !candidate.explanation.includes(`${step.targetSymbol} = ${assignment[step.targetSymbol]}`)
    ) {
      issues.push(issue("explanation", "unverified_solution_step", "The explanation step does not uniquely reproduce the solved value.", path));
      return;
    }
    solved.add(step.targetSymbol);
  });
  if (usedEquations.size !== equations.length) {
    issues.push(issue("explanation", "unused_equation", "Every equation must contribute to the verified deduction path."));
  }
  return issues;
}

export class MathematicalEquationValidator
  implements
    QuestionValidator<
      MathematicalEquationCandidate,
      MathematicalEquationValidationSolution
    >
{
  readonly questionType = "mathematical_equation" as const;
  readonly version = MATHEMATICAL_EQUATION_VALIDATOR_VERSION;

  validate(
    candidate: MathematicalEquationCandidate,
    requestedDifficulty: GenerationDifficulty,
  ): ValidationResult<MathematicalEquationValidationSolution> {
    const checks: ValidationCheck[] = [];
    const issues: ValidationIssue[] = [];
    const { variables, equations, domain, dependencyModel } = candidate.structuredData;
    const declared = new Set(variables);

    if (
      Object.keys(candidate.correctAnswer).some((symbol) => !declared.has(symbol)) ||
      Object.values(candidate.correctAnswer).some((value) =>
        !Number.isSafeInteger(value) || value < 1 || value > 20)
    ) {
      issues.push(issue(
        "domain",
        "HIDDEN_VALUE_OUT_OF_RANGE",
        "Every stored letter value must be an integer from 1 through 20.",
        "correctAnswer",
      ));
    }

    if (
      candidate.questionType !== "mathematical_equation" ||
      candidate.module !== "core" ||
      variables.length < 2 ||
      variables.length > 4 ||
      declared.size !== variables.length ||
      variables.some((symbol) => !/^[A-Z]$/.test(symbol)) ||
      equations.length < 2 ||
      equations.length !== variables.length ||
      domain.minimum !== MATHEMATICAL_EQUATION_DOMAIN.minimum ||
      domain.maximum !== MATHEMATICAL_EQUATION_DOMAIN.maximum ||
      domain.integersOnly !== true ||
      !dependencyModel ||
      dependencyModel.solveOrder.length !== variables.length ||
      [...dependencyModel.solveOrder].sort().join("") !== [...variables].sort().join("") ||
      !Number.isInteger(dependencyModel.hiddenGroupingCount) ||
      Number(dependencyModel.hiddenGroupingCount) < 0 ||
      !Number.isInteger(dependencyModel.relationshipReversalCount) ||
      Number(dependencyModel.relationshipReversalCount) < 0 ||
      !Number.isInteger(dependencyModel.meaningfulReasoningSteps) ||
      Number(dependencyModel.meaningfulReasoningSteps) < 2 ||
      !Array.isArray(dependencyModel.relationshipPrimitives) ||
      dependencyModel.relationshipPrimitives.length !== equations.length ||
      dependencyModel.evidenceLevel === "experimental" ||
      !dependencyModel.rootStrategy ||
      !dependencyModel.targetSymbol ||
      !declared.has(dependencyModel.targetSymbol)
    ) {
      issues.push(issue("format", "invalid_system_shape", "The equation system does not match the supported dMAT format."));
    }
    equations.forEach((equation, index) => {
      validateExpression(equation.left, declared, `equations.${index}.left`, issues);
      validateExpression(equation.right, declared, `equations.${index}.right`, issues);
    });
    const publicPresentation = inspectPublicEquationPresentation(
      candidate.presentation.blocks,
      equations,
    );
    if (!publicPresentation.validFormulaShape) {
      issues.push(issue(
        "format",
        "PUBLIC_PRESENTATION_MISMATCH",
        "The final student-visible formulae must exactly match the validated equation system and supported notation.",
        "presentation.blocks",
      ));
    }
    if (publicPresentation.visibleConstants.some((value) =>
      !Number.isSafeInteger(value) || value < 1 || value > 20)) {
      issues.push(issue(
        "format",
        "VISIBLE_CONSTANT_OUT_OF_RANGE",
        "The final student-visible formulae contain a numeric constant outside 1 through 20.",
        "presentation.blocks",
      ));
    }
    const relationshipDefinitions = dependencyModel.relationshipPrimitives?.map((relationship) =>
      EQUATION_RELATIONSHIP_REGISTRY.find((definition) => definition.id === relationship));
    const graphDefinition = EQUATION_GRAPH_REGISTRY.find((definition) =>
      definition.id === dependencyModel.family);
    if (
      !graphDefinition ||
      !graphDefinition.productionEnabled ||
      !validateEvidenceDefinition(sharedEquationEvidence(graphDefinition)).valid ||
      relationshipDefinitions?.some((definition) =>
        !definition ||
        !definition.productionEnabled ||
        !validateEvidenceDefinition(sharedEquationEvidence(definition)).valid)
    ) {
      issues.push(issue(
        "safety",
        "UNSUPPORTED_MECHANIC",
        "Every graph and relationship primitive must have enabled, valid production evidence.",
      ));
    }
    const styleMetrics = inspectMathematicalEquationStyle(candidate);
    mathematicalEquationStyleIssues(candidate).forEach((styleIssue) => {
      issues.push(issue("format", styleIssue.code, styleIssue.message));
    });
    const normalizedEquations = mathematicalEquationSemanticValue(candidate).equations;
    if (new Set(normalizedEquations.map((equation) => JSON.stringify(equation))).size !== equations.length) {
      issues.push(issue("format", "redundant_equation", "Every equation must contribute a distinct relationship."));
    }
    if (
      candidate.response.kind !== "symbol_assignment" ||
      [...candidate.response.symbols].sort().join("") !== [...variables].sort().join("")
    ) {
      issues.push(issue("format", "invalid_response", "The response must request every declared variable."));
    }
    if (
      !Array.isArray(candidate.reasoningPath) ||
      candidate.reasoningPath.length < 2 ||
      candidate.reasoningPath.some((step) => typeof step !== "string" || !step.trim()) ||
      typeof candidate.fastestMethod !== "string" ||
      candidate.fastestMethod.trim().length < 20
    ) {
      issues.push(issue("format", "invalid_reasoning_metadata", "Reasoning-path and fastest-method metadata must be complete."));
    }
    checks.push(check("format", !issues.some((item) => item.stage === "format"), styleMetrics as never));
    checks.push(check("safety", !issues.some((item) => item.stage === "safety")));
    if (issues.length) return { valid: false, issues, checks };

    const outcome = mathematicalEquationSolver.solve(candidate);
    checks.push(check("solve", outcome.status !== "invalid", { exploredAssignments: outcome.exploredAssignments }));
    checks.push(check("uniqueness", outcome.status === "unique", { solutionCount: outcome.solutions.length }));
    if (outcome.status !== "unique") {
      return {
        valid: false,
        issues: [
          issue(
            outcome.status === "invalid" ? "solve" : "uniqueness",
            outcome.status === "none" ? "no_solution" : outcome.status === "multiple" ? "multiple_solutions" : "solver_rejected",
            outcome.reason ?? `The system has ${outcome.status === "multiple" ? "more than one" : "no"} valid domain solution.`,
          ),
        ],
        checks,
      };
    }

    const assignment = outcome.solutions[0];
    const answerKeys = Object.keys(candidate.correctAnswer).sort();
    const domainValid =
      answerKeys.join("") === [...variables].sort().join("") &&
      Object.values(candidate.correctAnswer).every(
        (value) => Number.isInteger(value) && value >= domain.minimum && value <= domain.maximum,
      ) &&
      sameAssignment(candidate.correctAnswer, assignment, variables) &&
      equations.every((equation) => equationIsTrue(equation, assignment));
    checks.push(check("domain", domainValid));
    if (!domainValid) {
      return {
        valid: false,
        issues: [issue("domain", "stored_answer_mismatch", "The stored answer does not match the independent unique solution.")],
        checks,
      };
    }

    const explanationIssues = validateSolutionPath(candidate, assignment);
    if (
      candidate.reasoningPath.some((step) => !candidate.explanation.includes(step)) ||
      variables.some((symbol) => !candidate.explanation.includes(`${symbol} = ${assignment[symbol]}`))
    ) {
      explanationIssues.push(issue("explanation", "reasoning_path_mismatch", "The stored reasoning path must support the complete verified solution."));
    }
    const solvedBefore = new Set<string>();
    const actualEdges = candidate.solutionPath.flatMap((step) => {
      const references = new Set(
        solutionStepEquationIndices(step).flatMap((index) => {
          const equation = equations[index];
          return equation ? [...equationVariables(equation)] : [];
        }),
      );
      const edges = [...references]
        .filter((symbol) => symbol !== step.targetSymbol && solvedBefore.has(symbol))
        .map((source) => `${source}>${step.targetSymbol}`);
      solvedBefore.add(step.targetSymbol);
      return edges;
    }).sort();
    const storedEdges = dependencyModel.edges.map((edge) => `${edge.source}>${edge.target}`).sort();
    if (
      dependencyModel.solveOrder.join("|") !== candidate.solutionPath.map((step) => step.targetSymbol).join("|") ||
      actualEdges.join("|") !== storedEdges.join("|")
    ) {
      explanationIssues.push(issue("explanation", "dependency_model_mismatch", "The stored dependency model does not match the verified solve path."));
    }
    checks.push(check("explanation", explanationIssues.length === 0));
    if (explanationIssues.length) return { valid: false, issues: explanationIssues, checks };

    const calculated = calculateEquationDifficulty(candidate);
    const difficultyMatches = calculated.difficulty === requestedDifficulty;
    checks.push(check("difficulty", difficultyMatches, {
      ...calculated.metrics,
      family: dependencyModel.family,
      structuralSignature: mathematicalEquationStructuralSignature(candidate),
    }));
    if (!difficultyMatches) {
      return {
        valid: false,
        issues: [issue("difficulty", "difficulty_mismatch", `Requested ${requestedDifficulty}, calculated ${calculated.difficulty}.`)],
        checks,
      };
    }

    return {
      valid: true,
      solution: {
        assignment,
        calculatedDifficulty: calculated.difficulty,
        metrics: calculated.metrics,
        exploredAssignments: outcome.exploredAssignments,
      },
      checks,
    };
  }
}

export const mathematicalEquationValidator = new MathematicalEquationValidator();

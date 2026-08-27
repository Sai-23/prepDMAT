import "server-only";

import {
  buildCanonicalSolveTrace,
  validateSolveTraceRange,
  type MathematicalEquationStructuredData,
  type VariableAssignment,
} from "../generation/mathematical-equations";
import {
  EQUATION_EXPLANATION_TRACE_VERSION,
  equationAssignmentIsValid,
  parseEquationAssignment,
  parseEquationExplanationTrace,
  parseEquationSolutionPath,
  type EquationExplanationTrace,
} from "./mathematical-equation-explanation";

type EquationExplanationData = Pick<
  MathematicalEquationStructuredData,
  "variables" | "equations" | "domain"
>;

function sameAssignment(
  first: Readonly<VariableAssignment>,
  second: Readonly<VariableAssignment>,
  variables: readonly string[],
): boolean {
  return variables.every((symbol) => first[symbol] === second[symbol]) &&
    Object.keys(first).length === variables.length &&
    Object.keys(second).length === variables.length;
}

/**
 * Server-only compatibility boundary. New and older snapshots both pass
 * through the calibrated canonical solver here; the client receives only a
 * verified, serializable trace envelope and never solves the system itself.
 */
export function createVerifiedEquationExplanationTrace(
  data: EquationExplanationData,
  rawSolutionPath: unknown,
  correctAnswer: unknown,
  existingTrace?: unknown,
): EquationExplanationTrace | null {
  const assignment = parseEquationAssignment(data, correctAnswer);
  if (!assignment || !equationAssignmentIsValid(data, assignment)) return null;

  const existing = parseEquationExplanationTrace(data, existingTrace);
  const solutionPath = parseEquationSolutionPath(data, rawSolutionPath) ?? existing?.solutionPath ?? null;
  if (!solutionPath) return null;
  try {
    const solveTrace = buildCanonicalSolveTrace(
      { structuredData: { equations: data.equations }, solutionPath },
      assignment,
    );
    if (
      !sameAssignment(solveTrace.resolvedAssignment, assignment, data.variables) ||
      !validateSolveTraceRange(solveTrace, data.domain).valid
    ) return null;
    return {
      version: EQUATION_EXPLANATION_TRACE_VERSION,
      solveTrace,
      solutionPath,
    };
  } catch {
    return null;
  }
}

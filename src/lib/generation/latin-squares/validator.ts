import type {
  GenerationDifficulty,
  QuestionValidator,
  ValidationCheck,
  ValidationIssue,
  ValidationResult,
} from "../types";
import { productionEvidenceFor, validateEvidenceDefinition } from "../../evidence";
import {
  analyzeLatinDeductions,
  calculateLatinDifficulty,
  explainLatinDeductions,
} from "./difficulty";
import { analyzeLatinDistractors } from "./distractors";
import {
  LATIN_DEDUCTION_EVIDENCE_REGISTRY,
  LATIN_HARD_CONSTRAINT_REGISTRY,
} from "./evidence";
import { latinSquareSolver } from "./solver";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_SIZE,
  LATIN_SQUARE_VALIDATOR_VERSION,
  type CompletedLatinGrid,
  type LatinSquareCandidate,
  type LatinSymbol,
  type LatinValidationSolution,
} from "./types";

function validationCheck(
  stage: ValidationCheck["stage"],
  passed: boolean,
  details?: ValidationCheck["details"],
): ValidationCheck {
  return {
    stage,
    passed,
    validatorVersion: LATIN_SQUARE_VALIDATOR_VERSION,
    ...(details === undefined ? {} : { details }),
  };
}

function validationIssue(
  stage: ValidationIssue["stage"],
  code: string,
  message: string,
): ValidationIssue {
  return { stage, code, message };
}

function isCompletedLatinSquare(grid: CompletedLatinGrid): boolean {
  if (grid.length !== LATIN_SQUARE_SIZE || grid.some((row) => row.length !== LATIN_SQUARE_SIZE)) {
    return false;
  }
  const expected = [...DEFAULT_LATIN_SYMBOLS].sort().join("");
  for (let index = 0; index < LATIN_SQUARE_SIZE; index += 1) {
    if ([...grid[index]].sort().join("") !== expected) return false;
    if (grid.map((row) => row[index]).sort().join("") !== expected) return false;
  }
  return true;
}

function knownCluesValid(candidate: LatinSquareCandidate): boolean {
  const { grid } = candidate.structuredData;
  for (let index = 0; index < LATIN_SQUARE_SIZE; index += 1) {
    const row = grid[index].filter((value): value is LatinSymbol => value !== null);
    const column = grid
      .map((gridRow) => gridRow[index])
      .filter((value): value is LatinSymbol => value !== null);
    if (new Set(row).size !== row.length || new Set(column).size !== column.length) {
      return false;
    }
  }
  return true;
}

export class LatinSquareValidator
  implements QuestionValidator<LatinSquareCandidate, LatinValidationSolution>
{
  readonly questionType = "latin_square" as const;
  readonly version = LATIN_SQUARE_VALIDATOR_VERSION;

  validate(
    candidate: LatinSquareCandidate,
    requestedDifficulty: GenerationDifficulty,
  ): ValidationResult<LatinValidationSolution> {
    const checks: ValidationCheck[] = [];
    const { size, symbols, grid, target } = candidate.structuredData;

    const formatValid =
      candidate.questionType === "latin_square" &&
      candidate.module === "core" &&
      size === LATIN_SQUARE_SIZE &&
      symbols.join("") === DEFAULT_LATIN_SYMBOLS.join("") &&
      grid.length === LATIN_SQUARE_SIZE &&
      grid.every((row) => row.length === LATIN_SQUARE_SIZE) &&
      Number.isInteger(target.row) &&
      Number.isInteger(target.column) &&
      target.row >= 0 &&
      target.row < LATIN_SQUARE_SIZE &&
      target.column >= 0 &&
      target.column < LATIN_SQUARE_SIZE &&
      grid[target.row]?.[target.column] === null &&
      grid.flat().every((value) => value === null || symbols.includes(value)) &&
      candidate.response.kind === "single_choice" &&
      candidate.response.options.map((option) => option.content).join("") ===
        DEFAULT_LATIN_SYMBOLS.join("");
    checks.push(validationCheck("format", formatValid));
    if (!formatValid) {
      return {
        valid: false,
        issues: [validationIssue("format", "invalid_latin_format", "The candidate is not a valid 5 by 5 A-E Latin-square task.")],
        checks,
      };
    }

    const completedValid = isCompletedLatinSquare(candidate.completedGrid);
    const evidenceValid = LATIN_HARD_CONSTRAINT_REGISTRY.every((constraint) =>
      constraint.productionEnabled && validateEvidenceDefinition(constraint).valid);
    const cluesValid =
      knownCluesValid(candidate) &&
      grid.every((row, rowIndex) =>
        row.every(
          (value, columnIndex) =>
            value === null || value === candidate.completedGrid[rowIndex][columnIndex],
        ),
      ) &&
      candidate.correctAnswer === candidate.completedGrid[target.row][target.column];
    const domainValid = completedValid && cluesValid && evidenceValid;
    checks.push(validationCheck("domain", domainValid, {
      enforcedConstraints: LATIN_HARD_CONSTRAINT_REGISTRY.map((constraint) => constraint.id),
    }));
    if (!domainValid) {
      return {
        valid: false,
        issues: [validationIssue("domain", "invalid_latin_domain", "The clues or stored answer conflict with a completed Latin square.")],
        checks,
      };
    }

    const outcome = latinSquareSolver.solve(candidate);
    checks.push(validationCheck("solve", outcome.status !== "invalid", { exploredAssignments: outcome.exploredAssignments }));
    checks.push(validationCheck("uniqueness", outcome.status === "unique", {
      possibleTargetSymbols: outcome.possibleTargetSymbols,
      fullGridSolutionCount: outcome.fullGridSolutionCount,
      fullGridSolutionCountCapped: outcome.fullGridSolutionCountCapped,
    }));
    if (outcome.status !== "unique") {
      return {
        valid: false,
        issues: [
          validationIssue(
            outcome.status === "invalid" ? "solve" : "uniqueness",
            outcome.status === "multiple" ? "ambiguous_target" : outcome.status === "none" ? "no_completion" : "solver_rejected",
            outcome.status === "multiple"
              ? "The visible clues permit more than one target value."
              : "The visible clues do not form a solvable Latin-square task.",
          ),
        ],
        checks,
      };
    }
    if (outcome.possibleTargetSymbols[0] !== candidate.correctAnswer) {
      return {
        valid: false,
        issues: [validationIssue("domain", "target_answer_mismatch", "The stored target answer differs from the independent solver result.")],
        checks,
      };
    }

    const analysis = analyzeLatinDeductions(candidate);
    const deductions = analysis.deductions;
    const calculated = calculateLatinDifficulty(candidate, analysis);
    checks.push(validationCheck("explanation", calculated !== null, { deductionCount: deductions.length }));
    if (!calculated) {
      return {
        valid: false,
        issues: [validationIssue("explanation", "target_requires_search", "The target cannot be reached by the supported logical deduction rules.")],
        checks,
      };
    }
    const targetDeduction = deductions[calculated.metrics.targetStepIndex];
    if (targetDeduction.symbol !== candidate.correctAnswer) {
      return {
        valid: false,
        issues: [validationIssue("explanation", "deduction_answer_mismatch", "The logical deduction trace reaches a different target answer.")],
        checks,
      };
    }

    const causalGraphValid = deductions.every((deduction, deductionIndex) =>
      deduction.dependencies.every((dependency) => deductions.slice(0, deductionIndex).some((prior) =>
        prior.coordinate.row === dependency.row && prior.coordinate.column === dependency.column)) &&
      deduction.clueDependencies.every((dependency) => grid[dependency.row]?.[dependency.column] !== null));
    const reasoningEvidenceValid = Boolean(productionEvidenceFor(
      LATIN_DEDUCTION_EVIDENCE_REGISTRY,
      calculated.metrics.reasoningClassification,
    ));
    checks.push(validationCheck("domain", causalGraphValid && reasoningEvidenceValid, {
      reasoningClassification: calculated.metrics.reasoningClassification,
    }));
    if (!causalGraphValid || !reasoningEvidenceValid) {
      return {
        valid: false,
        issues: [validationIssue("domain", "invalid_latin_deduction_graph", "The target deduction graph is disconnected or lacks production evidence.")],
        checks,
      };
    }

    const distractors = analyzeLatinDistractors(candidate);
    const distractorsValid = distractors.length === DEFAULT_LATIN_SYMBOLS.length - 1 &&
      new Set(distractors.map((entry) => entry.symbol)).size === distractors.length;
    checks.push(validationCheck("uniqueness", distractorsValid, {
      distractorReasonCounts: distractors.reduce((counts, entry) => ({
        ...counts,
        [entry.reason]: (counts[entry.reason] ?? 0) + 1,
      }), {} as Record<string, number>),
    }));
    if (!distractorsValid) {
      return { valid: false, issues: [validationIssue("uniqueness", "invalid_latin_distractors", "Every wrong A-E option requires a distinct reasoning-error diagnosis.")], checks };
    }

    const pedagogicallyUseful =
      calculated.metrics.irrelevantClueCount <= Math.floor(calculated.metrics.visibleClues * 0.7) &&
      calculated.metrics.redundancyRatio <= 0.75;
    checks.push(validationCheck("safety", pedagogicallyUseful, {
      relevantClueCount: calculated.metrics.relevantClueCount,
      irrelevantClueCount: calculated.metrics.irrelevantClueCount,
      redundancyRatio: calculated.metrics.redundancyRatio,
    }));
    if (!pedagogicallyUseful) {
      return { valid: false, issues: [validationIssue("safety", "excessive_irrelevant_clues", "The puzzle contains too many irrelevant or reasoning-redundant clues.")], checks };
    }

    const difficultyMatches = calculated.difficulty === requestedDifficulty;
    checks.push(validationCheck("difficulty", difficultyMatches, calculated.metrics));
    if (!difficultyMatches) {
      return {
        valid: false,
        issues: [validationIssue("difficulty", "difficulty_mismatch", `Requested ${requestedDifficulty}, calculated ${calculated.difficulty}.`)],
        checks,
      };
    }

    return {
      valid: true,
      solution: {
        targetSymbol: candidate.correctAnswer,
        calculatedDifficulty: calculated.difficulty,
        metrics: calculated.metrics,
        deductions,
        explanation: explainLatinDeductions(deductions, target),
        exploredAssignments: outcome.exploredAssignments,
        fullGridSolutionCount: outcome.fullGridSolutionCount,
        fullGridSolutionCountCapped: outcome.fullGridSolutionCountCapped,
      },
      checks,
    };
  }
}

export const latinSquareValidator = new LatinSquareValidator();

import type {
  GenerationDifficulty,
  QuestionValidator,
  ValidationCheck,
  ValidationIssue,
  ValidationResult,
} from "../types";
import {
  validateFigureHardConstraints,
  validateFigurePedagogicalSignals,
} from "./constraints";
import { calculateFigureDifficulty } from "./difficulty";
import { figureFrameSimilarity, visibleFrameValue } from "./distractors";
import { replayFigureSequence } from "./engine";
import { figureStructuralSignature } from "./fingerprint";
import {
  FIGURE_SEQUENCE_VALIDATOR_VERSION,
  type FigureSequenceCandidate,
  type FigureValidationSolution,
} from "./types";

const check = (
  stage: ValidationCheck["stage"],
  passed: boolean,
  details?: ValidationCheck["details"],
): ValidationCheck => ({
  stage,
  passed,
  validatorVersion: FIGURE_SEQUENCE_VALIDATOR_VERSION,
  ...(details === undefined ? {} : { details }),
});
const issue = (
  stage: ValidationIssue["stage"],
  code: string,
  message: string,
): ValidationIssue => ({ stage, code, message });
const sameFrame = (
  first: Parameters<typeof visibleFrameValue>[0],
  second: Parameters<typeof visibleFrameValue>[0],
) => visibleFrameValue(first) === visibleFrameValue(second);

function explain(candidate: FigureSequenceCandidate): string {
  return candidate.structuredData.rules.map((rule) => {
    const parts: string[] = [];
    if (rule.movement?.kind === "linear") {
      parts.push(`moves ${rule.movement.direction.replaceAll("_", " ")}${rule.movement.progression === "incrementing" ? " by one additional cell each step" : ` by ${rule.movement.steps} cell${rule.movement.steps === 1 ? "" : "s"}`}`);
    }
    if (rule.movement?.kind === "border") {
      parts.push(`travels ${rule.movement.direction.replace("_", "-")} around the border${rule.movement.progression === "incrementing" ? " by one additional cell each step" : ""}`);
    }
    if (rule.movement?.kind === "direction_cycle") {
      parts.push(`cycles through ${rule.movement.directions.map((value) =>
        value.replaceAll("_", " ")).join(", ")}`);
    }
    if (rule.rotation) {
      parts.push(`rotates ${rule.rotation.direction}${rule.rotation.progression === "incrementing" ? " by an increasing number of quarter-turns" : " by one quarter-turn"}`);
    }
    if (rule.colour) parts.push(`cycles colour through ${rule.colour.cycle.join(", ")}`);
    return `${rule.symbolId} ${parts.join(" and ")}.`;
  }).join(" ") + " Applying these rules twice gives the two selected matrices.";
}

export class FigureSequenceValidator
  implements QuestionValidator<FigureSequenceCandidate, FigureValidationSolution>
{
  readonly questionType = "figure_sequence" as const;
  readonly version = FIGURE_SEQUENCE_VALIDATOR_VERSION;

  validate(
    candidate: FigureSequenceCandidate,
    requestedDifficulty: GenerationDifficulty,
  ): ValidationResult<FigureValidationSolution> {
    const checks: ValidationCheck[] = [];
    const { visibleFrames, rules } = candidate.structuredData;
    const formatValid =
      candidate.questionType === "figure_sequence" &&
      candidate.module === "core" &&
      visibleFrames.length === 4 &&
      candidate.sequence.visibleFrames.length === 4 &&
      candidate.solutionFrames.length === 2 &&
      candidate.sequence.missingMatrices.length === 2 &&
      candidate.response.kind === "two_stage_single_choice" &&
      candidate.correctAnswer.length === 2 &&
      candidate.sequence.missingMatrices.every((matrix, index) =>
        matrix.sequenceIndex === index + 4 && matrix.candidates.length === 3);
    checks.push(check("format", formatValid));
    if (!formatValid) {
      return {
        valid: false,
        issues: [issue("format", "invalid_figure_format", "A figure sequence requires four visible matrices and two three-option answer groups.")],
        checks,
      };
    }

    const constraintIssues = validateFigureHardConstraints(candidate);
    const constraintsValid = constraintIssues.length === 0;
    checks.push(check("domain", constraintsValid, {
      enforcedConstraints: [
        "OBJECTS_CANNOT_DISAPPEAR",
        "OBJECTS_CANNOT_OVERLAP",
        "OBJECTS_CANNOT_LEAVE_GRID",
        "DIAGONAL_MOVEMENT_TYPE_LOCK",
        "BOUNDARY_REQUIRES_VALID_BEHAVIOR",
      ],
    }));
    if (!constraintsValid) {
      return {
        valid: false,
        issues: constraintIssues.map((constraint) => issue(
          "domain",
          `figure_constraint_${constraint.constraint.toLowerCase()}`,
          constraint.message,
        )),
        checks,
      };
    }

    const publicPresentationMatches =
      candidate.sequence.grid.rows === candidate.structuredData.grid.rows &&
      candidate.sequence.grid.columns === candidate.structuredData.grid.columns &&
      candidate.sequence.visibleFrames.every((frame, index) =>
        sameFrame(frame, visibleFrames[index]));
    checks.push(check("format", publicPresentationMatches, {
      contract: "canonical-rendered-matrix-v1",
    }));
    if (!publicPresentationMatches) {
      return {
        valid: false,
        issues: [issue(
          "format",
          "PUBLIC_PRESENTATION_MISMATCH",
          "The student-visible grid and sequence must match the independently validated structured matrices.",
        )],
        checks,
      };
    }

    const pedagogyIssues = validateFigurePedagogicalSignals(candidate);
    checks.push(check("safety", pedagogyIssues.length === 0));
    if (pedagogyIssues.length) {
      return {
        valid: false,
        issues: pedagogyIssues.map((entry) =>
          issue("safety", "uninferable_figure_rule", entry.message)),
        checks,
      };
    }

    let replayed;
    try {
      replayed = replayFigureSequence(candidate.structuredData.grid, visibleFrames[0], rules, 5);
    } catch {
      checks.push(check("solve", false));
      return {
        valid: false,
        issues: [issue("solve", "unsafe_transformation", "Independent simulation rejected the transformation sequence.")],
        checks,
      };
    }
    const replayMatches =
      visibleFrames.every((frame, index) => sameFrame(frame, replayed[index])) &&
      candidate.solutionFrames.every((frame, index) => sameFrame(frame, replayed[index + 4]));
    checks.push(check("solve", replayMatches));
    if (!replayMatches) {
      return {
        valid: false,
        issues: [issue("solve", "sequence_replay_mismatch", "Independent simulation does not reproduce every input and continuation frame.")],
        checks,
      };
    }

    const symbolCount = visibleFrames[0].symbols.length;
    const selected: string[] = [];
    const optionIssues: ValidationIssue[] = [];
    candidate.sequence.missingMatrices.forEach((matrix, index) => {
      const values = matrix.candidates.map((option) => visibleFrameValue(option.frame));
      const matches = matrix.candidates.filter((option) => sameFrame(option.frame, replayed[index + 4]));
      const distractorsArePlausibleNearNeighbours = matrix.candidates
        .filter((option) => !sameFrame(option.frame, replayed[index + 4]))
        .every((option) =>
          figureFrameSimilarity(option.frame, replayed[index + 4]) ===
            Math.max(0, symbolCount - 1) / symbolCount);
      if (new Set(values).size !== 3) {
        optionIssues.push(issue(
          "uniqueness",
          "DUPLICATE_RENDERED_CANDIDATE",
          `Missing matrix ${index + 1} must contain three renderer-distinct candidates.`,
        ));
      }
      if (matches.length === 0) {
        optionIssues.push(issue(
          "uniqueness",
          "ZERO_CORRECT_CANDIDATE",
          `Missing matrix ${index + 1} has no candidate matching the simulated continuation.`,
        ));
      } else if (matches.length > 1) {
        optionIssues.push(issue(
          "uniqueness",
          "MULTIPLE_CORRECT_CANDIDATES",
          `Missing matrix ${index + 1} has multiple candidates matching the simulated continuation.`,
        ));
      }
      if (!distractorsArePlausibleNearNeighbours) {
        optionIssues.push(issue(
          "safety",
          "INVALID_DISTRACTOR",
          `Missing matrix ${index + 1} must use two valid one-object reasoning errors.`,
        ));
      }
      if (matches.length === 1) {
        selected.push(matches[0].id);
      }
    });
    const answerMatches = optionIssues.length === 0 &&
      selected.length === candidate.sequence.missingMatrices.length &&
      selected.every((id, index) => id === candidate.correctAnswer[index]);
    if (
      selected.length === candidate.sequence.missingMatrices.length &&
      !selected.every((id, index) => id === candidate.correctAnswer[index])
    ) {
      optionIssues.push(issue(
        "uniqueness",
        "CORRECT_ANSWER_MISMATCH",
        "The stored answer must identify the unique rendered continuation in both stages.",
      ));
    }
    checks.push(check("uniqueness", optionIssues.length === 0 && answerMatches, {
      correctCandidateIds: selected,
      contract: "canonical-rendered-matrix-v1",
    }));
    if (optionIssues.length > 0 || !answerMatches) {
      return {
        valid: false,
        issues: optionIssues,
        checks,
      };
    }

    const calculated = calculateFigureDifficulty(candidate);
    const difficultyMatches = calculated.difficulty === requestedDifficulty;
    checks.push(check("difficulty", difficultyMatches, {
      ...calculated.metrics,
      structuralSignature: figureStructuralSignature(candidate),
    }));
    if (!difficultyMatches) {
      return {
        valid: false,
        issues: [issue("difficulty", "difficulty_mismatch", `Requested ${requestedDifficulty}, calculated ${calculated.difficulty}.`)],
        checks,
      };
    }
    const explanation = explain(candidate);
    checks.push(check("explanation", explanation.length > 0));
    return {
      valid: true,
      solution: {
        correctCandidateIds: selected,
        calculatedDifficulty: calculated.difficulty,
        metrics: calculated.metrics,
        explanation,
      },
      checks,
    };
  }
}

export const figureSequenceValidator = new FigureSequenceValidator();

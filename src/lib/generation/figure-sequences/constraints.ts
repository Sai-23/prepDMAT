import { validateEvidenceDefinition } from "../../evidence";
import { validateFigureRuleCompatibility } from "./compatibility";
import { replayFigureSequenceDetailed } from "./engine";
import {
  FIGURE_HARD_CONSTRAINT_REGISTRY,
  type FigureHardConstraintId,
} from "./evidence";
import type {
  FigureFrame,
  FigureSequenceCandidate,
  FigureSymbolRuleSet,
} from "./types";
import { validateFigureFrameStructure } from "./validation";

export type FigureConstraintIssue = {
  constraint: FigureHardConstraintId | "EVIDENCE_COMPATIBILITY" | "PEDAGOGICAL_SIGNAL";
  message: string;
};

function frameIds(frame: FigureFrame): string {
  return frame.symbols.map((symbol) => symbol.id).sort().join("|");
}

function isBoundaryCell(
  frame: FigureFrame,
  symbolId: string,
  rows: number,
  columns: number,
): boolean {
  const symbol = frame.symbols.find((item) => item.id === symbolId);
  return Boolean(symbol && (
    symbol.row === 0 || symbol.column === 0 ||
    symbol.row === rows - 1 || symbol.column === columns - 1
  ));
}

function diagonalLockValid(
  rule: FigureSymbolRuleSet,
  frames: readonly FigureFrame[],
): boolean {
  if (rule.movement?.kind === "direction_cycle") {
    return rule.movement.directions.every((direction) => !direction.includes("_"));
  }
  if (rule.movement?.kind !== "linear" || !rule.movement.direction.includes("_")) return true;
  return frames.slice(1).every((frame) => {
    const symbol = frame.symbols.find((item) => item.id === rule.symbolId);
    return symbol?.motionState &&
      Math.abs(symbol.motionState.rowDelta) === 1 &&
      Math.abs(symbol.motionState.columnDelta) === 1;
  });
}

export function validateFigureHardConstraints(
  candidate: FigureSequenceCandidate,
): readonly FigureConstraintIssue[] {
  const issues: FigureConstraintIssue[] = [];
  for (const constraint of FIGURE_HARD_CONSTRAINT_REGISTRY) {
    if (!constraint.productionEnabled || !validateEvidenceDefinition(constraint).valid) {
      issues.push({
        constraint: "EVIDENCE_COMPATIBILITY",
        message: `Hard constraint ${constraint.id} lacks valid production evidence.`,
      });
    }
  }
  candidate.structuredData.rules.forEach((rule) => {
    const compatibility = validateFigureRuleCompatibility(rule);
    if (!compatibility.valid) {
      issues.push({
        constraint: "EVIDENCE_COMPATIBILITY",
        message: `${rule.symbolId}: ${compatibility.issues.join(" ")}`,
      });
    }
  });

  const officialFrames = [
    ...candidate.structuredData.visibleFrames,
    ...candidate.solutionFrames,
  ];
  const optionFrames = candidate.sequence.missingMatrices.flatMap((matrix) =>
    matrix.candidates.map((option) => option.frame));
  const allFrames = [...officialFrames, ...optionFrames];
  const initialIds = frameIds(officialFrames[0]);
  if (!initialIds || allFrames.some((frame) => frameIds(frame) !== initialIds)) {
    issues.push({
      constraint: "OBJECTS_CANNOT_DISAPPEAR",
      message: "Every visible, continuation, and option frame must preserve exactly the initial object identities.",
    });
  }
  const structuralFailures = allFrames.flatMap((frame) => {
    const result = validateFigureFrameStructure(candidate.structuredData.grid, frame);
    return result.valid ? [] : result.issues;
  });
  if (structuralFailures.some((message) => /overlap/i.test(message))) {
    issues.push({ constraint: "OBJECTS_CANNOT_OVERLAP", message: "No frame may contain overlapping objects." });
  }
  if (structuralFailures.some((message) => /outside/i.test(message))) {
    issues.push({ constraint: "OBJECTS_CANNOT_LEAVE_GRID", message: "No object may leave the matrix." });
  }
  if (structuralFailures.length && !issues.some((issue) =>
    issue.constraint === "OBJECTS_CANNOT_OVERLAP" || issue.constraint === "OBJECTS_CANNOT_LEAVE_GRID")) {
    issues.push({ constraint: "OBJECTS_CANNOT_DISAPPEAR", message: structuralFailures.join(" ") });
  }

  let simulation;
  try {
    simulation = replayFigureSequenceDetailed(
      candidate.structuredData.grid,
      candidate.structuredData.visibleFrames[0],
      candidate.structuredData.rules,
      5,
    );
  } catch (error) {
    issues.push({
      constraint: "BOUNDARY_REQUIRES_VALID_BEHAVIOR",
      message: error instanceof Error ? error.message : "Independent simulation rejected boundary behavior.",
    });
    return issues;
  }
  if (candidate.structuredData.rules.some((rule) =>
    !diagonalLockValid(rule, simulation.frames))) {
    issues.push({
      constraint: "DIAGONAL_MOVEMENT_TYPE_LOCK",
      message: "Diagonal movement must remain diagonal through every transition and bounce.",
    });
  }
  for (const rule of candidate.structuredData.rules) {
    if (rule.movement?.kind === "border" && !simulation.frames.every((frame) =>
      isBoundaryCell(
        frame,
        rule.symbolId,
        candidate.structuredData.grid.rows,
        candidate.structuredData.grid.columns,
      ))) {
      issues.push({
        constraint: "BOUNDARY_REQUIRES_VALID_BEHAVIOR",
        message: `Boundary-follow object ${rule.symbolId} left the outer boundary.`,
      });
    }
    if (rule.movement?.kind !== "border" && rule.movement?.boundary !== "bounce") {
      issues.push({
        constraint: "BOUNDARY_REQUIRES_VALID_BEHAVIOR",
        message: `Object ${rule.symbolId} does not use a production-supported boundary policy.`,
      });
    }
  }
  return issues;
}

export function validateFigurePedagogicalSignals(
  candidate: FigureSequenceCandidate,
): readonly FigureConstraintIssue[] {
  const issues: FigureConstraintIssue[] = [];
  const visibleFrames = candidate.structuredData.visibleFrames;
  const simulation = replayFigureSequenceDetailed(
    candidate.structuredData.grid,
    visibleFrames[0],
    candidate.structuredData.rules,
    3,
  );
  for (const rule of candidate.structuredData.rules) {
    const symbols = visibleFrames.map((frame) =>
      frame.symbols.find((symbol) => symbol.id === rule.symbolId));
    if (rule.movement && new Set(symbols.map((symbol) =>
      symbol ? `${symbol.row}:${symbol.column}` : "missing")).size < 2) {
      issues.push({ constraint: "PEDAGOGICAL_SIGNAL", message: `${rule.symbolId} movement is not visible.` });
    }
    if (
      rule.movement?.kind !== "border" &&
      !simulation.boundaryEvents.some((event) =>
        event.symbolId === rule.symbolId && event.behavior === "bounce")
    ) {
      issues.push({ constraint: "PEDAGOGICAL_SIGNAL", message: `${rule.symbolId} never demonstrates its bounce behavior in the visible sequence.` });
    }
    if (rule.rotation) {
      if (symbols.some((symbol) => symbol?.shape === "circle") ||
          new Set(symbols.map((symbol) => symbol?.orientation)).size < 2) {
        issues.push({ constraint: "PEDAGOGICAL_SIGNAL", message: `${rule.symbolId} rotation is not visually observable.` });
      }
    }
    if (rule.colour && new Set(symbols.map((symbol) => symbol?.color)).size < 2) {
      issues.push({ constraint: "PEDAGOGICAL_SIGNAL", message: `${rule.symbolId} colour rule is not inferable from visible changes.` });
    }
  }
  return issues;
}


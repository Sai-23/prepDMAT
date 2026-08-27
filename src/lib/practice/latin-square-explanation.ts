import {
  type CompletedLatinGrid,
  type LatinCoordinate,
  type LatinSquareStructuredData,
  type LatinSymbol,
  type VisibleLatinGrid,
} from "../generation/latin-squares";
import type {
  LatinExplanationTrace,
  VerifiedLatinDeduction,
} from "./latin-square-explanation-trace";

const LATIN_EXPLANATION_TRACE_VERSION = "latin-square-explanation-trace@1";
const LATIN_SQUARE_SIZE = 5;
const LATIN_SYMBOLS = ["A", "B", "C", "D", "E"] as const;

export type LatinExplanationStepType =
  | "intermediate"
  | "target_row"
  | "target_column"
  | "compare"
  | "resolve_target"
  | "final";

export type LatinExplanationStep = {
  id: string;
  type: LatinExplanationStepType;
  eyebrow: string;
  title: string;
  coordinate: LatinCoordinate;
  symbol: LatinSymbol;
  highlightRow: boolean;
  highlightColumn: boolean;
  rowExisting: LatinSymbol[];
  columnExisting: LatinSymbol[];
  rowCandidates: LatinSymbol[];
  columnCandidates: LatinSymbol[];
  commonCandidates: LatinSymbol[];
  eliminatedCandidates: LatinSymbol[];
  previewGrid: VisibleLatinGrid;
  placementScope: "row" | "column" | null;
  placementOptions: LatinCoordinate[];
  isTarget: boolean;
};

export type LatinWalkthroughSummary = {
  target: LatinCoordinate;
  answer: LatinSymbol;
  rowCandidates: LatinSymbol[];
  columnCandidates: LatinSymbol[];
  commonCandidates: LatinSymbol[];
  finalReason: "intersection" | "only_position_in_row" | "only_position_in_column";
};

export type LatinWalkthrough = {
  valid: boolean;
  steps: LatinExplanationStep[];
  completedGrid: CompletedLatinGrid | null;
  summary: LatinWalkthroughSummary | null;
  fallbackMessage: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isLatinSymbol(value: unknown): value is LatinSymbol {
  return typeof value === "string" && LATIN_SYMBOLS.includes(value as LatinSymbol);
}

function validTrace(value: unknown): value is LatinExplanationTrace {
  const trace = record(value);
  return trace?.version === LATIN_EXPLANATION_TRACE_VERSION &&
    isLatinSymbol(trace.answer) && Array.isArray(trace.deductions) && trace.deductions.length > 0 &&
    Array.isArray(trace.completedGrid) && trace.completedGrid.length === LATIN_SQUARE_SIZE &&
    trace.completedGrid.every((row) => Array.isArray(row) && row.length === LATIN_SQUARE_SIZE && row.every(isLatinSymbol));
}

function commonStep(
  evidence: VerifiedLatinDeduction,
  type: LatinExplanationStepType,
): Omit<LatinExplanationStep, "id" | "eyebrow" | "title" | "highlightRow" | "highlightColumn"> {
  return {
    type,
    coordinate: evidence.coordinate,
    symbol: evidence.symbol,
    rowExisting: evidence.rowExisting,
    columnExisting: evidence.columnExisting,
    rowCandidates: evidence.rowCandidates,
    columnCandidates: evidence.columnCandidates,
    commonCandidates: evidence.commonCandidates,
    eliminatedCandidates: evidence.eliminatedCandidates,
    previewGrid: evidence.gridBefore,
    placementScope: evidence.placementScope,
    placementOptions: evidence.placementOptions,
    isTarget: evidence.isTarget,
  };
}

function intermediateStep(evidence: VerifiedLatinDeduction, index: number): LatinExplanationStep {
  const row = evidence.coordinate.row + 1;
  const column = evidence.coordinate.column + 1;
  return {
    ...commonStep(evidence, "intermediate"),
    id: `intermediate:${index}:${evidence.coordinate.row}:${evidence.coordinate.column}`,
    eyebrow: "RESOLVE A USEFUL CELL",
    title: `Place ${evidence.symbol} at Row ${row}, Column ${column}`,
    highlightRow: evidence.placementScope !== "column",
    highlightColumn: evidence.placementScope !== "row",
    previewGrid: evidence.gridAfter,
  };
}

function targetSteps(
  evidence: VerifiedLatinDeduction,
): { steps: LatinExplanationStep[]; summary: LatinWalkthroughSummary } {
  const row = evidence.coordinate.row + 1;
  const column = evidence.coordinate.column + 1;
  const base = commonStep(evidence, "target_row");
  const steps: LatinExplanationStep[] = [
    { ...base, id: "target-row", type: "target_row", eyebrow: "LOOK AT THE ROW", title: `Look at Row ${row}`, highlightRow: true, highlightColumn: false },
    { ...base, id: "target-column", type: "target_column", eyebrow: "CHECK THE COLUMN", title: `Check Column ${column}`, highlightRow: false, highlightColumn: true },
    { ...base, id: "compare-options", type: "compare", eyebrow: "COMPARE THE TWO SETS", title: `Compare Row ${row} and Column ${column}`, highlightRow: true, highlightColumn: true },
  ];
  if (evidence.commonCandidates.length > 1 && evidence.placementScope) {
    steps.push({
      ...base,
      id: "resolve-target",
      type: "resolve_target",
      eyebrow: "ONE LAST CHECK",
      title: evidence.placementScope === "row"
        ? `Find where ${evidence.symbol} fits in Row ${row}`
        : `Find where ${evidence.symbol} fits in Column ${column}`,
      highlightRow: evidence.placementScope === "row",
      highlightColumn: evidence.placementScope === "column",
    });
  }
  steps.push({
    ...base,
    id: "final-answer",
    type: "final",
    eyebrow: "FINAL ANSWER",
    title: `So, the ? cell is ${evidence.symbol}`,
    highlightRow: true,
    highlightColumn: true,
    previewGrid: evidence.gridAfter,
  });
  return {
    steps,
    summary: {
      target: evidence.coordinate,
      answer: evidence.symbol,
      rowCandidates: evidence.rowCandidates,
      columnCandidates: evidence.columnCandidates,
      commonCandidates: evidence.commonCandidates,
      finalReason: evidence.placementScope === "row"
        ? "only_position_in_row"
        : evidence.placementScope === "column" ? "only_position_in_column" : "intersection",
    },
  };
}

function fallback(correctAnswer: unknown): LatinWalkthrough {
  return {
    valid: false,
    steps: [],
    completedGrid: null,
    summary: null,
    fallbackMessage: isLatinSymbol(correctAnswer)
      ? `The verified answer is ${correctAnswer}. A detailed walkthrough is unavailable for this earlier question.`
      : "The verified answer is unavailable.",
  };
}

export function buildLatinSquareWalkthrough(
  data: LatinSquareStructuredData,
  rawTrace: unknown,
  correctAnswer: unknown,
): LatinWalkthrough {
  if (!validTrace(rawTrace) || rawTrace.answer !== correctAnswer ||
    rawTrace.target.row !== data.target.row || rawTrace.target.column !== data.target.column) {
    return fallback(correctAnswer);
  }
  const targetIndex = rawTrace.deductions.findIndex((deduction) => deduction.isTarget);
  if (targetIndex !== rawTrace.deductions.length - 1) return fallback(correctAnswer);
  const target = rawTrace.deductions[targetIndex];
  const targetPresentation = targetSteps(target);
  return {
    valid: true,
    steps: [
      ...rawTrace.deductions.slice(0, targetIndex).map(intermediateStep),
      ...targetPresentation.steps,
    ],
    completedGrid: rawTrace.completedGrid,
    summary: targetPresentation.summary,
    fallbackMessage: null,
  };
}

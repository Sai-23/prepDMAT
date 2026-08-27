import type { GenerationDifficulty } from "../generation/types";
import type { FigureSequencePresentation } from "../generation/figure-sequences";
import type {
  MathematicalEquationStructuredData,
  VariableAssignment,
} from "../generation/mathematical-equations";
import type {
  LatinDeduction,
  LatinSquareStructuredData,
  LatinSymbol,
} from "../generation/latin-squares";
import { buildFigureSequenceWalkthrough } from "./figure-sequence-explanation";
import { buildMathematicalEquationWalkthrough } from "./mathematical-equation-explanation";
import { buildLatinSquareWalkthrough } from "./latin-square-explanation";

export const EDUCATIONAL_EXPLANATION_VERSION = "educational-explanation@1" as const;

export type ExplanationModule =
  | "figure_sequence"
  | "mathematical_equation"
  | "latin_square";

export type ExplanationReference = {
  kind: "object" | "frame" | "variable" | "equation" | "cell" | "rule";
  id: string;
  label: string;
};

export type EducationalExplanationStep = {
  id: string;
  title: string;
  description: string;
  references: ExplanationReference[];
  visual?: Record<string, unknown>;
};

export type EducationalExplanation = {
  version: typeof EDUCATIONAL_EXPLANATION_VERSION;
  module: ExplanationModule;
  difficulty: GenerationDifficulty;
  summary: string;
  observation: string;
  steps: EducationalExplanationStep[];
  answerConclusion: string;
  takeaway: string;
  reasoningClassification: string;
  validation: {
    replayable: true;
    source: "simulator" | "solver" | "deduction_graph";
  };
};

export type MistakeFeedback = {
  supported: boolean;
  title: string;
  description: string;
  references: ExplanationReference[];
};

function difficultyOf(value: unknown): GenerationDifficulty {
  return value === "easy" || value === "medium" || value === "hard" ? value : "medium";
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function coordinateId(row: number, column: number): string {
  return `${row}:${column}`;
}

export function isEducationalExplanation(value: unknown): value is EducationalExplanation {
  const item = record(value);
  if (
    item?.version !== EDUCATIONAL_EXPLANATION_VERSION ||
    !["figure_sequence", "mathematical_equation", "latin_square"].includes(String(item.module)) ||
    !["easy", "medium", "hard"].includes(String(item.difficulty)) ||
    typeof item.summary !== "string" ||
    typeof item.observation !== "string" ||
    typeof item.answerConclusion !== "string" ||
    typeof item.takeaway !== "string" ||
    typeof item.reasoningClassification !== "string" ||
    !Array.isArray(item.steps) || !item.steps.length
  ) return false;
  const validation = record(item.validation);
  return validation?.replayable === true &&
    ["simulator", "solver", "deduction_graph"].includes(String(validation.source)) &&
    item.steps.every((rawStep) => {
      const step = record(rawStep);
      return typeof step?.id === "string" && typeof step.title === "string" &&
        typeof step.description === "string" && Array.isArray(step.references);
    });
}

export function buildFigureEducationalExplanation(
  sequence: FigureSequencePresentation,
  trace: unknown,
  correctAnswer: unknown,
  difficulty?: unknown,
): EducationalExplanation | null {
  const walkthrough = buildFigureSequenceWalkthrough(sequence, trace, correctAnswer);
  if (!walkthrough.valid || walkthrough.steps.length < 3) return null;
  const ruleSteps = walkthrough.steps.filter((step) => step.type === "track_symbol");
  const predictionSteps = walkthrough.steps.filter((step) => step.type === "match_option");
  const correct = walkthrough.correctLabels.map((label, index) => `matrix ${index + 1}: Option ${label}`).join("; ");
  return {
    version: EDUCATIONAL_EXPLANATION_VERSION,
    module: "figure_sequence",
    difficulty: difficultyOf(difficulty),
    summary: `Track ${walkthrough.rules.length === 1 ? "the object" : "each object separately"}, then apply every verified rule to both missing frames.`,
    observation: walkthrough.rules.map((rule) => rule.summary).join(" "),
    steps: [
      ...ruleSteps.map((step) => ({
        id: step.id,
        title: step.title,
        description: `${step.ruleSummary} Check the same change across every simulated transition.`,
        references: [
          { kind: "object" as const, id: step.activeSymbolId, label: step.symbolLabel },
          { kind: "rule" as const, id: step.id, label: step.ruleSummary },
        ],
        visual: { transitionCount: step.transitions.length },
      })),
      ...predictionSteps.map((step) => ({
        id: step.id,
        title: step.title,
        description: `${step.instruction} The simulated result matches Option ${step.correctOptionLabel}.`,
        references: [
          { kind: "frame" as const, id: String(step.beforeFrame.index), label: `Frame ${step.beforeFrame.index + 1}` },
          { kind: "frame" as const, id: String(step.afterFrame.index), label: `Frame ${step.afterFrame.index + 1}` },
        ],
        visual: { missingIndex: step.missingIndex },
      })),
    ],
    answerConclusion: `The verified continuation is ${correct}.`,
    takeaway: walkthrough.rules.length > 1
      ? "Keep one rule stream per object; combine the streams only after each one is clear."
      : "Confirm a rule across the whole sequence before using it to predict the missing frames.",
    reasoningClassification: walkthrough.rules.length > 1 ? "independent_object_streams" : "single_object_transformation",
    validation: { replayable: true, source: "simulator" },
  };
}

export function buildEquationEducationalExplanation(
  data: MathematicalEquationStructuredData,
  trace: unknown,
  correctAnswer: unknown,
  difficulty?: unknown,
): EducationalExplanation | null {
  const walkthrough = buildMathematicalEquationWalkthrough(data, trace, correctAnswer);
  if (!walkthrough.valid || !walkthrough.assignment || !walkthrough.steps.length) return null;
  const assignment = walkthrough.assignment;
  const first = walkthrough.steps[0];
  const combined = walkthrough.steps.some((step) =>
    step.operation === "ADD_EQUATIONS" ||
    step.operation === "SUBTRACT_EQUATIONS" ||
    step.operation === "ELIMINATION");
  return {
    version: EDUCATIONAL_EXPLANATION_VERSION,
    module: "mathematical_equation",
    difficulty: difficultyOf(difficulty),
    summary: `Start with ${first.targetSymbol}, then use each solved value to unlock the next relationship.`,
    observation: combined
      ? "No single relationship gives the first value, so two relationships must be combined."
      : `The first useful relationship isolates ${first.targetSymbol} with no unresolved dependency.`,
    steps: walkthrough.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: `${step.instruction} ${step.expressionBefore} becomes ${step.expressionAfter}.`,
      references: [
        ...step.activeEquationIndices.map((index) => ({ kind: "equation" as const, id: String(index), label: `Equation ${index + 1}` })),
        { kind: "variable" as const, id: step.targetSymbol, label: step.targetSymbol },
      ],
      visual: { equationIndices: step.activeEquationIndices, targetSymbol: step.targetSymbol },
    })),
    answerConclusion: `Therefore ${data.variables.map((symbol) => `${symbol} = ${assignment[symbol]}`).join(", ")}.`,
    takeaway: combined
      ? "When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward."
      : "Choose the relationship with the fewest unknowns first, then substitute solved values forward.",
    reasoningClassification: combined ? "combine_then_substitute" : "dependency_order_substitution",
    validation: { replayable: true, source: "solver" },
  };
}

export function buildLatinEducationalExplanation(
  data: LatinSquareStructuredData,
  trace: unknown,
  correctAnswer: unknown,
  difficulty?: unknown,
): EducationalExplanation | null {
  const walkthrough = buildLatinSquareWalkthrough(data, trace, correctAnswer);
  if (!walkthrough.valid || !walkthrough.summary || !walkthrough.steps.length) return null;
  const target = walkthrough.summary.target;
  const intermediateCount = walkthrough.steps.filter((step) => step.type === "intermediate").length;
  return {
    version: EDUCATIONAL_EXPLANATION_VERSION,
    module: "latin_square",
    difficulty: difficultyOf(difficulty),
    summary: intermediateCount
      ? `Resolve ${intermediateCount} required ${intermediateCount === 1 ? "cell" : "cells"}, then return to the target.`
      : "Compare the symbols missing from the target row and target column.",
    observation: `The target is Row ${target.row + 1}, Column ${target.column + 1}; only its causal deduction path is needed.`,
    steps: walkthrough.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: latinStepDescription(step),
      references: [{
        kind: "cell" as const,
        id: coordinateId(step.coordinate.row, step.coordinate.column),
        label: `Row ${step.coordinate.row + 1}, Column ${step.coordinate.column + 1}`,
      }],
      visual: {
        coordinate: step.coordinate,
        rowCandidates: step.rowCandidates,
        columnCandidates: step.columnCandidates,
      },
    })),
    answerConclusion: `The target cell is ${walkthrough.summary.answer}.`,
    takeaway: intermediateCount
      ? "If the target is not forced yet, solve only the cells that remove a target candidate."
      : "A target value must satisfy both its row and its column at the same time.",
    reasoningClassification: intermediateCount ? "causal_dependency_closure" : "row_column_intersection",
    validation: { replayable: true, source: "deduction_graph" },
  };
}

function latinStepDescription(step: ReturnType<typeof buildLatinSquareWalkthrough>["steps"][number]): string {
  if (step.type === "intermediate") {
    return `At Row ${step.coordinate.row + 1}, Column ${step.coordinate.column + 1}, the verified candidates reduce to ${step.symbol}; place it because the target depends on this cell.`;
  }
  if (step.type === "target_row") return `The target row is missing ${step.rowCandidates.join(", ")}.`;
  if (step.type === "target_column") return `The target column is missing ${step.columnCandidates.join(", ")}.`;
  if (step.type === "compare") return `Compare both lists: ${step.commonCandidates.join(", ")} remain valid in both.`;
  if (step.type === "resolve_target") return `The only valid position check forces ${step.symbol} into the target.`;
  return `Both row and column constraints force ${step.symbol} at the target.`;
}

export function diagnoseFigureMistake(
  sequence: FigureSequencePresentation,
  selectedAnswer: readonly string[],
  correctAnswer: unknown,
): MistakeFeedback | null {
  const expected = Array.isArray(correctAnswer) ? correctAnswer.map(String) : [];
  const failedIndex = expected.findIndex((id, index) => selectedAnswer[index] !== id);
  if (failedIndex < 0) return null;
  const matrix = sequence.missingMatrices[failedIndex];
  const selected = matrix?.candidates.find((candidate) => candidate.id === selectedAnswer[failedIndex]);
  const correct = matrix?.candidates.find((candidate) => candidate.id === expected[failedIndex]);
  if (!selected || !correct) return neutralMistake("Recheck the continuation", "Apply every object rule to the preceding frame before matching an option.");
  const selectedById = new Map(selected.frame.symbols.map((symbol) => [symbol.id, symbol]));
  const differences = new Set<string>();
  for (const target of correct.frame.symbols) {
    const actual = selectedById.get(target.id);
    if (!actual || actual.row !== target.row || actual.column !== target.column) differences.add("position");
    if (!actual || actual.orientation !== target.orientation) differences.add("orientation");
    if (!actual || actual.color !== target.color) differences.add("colour");
  }
  const labels = [...differences];
  return {
    supported: true,
    title: `Recheck ${labels.join(" and ") || "the object states"}`,
    description: `In missing matrix ${failedIndex + 1}, your option differs from the simulated result in ${labels.join(" and ") || "one or more object states"}.`,
    references: [{ kind: "frame", id: String(matrix.sequenceIndex), label: `Missing matrix ${failedIndex + 1}` }],
  };
}

export function diagnoseEquationMistake(
  data: MathematicalEquationStructuredData,
  trace: unknown,
  selectedAnswer: Readonly<Partial<VariableAssignment>>,
  correctAnswer: unknown,
): MistakeFeedback | null {
  const expected = record(correctAnswer) as VariableAssignment | null;
  const walkthrough = buildMathematicalEquationWalkthrough(data, trace, correctAnswer);
  if (!expected || !walkthrough.valid) return neutralMistake("Recheck the values", "Work through the verified relationship order and test every value in the original equations.");
  const wrong = data.variables.filter((symbol) => selectedAnswer[symbol] !== expected[symbol]);
  if (!wrong.length) return null;
  if (wrong.length === 2 && selectedAnswer[wrong[0]] === expected[wrong[1]] && selectedAnswer[wrong[1]] === expected[wrong[0]]) {
    return {
      supported: true,
      title: "Two values were swapped",
      description: `${wrong[0]} and ${wrong[1]} have the right two numbers, but they are assigned to the opposite letters.`,
      references: wrong.map((symbol) => ({ kind: "variable", id: symbol, label: symbol })),
    };
  }
  const firstWrongStep = walkthrough.steps.find((step) => wrong.includes(step.targetSymbol));
  if (!firstWrongStep) return neutralMistake("Recheck the values", "Substitute your values into every original relationship.");
  return {
    supported: true,
    title: `Recheck ${firstWrongStep.targetSymbol} first`,
    description: `This is the earliest value in the verified solve order that differs. Rework ${firstWrongStep.activeEquationIndices.map((index) => `Equation ${index + 1}`).join(" and ")} before carrying values forward.`,
    references: [
      { kind: "variable", id: firstWrongStep.targetSymbol, label: firstWrongStep.targetSymbol },
      ...firstWrongStep.activeEquationIndices.map((index) => ({ kind: "equation" as const, id: String(index), label: `Equation ${index + 1}` })),
    ],
  };
}

export function diagnoseLatinMistake(
  data: LatinSquareStructuredData,
  trace: unknown,
  selectedAnswer: string | null,
  correctAnswer: unknown,
): MistakeFeedback | null {
  if (!selectedAnswer || selectedAnswer === correctAnswer) return null;
  const symbol = selectedAnswer as LatinSymbol;
  const rowConflict = data.grid[data.target.row].includes(symbol);
  const columnConflict = data.grid.some((row) => row[data.target.column] === symbol);
  if (rowConflict || columnConflict) {
    const scope = rowConflict && columnConflict ? "row and column" : rowConflict ? "row" : "column";
    return {
      supported: true,
      title: `The ${scope} already contains ${symbol}`,
      description: `A symbol can appear only once in each row and column, so ${symbol} is eliminated from the target.`,
      references: [{ kind: "cell", id: coordinateId(data.target.row, data.target.column), label: "Target cell" }],
    };
  }
  const parsed = Array.isArray(trace) ? trace.filter((item): item is LatinDeduction => Boolean(record(item))) : [];
  const target = parsed.find((deduction) => deduction.coordinate?.row === data.target.row && deduction.coordinate?.column === data.target.column);
  if (target?.eliminatedCandidates?.includes(symbol)) {
    return {
      supported: true,
      title: `${symbol} is removed by the deduction path`,
      description: target.dependencies.length
        ? `The target's first row-and-column check is not enough; resolve the highlighted dependency cells, then ${symbol} is eliminated.`
        : `The verified row-and-column candidate check eliminates ${symbol}.`,
      references: target.dependencies.map((coordinate) => ({
        kind: "cell" as const,
        id: coordinateId(coordinate.row, coordinate.column),
        label: `Row ${coordinate.row + 1}, Column ${coordinate.column + 1}`,
      })),
    };
  }
  return neutralMistake("Follow the target's deduction path", "Check the target row and column, then resolve only the highlighted dependency cells.");
}

function neutralMistake(title: string, description: string): MistakeFeedback {
  return { supported: false, title, description, references: [] };
}

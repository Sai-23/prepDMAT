import type {
  GenerationCandidate,
  GenerationConfiguration,
  GeneratedQuestion,
  GenerationDifficulty,
} from "../types";
import type { LatinDeductionMechanismId } from "./evidence";

export const LATIN_SQUARE_GENERATOR_VERSION = "latin-squares@4.0.0";
export const LATIN_SQUARE_SOLVER_VERSION = "latin-squares-solver@3.0.0";
export const LATIN_SQUARE_VALIDATOR_VERSION = "latin-squares-validator@3.0.0";
export const LATIN_SQUARE_SIZE = 5 as const;
export const DEFAULT_LATIN_SYMBOLS = ["A", "B", "C", "D", "E"] as const;

export type LatinSymbol = (typeof DEFAULT_LATIN_SYMBOLS)[number];
export type LatinCoordinate = { row: number; column: number };
export type CompletedLatinGrid = LatinSymbol[][];
export type VisibleLatinGrid = Array<Array<LatinSymbol | null>>;

export type LatinSquareStructuredData = {
  size: typeof LATIN_SQUARE_SIZE;
  symbols: LatinSymbol[];
  grid: VisibleLatinGrid;
  target: LatinCoordinate;
};

export type LatinSquareCandidate = GenerationCandidate<
  LatinSquareStructuredData,
  LatinSymbol
> & {
  questionType: "latin_square";
  module: "core";
  completedGrid: CompletedLatinGrid;
};

export type LatinSquareQuestion = GeneratedQuestion<
  LatinSquareStructuredData,
  LatinSymbol
> & {
  questionType: "latin_square";
  module: "core";
  completedGrid: CompletedLatinGrid;
  deductionTrace: LatinDeduction[];
};

export type LatinSquareGenerationConfiguration = GenerationConfiguration & {
  difficulty: "easy" | "medium" | "hard";
};

export type LatinDeductionReason =
  | "single_candidate"
  | "only_position_in_row"
  | "only_position_in_column";

export type LatinDeductionAxis = "row" | "column" | "both";

export type LatinDeduction = {
  coordinate: LatinCoordinate;
  symbol: LatinSymbol;
  reason: LatinDeductionReason;
  round: number;
  depth: number;
  axis: LatinDeductionAxis;
  dependencies: LatinCoordinate[];
  clueDependencies: LatinCoordinate[];
  candidatesBefore: LatinSymbol[];
  eliminatedCandidates: LatinSymbol[];
};

export type LatinTargetClassification = "direct" | "indirect" | "multi_stage";

export type LatinDeductionAnalysis = {
  deductions: LatinDeduction[];
  targetInitialCandidateCount: number;
  directRowEliminations: number;
  directColumnEliminations: number;
};

export type LatinTargetSolverOutcome = {
  status: "none" | "unique" | "multiple" | "invalid";
  possibleTargetSymbols: LatinSymbol[];
  exploredAssignments: number;
  fullGridSolutionCount: number;
  fullGridSolutionCountCapped: boolean;
  reason: string | null;
};

export type LatinDifficultyMetrics = {
  targetStepIndex: number;
  targetDepth: number;
  targetRound: number;
  totalDeductions: number;
  visibleClues: number;
  targetInitialCandidateCount: number;
  directRowEliminations: number;
  directColumnEliminations: number;
  forcedPlacementsBeforeTarget: number;
  rowDependencyCount: number;
  columnDependencyCount: number;
  usefulClueCount: number;
  clueDistanceFromTarget: number;
  workingMemoryLoad: number;
  classification: LatinTargetClassification;
  reasoningClassification: LatinDeductionMechanismId;
  totalForcedCells: number;
  requiredIntermediateCells: number;
  maxDeductionDepth: number;
  branchingFactor: number;
  rowColumnAlternations: number;
  candidateEliminations: number;
  relevantClueCount: number;
  irrelevantClueCount: number;
  essentialClueCount: number;
  redundantClueCount: number;
  redundancyRatio: number;
  score: number;
};

export type LatinValidationSolution = {
  targetSymbol: LatinSymbol;
  calculatedDifficulty: GenerationDifficulty;
  metrics: LatinDifficultyMetrics;
  deductions: LatinDeduction[];
  explanation: string;
  exploredAssignments: number;
  fullGridSolutionCount: number;
  fullGridSolutionCountCapped: boolean;
};

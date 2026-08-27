import type {
  GenerationCandidate,
  GenerationConfiguration,
  GeneratedQuestion,
  GenerationDifficulty,
} from "../types";

export const FIGURE_SEQUENCE_GENERATOR_VERSION = "figure-sequences@5.0.0";
export const FIGURE_SEQUENCE_VALIDATOR_VERSION = "figure-sequences-validator@4.0.0";

export const FIGURE_SHAPES = [
  "circle",
  "square",
  "triangle",
  "diamond",
  "arrow",
] as const;

export const FIGURE_COLORS = [
  "blue",
  "pink",
  "yellow",
  "orange",
  "green",
  "black",
  "white",
] as const;

export type FigureShape = (typeof FIGURE_SHAPES)[number];
export type FigureColor = (typeof FIGURE_COLORS)[number];
export type FigureFill = "solid" | "outline";
export type FigureOrientation = 0 | 90 | 180 | 270;
export type FigureDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "up_left"
  | "up_right"
  | "down_left"
  | "down_right";
export type FigureProgression = "fixed" | "incrementing";

export type FigureGridDefinition = {
  rows: number;
  columns: number;
};

export type FigureSymbolState = {
  id: string;
  shape: FigureShape;
  color: FigureColor;
  fill: FigureFill;
  orientation: FigureOrientation;
  row: number;
  column: number;
  motionState?: {
    rowDelta: -1 | 0 | 1;
    columnDelta: -1 | 0 | 1;
  };
};

export type FigureFrame = {
  index: number;
  symbols: FigureSymbolState[];
};

export type FigureCandidate = {
  id: string;
  label: string;
  frame: FigureFrame;
};

export type FigureMissingMatrix = {
  sequenceIndex: number;
  candidates: FigureCandidate[];
};

export type FigureSequencePresentation = {
  grid: FigureGridDefinition;
  visibleFrames: FigureFrame[];
  missingMatrices: [FigureMissingMatrix, FigureMissingMatrix];
};

export type FigureFrameValidation =
  | { valid: true }
  | { valid: false; issues: string[] };

export type LinearMovementRule = {
  kind: "linear";
  direction: FigureDirection;
  steps: number;
  progression: FigureProgression;
  boundary: "bounce" | "reject";
};

export type BorderMovementRule = {
  kind: "border";
  direction: "clockwise" | "counter_clockwise";
  steps: number;
  progression: FigureProgression;
};

export type DirectionCycleMovementRule = {
  kind: "direction_cycle";
  directions: FigureDirection[];
  steps: number;
  progression: FigureProgression;
  boundary: "bounce" | "reject";
};

export type FigureMovementRule =
  | LinearMovementRule
  | BorderMovementRule
  | DirectionCycleMovementRule;

export type FigureRotationRule = {
  direction: "clockwise" | "counter_clockwise";
  quarterTurns: number;
  progression: FigureProgression;
};

export type FigureColourRule = {
  cycle: FigureColor[];
  steps: number;
  progression: FigureProgression;
};

export type FigureSymbolRuleSet = {
  symbolId: string;
  movement?: FigureMovementRule;
  rotation?: FigureRotationRule;
  colour?: FigureColourRule;
};

export type FigureSequenceStructuredData = {
  grid: FigureGridDefinition;
  visibleFrames: FigureFrame[];
  rules: FigureSymbolRuleSet[];
};

export type FigureSequenceCandidate = GenerationCandidate<
  FigureSequenceStructuredData,
  string[]
> & {
  questionType: "figure_sequence";
  module: "core";
  sequence: FigureSequencePresentation;
  solutionFrames: [FigureFrame, FigureFrame];
};

export type FigureSequenceQuestion = GeneratedQuestion<
  FigureSequenceStructuredData,
  string[]
> & {
  questionType: "figure_sequence";
  module: "core";
  sequence: FigureSequencePresentation;
  solutionFrames: [FigureFrame, FigureFrame];
};

export type FigureSequenceGenerationConfiguration = GenerationConfiguration & {
  difficulty: "easy" | "medium" | "hard";
  /** Deterministic test/development override. Normal generation uses weighted profiles. */
  symbolCount?: 1 | 2 | 3 | 4;
};

export type FigureDifficultyMetrics = {
  symbolCount: number;
  movementRuleCount: number;
  attributeRuleCount: number;
  independentRuleCount: number;
  progressiveRuleCount: number;
  cycleRuleCount: number;
  borderRuleCount: number;
  orientationRuleCount: number;
  pathComplexity: number;
  cycleComplexity: number;
  advancedRuleCount: number;
  predictionDepth: number;
  distractorSimilarity: number;
  activeRuleCount: number;
  independentRuleStreams: number;
  movementComplexity: number;
  boundaryInteractionCount: number;
  combinedStatePeriod: number;
  rulePeriodMismatch: number;
  simultaneousTransformationCount: number;
  stateVariableCount: number;
  collisionAvoidanceComplexity: number;
  averageMovementPeriod: number;
  averageRotationPeriod: number;
  averageColourPeriod: number;
  trivialCycleCount: number;
  score: number;
};

export type FigureBoundaryEvent = {
  symbolId: string;
  transitionIndex: number;
  behavior: "bounce" | "follow";
  count: number;
};

export type FigureSimulation = {
  frames: FigureFrame[];
  boundaryEvents: FigureBoundaryEvent[];
};

export type FigureValidationSolution = {
  correctCandidateIds: string[];
  calculatedDifficulty: GenerationDifficulty;
  metrics: FigureDifficultyMetrics;
  explanation: string;
};

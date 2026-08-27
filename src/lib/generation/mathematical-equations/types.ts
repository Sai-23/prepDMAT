import type {
  GenerationCandidate,
  GenerationConfiguration,
  GeneratedQuestion,
  GenerationDifficulty,
  ValidationIssue,
} from "../types";
import type { EvidenceClassification } from "../../evidence";

export const MATHEMATICAL_EQUATION_GENERATOR_VERSION = "mathematical-equations@8.1.0";
export const MATHEMATICAL_EQUATION_SOLVER_VERSION = "mathematical-equations-solver@2.0.0";
export const MATHEMATICAL_EQUATION_VALIDATOR_VERSION = "mathematical-equations-validator@7.0.0";
export const MATHEMATICAL_EQUATION_DOMAIN = { minimum: 1, maximum: 20 } as const;

export type EquationVariable = string;
export type EquationOperator = "add" | "subtract" | "multiply" | "divide";

export type MathematicalExpression =
  | { kind: "constant"; value: number }
  | { kind: "variable"; symbol: EquationVariable }
  | {
      kind: "operation";
      operator: EquationOperator;
      left: MathematicalExpression;
      right: MathematicalExpression;
    };

export type MathematicalEquation = {
  left: MathematicalExpression;
  right: MathematicalExpression;
};

export type EquationStructuralFamily =
  | "direct"
  | "chain"
  | "reverse_chain"
  | "star"
  | "triangle"
  | "branch"
  | "merged"
  | "branch_recombine"
  | "cascade"
  | "mixed";

/** Compatibility alias: serialized equation evidence values remain unchanged. */
export type EquationEvidenceLevel = EvidenceClassification;

export type EquationRelationshipPrimitive =
  | "direct_value"
  | "offset_add"
  | "offset_subtract"
  | "scale"
  | "divide_by_constant"
  | "sum"
  | "difference"
  | "complement"
  | "weighted_sum"
  | "multi_variable_sum"
  | "multi_variable_balance";

export type EquationDependencyModel = {
  family: EquationStructuralFamily;
  solveOrder: EquationVariable[];
  edges: Array<{ source: EquationVariable; target: EquationVariable }>;
  hiddenGroupingCount?: number;
  relationshipReversalCount?: number;
  meaningfulReasoningSteps?: number;
  relationshipPrimitives?: EquationRelationshipPrimitive[];
  evidenceLevel?: EquationEvidenceLevel;
  rootStrategy?: "direct" | "coupled" | "global_balance";
  targetSymbol?: EquationVariable;
};

export type MathematicalEquationStructuredData = {
  variables: EquationVariable[];
  equations: MathematicalEquation[];
  domain: {
    minimum: number;
    maximum: number;
    integersOnly: true;
  };
  dependencyModel: EquationDependencyModel;
};

export type VariableAssignment = { [symbol: string]: number };

export type EquationSolutionStep = {
  equationIndex: number;
  supportingEquationIndices?: number[];
  targetSymbol: string;
  knownSymbols: string[];
  dependencySymbols?: string[];
  reasoning?: "solve_variable" | "substitute" | "combine_equations";
};

export type MathematicalEquationCandidate = GenerationCandidate<
  MathematicalEquationStructuredData,
  VariableAssignment
> & {
  questionType: "mathematical_equation";
  module: "core";
  solutionPath: EquationSolutionStep[];
  reasoningPath: string[];
  fastestMethod: string;
};

export type MathematicalEquationQuestion = GeneratedQuestion<
  MathematicalEquationStructuredData,
  VariableAssignment
> & {
  questionType: "mathematical_equation";
  module: "core";
  solutionPath: EquationSolutionStep[];
  reasoningPath: string[];
  fastestMethod: string;
};

export type MathematicalEquationGenerationConfiguration = GenerationConfiguration & {
  difficulty: "easy" | "medium" | "hard";
};

export type EquationSolverOutcome = {
  status: "none" | "unique" | "multiple" | "invalid";
  solutions: VariableAssignment[];
  exploredAssignments: number;
  reason: string | null;
};

export type EquationDifficultyMetrics = {
  variableCount: number;
  equationCount: number;
  dependencyDepth: number;
  branchingFactor: number;
  branchCount: number;
  recombinationCount: number;
  indirectCouplingCount: number;
  substitutionCount: number;
  operatorVariety: number;
  compoundExpressionCount: number;
  solveStepCount: number;
  operationCount: number;
  coefficientComplexity: number;
  directEntryPointCount: number;
  obviousEntryPointPenalty: number;
  workingMemoryEstimate: number;
  hiddenGroupingCount: number;
  relationshipReversalCount: number;
  meaningfulReasoningSteps: number;
  targetDepth: number;
  multiVariableConstraintCount: number;
  termCount: number;
  mentalArithmeticCost: number;
  score: number;
};

export type MathematicalEquationValidationSolution = {
  assignment: VariableAssignment;
  calculatedDifficulty: GenerationDifficulty;
  metrics: EquationDifficultyMetrics;
  exploredAssignments: number;
};

export type MathematicalEquationGenerationFailure = {
  attempts: number;
  lastIssues: ValidationIssue[];
};

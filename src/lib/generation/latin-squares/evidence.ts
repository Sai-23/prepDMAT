import type { EvidenceDefinition } from "../../evidence";

export const LATIN_DEDUCTION_MECHANISM_IDS = [
  "DIRECT_ROW_ELIMINATION",
  "DIRECT_COLUMN_ELIMINATION",
  "ROW_COLUMN_INTERSECTION",
  "SINGLE_INTERMEDIATE",
  "CHAINED_INTERMEDIATE",
  "MULTI_STAGE_DEDUCTION",
] as const;

export type LatinDeductionMechanismId = (typeof LATIN_DEDUCTION_MECHANISM_IDS)[number];
export type LatinDeductionEvidenceDefinition = EvidenceDefinition<LatinDeductionMechanismId> & {
  reasoningClassification: true;
};

const OFFICIAL_LATIN_SOURCES = [
  "DMAT_CURRENT_OFFICIAL",
  "TESTAS_HISTORICAL_OFFICIAL",
] as const;

function deduction(
  id: LatinDeductionMechanismId,
  confidence: LatinDeductionEvidenceDefinition["confidence"] = "very_high",
): LatinDeductionEvidenceDefinition {
  return {
    id,
    evidence: "official",
    sources: OFFICIAL_LATIN_SOURCES,
    confidence,
    productionEnabled: true,
    reasoningClassification: true,
  };
}

export const LATIN_DEDUCTION_EVIDENCE_REGISTRY = [
  deduction("DIRECT_ROW_ELIMINATION"),
  deduction("DIRECT_COLUMN_ELIMINATION"),
  deduction("ROW_COLUMN_INTERSECTION"),
  deduction("SINGLE_INTERMEDIATE"),
  deduction("CHAINED_INTERMEDIATE", "high"),
  deduction("MULTI_STAGE_DEDUCTION", "high"),
] as const;

export const LATIN_HARD_CONSTRAINT_IDS = [
  "GRID_5X5",
  "SYMBOL_SET_A_TO_E",
  "NO_REPEAT_IN_ROW",
  "NO_REPEAT_IN_COLUMN",
  "TARGET_MUST_BE_UNIQUELY_DETERMINED",
] as const;

export type LatinHardConstraintId = (typeof LATIN_HARD_CONSTRAINT_IDS)[number];
export type LatinHardConstraintDefinition = EvidenceDefinition<LatinHardConstraintId> & {
  role: "validator_constraint";
  enforcementReferences: readonly string[];
};

function constraint(
  id: LatinHardConstraintId,
  enforcementReferences: readonly string[],
): LatinHardConstraintDefinition {
  return {
    id,
    evidence: "official",
    sources: [
      "DMAT_CURRENT_OFFICIAL",
      "TESTAS_CURRENT_OFFICIAL",
      "TESTAS_HISTORICAL_OFFICIAL",
    ],
    confidence: "very_high",
    productionEnabled: true,
    role: "validator_constraint",
    enforcementReferences,
  };
}

export const LATIN_HARD_CONSTRAINT_REGISTRY = [
  constraint("GRID_5X5", ["LATIN_SQUARE_SIZE"]),
  constraint("SYMBOL_SET_A_TO_E", ["DEFAULT_LATIN_SYMBOLS"]),
  constraint("NO_REPEAT_IN_ROW", ["LatinSquareValidator.isCompletedLatinSquare", "LatinSquareSolver.hasKnownDuplicates"]),
  constraint("NO_REPEAT_IN_COLUMN", ["LatinSquareValidator.isCompletedLatinSquare", "LatinSquareSolver.hasKnownDuplicates"]),
  constraint("TARGET_MUST_BE_UNIQUELY_DETERMINED", ["LatinSquareSolver.solve", "LatinSquareValidator.validate:uniqueness"]),
] as const;

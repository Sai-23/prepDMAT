import type { EvidenceDefinition } from "../../evidence";

export const FIGURE_PRIMITIVE_IDS = [
  "MOVE_HORIZONTAL",
  "MOVE_VERTICAL",
  "MOVE_DIAGONAL",
  "MOVE_BOUNDARY_CLOCKWISE",
  "MOVE_BOUNDARY_COUNTERCLOCKWISE",
  "STEP_CONSTANT",
  "STEP_PROGRESSIVE",
  "BOUNDARY_BOUNCE",
  "BOUNDARY_FOLLOW",
  "ROTATE_CLOCKWISE",
  "ROTATE_COUNTERCLOCKWISE",
  "ROTATE_PROGRESSIVE",
  "COLOR_ALTERNATE",
  "COLOR_CYCLE",
] as const;

export type FigurePrimitiveId = (typeof FIGURE_PRIMITIVE_IDS)[number];
export type FigurePrimitiveCategory = "movement" | "step" | "boundary" | "rotation" | "color";
export type FigurePrimitiveEvidenceDefinition = EvidenceDefinition<FigurePrimitiveId> & {
  category: FigurePrimitiveCategory;
};

const OFFICIAL_FIGURE_SOURCES = [
  "DMAT_CURRENT_OFFICIAL",
  "TESTAS_HISTORICAL_OFFICIAL",
] as const;

function primitive(
  id: FigurePrimitiveId,
  category: FigurePrimitiveCategory,
): FigurePrimitiveEvidenceDefinition {
  return {
    id,
    category,
    evidence: "official",
    sources: OFFICIAL_FIGURE_SOURCES,
    confidence: "very_high",
    productionEnabled: true,
  };
}

export const FIGURE_PRIMITIVE_EVIDENCE_REGISTRY = [
  primitive("MOVE_HORIZONTAL", "movement"),
  primitive("MOVE_VERTICAL", "movement"),
  primitive("MOVE_DIAGONAL", "movement"),
  primitive("MOVE_BOUNDARY_CLOCKWISE", "movement"),
  primitive("MOVE_BOUNDARY_COUNTERCLOCKWISE", "movement"),
  primitive("STEP_CONSTANT", "step"),
  primitive("STEP_PROGRESSIVE", "step"),
  primitive("BOUNDARY_BOUNCE", "boundary"),
  primitive("BOUNDARY_FOLLOW", "boundary"),
  primitive("ROTATE_CLOCKWISE", "rotation"),
  primitive("ROTATE_COUNTERCLOCKWISE", "rotation"),
  primitive("ROTATE_PROGRESSIVE", "rotation"),
  primitive("COLOR_ALTERNATE", "color"),
  primitive("COLOR_CYCLE", "color"),
] as const;

export const FIGURE_HARD_CONSTRAINT_IDS = [
  "OBJECTS_CANNOT_DISAPPEAR",
  "OBJECTS_CANNOT_OVERLAP",
  "OBJECTS_CANNOT_LEAVE_GRID",
  "DIAGONAL_MOVEMENT_TYPE_LOCK",
  "BOUNDARY_REQUIRES_VALID_BEHAVIOR",
] as const;

export type FigureHardConstraintId = (typeof FIGURE_HARD_CONSTRAINT_IDS)[number];
export type FigureHardConstraintDefinition = EvidenceDefinition<FigureHardConstraintId> & {
  role: "validator_constraint";
  enforcementReferences: readonly string[];
};

function constraint(
  id: FigureHardConstraintId,
  enforcementReferences: readonly string[],
): FigureHardConstraintDefinition {
  return {
    id,
    evidence: "official",
    sources: OFFICIAL_FIGURE_SOURCES,
    confidence: "very_high",
    productionEnabled: true,
    role: "validator_constraint",
    enforcementReferences,
  };
}

export const FIGURE_HARD_CONSTRAINT_REGISTRY = [
  constraint("OBJECTS_CANNOT_DISAPPEAR", ["FigureSequenceValidator.validate:domain"]),
  constraint("OBJECTS_CANNOT_OVERLAP", ["validateFigureFrameStructure:positions"]),
  constraint("OBJECTS_CANNOT_LEAVE_GRID", ["validateFigureFrameStructure:grid-bounds"]),
  constraint("DIAGONAL_MOVEMENT_TYPE_LOCK", ["evolveFigureFrame:motionState"]),
  constraint("BOUNDARY_REQUIRES_VALID_BEHAVIOR", ["evolveFigureFrame:boundary-policy"]),
] as const;

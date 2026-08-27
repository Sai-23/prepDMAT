import type {
  EquationEvidenceLevel,
  EquationRelationshipPrimitive,
  EquationStructuralFamily,
} from "./types";
import type {
  ClassifiedEvidenceDefinition,
  EvidenceConfidence,
  EvidenceDefinition,
  EvidenceSourceProvenance,
} from "../../evidence";

export const MATHEMATICAL_EQUATION_EVIDENCE_SOURCES = {
  official2026: {
    id: "dmat-preparatory-materials-2026-07",
    level: "official" as const,
    description: "Official dMAT Core Mathematical Equations exercises and worked solutions.",
  },
  linearComposition: {
    id: "linear-system-composition",
    level: "official_composition" as const,
    description: "New arrangements composed only from arithmetic primitives demonstrated by official material.",
  },
  pairwiseLinear: {
    id: "pairwise-linear-system-structure",
    level: "third_party_supported" as const,
    description: "Pairwise linear constraints using no arithmetic beyond official primitives.",
  },
} as const;

export type RelationshipDefinition = ClassifiedEvidenceDefinition<EquationRelationshipPrimitive> & {
  parentCount: 0 | 1 | 2 | 3;
};

export const EQUATION_RELATIONSHIP_REGISTRY: readonly RelationshipDefinition[] = [
  { id: "direct_value", evidence: "official", productionEnabled: true, parentCount: 0 },
  { id: "offset_add", evidence: "official", productionEnabled: true, parentCount: 1 },
  { id: "offset_subtract", evidence: "official", productionEnabled: true, parentCount: 1 },
  { id: "scale", evidence: "official", productionEnabled: true, parentCount: 1 },
  { id: "divide_by_constant", evidence: "official", productionEnabled: true, parentCount: 1 },
  { id: "sum", evidence: "official", productionEnabled: true, parentCount: 1 },
  { id: "difference", evidence: "official", productionEnabled: true, parentCount: 1 },
  { id: "complement", evidence: "official", productionEnabled: true, parentCount: 1 },
  { id: "weighted_sum", evidence: "official", productionEnabled: true, parentCount: 1 },
  { id: "multi_variable_sum", evidence: "official_composition", productionEnabled: true, parentCount: 2 },
  { id: "multi_variable_balance", evidence: "official", productionEnabled: true, parentCount: 3 },
] as const;

export type GraphDefinition = ClassifiedEvidenceDefinition<EquationStructuralFamily> & {
  difficulties: readonly ("easy" | "medium" | "hard")[];
  variableCounts: Partial<Record<"easy" | "medium" | "hard", 2 | 3 | 4>>;
  rootStrategy: "direct" | "coupled" | "global_balance";
};

export const EQUATION_GRAPH_REGISTRY: readonly GraphDefinition[] = [
  { id: "direct", evidence: "official", productionEnabled: true, difficulties: ["easy"], variableCounts: { easy: 2 }, rootStrategy: "direct" },
  { id: "chain", evidence: "official_composition", productionEnabled: true, difficulties: ["easy", "medium"], variableCounts: { easy: 2, medium: 3 }, rootStrategy: "direct" },
  { id: "reverse_chain", evidence: "official_composition", productionEnabled: true, difficulties: ["easy", "medium"], variableCounts: { easy: 2, medium: 3 }, rootStrategy: "global_balance" },
  { id: "star", evidence: "official", productionEnabled: true, difficulties: ["hard"], variableCounts: { hard: 4 }, rootStrategy: "global_balance" },
  { id: "triangle", evidence: "third_party_supported", productionEnabled: true, difficulties: ["medium"], variableCounts: { medium: 3 }, rootStrategy: "coupled" },
  { id: "branch", evidence: "official_composition", productionEnabled: true, difficulties: ["medium", "hard"], variableCounts: { medium: 3, hard: 4 }, rootStrategy: "global_balance" },
  { id: "branch_recombine", evidence: "official_composition", productionEnabled: true, difficulties: ["hard"], variableCounts: { hard: 4 }, rootStrategy: "global_balance" },
  { id: "merged", evidence: "official_composition", productionEnabled: true, difficulties: ["medium", "hard"], variableCounts: { medium: 3, hard: 4 }, rootStrategy: "direct" },
  { id: "cascade", evidence: "official_composition", productionEnabled: true, difficulties: ["hard"], variableCounts: { hard: 4 }, rootStrategy: "global_balance" },
  { id: "mixed", evidence: "official_composition", productionEnabled: true, difficulties: ["hard"], variableCounts: { hard: 4 }, rootStrategy: "coupled" },
] as const;

export const EQUATION_PATTERN_EVIDENCE = [
  { id: "ME01_DIRECT_ANCHOR", evidence: "official", productionEnabled: true },
  { id: "ME02_SCALE_CONSTRAINT", evidence: "official", productionEnabled: true },
  { id: "ME03_DIVISION_CONSTRAINT", evidence: "official", productionEnabled: true },
  { id: "ME04_DERIVED_OUTPUT", evidence: "official", productionEnabled: true },
  { id: "ME05_COMPLEMENT_SCALE", evidence: "official", productionEnabled: true },
  { id: "ME06_STAR_BALANCE", evidence: "official", productionEnabled: true },
  { id: "ME07_MULTI_STAGE_ANCHOR", evidence: "official", productionEnabled: true },
  { id: "ME08_ADDITIVE_CHAIN_TOTAL", evidence: "official_composition", productionEnabled: true },
  { id: "ME09_MIXED_CHAIN_TOTAL", evidence: "official_composition", productionEnabled: true },
  { id: "ME10_BRANCH_RECOMBINE", evidence: "official_composition", productionEnabled: true },
  { id: "ME11_MERGED_DEPENDENCIES", evidence: "official_composition", productionEnabled: true },
  { id: "ME12_PAIRWISE_TRIANGLE", evidence: "third_party_supported", productionEnabled: true },
] as const;

export const EXPERIMENTAL_EQUATION_MECHANICS = [
  { id: "variable_multiplication", evidence: "experimental", productionEnabled: false },
  { id: "variable_division", evidence: "experimental", productionEnabled: false },
  { id: "powers", evidence: "experimental", productionEnabled: false },
  { id: "roots", evidence: "experimental", productionEnabled: false },
  { id: "quadratics", evidence: "experimental", productionEnabled: false },
  { id: "logarithms", evidence: "experimental", productionEnabled: false },
  { id: "calculus", evidence: "experimental", productionEnabled: false },
  { id: "nonlinear_systems", evidence: "experimental", productionEnabled: false },
] as const;

const SHARED_EVIDENCE_BY_LEVEL = {
  official: {
    sources: ["DMAT_CURRENT_OFFICIAL"],
    confidence: "very_high",
  },
  official_composition: {
    sources: ["DMAT_CURRENT_OFFICIAL"],
    confidence: "high",
  },
  third_party_supported: {
    sources: ["THIRD_PARTY"],
    confidence: "medium",
  },
  experimental: {
    sources: [],
    confidence: "low",
  },
} as const satisfies Record<EquationEvidenceLevel, {
  sources: readonly EvidenceSourceProvenance[];
  confidence: EvidenceConfidence;
}>;

/** Adds shared provenance/confidence without changing existing registry objects or serialization. */
export function sharedEquationEvidence<TDefinition extends ClassifiedEvidenceDefinition>(
  definition: TDefinition,
): EvidenceDefinition<TDefinition["id"]> {
  return {
    ...definition,
    ...SHARED_EVIDENCE_BY_LEVEL[definition.evidence],
  };
}

export function graphDefinition(family: EquationStructuralFamily): GraphDefinition {
  const definition = EQUATION_GRAPH_REGISTRY.find((item) => item.id === family);
  if (!definition) throw new Error(`Unknown equation graph family: ${family}`);
  return definition;
}

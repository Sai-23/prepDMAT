export const GENERAL_ACADEMIC_SCHEMA_VERSION = "general-academic-pack@1" as const;

export const GENERAL_ACADEMIC_DOMAINS = [
  "mathematics",
  "computational_sciences",
  "natural_sciences",
  "engineering",
  "business_administration",
  "economics",
  "social_sciences",
  "humanities",
] as const;

export const GENERAL_ACADEMIC_SKILLS = [
  "source_information",
  "concept_classification",
  "variable_identification",
  "formula_interpretation",
  "formula_substitution",
  "formula_rearrangement",
  "proportional_reasoning",
  "parameter_sensitivity",
  "graph_interpretation",
  "table_interpretation",
  "multi_representation",
  "causal_reasoning",
  "assumption_analysis",
  "research_design",
  "novel_scenario_transfer",
] as const;

export const GENERAL_ACADEMIC_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const GENERAL_ACADEMIC_ORIGINS = [
  "manual",
  "json_import",
  "external_ai",
  "openai",
  "parameterized",
  "deterministic",
] as const;

export const GENERAL_ACADEMIC_REVIEW_STATUSES = [
  "draft",
  "needs_review",
  "approved",
  "published",
  "rejected",
  "archived",
] as const;

export const GENERAL_ACADEMIC_GRAPH_TYPES = ["line", "bar", "scatter"] as const;
export const GENERAL_ACADEMIC_OPTION_IDS = ["A", "B", "C", "D"] as const;
export const GENERAL_ACADEMIC_ANSWER_TYPES = [
  "numeric",
  "categorical",
  "boolean",
  "text",
  "manual",
] as const;

export type GeneralAcademicDomain = (typeof GENERAL_ACADEMIC_DOMAINS)[number];
export type GeneralAcademicSkill = (typeof GENERAL_ACADEMIC_SKILLS)[number];
export type GeneralAcademicDifficulty = (typeof GENERAL_ACADEMIC_DIFFICULTIES)[number];
export type GeneralAcademicOrigin = (typeof GENERAL_ACADEMIC_ORIGINS)[number];
export type GeneralAcademicReviewStatus = (typeof GENERAL_ACADEMIC_REVIEW_STATUSES)[number];

export const GENERAL_ACADEMIC_DOMAIN_LABELS: Record<GeneralAcademicDomain, string> = {
  mathematics: "Mathematics",
  computational_sciences: "Computational Sciences",
  natural_sciences: "Natural Sciences",
  engineering: "Engineering",
  business_administration: "Business Administration",
  economics: "Economics",
  social_sciences: "Social Sciences",
  humanities: "Humanities",
};

export const GENERAL_ACADEMIC_SKILL_LABELS: Record<GeneralAcademicSkill, string> = {
  source_information: "Source Information",
  concept_classification: "Concept Classification",
  variable_identification: "Variable Identification",
  formula_interpretation: "Formula Interpretation",
  formula_substitution: "Formula Substitution",
  formula_rearrangement: "Formula Rearrangement",
  proportional_reasoning: "Proportional Reasoning",
  parameter_sensitivity: "Parameter Sensitivity",
  graph_interpretation: "Graph Interpretation",
  table_interpretation: "Table Interpretation",
  multi_representation: "Multi-representation Reasoning",
  causal_reasoning: "Causal Reasoning",
  assumption_analysis: "Assumption Analysis",
  research_design: "Research Design",
  novel_scenario_transfer: "Novel Scenario Transfer",
};

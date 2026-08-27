import type { StructuralProfile } from "@/lib/generation/novelty";
import type { PracticeModule } from "@/lib/practice/schemas";

export const CORE_MODULES = ["figure_sequence", "mathematical_equation", "latin_square"] as const;

export const CORE_SKILLS = [
  { id: "figure_linear_movement", module: "figure_sequence", label: "Linear movement" },
  { id: "figure_diagonal_movement", module: "figure_sequence", label: "Diagonal movement" },
  { id: "figure_boundary_movement", module: "figure_sequence", label: "Boundary movement" },
  { id: "figure_bounce", module: "figure_sequence", label: "Bounce behavior" },
  { id: "figure_progressive_movement", module: "figure_sequence", label: "Progressive movement" },
  { id: "figure_rotation", module: "figure_sequence", label: "Rotation" },
  { id: "figure_progressive_rotation", module: "figure_sequence", label: "Progressive rotation" },
  { id: "figure_colour_patterns", module: "figure_sequence", label: "Colour patterns" },
  { id: "figure_multi_object", module: "figure_sequence", label: "Multi-object tracking" },
  { id: "figure_combined_transformations", module: "figure_sequence", label: "Combined transformations" },
  { id: "equation_direct", module: "mathematical_equation", label: "Direct relationships" },
  { id: "equation_add_subtract", module: "mathematical_equation", label: "Addition & subtraction relationships" },
  { id: "equation_scale", module: "mathematical_equation", label: "Scale relationships" },
  { id: "equation_division", module: "mathematical_equation", label: "Division relationships" },
  { id: "equation_sums_differences", module: "mathematical_equation", label: "Sums & differences" },
  { id: "equation_weighted", module: "mathematical_equation", label: "Weighted relationships" },
  { id: "equation_chains", module: "mathematical_equation", label: "Chains" },
  { id: "equation_branching", module: "mathematical_equation", label: "Branching systems" },
  { id: "equation_multi_variable", module: "mathematical_equation", label: "Multi-variable systems" },
  { id: "equation_substitution", module: "mathematical_equation", label: "Substitution" },
  { id: "equation_multi_variable_balance", module: "mathematical_equation", label: "Multi-variable balance" },
  { id: "latin_row_elimination", module: "latin_square", label: "Row elimination" },
  { id: "latin_column_elimination", module: "latin_square", label: "Column elimination" },
  { id: "latin_row_column", module: "latin_square", label: "Row-column interaction" },
  { id: "latin_single_intermediate", module: "latin_square", label: "Single intermediate deduction" },
  { id: "latin_chained", module: "latin_square", label: "Chained deduction" },
  { id: "latin_multi_stage", module: "latin_square", label: "Multi-stage deduction" },
] as const satisfies readonly { id: string; module: PracticeModule; label: string }[];

export type CoreSkillId = (typeof CORE_SKILLS)[number]["id"];
export type CoreSkill = (typeof CORE_SKILLS)[number];

const BY_ID = new Map<string, CoreSkill>(CORE_SKILLS.map((skill) => [skill.id, skill]));

export function coreSkill(id: string): CoreSkill | null {
  return BY_ID.get(id) ?? null;
}

export function skillsForModule(module: PracticeModule): CoreSkill[] {
  return CORE_SKILLS.filter((skill) => skill.module === module);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function figureSkills(profile: StructuralProfile | null, trace: unknown): CoreSkillId[] {
  const result = new Set<CoreSkillId>();
  const features = profile?.features ?? {};
  const rules = Array.isArray(record(trace)?.rules) ? record(trace)!.rules as unknown[] : [];
  const movementKinds = strings(features.movementKinds);
  if (movementKinds.includes("linear-axis")) result.add("figure_linear_movement");
  if (movementKinds.includes("linear-diagonal")) result.add("figure_diagonal_movement");
  if (movementKinds.includes("border") || movementKinds.includes("direction_cycle")) result.add("figure_boundary_movement");
  if (strings(features.boundaryBehaviors).some((value) => value.includes("bounce"))) result.add("figure_bounce");

  let activeStreams = 0;
  rules.forEach((rawRule) => {
    const rule = record(rawRule);
    if (!rule) return;
    const movement = record(rule.movement);
    const rotation = record(rule.rotation);
    const colour = record(rule.colour);
    if (movement) {
      activeStreams += 1;
      const direction = String(movement.direction ?? "");
      if (movement.kind === "linear") {
        result.add(direction.includes("_") ? "figure_diagonal_movement" : "figure_linear_movement");
      } else {
        result.add("figure_boundary_movement");
      }
      if (movement.boundary === "bounce") result.add("figure_bounce");
      if (movement.progression === "incrementing") result.add("figure_progressive_movement");
    }
    if (rotation) {
      activeStreams += 1;
      result.add("figure_rotation");
      if (rotation.progression === "incrementing") result.add("figure_progressive_rotation");
    }
    if (colour) {
      activeStreams += 1;
      result.add("figure_colour_patterns");
    }
  });
  if (Number(features.objectCount ?? 0) > 1) result.add("figure_multi_object");
  if (Number(features.simultaneousTransformations ?? 0) > 0 || activeStreams > rules.length) {
    result.add("figure_combined_transformations");
  }
  return [...result];
}

function equationSkills(profile: StructuralProfile | null, publicSnapshot: unknown, trace: unknown): CoreSkillId[] {
  const result = new Set<CoreSkillId>();
  const snapshot = record(publicSnapshot);
  const task = record(snapshot?.structuredData);
  const dependency = record(task?.dependencyModel);
  const raw = strings(dependency?.relationshipPrimitives);
  const normalized = strings(profile?.features.relationships);
  const relationships = raw.length ? raw : normalized;
  relationships.forEach((relationship) => {
    if (relationship === "direct_value") result.add("equation_direct");
    if (["offset_add", "offset_subtract", "offset_difference"].includes(relationship)) result.add("equation_add_subtract");
    if (relationship === "scale") result.add("equation_scale");
    if (relationship === "divide_by_constant") result.add("equation_division");
    if (["sum", "difference", "complement", "sum_complement"].includes(relationship)) result.add("equation_sums_differences");
    if (relationship === "weighted_sum") result.add("equation_weighted");
    if (relationship === "multi_variable_sum") result.add("equation_multi_variable");
    if (relationship === "multi_variable_balance") {
      result.add("equation_multi_variable");
      result.add("equation_multi_variable_balance");
    }
  });
  const graph = String(dependency?.family ?? profile?.features.graph ?? "");
  if (["chain", "reverse_chain", "cascade"].includes(graph)) result.add("equation_chains");
  if (["star", "triangle", "branch", "merged", "branch_recombine"].includes(graph)) result.add("equation_branching");
  const variableCount = Number(profile?.features.variableCount
    ?? (Array.isArray(task?.variables) ? task.variables.length : 0));
  if (variableCount >= 3) {
    result.add("equation_multi_variable");
  }
  const steps = Array.isArray(trace) ? trace : [];
  if (steps.some((step) => record(step)?.reasoning === "substitute") || strings(profile?.features.reasoningModes).includes("substitute")) {
    result.add("equation_substitution");
  }
  return [...result];
}

function latinSkills(profile: StructuralProfile | null, trace: unknown): CoreSkillId[] {
  const result = new Set<CoreSkillId>();
  const deductions = Array.isArray(trace) ? trace.map(record).filter(Boolean) as Record<string, unknown>[] : [];
  if (deductions.some((step) => step.axis === "row" || step.reason === "only_position_in_row")) result.add("latin_row_elimination");
  if (deductions.some((step) => step.axis === "column" || step.reason === "only_position_in_column")) result.add("latin_column_elimination");
  if (deductions.some((step) => step.axis === "both") || Number(profile?.features.rowColumnAlternations ?? 0) > 0) result.add("latin_row_column");
  const mechanism = String(profile?.features.targetReasoning ?? "");
  if (mechanism === "SINGLE_INTERMEDIATE") result.add("latin_single_intermediate");
  if (mechanism === "CHAINED_INTERMEDIATE") result.add("latin_chained");
  if (mechanism === "MULTI_STAGE_DEDUCTION") result.add("latin_multi_stage");
  if (mechanism === "ROW_COLUMN_INTERSECTION") result.add("latin_row_column");
  if (mechanism === "DIRECT_AXIS_ELIMINATION" && result.size === 0) {
    // The normalized profile cannot safely distinguish row from column.
    result.add("latin_row_column");
  }
  return [...result];
}

export function mapQuestionToSkills(input: {
  module: PracticeModule;
  structuralProfile?: StructuralProfile | null;
  publicSnapshot?: unknown;
  explanationTrace?: unknown;
}): CoreSkillId[] {
  if (input.module === "figure_sequence") return figureSkills(input.structuralProfile ?? null, input.explanationTrace);
  if (input.module === "mathematical_equation") {
    return equationSkills(input.structuralProfile ?? null, input.publicSnapshot, input.explanationTrace);
  }
  return latinSkills(input.structuralProfile ?? null, input.explanationTrace);
}

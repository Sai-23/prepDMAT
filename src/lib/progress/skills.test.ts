import { describe, expect, it } from "vitest";

import type { StructuralFeature, StructuralProfile } from "@/lib/generation/novelty";

import { mapQuestionToSkills } from "./skills";

const profile = (namespace: StructuralProfile["namespace"], features: Record<string, StructuralFeature>): StructuralProfile => ({ namespace, features });

describe("student-facing Core skill mapping", () => {
  it("maps every active Figure rule stream and object signal", () => {
    const skills = mapQuestionToSkills({
      module: "figure_sequence",
      structuralProfile: profile("figure_sequence", { movementKinds: ["linear-diagonal"], objectCount: 2, simultaneousTransformations: 1, boundaryBehaviors: ["bounce"] }),
      explanationTrace: { rules: [{ movement: { kind: "linear", direction: "up_right", progression: "incrementing", boundary: "bounce" }, rotation: { progression: "incrementing" }, colour: { progression: "fixed" } }] },
    });
    expect(skills).toEqual(expect.arrayContaining([
      "figure_diagonal_movement", "figure_bounce", "figure_progressive_movement", "figure_rotation",
      "figure_progressive_rotation", "figure_colour_patterns", "figure_multi_object", "figure_combined_transformations",
    ]));
  });

  it("maps raw Equation relationship primitives without exposing internal enums", () => {
    const skills = mapQuestionToSkills({
      module: "mathematical_equation",
      structuralProfile: profile("mathematical_equation", { graph: "branch_recombine", variableCount: 4, reasoningModes: ["substitute"] }),
      publicSnapshot: { structuredData: { dependencyModel: { family: "branch_recombine", relationshipPrimitives: ["offset_add", "scale", "divide_by_constant", "weighted_sum", "multi_variable_balance"] } } },
      explanationTrace: [{ reasoning: "substitute" }],
    });
    expect(skills).toEqual(expect.arrayContaining([
      "equation_add_subtract", "equation_scale", "equation_division", "equation_weighted", "equation_branching",
      "equation_multi_variable", "equation_substitution", "equation_multi_variable_balance",
    ]));
  });

  it("uses Latin causal axes and normalized depth mechanisms", () => {
    const skills = mapQuestionToSkills({
      module: "latin_square",
      structuralProfile: profile("latin_square", { targetReasoning: "CHAINED_INTERMEDIATE", rowColumnAlternations: 2 }),
      explanationTrace: [{ axis: "row" }, { axis: "column" }, { axis: "both" }],
    });
    expect(skills).toEqual(expect.arrayContaining([
      "latin_row_elimination", "latin_column_elimination", "latin_row_column", "latin_chained",
    ]));
  });

  it("does not invent a row or column claim from normalized direct metadata", () => {
    const skills = mapQuestionToSkills({
      module: "latin_square",
      structuralProfile: profile("latin_square", { targetReasoning: "DIRECT_AXIS_ELIMINATION" }),
    });
    expect(skills).toEqual(["latin_row_column"]);
    expect(skills).not.toContain("latin_row_elimination");
    expect(skills).not.toContain("latin_column_elimination");
  });
});

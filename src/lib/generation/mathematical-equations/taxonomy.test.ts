import { describe, expect, it } from "vitest";

import {
  EQUATION_GRAPH_REGISTRY,
  EQUATION_PATTERN_EVIDENCE,
  EQUATION_RELATIONSHIP_REGISTRY,
  EXPERIMENTAL_EQUATION_MECHANICS,
} from "./taxonomy";

describe("mathematical-equation evidence taxonomy", () => {
  it("enables all supported graph and relationship definitions", () => {
    expect(new Set(EQUATION_GRAPH_REGISTRY.map((item) => item.id))).toEqual(new Set([
      "direct", "chain", "reverse_chain", "star", "triangle", "branch",
      "branch_recombine", "merged", "cascade", "mixed",
    ]));
    expect(EQUATION_GRAPH_REGISTRY.every((item) => item.productionEnabled)).toBe(true);
    expect(EQUATION_RELATIONSHIP_REGISTRY.every((item) => item.productionEnabled)).toBe(true);
    expect(EQUATION_PATTERN_EVIDENCE).toHaveLength(12);
  });

  it("keeps every nonlinear or syllabus-expanding mechanism disabled", () => {
    expect(EXPERIMENTAL_EQUATION_MECHANICS.length).toBeGreaterThan(0);
    expect(EXPERIMENTAL_EQUATION_MECHANICS.every((item) =>
      item.evidence === "experimental" && item.productionEnabled === false,
    )).toBe(true);
  });
});

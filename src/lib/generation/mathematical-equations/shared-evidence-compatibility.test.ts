import { describe, expect, it } from "vitest";

import { validateEvidenceDefinition } from "../../evidence";
import {
  EQUATION_GRAPH_REGISTRY,
  EQUATION_PATTERN_EVIDENCE,
  EQUATION_RELATIONSHIP_REGISTRY,
  EXPERIMENTAL_EQUATION_MECHANICS,
  sharedEquationEvidence,
} from "./taxonomy";

describe("Mathematical Equation shared-evidence compatibility", () => {
  it("preserves every existing classification while adding shared metadata", () => {
    const definitions = [
      ...EQUATION_GRAPH_REGISTRY,
      ...EQUATION_RELATIONSHIP_REGISTRY,
      ...EQUATION_PATTERN_EVIDENCE,
      ...EXPERIMENTAL_EQUATION_MECHANICS,
    ];
    for (const definition of definitions) {
      const shared = sharedEquationEvidence(definition);
      expect(shared.evidence).toBe(definition.evidence);
      expect(shared.productionEnabled).toBe(definition.productionEnabled);
      expect(validateEvidenceDefinition(shared).valid).toBe(true);
    }
  });

  it("keeps unsupported equation mechanics experimental and disabled", () => {
    expect(EXPERIMENTAL_EQUATION_MECHANICS.every((definition) =>
      definition.evidence === "experimental" && !definition.productionEnabled)).toBe(true);
  });
});


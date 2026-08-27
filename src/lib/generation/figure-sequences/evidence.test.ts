import { describe, expect, it } from "vitest";

import { productionEvidenceFor, validateEvidenceDefinition } from "../../evidence";
import {
  FIGURE_HARD_CONSTRAINT_IDS,
  FIGURE_HARD_CONSTRAINT_REGISTRY,
  FIGURE_PRIMITIVE_EVIDENCE_REGISTRY,
  FIGURE_PRIMITIVE_IDS,
} from "./evidence";

describe("Figure Sequence evidence registries", () => {
  it("covers every declared primitive with valid production evidence", () => {
    expect(FIGURE_PRIMITIVE_EVIDENCE_REGISTRY.map((item) => item.id))
      .toEqual([...FIGURE_PRIMITIVE_IDS]);
    expect(FIGURE_PRIMITIVE_EVIDENCE_REGISTRY.every((item) =>
      item.productionEnabled && validateEvidenceDefinition(item).valid)).toBe(true);
  });

  it("keeps validator constraints separate and rejects unknown mechanics", () => {
    expect(FIGURE_HARD_CONSTRAINT_REGISTRY.map((item) => item.id))
      .toEqual([...FIGURE_HARD_CONSTRAINT_IDS]);
    expect(FIGURE_HARD_CONSTRAINT_REGISTRY.every((item) =>
      item.role === "validator_constraint" && item.enforcementReferences.length > 0 &&
      validateEvidenceDefinition(item).valid)).toBe(true);
    expect(productionEvidenceFor(FIGURE_PRIMITIVE_EVIDENCE_REGISTRY, "TELEPORT"))
      .toBeNull();
  });
});

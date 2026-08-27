import { describe, expect, it } from "vitest";

import { productionEvidenceFor, validateEvidenceDefinition } from "../../evidence";
import {
  LATIN_DEDUCTION_EVIDENCE_REGISTRY,
  LATIN_DEDUCTION_MECHANISM_IDS,
  LATIN_HARD_CONSTRAINT_IDS,
  LATIN_HARD_CONSTRAINT_REGISTRY,
} from "./evidence";

describe("Latin Square evidence registries", () => {
  it("covers every declared deduction mechanism with valid production evidence", () => {
    expect(LATIN_DEDUCTION_EVIDENCE_REGISTRY.map((item) => item.id))
      .toEqual([...LATIN_DEDUCTION_MECHANISM_IDS]);
    expect(LATIN_DEDUCTION_EVIDENCE_REGISTRY.every((item) =>
      item.productionEnabled && item.reasoningClassification &&
      validateEvidenceDefinition(item).valid)).toBe(true);
  });

  it("keeps hard constraints separate and rejects unknown deductions", () => {
    expect(LATIN_HARD_CONSTRAINT_REGISTRY.map((item) => item.id))
      .toEqual([...LATIN_HARD_CONSTRAINT_IDS]);
    expect(LATIN_HARD_CONSTRAINT_REGISTRY.every((item) =>
      item.role === "validator_constraint" && item.enforcementReferences.length > 0 &&
      validateEvidenceDefinition(item).valid)).toBe(true);
    expect(productionEvidenceFor(LATIN_DEDUCTION_EVIDENCE_REGISTRY, "GUESS_AND_CHECK"))
      .toBeNull();
  });
});

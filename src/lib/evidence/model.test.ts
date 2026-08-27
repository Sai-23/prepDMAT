import { describe, expect, it } from "vitest";

import {
  productionEvidenceFor,
  validateEvidenceDefinition,
  type EvidenceDefinition,
} from "./model";

describe("shared evidence safety rules", () => {
  const supported: EvidenceDefinition = {
    id: "SUPPORTED_MECHANIC",
    evidence: "official",
    sources: ["DMAT_CURRENT_OFFICIAL"],
    confidence: "very_high",
    productionEnabled: true,
  };

  it("does not treat unknown mechanics or source combinations as valid", () => {
    expect(productionEvidenceFor([supported], "UNKNOWN_MECHANIC")).toBeNull();
    expect(validateEvidenceDefinition({
      ...supported,
      id: "UNKNOWN_SOURCE_COMBINATION",
      sources: ["UNRECOGNIZED_SOURCE"],
    }).valid).toBe(false);
    expect(validateEvidenceDefinition({
      ...supported,
      id: "FALSE_OFFICIAL_CLAIM",
      sources: ["THIRD_PARTY"],
    }).valid).toBe(false);
  });

  it("cannot production-enable experimental mechanics", () => {
    expect(validateEvidenceDefinition({
      id: "UNSUPPORTED_MECHANIC",
      evidence: "experimental",
      sources: [],
      confidence: "low",
      productionEnabled: true,
    })).toEqual(expect.objectContaining({ valid: false }));
  });
});


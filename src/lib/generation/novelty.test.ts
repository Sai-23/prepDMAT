import { describe, expect, it } from "vitest";

import {
  assessStructuralNovelty,
  calculateStructuralSimilarity,
  fingerprintStructuralProfile,
  type StructuralProfile,
} from "./novelty";

const profile = (features: StructuralProfile["features"]): StructuralProfile => ({
  namespace: "mathematical_equation",
  features,
});

describe("structural novelty", () => {
  it("treats reordered rule multisets as identical", () => {
    const first = profile({ graph: "merged", relationships: ["sum", "difference", "scale"] });
    const second = profile({ graph: "merged", relationships: ["scale", "sum", "difference"] });
    expect(calculateStructuralSimilarity(first, second)).toBe(1);
    expect(fingerprintStructuralProfile(first)).not.toBe("");
  });

  it("rejects a cosmetic reference reskin but accepts a changed deduction graph", () => {
    const reference = profile({ variables: 2, graph: "coupled_pair", relationships: ["scale", "difference"], depth: 1 });
    expect(assessStructuralNovelty(reference, { references: [reference] }).accepted).toBe(false);
    expect(assessStructuralNovelty(profile({ variables: 4, graph: "branch_recombine", relationships: ["sum", "three_term"], depth: 3 }), { references: [reference] }).accepted).toBe(true);
  });
});

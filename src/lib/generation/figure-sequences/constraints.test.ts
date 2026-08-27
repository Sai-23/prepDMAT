import { describe, expect, it } from "vitest";
import { validateFigureHardConstraints } from "./constraints";
import { figureSequenceGenerator } from "./generator";

function candidate() {
  return figureSequenceGenerator.generate({ seed: "constraint-tampering", difficulty: "medium", symbolCount: 2 }, 1);
}

describe("Figure hard-constraint enforcement", () => {
  it("accepts an independently constructed production candidate", () => {
    expect(validateFigureHardConstraints(candidate())).toEqual([]);
  });

  it("rejects disappearance from an option", () => {
    const changed = candidate();
    changed.sequence.missingMatrices[0].candidates[0].frame.symbols.pop();
    expect(validateFigureHardConstraints(changed).some((item) => item.constraint === "OBJECTS_CANNOT_DISAPPEAR")).toBe(true);
  });

  it("rejects overlap and leaving the grid", () => {
    const overlap = candidate();
    overlap.sequence.missingMatrices[0].candidates[0].frame.symbols[1].row = overlap.sequence.missingMatrices[0].candidates[0].frame.symbols[0].row;
    overlap.sequence.missingMatrices[0].candidates[0].frame.symbols[1].column = overlap.sequence.missingMatrices[0].candidates[0].frame.symbols[0].column;
    expect(validateFigureHardConstraints(overlap).some((item) => item.constraint === "OBJECTS_CANNOT_OVERLAP")).toBe(true);

    const outside = candidate();
    outside.sequence.missingMatrices[0].candidates[0].frame.symbols[0].row = -1;
    expect(validateFigureHardConstraints(outside).some((item) => item.constraint === "OBJECTS_CANNOT_LEAVE_GRID")).toBe(true);
  });

  it("rejects diagonal direction-cycle mixing and unsupported boundaries", () => {
    const diagonal = candidate();
    diagonal.structuredData.rules[0].movement = { kind: "direction_cycle", directions: ["left", "up_right"], steps: 1, progression: "fixed", boundary: "bounce" };
    expect(validateFigureHardConstraints(diagonal).some((item) => item.constraint === "EVIDENCE_COMPATIBILITY")).toBe(true);

    const rejecting = candidate();
    const movement = rejecting.structuredData.rules[0].movement;
    if (movement?.kind !== "border") movement!.boundary = "reject";
    else rejecting.structuredData.rules[0].movement = { kind: "linear", direction: "right", steps: 1, progression: "fixed", boundary: "reject" };
    expect(validateFigureHardConstraints(rejecting).some((item) => item.constraint === "BOUNDARY_REQUIRES_VALID_BEHAVIOR" || item.constraint === "EVIDENCE_COMPATIBILITY")).toBe(true);
  });
});

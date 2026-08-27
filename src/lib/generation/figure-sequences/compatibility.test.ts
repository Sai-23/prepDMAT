import { describe, expect, it } from "vitest";
import { enabledFigurePrimitives, figurePrimitivePairCompatibility, validateFigureRuleCompatibility } from "./compatibility";
import { FIGURE_PRIMITIVE_EVIDENCE_REGISTRY } from "./evidence";

describe("Figure evidence compatibility", () => {
  it("derives all production primitives from the evidence registry", () => {
    const enabled = FIGURE_PRIMITIVE_EVIDENCE_REGISTRY.filter((item) => item.productionEnabled).map((item) => item.id);
    const derived = ["movement", "step", "boundary", "rotation", "color"].flatMap((category) =>
      enabledFigurePrimitives(category as Parameters<typeof enabledFigurePrimitives>[0]));
    expect(new Set(derived)).toEqual(new Set(enabled));
  });

  it("allows cardinal direction composition and rejects diagonal mixing", () => {
    expect(validateFigureRuleCompatibility({ symbolId: "a", movement: { kind: "direction_cycle", directions: ["left", "up", "right", "down"], steps: 1, progression: "fixed", boundary: "bounce" } }).valid).toBe(true);
    expect(validateFigureRuleCompatibility({ symbolId: "a", movement: { kind: "direction_cycle", directions: ["left", "up_right"], steps: 1, progression: "fixed", boundary: "bounce" } }).valid).toBe(false);
  });

  it("fails closed for unsupported primitive pairs", () => {
    expect(figurePrimitivePairCompatibility("MOVE_DIAGONAL", "MOVE_BOUNDARY_CLOCKWISE")).toBe("INVALID");
    expect(figurePrimitivePairCompatibility("MOVE_HORIZONTAL", "MOVE_VERTICAL")).toBe("CONDITIONALLY_SUPPORTED");
  });
});

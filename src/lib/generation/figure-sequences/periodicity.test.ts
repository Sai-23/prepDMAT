import { describe, expect, it } from "vitest";
import { analyzeFigurePeriodicity, leastCommonMultiple } from "./periodicity";
import type { FigureSymbolState } from "./types";

const symbol = (id: string): FigureSymbolState => ({ id, shape: "arrow", color: "blue", fill: "solid", orientation: 0, row: 2, column: 2 });

describe("Figure periodicity analysis", () => {
  it("calculates exact fixed-rule periods and their LCM", () => {
    const result = analyzeFigurePeriodicity({ rows: 5, columns: 5 }, [symbol("a")], [{
      symbolId: "a",
      movement: { kind: "linear", direction: "right", steps: 1, progression: "fixed", boundary: "bounce" },
      rotation: { direction: "clockwise", quarterTurns: 1, progression: "fixed" },
      colour: { cycle: ["blue", "pink", "yellow"], steps: 1, progression: "fixed" },
    }]);
    expect(result.objects[0]).toMatchObject({ movementPeriod: 8, rotationPeriod: 4, colourPeriod: 3 });
    expect(result.combinedStatePeriod).toBe(24);
    expect(leastCommonMultiple(8, 3)).toBe(24);
  });

  it("reports mismatched object periods", () => {
    const result = analyzeFigurePeriodicity({ rows: 5, columns: 5 }, [symbol("a"), symbol("b")], [
      { symbolId: "a", movement: { kind: "linear", direction: "right", steps: 1, progression: "fixed", boundary: "bounce" } },
      { symbolId: "b", movement: { kind: "linear", direction: "down", steps: 2, progression: "fixed", boundary: "bounce" }, rotation: { direction: "clockwise", quarterTurns: 1, progression: "fixed" } },
    ]);
    expect(result.rulePeriodMismatch).toBe(1);
    expect(result.combinedStatePeriod).toBeGreaterThan(1);
  });
});

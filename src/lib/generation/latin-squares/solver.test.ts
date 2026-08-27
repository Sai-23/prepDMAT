import { describe, expect, it } from "vitest";

import { latinSquareGenerator } from "./generator";
import { findUniqueLatinGridSolution, latinSquareSolver } from "./solver";
import type { VisibleLatinGrid } from "./types";

describe("LatinSquareSolver", () => {
  it("proves a target value from visible clues only", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "solver-unique", difficulty: "easy" },
      1,
    );
    const { target } = candidate.structuredData;
    candidate.structuredData.grid = candidate.completedGrid.map((row) => [...row]);
    candidate.structuredData.grid[target.row][target.column] = null;
    const outcome = latinSquareSolver.solve(candidate);
    expect(outcome.status).toBe("unique");
    expect(outcome.possibleTargetSymbols).toEqual([candidate.correctAnswer]);
    expect(outcome.fullGridSolutionCount).toBe(1);
  });

  it("rejects an ambiguous target", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "solver-ambiguous", difficulty: "hard" },
      1,
    );
    candidate.structuredData.grid = Array.from({ length: 5 }, () =>
      Array.from({ length: 5 }, () => null),
    );
    const outcome = latinSquareSolver.solve(candidate);
    expect(outcome.status).toBe("multiple");
    expect(outcome.possibleTargetSymbols).toEqual(["A", "B", "C", "D", "E"]);
    expect(outcome.fullGridSolutionCountCapped).toBe(true);
  });

  it("rejects duplicate visible symbols in a row", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "solver-invalid", difficulty: "easy" },
      1,
    );
    candidate.structuredData.grid[0][0] = "A";
    candidate.structuredData.grid[0][1] = "A";
    expect(latinSquareSolver.solve(candidate).status).toBe("invalid");
  });

  it("reconstructs a complete grid only when the visible grid has one completion", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "solver-reconstruct-legacy", difficulty: "easy" },
      1,
    );
    const { target } = candidate.structuredData;
    const nearlyComplete: VisibleLatinGrid = candidate.completedGrid.map((row) => [...row]);
    nearlyComplete[target.row][target.column] = null;
    expect(findUniqueLatinGridSolution(nearlyComplete)).toEqual(candidate.completedGrid);
    expect(findUniqueLatinGridSolution(Array.from({ length: 5 }, () => Array(5).fill(null)))).toBeNull();
  });
});

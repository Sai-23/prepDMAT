import { describe, expect, it } from "vitest";

import { intendedLatinDeductionMechanism, latinSquareGenerator } from "./generator";
import { latinCandidatesFor } from "./difficulty";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_SIZE,
  type CompletedLatinGrid,
} from "./types";

function expectCompletedLatinSquare(grid: CompletedLatinGrid): void {
  const expected = [...DEFAULT_LATIN_SYMBOLS].sort();
  expect(grid).toHaveLength(LATIN_SQUARE_SIZE);
  for (const row of grid) {
    expect(row).toHaveLength(LATIN_SQUARE_SIZE);
    expect([...row].sort()).toEqual(expected);
  }
  for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
    expect(grid.map((row) => row[column]).sort()).toEqual(expected);
  }
}

describe("LatinSquareGenerator", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "is deterministic for %s configuration",
    (difficulty) => {
      const configuration = { seed: "latin-deterministic", difficulty };
      expect(latinSquareGenerator.generate(configuration, 1)).toEqual(
        latinSquareGenerator.generate(configuration, 1),
      );
    },
    20_000,
  );

  it.each(["easy", "medium", "hard"] as const)(
    "constructs valid %s squares through target-aware clue removal",
    (difficulty) => {
      for (let seed = 0; seed < 250; seed += 1) {
        const candidate = latinSquareGenerator.generate(
          { seed: `latin-${seed}`, difficulty },
          1,
        );
        expectCompletedLatinSquare(candidate.completedGrid);
        expect(candidate.structuredData.grid).toHaveLength(5);
        expect(candidate.structuredData.grid.every((row) => row.length === 5)).toBe(true);
        const { row, column } = candidate.structuredData.target;
        expect(candidate.structuredData.grid[row][column]).toBeNull();
        expect(candidate.correctAnswer).toBe(candidate.completedGrid[row][column]);
        const clueCount = candidate.structuredData.grid.flat().filter(Boolean).length;
        expect(clueCount).toBeGreaterThanOrEqual(10);
        expect(clueCount).toBeLessThanOrEqual(15);
        const targetCandidates = latinCandidatesFor(candidate.structuredData.grid, row, column);
        expect(targetCandidates).toContain(candidate.correctAnswer);
        expect(targetCandidates.length).toBeGreaterThanOrEqual(1);
        expect(targetCandidates.length).toBeLessThanOrEqual(5);
        expect(candidate.response.kind).toBe("single_choice");
        if (candidate.response.kind === "single_choice") {
          expect(candidate.response.options.map((option) => option.content)).toEqual(
            DEFAULT_LATIN_SYMBOLS,
          );
        }
        for (let index = 0; index < LATIN_SQUARE_SIZE; index += 1) {
          expect(candidate.structuredData.grid[index].filter(Boolean).length).toBeLessThan(5);
          expect(candidate.structuredData.grid.filter((gridRow) => Boolean(gridRow[index])).length)
            .toBeLessThan(5);
        }
      }
    },
    20_000,
  );

  it.each(["easy", "medium", "hard"] as const)(
    "distributes %s targets across every row and column",
    (difficulty) => {
      const rows = new Set<number>();
      const columns = new Set<number>();
      for (let seed = 0; seed < 100; seed += 1) {
        const { target } = latinSquareGenerator.generate(
          { seed: `latin-target-${seed}`, difficulty },
          1,
        ).structuredData;
        rows.add(target.row);
        columns.add(target.column);
      }
      expect(rows.size).toBe(LATIN_SQUARE_SIZE);
      expect(columns.size).toBe(LATIN_SQUARE_SIZE);
    },
  );

  it("uses the attempt as part of deterministic retry generation", () => {
    const configuration = { seed: "latin-retry", difficulty: "hard" as const };
    expect(latinSquareGenerator.generate(configuration, 1)).not.toEqual(
      latinSquareGenerator.generate(configuration, 2),
    );
  });

  it("keeps the intended evidence classification stable across retries", () => {
    const configuration = { seed: "latin-stable-reasoning", difficulty: "hard" as const };
    expect(intendedLatinDeductionMechanism(configuration)).toBe(intendedLatinDeductionMechanism(configuration));
    const first = intendedLatinDeductionMechanism(configuration);
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      latinSquareGenerator.generate(configuration, attempt);
      expect(intendedLatinDeductionMechanism(configuration)).toBe(first);
    }
  });

  it("rejects empty seeds and invalid attempts", () => {
    expect(() =>
      latinSquareGenerator.generate({ seed: " ", difficulty: "easy" }, 1),
    ).toThrow(/non-empty/);
    expect(() =>
      latinSquareGenerator.generate({ seed: "latin", difficulty: "easy" }, 0),
    ).toThrow(RangeError);
  });
});

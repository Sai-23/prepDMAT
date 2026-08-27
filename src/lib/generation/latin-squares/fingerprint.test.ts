import { describe, expect, it } from "vitest";

import {
  fingerprintLatinSquare,
  latinSquareStructuralSignature,
} from "./fingerprint";
import { latinSquareGenerator } from "./generator";
import type { LatinSymbol } from "./types";

describe("Latin-square fingerprints", () => {
  it("normalizes safe symbol relabeling", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "latin-fingerprint", difficulty: "medium" },
      1,
    );
    const relabeled = structuredClone(candidate);
    const map: Record<LatinSymbol, LatinSymbol> = {
      A: "C",
      B: "E",
      C: "A",
      D: "B",
      E: "D",
    };
    relabeled.structuredData.grid = relabeled.structuredData.grid.map((row) =>
      row.map((symbol) => (symbol === null ? null : map[symbol])),
    );
    relabeled.correctAnswer = map[relabeled.correctAnswer];
    expect(fingerprintLatinSquare(relabeled)).toBe(fingerprintLatinSquare(candidate));
  });

  it("changes when the target coordinate changes", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "latin-fingerprint-target", difficulty: "easy" },
      1,
    );
    const changed = structuredClone(candidate);
    changed.structuredData.target = {
      row: (candidate.structuredData.target.row + 1) % 5,
      column: candidate.structuredData.target.column,
    };
    expect(fingerprintLatinSquare(changed)).not.toBe(fingerprintLatinSquare(candidate));
  });

  it("tracks logical structure independently from symbol names", () => {
    const candidate = latinSquareGenerator.generate(
      { seed: "latin-structure", difficulty: "hard" },
      1,
    );
    const relabeled = structuredClone(candidate);
    const map: Record<LatinSymbol, LatinSymbol> = {
      A: "D",
      B: "C",
      C: "E",
      D: "A",
      E: "B",
    };
    relabeled.structuredData.grid = relabeled.structuredData.grid.map((row) =>
      row.map((symbol) => symbol === null ? null : map[symbol]),
    );
    relabeled.correctAnswer = map[relabeled.correctAnswer];
    expect(latinSquareStructuralSignature(relabeled)).toBe(
      latinSquareStructuralSignature(candidate),
    );

    const movedClue = structuredClone(candidate);
    const visible = movedClue.structuredData.grid.flatMap((gridRow, row) =>
      gridRow.map((symbol, column) => ({ symbol, row, column })),
    ).find(({ symbol, row, column }) =>
      symbol !== null &&
      row !== movedClue.structuredData.target.row &&
      column !== movedClue.structuredData.target.column,
    );
    const blank = movedClue.structuredData.grid.flatMap((gridRow, row) =>
      gridRow.map((symbol, column) => ({ symbol, row, column })),
    ).find(({ symbol, row, column }) =>
      symbol === null &&
      row !== movedClue.structuredData.target.row &&
      column !== movedClue.structuredData.target.column,
    );
    expect(visible).toBeDefined();
    expect(blank).toBeDefined();
    if (visible && blank) {
      movedClue.structuredData.grid[visible.row][visible.column] = null;
      movedClue.structuredData.grid[blank.row][blank.column] =
        movedClue.completedGrid[blank.row][blank.column];
    }
    expect(latinSquareStructuralSignature(movedClue)).not.toBe(
      latinSquareStructuralSignature(candidate),
    );
  });

  it("treats row and column permutations as the same clue structure", () => {
    const candidate = latinSquareGenerator.generate({ seed: "latin-permutation", difficulty: "hard" }, 1);
    const permuted = structuredClone(candidate);
    const rowOrder = [4, 2, 0, 3, 1];
    const columnOrder = [1, 4, 2, 0, 3];
    permuted.structuredData.grid = rowOrder.map((row) =>
      columnOrder.map((column) => candidate.structuredData.grid[row][column]),
    );
    permuted.completedGrid = rowOrder.map((row) =>
      columnOrder.map((column) => candidate.completedGrid[row][column]),
    );
    permuted.structuredData.target = {
      row: rowOrder.indexOf(candidate.structuredData.target.row),
      column: columnOrder.indexOf(candidate.structuredData.target.column),
    };
    expect(latinSquareStructuralSignature(permuted)).toBe(latinSquareStructuralSignature(candidate));
  });

  it("treats transpose symmetry as the same reasoning structure", () => {
    const candidate = latinSquareGenerator.generate({ seed: "latin-transpose", difficulty: "medium" }, 1);
    const transposed = structuredClone(candidate);
    transposed.structuredData.grid = Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 5 }, (__, column) => candidate.structuredData.grid[column][row]));
    transposed.completedGrid = Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 5 }, (__, column) => candidate.completedGrid[column][row]));
    transposed.structuredData.target = { row: candidate.structuredData.target.column, column: candidate.structuredData.target.row };
    expect(latinSquareStructuralSignature(transposed)).toBe(latinSquareStructuralSignature(candidate));
  });
});

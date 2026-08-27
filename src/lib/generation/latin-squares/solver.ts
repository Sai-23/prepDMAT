import type { QuestionSolver } from "../types";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_SIZE,
  LATIN_SQUARE_SOLVER_VERSION,
  type LatinSquareCandidate,
  type CompletedLatinGrid,
  type LatinSymbol,
  type LatinTargetSolverOutcome,
  type VisibleLatinGrid,
} from "./types";

function validGridShape(grid: VisibleLatinGrid): boolean {
  return (
    grid.length === LATIN_SQUARE_SIZE &&
    grid.every((row) => row.length === LATIN_SQUARE_SIZE)
  );
}

function hasKnownDuplicates(grid: VisibleLatinGrid): boolean {
  for (let index = 0; index < LATIN_SQUARE_SIZE; index += 1) {
    const row = grid[index].filter((value): value is LatinSymbol => value !== null);
    const column = grid
      .map((gridRow) => gridRow[index])
      .filter((value): value is LatinSymbol => value !== null);
    if (new Set(row).size !== row.length || new Set(column).size !== column.length) {
      return true;
    }
  }
  return false;
}

function canPlace(
  grid: VisibleLatinGrid,
  row: number,
  column: number,
  symbol: LatinSymbol,
): boolean {
  return (
    !grid[row].includes(symbol) &&
    !grid.some((gridRow) => gridRow[column] === symbol)
  );
}

export type LatinCompletionCount = {
  count: number;
  capped: boolean;
  exploredAssignments: number;
};

export function countLatinGridSolutions(
  source: VisibleLatinGrid,
  limit = 2,
): LatinCompletionCount {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new RangeError("Latin completion limit must be positive.");
  if (!validGridShape(source) || hasKnownDuplicates(source)) {
    return { count: 0, capped: false, exploredAssignments: 0 };
  }
  const grid = source.map((row) => [...row]);
  let exploredAssignments = 0;
  let count = 0;

  const search = (): void => {
    if (count >= limit) return;
    let best: { row: number; column: number; candidates: LatinSymbol[] } | null = null;
    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
        if (grid[row][column] !== null) continue;
        const candidates = DEFAULT_LATIN_SYMBOLS.filter((symbol) =>
          canPlace(grid, row, column, symbol),
        );
        if (candidates.length === 0) return;
        if (!best || candidates.length < best.candidates.length) {
          best = { row, column, candidates: [...candidates] };
        }
      }
    }
    if (!best) {
      count += 1;
      return;
    }
    const cell = best as { row: number; column: number; candidates: LatinSymbol[] };
    for (const symbol of cell.candidates) {
      exploredAssignments += 1;
      grid[cell.row][cell.column] = symbol;
      search();
      grid[cell.row][cell.column] = null;
      if (count >= limit) return;
    }
  };

  search();
  return { count, capped: count >= limit, exploredAssignments };
}

export function findUniqueLatinGridSolution(source: VisibleLatinGrid): CompletedLatinGrid | null {
  if (!validGridShape(source) || hasKnownDuplicates(source)) return null;
  const grid = source.map((row) => [...row]);
  let first: CompletedLatinGrid | null = null;
  let count = 0;
  const search = (): void => {
    if (count > 1) return;
    let best: { row: number; column: number; candidates: LatinSymbol[] } | null = null;
    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
        if (grid[row][column] !== null) continue;
        const candidates = DEFAULT_LATIN_SYMBOLS.filter((symbol) => canPlace(grid, row, column, symbol));
        if (candidates.length === 0) return;
        if (!best || candidates.length < best.candidates.length) best = { row, column, candidates };
      }
    }
    if (!best) {
      count += 1;
      if (count === 1) first = structuredClone(grid) as CompletedLatinGrid;
      return;
    }
    const cell = best;
    for (const symbol of cell.candidates) {
      grid[cell.row][cell.column] = symbol;
      search();
      grid[cell.row][cell.column] = null;
      if (count > 1) return;
    }
  };
  search();
  return count === 1 ? first : null;
}

function hasCompletion(grid: VisibleLatinGrid): {
  found: boolean;
  exploredAssignments: number;
} {
  const result = countLatinGridSolutions(grid, 1);
  return { found: result.count > 0, exploredAssignments: result.exploredAssignments };
}

export class LatinSquareSolver
  implements QuestionSolver<LatinSquareCandidate, LatinTargetSolverOutcome>
{
  readonly questionType = "latin_square" as const;
  readonly version = LATIN_SQUARE_SOLVER_VERSION;

  solve(candidate: LatinSquareCandidate): LatinTargetSolverOutcome {
    const { grid, target, symbols, size } = candidate.structuredData;
    if (
      size !== LATIN_SQUARE_SIZE ||
      !validGridShape(grid) ||
      target.row < 0 ||
      target.row >= LATIN_SQUARE_SIZE ||
      target.column < 0 ||
      target.column >= LATIN_SQUARE_SIZE ||
      grid[target.row][target.column] !== null ||
      symbols.join("") !== DEFAULT_LATIN_SYMBOLS.join("") ||
      grid.flat().some((value) => value !== null && !symbols.includes(value)) ||
      hasKnownDuplicates(grid)
    ) {
      return {
        status: "invalid",
        possibleTargetSymbols: [],
        exploredAssignments: 0,
        fullGridSolutionCount: 0,
        fullGridSolutionCountCapped: false,
        reason: "Invalid Latin-square structure or clues.",
      };
    }

    const possibleTargetSymbols: LatinSymbol[] = [];
    let exploredAssignments = 0;
    for (const symbol of DEFAULT_LATIN_SYMBOLS) {
      const trial = grid.map((row) => [...row]);
      if (!canPlace(trial, target.row, target.column, symbol)) continue;
      trial[target.row][target.column] = symbol;
      const completion = hasCompletion(trial);
      exploredAssignments += completion.exploredAssignments;
      if (completion.found) possibleTargetSymbols.push(symbol);
    }

    const fullGridSolutions = countLatinGridSolutions(grid, 2);

    return {
      status:
        possibleTargetSymbols.length === 0
          ? "none"
          : possibleTargetSymbols.length === 1
            ? "unique"
            : "multiple",
      possibleTargetSymbols,
      exploredAssignments,
      fullGridSolutionCount: fullGridSolutions.count,
      fullGridSolutionCountCapped: fullGridSolutions.capped,
      reason: null,
    };
  }
}

export const latinSquareSolver = new LatinSquareSolver();

import { latinCandidatesFor } from "./difficulty";
import type { LatinSquareCandidate, LatinSymbol } from "./types";

export type LatinDistractorReason =
  | "survives_row_but_fails_column"
  | "survives_column_but_fails_row"
  | "fails_both_local_constraints"
  | "survives_local_elimination_but_fails_global_deduction";

export type LatinDistractorDiagnostic = {
  symbol: LatinSymbol;
  reason: LatinDistractorReason;
};

/** Diagnoses the plausible error represented by each mandatory A-E wrong option. */
export function analyzeLatinDistractors(candidate: LatinSquareCandidate): LatinDistractorDiagnostic[] {
  const { grid, target } = candidate.structuredData;
  const localCandidates = new Set(latinCandidatesFor(grid, target.row, target.column));
  return candidate.structuredData.symbols.filter((symbol) => symbol !== candidate.correctAnswer).map((symbol) => {
    const rejectedByRow = grid[target.row].includes(symbol);
    const rejectedByColumn = grid.some((row) => row[target.column] === symbol);
    const reason: LatinDistractorReason = rejectedByRow && rejectedByColumn
      ? "fails_both_local_constraints"
      : rejectedByRow
        ? "survives_column_but_fails_row"
        : rejectedByColumn
          ? "survives_row_but_fails_column"
          : localCandidates.has(symbol)
            ? "survives_local_elimination_but_fails_global_deduction"
            : "fails_both_local_constraints";
    return { symbol, reason };
  });
}

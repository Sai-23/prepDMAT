import "server-only";

import {
  DEFAULT_LATIN_SYMBOLS,
  findUniqueLatinGridSolution,
  LATIN_SQUARE_SIZE,
  type CompletedLatinGrid,
  type LatinCoordinate,
  type LatinDeduction,
  type LatinDeductionReason,
  type LatinSquareStructuredData,
  type LatinSymbol,
  type VisibleLatinGrid,
} from "@/lib/generation/latin-squares";

export const LATIN_EXPLANATION_TRACE_VERSION = "latin-square-explanation-trace@1" as const;

export type VerifiedLatinDeduction = {
  coordinate: LatinCoordinate;
  symbol: LatinSymbol;
  reason: LatinDeductionReason;
  gridBefore: VisibleLatinGrid;
  gridAfter: VisibleLatinGrid;
  rowExisting: LatinSymbol[];
  columnExisting: LatinSymbol[];
  rowCandidates: LatinSymbol[];
  columnCandidates: LatinSymbol[];
  commonCandidates: LatinSymbol[];
  eliminatedCandidates: LatinSymbol[];
  placementScope: "row" | "column" | null;
  placementOptions: LatinCoordinate[];
  isTarget: boolean;
};

export type LatinExplanationTrace = {
  version: typeof LATIN_EXPLANATION_TRACE_VERSION;
  target: LatinCoordinate;
  answer: LatinSymbol;
  deductions: VerifiedLatinDeduction[];
  completedGrid: CompletedLatinGrid;
};

const coordinateKey = ({ row, column }: LatinCoordinate) => `${row}:${column}`;
const sameCoordinate = (first: LatinCoordinate, second: LatinCoordinate) =>
  first.row === second.row && first.column === second.column;

function isCoordinate(value: unknown): value is LatinCoordinate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const coordinate = value as Record<string, unknown>;
  return Number.isInteger(coordinate.row) && Number.isInteger(coordinate.column) &&
    Number(coordinate.row) >= 0 && Number(coordinate.row) < LATIN_SQUARE_SIZE &&
    Number(coordinate.column) >= 0 && Number(coordinate.column) < LATIN_SQUARE_SIZE;
}

function isLatinSymbol(value: unknown): value is LatinSymbol {
  return typeof value === "string" && DEFAULT_LATIN_SYMBOLS.includes(value as LatinSymbol);
}

function parseDeduction(value: unknown): LatinDeduction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const deduction = value as Record<string, unknown>;
  const reasons: LatinDeductionReason[] = [
    "single_candidate",
    "only_position_in_row",
    "only_position_in_column",
  ];
  if (
    !isCoordinate(deduction.coordinate) || !isLatinSymbol(deduction.symbol) ||
    !reasons.includes(deduction.reason as LatinDeductionReason) ||
    !Number.isInteger(deduction.round) || !Number.isInteger(deduction.depth) ||
    !Array.isArray(deduction.dependencies) || !deduction.dependencies.every(isCoordinate)
  ) return null;
  return {
    coordinate: deduction.coordinate,
    symbol: deduction.symbol,
    reason: deduction.reason as LatinDeductionReason,
    round: Number(deduction.round),
    depth: Number(deduction.depth),
    dependencies: deduction.dependencies,
    axis: deduction.axis === "row" || deduction.axis === "column" || deduction.axis === "both"
      ? deduction.axis
      : "both",
    clueDependencies: Array.isArray(deduction.clueDependencies) && deduction.clueDependencies.every(isCoordinate)
      ? deduction.clueDependencies
      : [],
    candidatesBefore: Array.isArray(deduction.candidatesBefore) && deduction.candidatesBefore.every(isLatinSymbol)
      ? deduction.candidatesBefore
      : [deduction.symbol],
    eliminatedCandidates: Array.isArray(deduction.eliminatedCandidates) && deduction.eliminatedCandidates.every(isLatinSymbol)
      ? deduction.eliminatedCandidates
      : DEFAULT_LATIN_SYMBOLS.filter((symbol) => symbol !== deduction.symbol),
  };
}

function candidatesFor(grid: VisibleLatinGrid, coordinate: LatinCoordinate): LatinSymbol[] {
  if (grid[coordinate.row]?.[coordinate.column] !== null) return [];
  const used = new Set<LatinSymbol>();
  grid[coordinate.row].forEach((symbol) => { if (symbol !== null) used.add(symbol); });
  grid.forEach((row) => { const symbol = row[coordinate.column]; if (symbol !== null) used.add(symbol); });
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) => !used.has(symbol));
}

function rowCandidates(grid: VisibleLatinGrid, row: number): LatinSymbol[] {
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) => !grid[row].includes(symbol));
}

function columnCandidates(grid: VisibleLatinGrid, column: number): LatinSymbol[] {
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) => !grid.some((row) => row[column] === symbol));
}

function intersect(first: readonly LatinSymbol[], second: readonly LatinSymbol[]): LatinSymbol[] {
  const secondSet = new Set(second);
  return first.filter((symbol) => secondSet.has(symbol));
}

function placementOptions(grid: VisibleLatinGrid, deduction: LatinDeduction): LatinCoordinate[] {
  if (deduction.reason === "only_position_in_row") {
    return Array.from({ length: LATIN_SQUARE_SIZE }, (_, column) => ({ row: deduction.coordinate.row, column }))
      .filter((coordinate) => candidatesFor(grid, coordinate).includes(deduction.symbol));
  }
  if (deduction.reason === "only_position_in_column") {
    return Array.from({ length: LATIN_SQUARE_SIZE }, (_, row) => ({ row, column: deduction.coordinate.column }))
      .filter((coordinate) => candidatesFor(grid, coordinate).includes(deduction.symbol));
  }
  return [];
}

function deductionIsValid(grid: VisibleLatinGrid, deduction: LatinDeduction): boolean {
  const candidates = candidatesFor(grid, deduction.coordinate);
  if (!candidates.includes(deduction.symbol)) return false;
  if (deduction.reason === "single_candidate") return candidates.length === 1;
  const options = placementOptions(grid, deduction);
  return options.length === 1 && sameCoordinate(options[0], deduction.coordinate);
}

function proofIsValid(
  originalGrid: VisibleLatinGrid,
  deductions: readonly LatinDeduction[],
  selectedIndices: ReadonlySet<number>,
  targetIndex: number,
): boolean {
  const grid = originalGrid.map((row) => [...row]);
  for (let index = 0; index <= targetIndex; index += 1) {
    if (index !== targetIndex && !selectedIndices.has(index)) continue;
    const deduction = deductions[index];
    if (!deductionIsValid(grid, deduction)) return false;
    grid[deduction.coordinate.row][deduction.coordinate.column] = deduction.symbol;
  }
  return true;
}

function conciseProofIndices(
  grid: VisibleLatinGrid,
  deductions: readonly LatinDeduction[],
  targetIndex: number,
): number[] | null {
  const selected = Array.from({ length: targetIndex }, (_, index) => index);
  if (!proofIsValid(grid, deductions, new Set(selected), targetIndex)) return null;
  for (const index of [...selected]) {
    const trial = selected.filter((candidate) => candidate !== index);
    if (proofIsValid(grid, deductions, new Set(trial), targetIndex)) {
      selected.splice(selected.indexOf(index), 1);
    }
  }
  return [...selected, targetIndex];
}

function validCompletedGrid(
  data: LatinSquareStructuredData,
  completedGrid: unknown,
  answer: LatinSymbol,
): completedGrid is CompletedLatinGrid {
  if (!Array.isArray(completedGrid) || completedGrid.length !== LATIN_SQUARE_SIZE) return false;
  const expected = [...DEFAULT_LATIN_SYMBOLS].sort().join("");
  const grid = completedGrid as unknown[][];
  if (grid.some((row) => !Array.isArray(row) || row.length !== LATIN_SQUARE_SIZE || !row.every(isLatinSymbol))) return false;
  const complete = grid as CompletedLatinGrid;
  if (complete.some((row) => [...row].sort().join("") !== expected)) return false;
  if (Array.from({ length: LATIN_SQUARE_SIZE }, (_, column) => complete.map((row) => row[column]).sort().join(""))
    .some((column) => column !== expected)) return false;
  return data.grid.every((row, rowIndex) => row.every((symbol, columnIndex) =>
    symbol === null || symbol === complete[rowIndex][columnIndex])) &&
    complete[data.target.row][data.target.column] === answer;
}

function evidenceFor(
  grid: VisibleLatinGrid,
  deduction: LatinDeduction,
  target: LatinCoordinate,
): VerifiedLatinDeduction {
  const rows = rowCandidates(grid, deduction.coordinate.row);
  const columns = columnCandidates(grid, deduction.coordinate.column);
  const after = grid.map((row) => [...row]);
  after[deduction.coordinate.row][deduction.coordinate.column] = deduction.symbol;
  return {
    coordinate: structuredClone(deduction.coordinate),
    symbol: deduction.symbol,
    reason: deduction.reason,
    gridBefore: grid.map((row) => [...row]),
    gridAfter: after,
    rowExisting: DEFAULT_LATIN_SYMBOLS.filter((symbol) => grid[deduction.coordinate.row].includes(symbol)),
    columnExisting: DEFAULT_LATIN_SYMBOLS.filter((symbol) => grid.some((row) => row[deduction.coordinate.column] === symbol)),
    rowCandidates: rows,
    columnCandidates: columns,
    commonCandidates: intersect(rows, columns),
    eliminatedCandidates: structuredClone(deduction.eliminatedCandidates),
    placementScope: deduction.reason === "only_position_in_row"
      ? "row"
      : deduction.reason === "only_position_in_column" ? "column" : null,
    placementOptions: placementOptions(grid, deduction),
    isTarget: sameCoordinate(deduction.coordinate, target),
  };
}

export function createVerifiedLatinExplanationTrace(
  data: LatinSquareStructuredData,
  rawTrace: unknown,
  correctAnswer: unknown,
  completedGrid: unknown,
): LatinExplanationTrace | null {
  if (!isLatinSymbol(correctAnswer)) return null;
  const resolvedGrid = validCompletedGrid(data, completedGrid, correctAnswer)
    ? completedGrid
    : findUniqueLatinGridSolution(data.grid);
  if (!validCompletedGrid(data, resolvedGrid, correctAnswer)) return null;
  const rawDeductions = Array.isArray(rawTrace) ? rawTrace : null;
  if (!rawDeductions) return null;
  const parsed = rawDeductions.map(parseDeduction);
  if (parsed.some((deduction) => deduction === null)) return null;
  const deductions = parsed as LatinDeduction[];
  const targetIndex = deductions.findIndex((deduction) => sameCoordinate(deduction.coordinate, data.target));
  if (targetIndex < 0 || deductions[targetIndex].symbol !== correctAnswer) return null;
  const seen = new Map<string, number>();
  for (let index = 0; index <= targetIndex; index += 1) {
    const deduction = deductions[index];
    const key = coordinateKey(deduction.coordinate);
    if (seen.has(key) || deduction.dependencies.some((dependency) => {
      const dependencyIndex = seen.get(coordinateKey(dependency));
      return dependencyIndex === undefined || dependencyIndex >= index;
    })) return null;
    seen.set(key, index);
  }
  const proofIndices = conciseProofIndices(data.grid, deductions, targetIndex);
  if (!proofIndices) return null;
  const grid = data.grid.map((row) => [...row]);
  const evidence: VerifiedLatinDeduction[] = [];
  for (const index of proofIndices) {
    const deduction = deductions[index];
    if (!deductionIsValid(grid, deduction) || resolvedGrid[deduction.coordinate.row][deduction.coordinate.column] !== deduction.symbol) {
      return null;
    }
    evidence.push(evidenceFor(grid, deduction, data.target));
    grid[deduction.coordinate.row][deduction.coordinate.column] = deduction.symbol;
  }
  if (!evidence.at(-1)?.isTarget) return null;
  return {
    version: LATIN_EXPLANATION_TRACE_VERSION,
    target: structuredClone(data.target),
    answer: correctAnswer,
    deductions: evidence,
    completedGrid: structuredClone(resolvedGrid),
  };
}

import { createFingerprint } from "../fingerprint";
import type { StructuralProfile } from "../novelty";
import type { JsonValue } from "../types";
import { analyzeLatinDeductions, calculateLatinDifficulty, latinCandidatesFor } from "./difficulty";
import type { LatinDeduction, LatinSquareCandidate, LatinSymbol } from "./types";

const coordinateKey = (row: number, column: number) => `${row}:${column}`;

export function latinSquareSemanticValue(candidate: LatinSquareCandidate): JsonValue {
  const symbolMap = new Map<LatinSymbol, string>();
  const normalizedSymbol = (symbol: LatinSymbol): string => {
    if (!symbolMap.has(symbol)) symbolMap.set(symbol, `S${symbolMap.size}`);
    return symbolMap.get(symbol)!;
  };
  return {
    size: candidate.structuredData.size,
    target: candidate.structuredData.target,
    grid: candidate.structuredData.grid.map((row) => row.map((symbol) => symbol === null ? null : normalizedSymbol(symbol))),
    answer: normalizedSymbol(candidate.correctAnswer),
  };
}

export function fingerprintLatinSquare(candidate: LatinSquareCandidate): string {
  return createFingerprint("latin-square-v2", latinSquareSemanticValue(candidate));
}

function permutations(values: readonly number[]): number[][] {
  if (values.length <= 1) return [[...values]];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [value, ...rest]));
}

function transformedCandidate(
  candidate: LatinSquareCandidate,
  transpose: boolean,
  rows: readonly number[],
  columns: readonly number[],
): LatinSquareCandidate {
  const source = (row: number, column: number) => transpose
    ? { row: columns[column], column: rows[row] }
    : { row: rows[row], column: columns[column] };
  const transformed = structuredClone(candidate);
  transformed.structuredData.grid = rows.map((_, row) => columns.map((__, column) => {
    const coordinate = source(row, column);
    return candidate.structuredData.grid[coordinate.row][coordinate.column];
  }));
  transformed.completedGrid = rows.map((_, row) => columns.map((__, column) => {
    const coordinate = source(row, column);
    return candidate.completedGrid[coordinate.row][coordinate.column];
  }));
  transformed.structuredData.target = { row: 0, column: 0 };
  return transformed;
}

function normalizedTransformValue(
  candidate: LatinSquareCandidate,
  transpose: boolean,
  rows: readonly number[],
  columns: readonly number[],
): string {
  const symbols = new Map<LatinSymbol, string>();
  const normalized = (symbol: LatinSymbol): string => {
    if (!symbols.has(symbol)) symbols.set(symbol, `S${symbols.size}`);
    return symbols.get(symbol)!;
  };
  const values: string[] = [];
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      if (row === 0 && column === 0) {
        values.push("T");
        continue;
      }
      const source = transpose
        ? { row: columns[column], column: rows[row] }
        : { row: rows[row], column: columns[column] };
      const symbol = candidate.structuredData.grid[source.row][source.column];
      values.push(symbol === null ? "0" : normalized(symbol));
    }
  }
  return `${values.join("")}|answer:${normalized(candidate.correctAnswer)}`;
}

/** Canonicalizes symbol, row, column, and transpose symmetry with the target at 0:0. */
function canonicalLatinCandidate(candidate: LatinSquareCandidate): LatinSquareCandidate {
  let best: { value: string; transpose: boolean; rows: number[]; columns: number[] } | null = null;
  for (const transpose of [false, true]) {
    const orientedTarget = transpose
      ? { row: candidate.structuredData.target.column, column: candidate.structuredData.target.row }
      : candidate.structuredData.target;
    const rowTails = permutations([0, 1, 2, 3, 4].filter((row) => row !== orientedTarget.row));
    const columnTails = permutations([0, 1, 2, 3, 4].filter((column) => column !== orientedTarget.column));
    for (const rowTail of rowTails) {
      const rows = [orientedTarget.row, ...rowTail];
      for (const columnTail of columnTails) {
        const columns = [orientedTarget.column, ...columnTail];
        const value = normalizedTransformValue(candidate, transpose, rows, columns);
        if (!best || value < best.value) best = { value, transpose, rows, columns };
      }
    }
  }
  return transformedCandidate(candidate, best!.transpose, best!.rows, best!.columns);
}

function targetClosure(deductions: readonly LatinDeduction[]): LatinDeduction[] {
  const byKey = new Map(deductions.map((deduction) => [coordinateKey(deduction.coordinate.row, deduction.coordinate.column), deduction]));
  const target = byKey.get("0:0");
  if (!target) return [];
  const closure = new Set<string>();
  const visit = (deduction: LatinDeduction) => {
    const currentKey = coordinateKey(deduction.coordinate.row, deduction.coordinate.column);
    if (closure.has(currentKey)) return;
    closure.add(currentKey);
    deduction.dependencies.forEach((dependency) => {
      const parent = byKey.get(coordinateKey(dependency.row, dependency.column));
      if (parent) visit(parent);
    });
  };
  visit(target);
  return deductions.filter((deduction) => closure.has(coordinateKey(deduction.coordinate.row, deduction.coordinate.column)));
}

function normalizedReason(reason: LatinDeduction["reason"]): string {
  return reason === "single_candidate" ? reason : "only_position_in_axis";
}

function deductionTopology(deductions: readonly LatinDeduction[]): string[] {
  const closure = targetClosure(deductions);
  const closureKeys = new Set(closure.map((deduction) => coordinateKey(deduction.coordinate.row, deduction.coordinate.column)));
  return closure.map((deduction) => {
    const dependencyRoles = deduction.dependencies.filter((dependency) => closureKeys.has(coordinateKey(dependency.row, dependency.column))).map((dependency) =>
      `${dependency.row === deduction.coordinate.row ? "same-row" : "same-column"}:${dependency.row}:${dependency.column}`).sort();
    return `${deduction.coordinate.row}:${deduction.coordinate.column}:${normalizedReason(deduction.reason)}:${deduction.candidatesBefore.length}:depth${deduction.depth}:deps[${dependencyRoles.join(",")}]`;
  }).sort();
}

export const LATIN_SQUARE_NOVELTY_POLICY = {
  referenceThreshold: 0.85,
  recentThreshold: 0.9,
} as const;

export const LATIN_SQUARE_SIMILARITY_WEIGHTS = {
  fingerprintVersion: 1,
  cluePattern: 4,
  clueRoles: 3,
  clueCount: 1,
  targetReasoning: 5,
  targetDepth: 3,
  intermediateCells: 4,
  deductionTopology: 6,
  candidateCountProfile: 3,
  candidateEliminations: 3,
  rowColumnAlternations: 3,
  essentialClues: 2,
  redundantClues: 2,
  redundancyBand: 2,
} as const;

export function latinSquareStructuralProfile(candidate: LatinSquareCandidate): StructuralProfile {
  const canonical = canonicalLatinCandidate(candidate);
  const analysis = analyzeLatinDeductions(canonical);
  const calculated = calculateLatinDifficulty(canonical, analysis);
  if (!calculated) throw new Error("Cannot fingerprint a Latin square without a human deduction path to the target.");
  const symbols = new Map<LatinSymbol, string>();
  const normalizedSymbol = (symbol: LatinSymbol): string => {
    if (!symbols.has(symbol)) symbols.set(symbol, `S${symbols.size}`);
    return symbols.get(symbol)!;
  };
  const cluePattern: string[] = [];
  const clueRoles: string[] = [];
  canonical.structuredData.grid.forEach((row, rowIndex) => row.forEach((symbol, columnIndex) => {
    if (symbol === null) return;
    const position = String(rowIndex * 5 + columnIndex);
    cluePattern.push(position);
    clueRoles.push(`${position}:${normalizedSymbol(symbol)}`);
  }));
  const candidateCountProfile = canonical.structuredData.grid.flatMap((row, rowIndex) => row.flatMap((symbol, columnIndex) =>
    symbol === null ? [String(latinCandidatesFor(canonical.structuredData.grid, rowIndex, columnIndex).length)] : [])).sort();
  const metrics = calculated.metrics;
  const symmetryReasoning = metrics.reasoningClassification === "DIRECT_ROW_ELIMINATION" || metrics.reasoningClassification === "DIRECT_COLUMN_ELIMINATION"
    ? "DIRECT_AXIS_ELIMINATION"
    : metrics.reasoningClassification;
  return {
    namespace: "latin_square",
    features: {
      fingerprintVersion: "v2",
      cluePattern,
      clueRoles,
      clueCount: metrics.visibleClues,
      targetReasoning: symmetryReasoning,
      targetDepth: metrics.targetDepth,
      intermediateCells: metrics.requiredIntermediateCells,
      deductionTopology: deductionTopology(analysis.deductions),
      candidateCountProfile,
      candidateEliminations: metrics.candidateEliminations,
      rowColumnAlternations: metrics.rowColumnAlternations,
      essentialClues: metrics.essentialClueCount,
      redundantClues: metrics.redundantClueCount,
      redundancyBand: Math.round(metrics.redundancyRatio * 10) / 10,
    },
  };
}

export function latinSquareStructuralSignature(candidate: LatinSquareCandidate): string {
  return createFingerprint("latin-square-structure-v2", latinSquareStructuralProfile(candidate) as never);
}

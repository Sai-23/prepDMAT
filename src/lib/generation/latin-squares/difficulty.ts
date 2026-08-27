import type { GenerationDifficulty } from "../types";
import type { LatinDeductionMechanismId } from "./evidence";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_SIZE,
  type LatinCoordinate,
  type LatinDeduction,
  type LatinDeductionAnalysis,
  type LatinDeductionAxis,
  type LatinDeductionReason,
  type LatinDifficultyMetrics,
  type LatinSquareCandidate,
  type LatinSymbol,
  type VisibleLatinGrid,
} from "./types";

const key = (row: number, column: number) => `${row}:${column}`;
const sameCoordinate = (first: LatinCoordinate, second: LatinCoordinate) =>
  first.row === second.row && first.column === second.column;

export function latinCandidatesFor(
  grid: VisibleLatinGrid,
  row: number,
  column: number,
): LatinSymbol[] {
  if (grid[row][column] !== null) return [];
  const used = new Set<LatinSymbol>();
  for (const symbol of grid[row]) if (symbol !== null) used.add(symbol);
  for (const gridRow of grid) {
    const symbol = gridRow[column];
    if (symbol !== null) used.add(symbol);
  }
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) => !used.has(symbol));
}

function uniqueCoordinates(coordinates: readonly LatinCoordinate[]): LatinCoordinate[] {
  return [...new Map(coordinates.map((coordinate) => [key(coordinate.row, coordinate.column), coordinate])).values()];
}

function blockersForSymbol(
  grid: VisibleLatinGrid,
  row: number,
  column: number,
  symbol: LatinSymbol,
): LatinCoordinate[] {
  const blockers: LatinCoordinate[] = [];
  for (let otherColumn = 0; otherColumn < LATIN_SQUARE_SIZE; otherColumn += 1) {
    if (grid[row][otherColumn] === symbol) blockers.push({ row, column: otherColumn });
  }
  for (let otherRow = 0; otherRow < LATIN_SQUARE_SIZE; otherRow += 1) {
    if (grid[otherRow][column] === symbol) blockers.push({ row: otherRow, column });
  }
  return uniqueCoordinates(blockers);
}

function hiddenSingleBlockers(
  grid: VisibleLatinGrid,
  candidateMap: ReadonlyMap<string, LatinSymbol[]>,
  row: number,
  column: number,
  symbol: LatinSymbol,
  reason: LatinDeductionReason,
): LatinCoordinate[] {
  const blockers: LatinCoordinate[] = [];
  if (reason === "only_position_in_row") {
    for (let otherColumn = 0; otherColumn < LATIN_SQUARE_SIZE; otherColumn += 1) {
      if (otherColumn === column || grid[row][otherColumn] !== null) continue;
      if (candidateMap.get(key(row, otherColumn))?.includes(symbol)) continue;
      blockers.push(...blockersForSymbol(grid, row, otherColumn, symbol));
    }
  } else if (reason === "only_position_in_column") {
    for (let otherRow = 0; otherRow < LATIN_SQUARE_SIZE; otherRow += 1) {
      if (otherRow === row || grid[otherRow][column] !== null) continue;
      if (candidateMap.get(key(otherRow, column))?.includes(symbol)) continue;
      blockers.push(...blockersForSymbol(grid, otherRow, column, symbol));
    }
  }
  return uniqueCoordinates(blockers);
}

function deductionAxis(
  reason: LatinDeductionReason,
  coordinate: LatinCoordinate,
  blockers: readonly LatinCoordinate[],
): LatinDeductionAxis {
  if (reason === "only_position_in_row") return "row";
  if (reason === "only_position_in_column") return "column";
  const rowEvidence = blockers.some((blocker) => blocker.row === coordinate.row);
  const columnEvidence = blockers.some((blocker) => blocker.column === coordinate.column);
  return rowEvidence && columnEvidence ? "both" : rowEvidence ? "row" : "column";
}

export function analyzeLatinDeductions(candidate: LatinSquareCandidate): LatinDeductionAnalysis {
  const initialGrid = candidate.structuredData.grid;
  const { target } = candidate.structuredData;
  const targetInitialCandidateCount = latinCandidatesFor(initialGrid, target.row, target.column).length;
  const directRowEliminations = new Set(initialGrid[target.row].filter((symbol): symbol is LatinSymbol => symbol !== null)).size;
  const directColumnEliminations = new Set(initialGrid.map((row) => row[target.column]).filter((symbol): symbol is LatinSymbol => symbol !== null)).size;
  const initialClues = new Set(initialGrid.flatMap((row, rowIndex) => row.flatMap((symbol, columnIndex) =>
    symbol === null ? [] : [key(rowIndex, columnIndex)])));
  const grid = initialGrid.map((row) => [...row]);
  const deductions: LatinDeduction[] = [];
  const depths = new Map<string, number>();

  for (let round = 1; round <= LATIN_SQUARE_SIZE * LATIN_SQUARE_SIZE; round += 1) {
    type Proposal = Omit<LatinDeduction, "round" | "depth">;
    const proposed = new Map<string, Proposal>();
    const conflicts = new Set<string>();
    const candidateMap = new Map<string, LatinSymbol[]>();

    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
        if (grid[row][column] === null) candidateMap.set(key(row, column), latinCandidatesFor(grid, row, column));
      }
    }

    const propose = (
      row: number,
      column: number,
      symbol: LatinSymbol,
      reason: LatinDeductionReason,
      blockers: readonly LatinCoordinate[],
    ) => {
      const coordinateKey = key(row, column);
      if (conflicts.has(coordinateKey)) return;
      const existing = proposed.get(coordinateKey);
      if (existing && existing.symbol !== symbol) {
        proposed.delete(coordinateKey);
        conflicts.add(coordinateKey);
        return;
      }
      const candidatesBefore = candidateMap.get(coordinateKey) ?? [];
      const allBlockers = uniqueCoordinates(blockers);
      const dependencies = allBlockers.filter((coordinate) => depths.has(key(coordinate.row, coordinate.column)));
      const clueDependencies = allBlockers.filter((coordinate) => initialClues.has(key(coordinate.row, coordinate.column)));
      const proposal: Proposal = {
        coordinate: { row, column },
        symbol,
        reason,
        axis: deductionAxis(reason, { row, column }, allBlockers),
        dependencies,
        clueDependencies,
        candidatesBefore: [...candidatesBefore],
        eliminatedCandidates: DEFAULT_LATIN_SYMBOLS.filter((candidateSymbol) => !candidatesBefore.includes(candidateSymbol)),
      };
      if (!existing || reason === "single_candidate") proposed.set(coordinateKey, proposal);
    };

    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
        const candidates = candidateMap.get(key(row, column));
        if (candidates?.length === 1) {
          const blockers = DEFAULT_LATIN_SYMBOLS.filter((symbol) => symbol !== candidates[0])
            .flatMap((symbol) => blockersForSymbol(grid, row, column, symbol));
          propose(row, column, candidates[0], "single_candidate", blockers);
        }
      }
    }
    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (const symbol of DEFAULT_LATIN_SYMBOLS) {
        if (grid[row].includes(symbol)) continue;
        const columns = Array.from({ length: LATIN_SQUARE_SIZE }, (_, column) => column)
          .filter((column) => candidateMap.get(key(row, column))?.includes(symbol));
        if (columns.length === 1) {
          propose(row, columns[0], symbol, "only_position_in_row", hiddenSingleBlockers(grid, candidateMap, row, columns[0], symbol, "only_position_in_row"));
        }
      }
    }
    for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
      for (const symbol of DEFAULT_LATIN_SYMBOLS) {
        if (grid.some((row) => row[column] === symbol)) continue;
        const rows = Array.from({ length: LATIN_SQUARE_SIZE }, (_, row) => row)
          .filter((row) => candidateMap.get(key(row, column))?.includes(symbol));
        if (rows.length === 1) {
          propose(rows[0], column, symbol, "only_position_in_column", hiddenSingleBlockers(grid, candidateMap, rows[0], column, symbol, "only_position_in_column"));
        }
      }
    }

    if (!proposed.size) break;
    const ordered = [...proposed.values()].sort((first, second) =>
      first.coordinate.row - second.coordinate.row || first.coordinate.column - second.coordinate.column);
    let applied = 0;
    for (const deduction of ordered) {
      const { row, column } = deduction.coordinate;
      if (grid[row][column] !== null || !latinCandidatesFor(grid, row, column).includes(deduction.symbol)) continue;
      const depth = 1 + Math.max(0, ...deduction.dependencies.map((dependency) => depths.get(key(dependency.row, dependency.column)) ?? 0));
      grid[row][column] = deduction.symbol;
      depths.set(key(row, column), depth);
      deductions.push({ ...deduction, round, depth });
      applied += 1;
    }
    if (!applied) break;
  }
  return { deductions, targetInitialCandidateCount, directRowEliminations, directColumnEliminations };
}

export function deriveLatinDeductions(candidate: LatinSquareCandidate): LatinDeduction[] {
  return analyzeLatinDeductions(candidate).deductions;
}

type TargetClosure = {
  deductions: LatinDeduction[];
  forcedKeys: Set<string>;
  clueKeys: Set<string>;
};

function targetDependencyClosure(
  deductions: readonly LatinDeduction[],
  target: LatinCoordinate,
): TargetClosure {
  const byKey = new Map(deductions.map((deduction) => [key(deduction.coordinate.row, deduction.coordinate.column), deduction]));
  const forcedKeys = new Set<string>();
  const clueKeys = new Set<string>();
  const visit = (coordinate: LatinCoordinate) => {
    const coordinateKey = key(coordinate.row, coordinate.column);
    if (forcedKeys.has(coordinateKey)) return;
    const deduction = byKey.get(coordinateKey);
    if (!deduction) return;
    forcedKeys.add(coordinateKey);
    deduction.clueDependencies.forEach((dependency) => clueKeys.add(key(dependency.row, dependency.column)));
    deduction.dependencies.forEach(visit);
  };
  visit(target);
  return {
    deductions: deductions.filter((deduction) => forcedKeys.has(key(deduction.coordinate.row, deduction.coordinate.column))),
    forcedKeys,
    clueKeys,
  };
}

function reasoningClassification(
  targetDeduction: LatinDeduction,
  closure: TargetClosure,
): LatinDeductionMechanismId {
  const requiredIntermediateCells = Math.max(0, closure.deductions.length - 1);
  const maxDepth = Math.max(...closure.deductions.map((deduction) => deduction.depth));
  if (!requiredIntermediateCells) {
    if (targetDeduction.axis === "row") return "DIRECT_ROW_ELIMINATION";
    if (targetDeduction.axis === "column") return "DIRECT_COLUMN_ELIMINATION";
    return "ROW_COLUMN_INTERSECTION";
  }
  if (requiredIntermediateCells === 1) return "SINGLE_INTERMEDIATE";
  if (maxDepth >= 4 || (maxDepth >= 3 && requiredIntermediateCells >= 5)) return "MULTI_STAGE_DEDUCTION";
  return "CHAINED_INTERMEDIATE";
}

function closureAlternations(closure: TargetClosure): number {
  const byKey = new Map(closure.deductions.map((deduction) => [key(deduction.coordinate.row, deduction.coordinate.column), deduction]));
  let alternations = 0;
  const visit = (deduction: LatinDeduction, previousAxis: "row" | "column" | null, visited: Set<string>) => {
    const deductionKey = key(deduction.coordinate.row, deduction.coordinate.column);
    if (visited.has(deductionKey)) return;
    const nextVisited = new Set(visited).add(deductionKey);
    deduction.dependencies.forEach((dependency) => {
      const parent = byKey.get(key(dependency.row, dependency.column));
      if (!parent) return;
      const relationAxis = dependency.row === deduction.coordinate.row ? "row" : "column";
      if (previousAxis && previousAxis !== relationAxis) alternations += 1;
      visit(parent, relationAxis, nextVisited);
    });
  };
  const dependencyKeys = new Set(closure.deductions.flatMap((deduction) => deduction.dependencies.map((dependency) => key(dependency.row, dependency.column))));
  const target = closure.deductions.find((deduction) => !dependencyKeys.has(key(deduction.coordinate.row, deduction.coordinate.column)));
  if (target) visit(target, null, new Set());
  return alternations;
}

function pathSignature(candidate: LatinSquareCandidate, analysis: LatinDeductionAnalysis): string | null {
  const target = analysis.deductions.find((deduction) => sameCoordinate(deduction.coordinate, candidate.structuredData.target));
  if (!target || target.symbol !== candidate.correctAnswer) return null;
  const closure = targetDependencyClosure(analysis.deductions, candidate.structuredData.target);
  const alternations = closureAlternations(closure);
  return JSON.stringify({
    classification: reasoningClassification(target, closure),
    targetDepth: target.depth,
    intermediates: closure.deductions.length - 1,
    alternations,
    reasons: closure.deductions.map((deduction) => `${deduction.reason}:${deduction.axis}:${deduction.candidatesBefore.length}`).sort(),
  });
}

function clueQuality(
  candidate: LatinSquareCandidate,
  analysis: LatinDeductionAnalysis,
  closure: TargetClosure,
): { essential: number; redundant: number; relevant: number; irrelevant: number } {
  const visibleCoordinates = candidate.structuredData.grid.flatMap((row, rowIndex) => row.flatMap((symbol, columnIndex) =>
    symbol === null ? [] : [{ row: rowIndex, column: columnIndex }]));
  const baseSignature = pathSignature(candidate, analysis);
  let essential = 0;
  for (const coordinate of visibleCoordinates) {
    if (!closure.clueKeys.has(key(coordinate.row, coordinate.column))) continue;
    const changed = structuredClone(candidate);
    changed.structuredData.grid[coordinate.row][coordinate.column] = null;
    if (pathSignature(changed, analyzeLatinDeductions(changed)) !== baseSignature) essential += 1;
  }
  return {
    essential,
    redundant: visibleCoordinates.length - essential,
    relevant: closure.clueKeys.size,
    irrelevant: visibleCoordinates.length - closure.clueKeys.size,
  };
}

export function calculateLatinDifficulty(
  candidate: LatinSquareCandidate,
  analysis: LatinDeductionAnalysis,
  options: { assessClues?: boolean } = {},
): { difficulty: GenerationDifficulty; metrics: LatinDifficultyMetrics } | null {
  const { target, grid } = candidate.structuredData;
  const targetStepIndex = analysis.deductions.findIndex((deduction) => sameCoordinate(deduction.coordinate, target));
  if (targetStepIndex < 0) return null;
  const targetDeduction = analysis.deductions[targetStepIndex];
  if (targetDeduction.symbol !== candidate.correctAnswer) return null;
  const closure = targetDependencyClosure(analysis.deductions, target);
  const rowColumnAlternations = closureAlternations(closure);
  const requiredIntermediateCells = Math.max(0, closure.deductions.length - 1);
  const maxDeductionDepth = Math.max(...closure.deductions.map((deduction) => deduction.depth));
  const dependencyEdges = closure.deductions.reduce((sum, deduction) => sum + deduction.dependencies.filter((dependency) => closure.forcedKeys.has(key(dependency.row, dependency.column))).length, 0);
  const branchingFactor = requiredIntermediateCells ? dependencyEdges / requiredIntermediateCells : 0;
  const candidateEliminations = closure.deductions.reduce((sum, deduction) => sum + deduction.eliminatedCandidates.length + Math.max(0, deduction.candidatesBefore.length - 1), 0);
  const visibleClues = grid.flat().filter((value) => value !== null).length;
  const quality = options.assessClues === false
    ? { essential: closure.clueKeys.size, redundant: visibleClues - closure.clueKeys.size, relevant: closure.clueKeys.size, irrelevant: visibleClues - closure.clueKeys.size }
    : clueQuality(candidate, analysis, closure);
  const legacyClassification = !requiredIntermediateCells
    ? "direct"
    : maxDeductionDepth >= 3 || targetDeduction.round >= 3
      ? "multi_stage"
      : "indirect";
  const mechanism = reasoningClassification(targetDeduction, closure);
  const workingMemoryLoad = requiredIntermediateCells + analysis.targetInitialCandidateCount + maxDeductionDepth + rowColumnAlternations + Math.ceil(candidateEliminations / 4);
  const score = Number((
    targetDeduction.depth * 4 +
    requiredIntermediateCells * 2.5 +
    maxDeductionDepth * 2 +
    candidateEliminations * 0.35 +
    rowColumnAlternations * 2.5 +
    branchingFactor * 1.5 +
    workingMemoryLoad +
    Math.max(0, quality.redundant - quality.essential) * 0.15
  ).toFixed(3));
  const direct = mechanism === "DIRECT_ROW_ELIMINATION" || mechanism === "DIRECT_COLUMN_ELIMINATION" || mechanism === "ROW_COLUMN_INTERSECTION";
  const easyProfile = direct && requiredIntermediateCells === 0 && targetDeduction.depth === 1 && analysis.targetInitialCandidateCount <= 2;
  const mediumProfile = !easyProfile && maxDeductionDepth <= 3 && requiredIntermediateCells <= 4 && rowColumnAlternations <= 2;
  const difficulty: GenerationDifficulty = easyProfile ? "easy" : mediumProfile ? "medium" : "hard";

  const rowDependencyCount = closure.deductions.reduce((sum, deduction) => sum + deduction.dependencies.filter((dependency) => dependency.row === deduction.coordinate.row).length, 0);
  const columnDependencyCount = closure.deductions.reduce((sum, deduction) => sum + deduction.dependencies.filter((dependency) => dependency.column === deduction.coordinate.column).length, 0);
  const usefulClues = quality.relevant;
  const clueCoordinates = [...closure.clueKeys].map((value) => {
    const [row, column] = value.split(":").map(Number);
    return { row, column };
  });
  const clueDistanceFromTarget = clueCoordinates.length ? clueCoordinates.reduce((sum, coordinate) => sum + Math.abs(coordinate.row - target.row) + Math.abs(coordinate.column - target.column), 0) / clueCoordinates.length : 0;
  return {
    difficulty,
    metrics: {
      targetStepIndex,
      targetDepth: targetDeduction.depth,
      targetRound: targetDeduction.round,
      totalDeductions: analysis.deductions.length,
      visibleClues,
      targetInitialCandidateCount: analysis.targetInitialCandidateCount,
      directRowEliminations: analysis.directRowEliminations,
      directColumnEliminations: analysis.directColumnEliminations,
      forcedPlacementsBeforeTarget: requiredIntermediateCells,
      rowDependencyCount,
      columnDependencyCount,
      usefulClueCount: usefulClues,
      clueDistanceFromTarget: Number(clueDistanceFromTarget.toFixed(3)),
      workingMemoryLoad,
      classification: legacyClassification,
      reasoningClassification: mechanism,
      totalForcedCells: analysis.deductions.length,
      requiredIntermediateCells,
      maxDeductionDepth,
      branchingFactor: Number(branchingFactor.toFixed(3)),
      rowColumnAlternations,
      candidateEliminations,
      relevantClueCount: quality.relevant,
      irrelevantClueCount: quality.irrelevant,
      essentialClueCount: quality.essential,
      redundantClueCount: quality.redundant,
      redundancyRatio: Number((quality.redundant / Math.max(1, visibleClues)).toFixed(4)),
      score,
    },
  };
}

export function explainLatinDeductions(
  deductions: readonly LatinDeduction[],
  target: LatinCoordinate,
): string {
  const closure = targetDependencyClosure(deductions, target);
  return deductions
    .filter((deduction) => closure.forcedKeys.has(key(deduction.coordinate.row, deduction.coordinate.column)))
    .map((deduction, index) => {
      const row = deduction.coordinate.row + 1;
      const column = deduction.coordinate.column + 1;
      const reason = deduction.reason === "single_candidate"
        ? `the existing row and column entries eliminate ${deduction.eliminatedCandidates.join(", ")}, leaving only ${deduction.symbol}`
        : deduction.reason === "only_position_in_row"
          ? `column ${column} is the only remaining position for ${deduction.symbol} in row ${row}`
          : `row ${row} is the only remaining position for ${deduction.symbol} in column ${column}`;
      return `${index + 1}. Put ${deduction.symbol} in row ${row}, column ${column}, because ${reason}.`;
    })
    .join("\n");
}

import { productionEvidenceFor } from "../../evidence";
import { canonicalize } from "../fingerprint";
import { SeededRandom } from "../random";
import type { QuestionGenerator } from "../types";
import { analyzeLatinDeductions, calculateLatinDifficulty } from "./difficulty";
import {
  LATIN_DEDUCTION_EVIDENCE_REGISTRY,
  type LatinDeductionMechanismId,
} from "./evidence";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_GENERATOR_VERSION,
  LATIN_SQUARE_SIZE,
  type CompletedLatinGrid,
  type LatinCoordinate,
  type LatinSquareCandidate,
  type LatinSquareGenerationConfiguration,
  type LatinSymbol,
  type VisibleLatinGrid,
} from "./types";

const CLUE_RANGE = { minimum: 10, maximum: 15 } as const;
const ESTIMATED_SECONDS = { easy: 55, medium: 75, hard: 100 } as const;
type Difficulty = LatinSquareGenerationConfiguration["difficulty"];

function seedNamespace(configuration: LatinSquareGenerationConfiguration): string {
  if (!configuration.seed.trim()) throw new Error("A non-empty Latin-square seed is required.");
  return `${LATIN_SQUARE_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${canonicalize(configuration.options ?? {})}`;
}

function createRandom(configuration: LatinSquareGenerationConfiguration, attempt: number): SeededRandom {
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError("Generation attempt must be a positive safe integer.");
  return new SeededRandom(`${seedNamespace(configuration)}\u001f${attempt}`);
}

function completedSquare(random: SeededRandom): CompletedLatinGrid {
  const rowOrder = random.shuffle([0, 1, 2, 3, 4]);
  const columnOrder = random.shuffle([0, 1, 2, 3, 4]);
  const symbols = random.shuffle(DEFAULT_LATIN_SYMBOLS) as LatinSymbol[];
  return rowOrder.map((row) => columnOrder.map((column) => symbols[(row + column) % LATIN_SQUARE_SIZE]));
}

function enabledMechanism(id: LatinDeductionMechanismId): boolean {
  return Boolean(productionEvidenceFor(LATIN_DEDUCTION_EVIDENCE_REGISTRY, id));
}

export function intendedLatinDeductionMechanism(
  configuration: LatinSquareGenerationConfiguration,
): LatinDeductionMechanismId {
  const random = new SeededRandom(`${seedNamespace(configuration)}\u001freasoning-intent`);
  const weighted: Record<Difficulty, LatinDeductionMechanismId[]> = {
    easy: [
      "DIRECT_ROW_ELIMINATION",
      "DIRECT_ROW_ELIMINATION",
      "DIRECT_COLUMN_ELIMINATION",
      "DIRECT_COLUMN_ELIMINATION",
      "ROW_COLUMN_INTERSECTION",
    ],
    medium: [
      "SINGLE_INTERMEDIATE",
      "SINGLE_INTERMEDIATE",
      "SINGLE_INTERMEDIATE",
      "CHAINED_INTERMEDIATE",
    ],
    hard: [
      "CHAINED_INTERMEDIATE",
      "CHAINED_INTERMEDIATE",
      "MULTI_STAGE_DEDUCTION",
      "MULTI_STAGE_DEDUCTION",
      "MULTI_STAGE_DEDUCTION",
    ],
  };
  const available = weighted[configuration.difficulty].filter(enabledMechanism);
  if (!available.length) throw new Error(`No evidence-backed Latin reasoning mechanism is enabled for ${configuration.difficulty}.`);
  return random.pick(available);
}

function coordinateKey({ row, column }: LatinCoordinate): string {
  return `${row}:${column}`;
}

function allCoordinates(): LatinCoordinate[] {
  return Array.from({ length: LATIN_SQUARE_SIZE * LATIN_SQUARE_SIZE }, (_, index) => ({
    row: Math.floor(index / LATIN_SQUARE_SIZE),
    column: index % LATIN_SQUARE_SIZE,
  }));
}

function initialGrid(completed: CompletedLatinGrid, target: LatinCoordinate): VisibleLatinGrid {
  return completed.map((row, rowIndex) => row.map((symbol, columnIndex) =>
    rowIndex === target.row && columnIndex === target.column ? null : symbol));
}

function candidateShell(
  configuration: LatinSquareGenerationConfiguration,
  completedGrid: CompletedLatinGrid,
  grid: VisibleLatinGrid,
  target: LatinCoordinate,
): LatinSquareCandidate {
  const correctAnswer = completedGrid[target.row][target.column];
  return {
    questionType: "latin_square",
    module: "core",
    topic: "Latin Squares",
    subtopic: "Row and column deduction",
    presentation: {
      prompt: "Which letter belongs in the cell marked with a question mark?",
      blocks: [{ kind: "diagram", data: { size: LATIN_SQUARE_SIZE, grid, target } }],
    },
    structuredData: { size: LATIN_SQUARE_SIZE, symbols: [...DEFAULT_LATIN_SYMBOLS], grid, target },
    response: {
      kind: "single_choice",
      options: DEFAULT_LATIN_SYMBOLS.map((symbol) => ({ id: symbol, label: symbol, content: symbol })),
    },
    correctAnswer,
    explanation: `Applying the row and column constraints determines ${correctAnswer} at the target cell.`,
    estimatedSolveTimeSeconds: ESTIMATED_SECONDS[configuration.difficulty],
    completedGrid,
  };
}

function protectedTargetBlockers(
  completed: CompletedLatinGrid,
  target: LatinCoordinate,
  mechanism: LatinDeductionMechanismId,
  random: SeededRandom,
): Set<string> {
  const answer = completed[target.row][target.column];
  const otherSymbols = random.shuffle(DEFAULT_LATIN_SYMBOLS.filter((symbol) => symbol !== answer));
  const protectedCoordinates: LatinCoordinate[] = [];
  const desiredBlockers = mechanism === "SINGLE_INTERMEDIATE"
    ? 3
    : mechanism === "CHAINED_INTERMEDIATE"
      ? 2
      : mechanism === "MULTI_STAGE_DEDUCTION"
        ? 1
        : 4;
  otherSymbols.slice(0, desiredBlockers).forEach((symbol, index) => {
    const rowCoordinate = { row: target.row, column: completed[target.row].indexOf(symbol) };
    const columnCoordinate = { row: completed.findIndex((row) => row[target.column] === symbol), column: target.column };
    const coordinate = mechanism === "DIRECT_ROW_ELIMINATION"
      ? rowCoordinate
      : mechanism === "DIRECT_COLUMN_ELIMINATION"
        ? columnCoordinate
        : index % 2 === 0 ? rowCoordinate : columnCoordinate;
    protectedCoordinates.push(coordinate);
  });
  return new Set(protectedCoordinates.map(coordinateKey));
}

function mechanismDistance(
  actual: LatinDeductionMechanismId,
  intended: LatinDeductionMechanismId,
): number {
  if (actual === intended) return 0;
  const ranks: Record<LatinDeductionMechanismId, number> = {
    DIRECT_ROW_ELIMINATION: 0,
    DIRECT_COLUMN_ELIMINATION: 0,
    ROW_COLUMN_INTERSECTION: 1,
    SINGLE_INTERMEDIATE: 2,
    CHAINED_INTERMEDIATE: 3,
    MULTI_STAGE_DEDUCTION: 4,
  };
  return 10 + Math.abs(ranks[actual] - ranks[intended]);
}

function removeClues(
  configuration: LatinSquareGenerationConfiguration,
  completed: CompletedLatinGrid,
  target: LatinCoordinate,
  mechanism: LatinDeductionMechanismId,
  random: SeededRandom,
): VisibleLatinGrid {
  const grid = initialGrid(completed, target);
  const protectedBlockers = protectedTargetBlockers(completed, target, mechanism, random.fork("blockers"));
  allCoordinates().forEach((coordinate) => {
    if (coordinateKey(coordinate) === coordinateKey(target)) return;
    if ((coordinate.row === target.row || coordinate.column === target.column) && !protectedBlockers.has(coordinateKey(coordinate))) {
      grid[coordinate.row][coordinate.column] = null;
    }
  });

  const targetClueCount = random.integer(CLUE_RANGE.minimum, CLUE_RANGE.maximum);
  while (grid.flat().filter((symbol) => symbol !== null).length > targetClueCount) {
    const fullRows = new Set(grid.flatMap((row, rowIndex) => row.every((symbol) => symbol !== null) ? [rowIndex] : []));
    const fullColumns = new Set(Array.from({ length: LATIN_SQUARE_SIZE }, (_, column) => column)
      .filter((column) => grid.every((row) => row[column] !== null)));
    const allRemovable = allCoordinates().filter((coordinate) =>
      grid[coordinate.row][coordinate.column] !== null && !protectedBlockers.has(coordinateKey(coordinate)));
    const lineBalancing = allRemovable.filter((coordinate) => fullRows.has(coordinate.row) || fullColumns.has(coordinate.column));
    const removable = random.shuffle(lineBalancing.length ? lineBalancing : allRemovable);
    // A small deterministic beam keeps reasoning-guided removal inexpensive in production.
    const evaluated = removable.slice(0, 4).flatMap((coordinate) => {
      const trial = grid.map((row) => [...row]);
      trial[coordinate.row][coordinate.column] = null;
      const trialCandidate = candidateShell(configuration, completed, trial, target);
      const analysis = analyzeLatinDeductions(trialCandidate);
      const calculated = calculateLatinDifficulty(trialCandidate, analysis, { assessClues: false });
      if (!calculated) return [];
      const difficultyPenalty = calculated.difficulty === configuration.difficulty ? 0 : 5;
      const distance = mechanismDistance(calculated.metrics.reasoningClassification, mechanism);
      const redundancyPenalty = calculated.metrics.redundantClueCount / Math.max(1, calculated.metrics.visibleClues);
      return [{ coordinate, score: distance + difficultyPenalty + redundancyPenalty }];
    });
    if (!evaluated.length) break;
    evaluated.sort((first, second) => first.score - second.score || coordinateKey(first.coordinate).localeCompare(coordinateKey(second.coordinate)));
    const bestScore = evaluated[0].score;
    const best = evaluated.filter((item) => item.score <= bestScore + 0.001);
    const selected = random.pick(best).coordinate;
    grid[selected.row][selected.column] = null;
  }
  return grid;
}

export class LatinSquareGenerator implements QuestionGenerator<LatinSquareGenerationConfiguration, LatinSquareCandidate> {
  readonly questionType = "latin_square" as const;
  readonly version = LATIN_SQUARE_GENERATOR_VERSION;

  generate(configuration: LatinSquareGenerationConfiguration, attempt: number): LatinSquareCandidate {
    const random = createRandom(configuration, attempt);
    const completedGrid = completedSquare(random.fork("completed"));
    const mechanism = intendedLatinDeductionMechanism(configuration);
    const evaluated = random.shuffle(allCoordinates()).slice(0, 3).map((target) => {
      const grid = removeClues(configuration, completedGrid, target, mechanism, random.fork(`clue-removal-${coordinateKey(target)}`));
      const candidate = candidateShell(configuration, completedGrid, grid, target);
      const calculated = calculateLatinDifficulty(candidate, analyzeLatinDeductions(candidate), { assessClues: false });
      const score = calculated
        ? mechanismDistance(calculated.metrics.reasoningClassification, mechanism) +
          Number(calculated.difficulty !== configuration.difficulty) * 5 +
          calculated.metrics.redundancyRatio
        : Number.POSITIVE_INFINITY;
      return { candidate, score };
    }).sort((first, second) => first.score - second.score);
    if (!evaluated.length || !Number.isFinite(evaluated[0].score)) {
      throw new Error("No candidate target produced an evidence-backed human deduction path.");
    }
    return evaluated[0].candidate;
  }
}

export const latinSquareGenerator = new LatinSquareGenerator();

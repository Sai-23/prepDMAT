import { canonicalize } from "../fingerprint";
import { SeededRandom } from "../random";
import type { QuestionGenerator } from "../types";
import {
  enabledFigurePrimitives,
  validateFigureRuleCompatibility,
} from "./compatibility";
import { createFigureCandidates } from "./distractors";
import { replayFigureSequence, replayFigureSequenceDetailed } from "./engine";
import type { FigurePrimitiveId } from "./evidence";
import {
  FIGURE_COLORS,
  FIGURE_SEQUENCE_GENERATOR_VERSION,
  FIGURE_SHAPES,
  type FigureColor,
  type FigureDirection,
  type FigureGridDefinition,
  type FigureMissingMatrix,
  type FigureMovementRule,
  type FigureSequenceCandidate,
  type FigureSequenceGenerationConfiguration,
  type FigureShape,
  type FigureSymbolRuleSet,
  type FigureSymbolState,
} from "./types";

const GRID: FigureGridDefinition = { rows: 5, columns: 5 };
const ESTIMATED_SECONDS = { easy: 65, medium: 95, hard: 125 } as const;
const IDS = ["alpha", "beta", "gamma", "delta"] as const;
const HORIZONTAL_DIRECTIONS: FigureDirection[] = ["left", "right"];
const VERTICAL_DIRECTIONS: FigureDirection[] = ["up", "down"];
const DIAGONAL_DIRECTIONS: FigureDirection[] = [
  "up_left",
  "up_right",
  "down_left",
  "down_right",
];

type Difficulty = FigureSequenceGenerationConfiguration["difficulty"];
type MovementArchitecture =
  | Extract<FigurePrimitiveId,
      | "MOVE_HORIZONTAL"
      | "MOVE_VERTICAL"
      | "MOVE_DIAGONAL"
      | "MOVE_BOUNDARY_CLOCKWISE"
      | "MOVE_BOUNDARY_COUNTERCLOCKWISE">
  | "CARDINAL_DIRECTION_CYCLE_COMPOSITION";

type GenerationIntent = {
  symbolCount: 1 | 2 | 3 | 4;
  anchorMovement: MovementArchitecture;
};

function seedNamespace(configuration: FigureSequenceGenerationConfiguration): string {
  if (!configuration.seed.trim()) throw new Error("A non-empty figure-sequence seed is required.");
  return `${FIGURE_SEQUENCE_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${configuration.symbolCount ?? "weighted"}\u001f${canonicalize(configuration.options ?? {})}`;
}

function randomFor(
  configuration: FigureSequenceGenerationConfiguration,
  attempt: number,
): SeededRandom {
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new RangeError("Generation attempt must be positive.");
  }
  return new SeededRandom(`${seedNamespace(configuration)}\u001f${attempt}`);
}

function weightedSymbolCount(difficulty: Difficulty, random: SeededRandom): 1 | 2 | 3 | 4 {
  const roll = random.next();
  if (difficulty === "easy") return roll < 0.72 ? 1 : 2;
  if (difficulty === "medium") return roll < 0.08 ? 1 : roll < 0.53 ? 2 : 3;
  return roll < 0.14 ? 2 : roll < 0.55 ? 3 : 4;
}

function resolveSymbolCount(
  configuration: FigureSequenceGenerationConfiguration,
  random: SeededRandom,
): 1 | 2 | 3 | 4 {
  const count = configuration.symbolCount ?? weightedSymbolCount(configuration.difficulty, random);
  const valid =
    (configuration.difficulty === "easy" && count >= 1 && count <= 2) ||
    (configuration.difficulty === "medium" && count >= 1 && count <= 3) ||
    (configuration.difficulty === "hard" && count >= 2 && count <= 4);
  if (!valid) {
    throw new RangeError(`A ${configuration.difficulty} figure sequence does not support ${count} symbols.`);
  }
  return count;
}

function movementArchitectures(difficulty: Difficulty): MovementArchitecture[] {
  const supported = new Set(enabledFigurePrimitives("movement"));
  const architectures: MovementArchitecture[] = [];
  if (supported.has("MOVE_HORIZONTAL")) architectures.push("MOVE_HORIZONTAL");
  if (supported.has("MOVE_VERTICAL")) architectures.push("MOVE_VERTICAL");
  if (supported.has("MOVE_DIAGONAL")) architectures.push("MOVE_DIAGONAL");
  if (supported.has("MOVE_BOUNDARY_CLOCKWISE")) architectures.push("MOVE_BOUNDARY_CLOCKWISE");
  if (supported.has("MOVE_BOUNDARY_COUNTERCLOCKWISE")) architectures.push("MOVE_BOUNDARY_COUNTERCLOCKWISE");
  if (
    difficulty !== "easy" &&
    supported.has("MOVE_HORIZONTAL") &&
    supported.has("MOVE_VERTICAL")
  ) architectures.push("CARDINAL_DIRECTION_CYCLE_COMPOSITION");
  if (!architectures.length) throw new Error("No evidence-backed Figure movement is production-enabled.");
  return architectures;
}

function generationIntent(
  configuration: FigureSequenceGenerationConfiguration,
): GenerationIntent {
  const random = new SeededRandom(`${seedNamespace(configuration)}\u001fcomposition-intent`);
  return {
    symbolCount: resolveSymbolCount(configuration, random),
    anchorMovement: random.pick(movementArchitectures(configuration.difficulty)),
  };
}

function movementRule(
  architecture: MovementArchitecture,
  difficulty: Difficulty,
  random: SeededRandom,
): FigureMovementRule {
  const progressiveProbability = difficulty === "easy" ? 0.04 : difficulty === "medium" ? 0.18 : 0.42;
  const progression = random.boolean(progressiveProbability) ? "incrementing" : "fixed";
  const steps = progression === "incrementing"
    ? 1
    : difficulty === "easy" ? 1 : random.pick([1, 1, 2]);
  if (architecture === "MOVE_BOUNDARY_CLOCKWISE" || architecture === "MOVE_BOUNDARY_COUNTERCLOCKWISE") {
    return {
      kind: "border",
      direction: architecture === "MOVE_BOUNDARY_CLOCKWISE" ? "clockwise" : "counter_clockwise",
      steps,
      progression,
    };
  }
  if (architecture === "CARDINAL_DIRECTION_CYCLE_COMPOSITION") {
    const directions = random.pick([
      ["right", "down", "left", "up"],
      ["right", "up", "left", "down"],
      ["left", "down", "right", "up"],
      ["up", "right", "down", "left"],
    ] as const);
    return {
      kind: "direction_cycle",
      directions: [...directions],
      steps,
      progression,
      boundary: "bounce",
    };
  }
  const directions = architecture === "MOVE_HORIZONTAL"
    ? HORIZONTAL_DIRECTIONS
    : architecture === "MOVE_VERTICAL"
      ? VERTICAL_DIRECTIONS
      : DIAGONAL_DIRECTIONS;
  return {
    kind: "linear",
    direction: random.pick(directions),
    steps,
    progression,
    boundary: "bounce",
  };
}

function addRotation(
  rule: FigureSymbolRuleSet,
  difficulty: Difficulty,
  random: SeededRandom,
): void {
  rule.rotation = {
    direction: random.boolean() ? "clockwise" : "counter_clockwise",
    quarterTurns: 1,
    progression: random.boolean(difficulty === "hard" ? 0.28 : difficulty === "medium" ? 0.05 : 0)
      ? "incrementing"
      : "fixed",
  };
}

function addColour(
  rule: FigureSymbolRuleSet,
  difficulty: Difficulty,
  random: SeededRandom,
): void {
  const cycleLength = difficulty === "easy" ? 2 : random.pick([2, 3, difficulty === "hard" ? 4 : 3]);
  rule.colour = {
    cycle: random.shuffle(FIGURE_COLORS.filter((colour) => colour !== "white")).slice(0, cycleLength),
    steps: 1,
    progression: random.boolean(difficulty === "hard" ? 0.15 : 0) ? "incrementing" : "fixed",
  };
}

function createRules(
  difficulty: Difficulty,
  intent: GenerationIntent,
  random: SeededRandom,
): FigureSymbolRuleSet[] {
  const architectures = movementArchitectures(difficulty);
  const rules = IDS.slice(0, intent.symbolCount).map((symbolId, index): FigureSymbolRuleSet => {
    const architecture = index === 0
      ? intent.anchorMovement
      : random.pick(architectures.filter((candidate) => candidate !== intent.anchorMovement).length
        ? architectures.filter((candidate) => candidate !== intent.anchorMovement)
        : architectures);
    const rule: FigureSymbolRuleSet = {
      symbolId,
      movement: movementRule(architecture, difficulty, random),
    };
    const rotationProbability = difficulty === "easy" ? 0.12 : difficulty === "medium" ? 0.38 : 0.62;
    const colourProbability = difficulty === "easy" ? 0.12 : difficulty === "medium" ? 0.38 : 0.62;
    if (random.boolean(rotationProbability)) addRotation(rule, difficulty, random);
    if (random.boolean(colourProbability)) addColour(rule, difficulty, random);
    return rule;
  });

  if (difficulty === "easy") {
    const secondaryRules = rules.flatMap((rule) => [
      ...(rule.rotation ? [{ rule, kind: "rotation" as const }] : []),
      ...(rule.colour ? [{ rule, kind: "colour" as const }] : []),
    ]);
    random.shuffle(secondaryRules).slice(1).forEach(({ rule, kind }) => { delete rule[kind]; });
  }
  if (difficulty === "medium" && !rules.some((rule) =>
    rule.rotation || rule.colour || rule.movement?.progression === "incrementing")) {
    const target = random.pick(rules);
    if (random.boolean()) addRotation(target, difficulty, random);
    else addColour(target, difficulty, random);
  }
  if (difficulty === "hard") {
    while (rules.reduce((count, rule) => count + Number(Boolean(rule.rotation)) + Number(Boolean(rule.colour)), 0) < 2) {
      const target = random.pick(rules);
      if (!target.rotation && (target.colour || random.boolean())) addRotation(target, difficulty, random);
      else if (!target.colour) addColour(target, difficulty, random);
    }
    if (!rules.some((rule) =>
      rule.movement?.progression === "incrementing" ||
      rule.rotation?.progression === "incrementing" ||
      rule.colour?.progression === "incrementing")) {
      random.pick(rules).movement!.progression = "incrementing";
    }
  }

  for (const rule of rules) {
    const compatibility = validateFigureRuleCompatibility(rule);
    if (!compatibility.valid) throw new Error(compatibility.issues.join(" "));
  }
  return rules;
}

function perimeterPositions(): Array<{ row: number; column: number }> {
  const positions: Array<{ row: number; column: number }> = [];
  for (let column = 0; column < GRID.columns; column += 1) positions.push({ row: 0, column });
  for (let row = 1; row < GRID.rows; row += 1) positions.push({ row, column: GRID.columns - 1 });
  for (let column = GRID.columns - 2; column >= 0; column -= 1) positions.push({ row: GRID.rows - 1, column });
  for (let row = GRID.rows - 2; row > 0; row -= 1) positions.push({ row, column: 0 });
  return positions;
}

function allPositions(): Array<{ row: number; column: number }> {
  return Array.from({ length: GRID.rows * GRID.columns }, (_, index) => ({
    row: Math.floor(index / GRID.columns),
    column: index % GRID.columns,
  }));
}

function demonstratesBoundary(
  position: { row: number; column: number },
  rule: FigureSymbolRuleSet,
): boolean {
  if (rule.movement?.kind === "border") return true;
  const symbol: FigureSymbolState = {
    id: rule.symbolId,
    shape: "arrow",
    color: rule.colour?.cycle[0] ?? "blue",
    fill: "solid",
    orientation: 0,
    ...position,
  };
  try {
    return replayFigureSequenceDetailed(
      GRID,
      { index: 0, symbols: [symbol] },
      [rule],
      3,
    ).boundaryEvents.some((event) => event.behavior === "bounce");
  } catch {
    return false;
  }
}

function createSymbolsOnce(
  rules: readonly FigureSymbolRuleSet[],
  random: SeededRandom,
): FigureSymbolState[] {
  const occupied = new Set<string>();
  const unusedShapes = random.shuffle(FIGURE_SHAPES);
  const unusedColours = random.shuffle(FIGURE_COLORS.filter((colour) => colour !== "white"));
  return rules.map((rule, index) => {
    const positions = rule.movement?.kind === "border"
      ? perimeterPositions()
      : allPositions().filter((position) => demonstratesBoundary(position, rule));
    const availablePositions = random.shuffle(positions).filter((position) =>
      !occupied.has(`${position.row}:${position.column}`));
    const position = availablePositions[0];
    if (!position) throw new Error(`No pedagogically useful starting position is available for ${rule.symbolId}.`);
    occupied.add(`${position.row}:${position.column}`);
    const permittedShapes = unusedShapes.filter((shape) => !rule.rotation || shape !== "circle");
    const shape: FigureShape = permittedShapes[0] ?? random.pick(FIGURE_SHAPES.filter((item) => item !== "circle"));
    const usedShapeIndex = unusedShapes.indexOf(shape);
    if (usedShapeIndex >= 0) unusedShapes.splice(usedShapeIndex, 1);
    const color: FigureColor = rule.colour ? random.pick(rule.colour.cycle) : unusedColours[index % unusedColours.length];
    return {
      id: rule.symbolId,
      shape,
      color,
      fill: index % 2 === 0 ? "solid" : "outline",
      orientation: random.pick([0, 90, 180, 270]),
      ...position,
    };
  });
}

function createModel(
  configuration: FigureSequenceGenerationConfiguration,
  intent: GenerationIntent,
  random: SeededRandom,
): { symbols: FigureSymbolState[]; rules: FigureSymbolRuleSet[] } {
  const rules = createRules(configuration.difficulty, intent, random.fork("rules"));
  for (let placementAttempt = 1; placementAttempt <= 192; placementAttempt += 1) {
    try {
      const symbols = createSymbolsOnce(rules, random.fork(`placement-${placementAttempt}`));
      replayFigureSequence(GRID, { index: 0, symbols }, rules, 5);
      return { symbols, rules };
    } catch {
      // Keep the retry inside the intended composition so collisions do not select simpler rules.
    }
  }
  throw new Error("Unable to place the intended evidence-backed rule composition without collisions.");
}

export class FigureSequenceGenerator implements QuestionGenerator<FigureSequenceGenerationConfiguration, FigureSequenceCandidate> {
  readonly questionType = "figure_sequence" as const;
  readonly version = FIGURE_SEQUENCE_GENERATOR_VERSION;

  generate(configuration: FigureSequenceGenerationConfiguration, attempt: number): FigureSequenceCandidate {
    const random = randomFor(configuration, attempt);
    const intent = generationIntent(configuration);
    const model = createModel(configuration, intent, random);
    const frames = replayFigureSequence(GRID, { index: 0, symbols: model.symbols }, model.rules, 5);
    const first = createFigureCandidates(
      GRID,
      frames[4],
      frames[3],
      model.rules,
      3,
      random.fork("slot-1"),
      1,
    );
    const second = createFigureCandidates(
      GRID,
      frames[5],
      frames[4],
      model.rules,
      4,
      random.fork("slot-2"),
      2,
    );
    const missingMatrices: [FigureMissingMatrix, FigureMissingMatrix] = [
      { sequenceIndex: 4, candidates: first.candidates },
      { sequenceIndex: 5, candidates: second.candidates },
    ];
    const structuredData = { grid: GRID, visibleFrames: frames.slice(0, 4), rules: model.rules };
    return {
      questionType: "figure_sequence",
      module: "core",
      topic: "Figure Sequences",
      subtopic: "Independent transformation rules",
      presentation: {
        prompt: "Choose the next two matrices in the sequence.",
        blocks: [{ kind: "diagram", data: { grid: GRID, visibleFrames: frames.slice(0, 4), missingMatrices } }],
      },
      structuredData,
      response: {
        kind: "two_stage_single_choice",
        stages: missingMatrices.map((matrix) => matrix.candidates.map((candidate) => ({
          id: candidate.id,
          label: candidate.label,
          content: { frame: candidate.frame },
        }))) as [never[], never[]],
      },
      correctAnswer: [first.correctCandidateId, second.correctCandidateId],
      explanation: "The independently validated transformation rules determine both missing matrices.",
      estimatedSolveTimeSeconds: ESTIMATED_SECONDS[configuration.difficulty],
      sequence: { ...structuredData, missingMatrices },
      solutionFrames: [frames[4], frames[5]],
    };
  }
}

export const figureSequenceGenerator = new FigureSequenceGenerator();

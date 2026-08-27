import { validateFigureFrameStructure } from "./validation";
import type {
  FigureColourRule,
  FigureBoundaryEvent,
  FigureDirection,
  FigureFrame,
  FigureGridDefinition,
  FigureMovementRule,
  FigureProgression,
  FigureRotationRule,
  FigureSimulation,
  FigureSymbolRuleSet,
  FigureSymbolState,
} from "./types";

const DIRECTION_VECTORS: Record<
  FigureDirection,
  { rowDelta: -1 | 0 | 1; columnDelta: -1 | 0 | 1 }
> = {
  up: { rowDelta: -1, columnDelta: 0 },
  down: { rowDelta: 1, columnDelta: 0 },
  left: { rowDelta: 0, columnDelta: -1 },
  right: { rowDelta: 0, columnDelta: 1 },
  up_left: { rowDelta: -1, columnDelta: -1 },
  up_right: { rowDelta: -1, columnDelta: 1 },
  down_left: { rowDelta: 1, columnDelta: -1 },
  down_right: { rowDelta: 1, columnDelta: 1 },
};

function progressedValue(
  base: number,
  progression: FigureProgression,
  transitionIndex: number,
): number {
  if (!Number.isSafeInteger(base) || base < 1) {
    throw new RangeError("Transformation steps must be positive safe integers.");
  }
  return progression === "incrementing" ? base + transitionIndex : base;
}

function moveWithVector(
  grid: FigureGridDefinition,
  symbol: FigureSymbolState,
  vector: { rowDelta: -1 | 0 | 1; columnDelta: -1 | 0 | 1 },
  steps: number,
  boundary: "bounce" | "reject",
): { symbol: FigureSymbolState; boundaryInteractions: number } {
  let row = symbol.row;
  let column = symbol.column;
  let { rowDelta, columnDelta } = vector;
  let boundaryInteractions = 0;
  for (let step = 0; step < steps; step += 1) {
    let nextRow = row + rowDelta;
    let nextColumn = column + columnDelta;
    const rowOutside = nextRow < 0 || nextRow >= grid.rows;
    const columnOutside = nextColumn < 0 || nextColumn >= grid.columns;
    if (rowOutside || columnOutside) {
      if (boundary === "reject") {
        throw new Error(`Movement would take symbol ${symbol.id} outside the matrix.`);
      }
      boundaryInteractions += 1;
      if (rowOutside) rowDelta = (rowDelta * -1) as -1 | 0 | 1;
      if (columnOutside) columnDelta = (columnDelta * -1) as -1 | 0 | 1;
      nextRow = row + rowDelta;
      nextColumn = column + columnDelta;
    }
    row = nextRow;
    column = nextColumn;
  }
  return {
    symbol: { ...symbol, row, column, motionState: { rowDelta, columnDelta } },
    boundaryInteractions,
  };
}

function perimeter(grid: FigureGridDefinition): Array<{ row: number; column: number }> {
  const positions: Array<{ row: number; column: number }> = [];
  for (let column = 0; column < grid.columns; column += 1) positions.push({ row: 0, column });
  for (let row = 1; row < grid.rows; row += 1) {
    positions.push({ row, column: grid.columns - 1 });
  }
  for (let column = grid.columns - 2; column >= 0; column -= 1) {
    positions.push({ row: grid.rows - 1, column });
  }
  for (let row = grid.rows - 2; row > 0; row -= 1) positions.push({ row, column: 0 });
  return positions;
}

function applyMovement(
  grid: FigureGridDefinition,
  symbol: FigureSymbolState,
  rule: FigureMovementRule,
  transitionIndex: number,
): { symbol: FigureSymbolState; event: FigureBoundaryEvent | null } {
  const steps = progressedValue(rule.steps, rule.progression, transitionIndex);
  if (rule.kind === "border") {
    const positions = perimeter(grid);
    const currentIndex = positions.findIndex(
      (position) => position.row === symbol.row && position.column === symbol.column,
    );
    if (currentIndex < 0) {
      throw new Error(`Border traversal requires symbol ${symbol.id} to start on the outer boundary.`);
    }
    const direction = rule.direction === "clockwise" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction * (steps % positions.length) + positions.length) %
      positions.length;
    return {
      symbol: { ...symbol, ...positions[nextIndex], motionState: undefined },
      event: { symbolId: symbol.id, transitionIndex, behavior: "follow", count: 1 },
    };
  }

  const direction =
    rule.kind === "direction_cycle"
      ? rule.directions[transitionIndex % rule.directions.length]
      : rule.direction;
  if (!direction) throw new Error("A direction cycle must contain at least one direction.");
  const configuredVector = DIRECTION_VECTORS[direction];
  const vector =
    rule.kind === "linear" && symbol.motionState
      ? symbol.motionState
      : configuredVector;
  const moved = moveWithVector(grid, symbol, vector, steps, rule.boundary);
  return {
    symbol: moved.symbol,
    event: moved.boundaryInteractions > 0
      ? { symbolId: symbol.id, transitionIndex, behavior: "bounce", count: moved.boundaryInteractions }
      : null,
  };
}

function applyRotation(
  symbol: FigureSymbolState,
  rule: FigureRotationRule,
  transitionIndex: number,
): FigureSymbolState {
  const turns = progressedValue(rule.quarterTurns, rule.progression, transitionIndex);
  const sign = rule.direction === "clockwise" ? 1 : -1;
  const orientation = ((symbol.orientation + sign * turns * 90) % 360 + 360) % 360;
  return { ...symbol, orientation: orientation as FigureSymbolState["orientation"] };
}

function applyColour(
  symbol: FigureSymbolState,
  rule: FigureColourRule,
  transitionIndex: number,
): FigureSymbolState {
  if (rule.cycle.length < 2 || new Set(rule.cycle).size !== rule.cycle.length) {
    throw new Error("A colour cycle requires at least two unique colours.");
  }
  const currentIndex = rule.cycle.indexOf(symbol.color);
  if (currentIndex < 0) {
    throw new Error(`The current colour of symbol ${symbol.id} is absent from its cycle.`);
  }
  const steps = progressedValue(rule.steps, rule.progression, transitionIndex);
  return {
    ...symbol,
    color: rule.cycle[(currentIndex + steps) % rule.cycle.length],
  };
}

export function evolveFigureFrameDetailed(
  grid: FigureGridDefinition,
  frame: FigureFrame,
  rules: readonly FigureSymbolRuleSet[],
  transitionIndex: number,
): { frame: FigureFrame; boundaryEvents: FigureBoundaryEvent[] } {
  if (!Number.isSafeInteger(transitionIndex) || transitionIndex < 0) {
    throw new RangeError("Transition index must be a non-negative safe integer.");
  }
  const initialValidation = validateFigureFrameStructure(grid, frame);
  if (!initialValidation.valid) throw new Error(initialValidation.issues.join(" "));
  if (new Set(rules.map((rule) => rule.symbolId)).size !== rules.length) {
    throw new Error("Each symbol can have only one transformation rule set.");
  }
  const ruleById = new Map(rules.map((rule) => [rule.symbolId, rule]));
  for (const rule of rules) {
    if (!frame.symbols.some((symbol) => symbol.id === rule.symbolId)) {
      throw new Error(`Rule references missing symbol ${rule.symbolId}.`);
    }
  }

  const boundaryEvents: FigureBoundaryEvent[] = [];
  const symbols = frame.symbols.map((original) => {
    const rule = ruleById.get(original.id);
    if (!rule) return { ...original };
    let symbol = { ...original };
    if (rule.movement) {
      const moved = applyMovement(grid, symbol, rule.movement, transitionIndex);
      symbol = moved.symbol;
      if (moved.event) boundaryEvents.push(moved.event);
    }
    if (rule.rotation) symbol = applyRotation(symbol, rule.rotation, transitionIndex);
    if (rule.colour) symbol = applyColour(symbol, rule.colour, transitionIndex);
    return symbol;
  });
  const next = { index: frame.index + 1, symbols };
  const validation = validateFigureFrameStructure(grid, next);
  if (!validation.valid) throw new Error(validation.issues.join(" "));
  return { frame: next, boundaryEvents };
}

export function evolveFigureFrame(
  grid: FigureGridDefinition,
  frame: FigureFrame,
  rules: readonly FigureSymbolRuleSet[],
  transitionIndex: number,
): FigureFrame {
  return evolveFigureFrameDetailed(grid, frame, rules, transitionIndex).frame;
}

export function replayFigureSequence(
  grid: FigureGridDefinition,
  initialFrame: FigureFrame,
  rules: readonly FigureSymbolRuleSet[],
  transitionCount: number,
): FigureFrame[] {
  return replayFigureSequenceDetailed(grid, initialFrame, rules, transitionCount).frames;
}

export function replayFigureSequenceDetailed(
  grid: FigureGridDefinition,
  initialFrame: FigureFrame,
  rules: readonly FigureSymbolRuleSet[],
  transitionCount: number,
): FigureSimulation {
  if (!Number.isSafeInteger(transitionCount) || transitionCount < 0) {
    throw new RangeError("Transition count must be a non-negative safe integer.");
  }
  const frames = [structuredClone(initialFrame)];
  const boundaryEvents: FigureBoundaryEvent[] = [];
  for (let transitionIndex = 0; transitionIndex < transitionCount; transitionIndex += 1) {
    const evolved = evolveFigureFrameDetailed(
      grid,
      frames[frames.length - 1],
      rules,
      transitionIndex,
    );
    frames.push(evolved.frame);
    boundaryEvents.push(...evolved.boundaryEvents);
  }
  return { frames, boundaryEvents };
}

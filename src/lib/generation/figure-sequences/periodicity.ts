import { canonicalize } from "../fingerprint";
import { evolveFigureFrame } from "./engine";
import type {
  FigureGridDefinition,
  FigureMovementRule,
  FigureSymbolRuleSet,
  FigureSymbolState,
} from "./types";

const MAX_PERIOD_SEARCH = 4_096;
const MAX_REPORTED_PERIOD = 10_000;

function gcd(first: number, second: number): number {
  let a = Math.abs(first);
  let b = Math.abs(second);
  while (b > 0) [a, b] = [b, a % b];
  return a || 1;
}

export function leastCommonMultiple(first: number, second: number): number {
  if (first === 0 || second === 0) return 0;
  return Math.min(MAX_REPORTED_PERIOD, Math.abs((first / gcd(first, second)) * second));
}

function gridPerimeter(grid: FigureGridDefinition): number {
  return 2 * grid.rows + 2 * grid.columns - 4;
}

function movementTopologyPeriod(
  grid: FigureGridDefinition,
  movement: FigureMovementRule,
): number {
  if (movement.kind === "border") return gridPerimeter(grid);
  if (movement.kind === "direction_cycle") {
    return movement.directions.length * leastCommonMultiple(
      2 * (grid.rows - 1),
      2 * (grid.columns - 1),
    );
  }
  const vertical = movement.direction === "up" || movement.direction === "down" || movement.direction.includes("up_") || movement.direction.includes("down_");
  const horizontal = movement.direction === "left" || movement.direction === "right" || movement.direction.includes("_left") || movement.direction.includes("_right");
  const rowPeriod = vertical ? 2 * (grid.rows - 1) : 1;
  const columnPeriod = horizontal ? 2 * (grid.columns - 1) : 1;
  return leastCommonMultiple(rowPeriod, columnPeriod);
}

function phaseModulus(
  grid: FigureGridDefinition,
  rule: FigureSymbolRuleSet,
): number {
  let phase = rule.movement?.kind === "direction_cycle"
    ? rule.movement.directions.length
    : 1;
  if (rule.movement?.progression === "incrementing") {
    phase = leastCommonMultiple(phase, movementTopologyPeriod(grid, rule.movement));
  }
  if (rule.rotation?.progression === "incrementing") phase = leastCommonMultiple(phase, 4);
  if (rule.colour?.progression === "incrementing") {
    phase = leastCommonMultiple(phase, rule.colour.cycle.length);
  }
  return Math.max(1, phase);
}

type PeriodDimension = "movement" | "rotation" | "colour" | "combined";

function isolatedRule(
  rule: FigureSymbolRuleSet,
  dimension: PeriodDimension,
): FigureSymbolRuleSet {
  return {
    symbolId: rule.symbolId,
    ...(dimension === "movement" || dimension === "combined" ? { movement: rule.movement } : {}),
    ...(dimension === "rotation" || dimension === "combined" ? { rotation: rule.rotation } : {}),
    ...(dimension === "colour" || dimension === "combined" ? { colour: rule.colour } : {}),
  };
}

function stateValue(
  symbol: FigureSymbolState,
  transitionIndex: number,
  phase: number,
  dimension: PeriodDimension,
): string {
  return canonicalize({
    phase: transitionIndex % phase,
    ...(dimension === "movement" || dimension === "combined" ? {
      row: symbol.row,
      column: symbol.column,
      motion: symbol.motionState ?? null,
    } : {}),
    ...(dimension === "rotation" || dimension === "combined" ? {
      orientation: symbol.orientation,
    } : {}),
    ...(dimension === "colour" || dimension === "combined" ? {
      colour: symbol.color,
    } : {}),
  });
}

function detectPeriod(
  grid: FigureGridDefinition,
  initial: FigureSymbolState,
  sourceRule: FigureSymbolRuleSet,
  dimension: PeriodDimension,
): number {
  const rule = isolatedRule(sourceRule, dimension);
  const active = Boolean(rule.movement || rule.rotation || rule.colour);
  if (!active) return 1;
  const phase = phaseModulus(grid, rule);
  const seen = new Map<string, number>();
  let frame = { index: 0, symbols: [structuredClone(initial)] };
  seen.set(stateValue(frame.symbols[0], 0, phase, dimension), 0);
  for (let transitionIndex = 0; transitionIndex < MAX_PERIOD_SEARCH; transitionIndex += 1) {
    frame = evolveFigureFrame(grid, frame, [rule], transitionIndex);
    const nextIndex = transitionIndex + 1;
    const key = stateValue(frame.symbols[0], nextIndex, phase, dimension);
    const previous = seen.get(key);
    if (previous !== undefined) return nextIndex - previous;
    seen.set(key, nextIndex);
  }
  return MAX_PERIOD_SEARCH;
}

export type FigureObjectPeriodicity = {
  symbolId: string;
  movementPeriod: number;
  rotationPeriod: number;
  colourPeriod: number;
  combinedStatePeriod: number;
};

export type FigurePeriodicityAnalysis = {
  objects: FigureObjectPeriodicity[];
  combinedStatePeriod: number;
  averageMovementPeriod: number;
  averageRotationPeriod: number;
  averageColourPeriod: number;
  rulePeriodMismatch: number;
  trivialCycleCount: number;
};

const average = (values: readonly number[]): number =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

export function analyzeFigurePeriodicity(
  grid: FigureGridDefinition,
  initialSymbols: readonly FigureSymbolState[],
  rules: readonly FigureSymbolRuleSet[],
): FigurePeriodicityAnalysis {
  const symbolById = new Map(initialSymbols.map((symbol) => [symbol.id, symbol]));
  const objects = rules.map((rule): FigureObjectPeriodicity => {
    const symbol = symbolById.get(rule.symbolId);
    if (!symbol) throw new Error(`Cannot analyze periodicity for missing symbol ${rule.symbolId}.`);
    return {
      symbolId: rule.symbolId,
      movementPeriod: detectPeriod(grid, symbol, rule, "movement"),
      rotationPeriod: detectPeriod(grid, symbol, rule, "rotation"),
      colourPeriod: detectPeriod(grid, symbol, rule, "colour"),
      combinedStatePeriod: detectPeriod(grid, symbol, rule, "combined"),
    };
  });
  const combinedStatePeriod = objects.reduce(
    (period, object) => leastCommonMultiple(period, object.combinedStatePeriod),
    1,
  );
  const distinctPeriods = new Set(objects.map((object) => object.combinedStatePeriod));
  return {
    objects,
    combinedStatePeriod,
    averageMovementPeriod: average(objects.map((object) => object.movementPeriod)),
    averageRotationPeriod: average(objects.map((object) => object.rotationPeriod)),
    averageColourPeriod: average(objects.map((object) => object.colourPeriod)),
    rulePeriodMismatch: Math.max(0, distinctPeriods.size - 1),
    trivialCycleCount: objects.filter((object) => object.combinedStatePeriod <= 2).length,
  };
}


import { createFingerprint } from "../fingerprint";
import type { StructuralProfile } from "../novelty";
import { replayFigureSequenceDetailed } from "./engine";
import { analyzeFigurePeriodicity } from "./periodicity";
import type {
  FigureDirection,
  FigureMovementRule,
  FigureSequenceCandidate,
  FigureSymbolRuleSet,
} from "./types";

const DIRECTION_INDEX: Record<FigureDirection, number> = {
  up: 0,
  up_right: 1,
  right: 2,
  down_right: 3,
  down: 4,
  down_left: 5,
  left: 6,
  up_left: 7,
};

function directionClass(direction: FigureDirection): string {
  return direction.includes("_") ? "diagonal" : "axis";
}

function canonicalRotation(values: readonly string[]): string {
  if (!values.length) return "empty";
  return values
    .map((_, index) => [...values.slice(index), ...values.slice(0, index)].join(">"))
    .sort()[0];
}

/**
 * Encodes relative turns, so rotating, reflecting, or changing the phase of a
 * direction cycle cannot create a new structure. The diagonal/cardinal class
 * remains explicit because official Figure rules do not allow those to mix.
 */
function canonicalDirectionCycle(directions: readonly FigureDirection[]): string {
  if (!directions.length) return "empty";
  const indices = directions.map((direction) => DIRECTION_INDEX[direction]);
  const turns = indices.map((value, index) =>
    (indices[(index + 1) % indices.length] - value + 8) % 8);
  const reflected = turns.map((turn) => (8 - turn) % 8);
  const pattern = [canonicalRotation(turns.map(String)), canonicalRotation(reflected.map(String))].sort()[0];
  return `${directionClass(directions[0])}:${pattern}`;
}

function normalizedMovement(rule: FigureMovementRule | undefined): string {
  if (!rule) return "stationary";
  if (rule.kind === "linear") {
    return `linear:${directionClass(rule.direction)}:step-${rule.steps}:${rule.progression}:bounce`;
  }
  if (rule.kind === "border") {
    return `border:reflection-equivalent:step-${rule.steps}:${rule.progression}:follow`;
  }
  return `direction-cycle:${canonicalDirectionCycle(rule.directions)}:step-${rule.steps}:${rule.progression}:bounce`;
}

function normalizedRule(rule: FigureSymbolRuleSet): string {
  const rotation = rule.rotation
    ? `rotation:reflection-equivalent:q${rule.rotation.quarterTurns}:${rule.rotation.progression}`
    : "rotation:none";
  const colour = rule.colour
    ? `colour:cycle-${rule.colour.cycle.length}:step-${rule.colour.steps}:${rule.colour.progression}`
    : "colour:none";
  return `${normalizedMovement(rule.movement)}|${rotation}|${colour}`;
}

function movementKind(rule: FigureSymbolRuleSet): string {
  if (rule.movement?.kind === "linear") return `linear-${directionClass(rule.movement.direction)}`;
  return rule.movement?.kind ?? "none";
}

function boundarySignature(candidate: FigureSequenceCandidate): string[] {
  const simulation = replayFigureSequenceDetailed(
    candidate.structuredData.grid,
    candidate.structuredData.visibleFrames[0],
    candidate.structuredData.rules,
    5,
  );
  const eventsById = new Map<string, string[]>();
  simulation.boundaryEvents.forEach((event) => {
    const current = eventsById.get(event.symbolId) ?? [];
    current.push(`${event.behavior}@${event.transitionIndex}x${event.count}`);
    eventsById.set(event.symbolId, current);
  });
  return candidate.structuredData.rules.map((rule) =>
    `${normalizedRule(rule)}=>${(eventsById.get(rule.symbolId) ?? ["none"]).join(",")}`,
  ).sort();
}

export const FIGURE_SEQUENCE_NOVELTY_POLICY = {
  referenceThreshold: 0.85,
  recentThreshold: 0.9,
} as const;

export const FIGURE_SEQUENCE_SIMILARITY_WEIGHTS = {
  fingerprintVersion: 1,
  objectCount: 3,
  ruleStreams: 7,
  movementKinds: 4,
  boundaryBehaviors: 5,
  objectPeriods: 4,
  combinedStatePeriod: 2,
  periodMismatch: 2,
  progressiveRuleCount: 2,
  simultaneousTransformations: 2,
  stateVariableCount: 2,
  predictionDepth: 1,
} as const;

export function figureSequenceStructuralProfile(candidate: FigureSequenceCandidate): StructuralProfile {
  const rules = candidate.structuredData.rules;
  const initial = candidate.structuredData.visibleFrames[0];
  const periodicity = analyzeFigurePeriodicity(candidate.structuredData.grid, initial.symbols, rules);
  const ruleById = new Map(rules.map((rule) => [rule.symbolId, rule]));
  const objectPeriods = periodicity.objects.map((object) =>
    `${normalizedRule(ruleById.get(object.symbolId)!)}=>m${object.movementPeriod}:r${object.rotationPeriod}:c${object.colourPeriod}:all${object.combinedStatePeriod}`,
  ).sort();
  const progressiveRuleCount = rules.reduce((count, rule) => count +
    Number(rule.movement?.progression === "incrementing") +
    Number(rule.rotation?.progression === "incrementing") +
    Number(rule.colour?.progression === "incrementing"), 0);
  const simultaneousTransformations = Math.max(0, ...rules.map((rule) =>
    Number(Boolean(rule.movement)) + Number(Boolean(rule.rotation)) + Number(Boolean(rule.colour))));
  const stateVariableCount = rules.reduce((count, rule) => count +
    Number(Boolean(rule.movement)) +
    Number(Boolean(rule.rotation)) +
    Number(Boolean(rule.colour)) +
    Number(rule.movement?.progression === "incrementing") +
    Number(rule.rotation?.progression === "incrementing") +
    Number(rule.colour?.progression === "incrementing"), 0);
  return {
    namespace: "figure_sequence",
    features: {
      fingerprintVersion: "v2",
      objectCount: initial?.symbols.length ?? 0,
      predictionDepth: candidate.solutionFrames.length,
      ruleStreams: rules.map(normalizedRule).sort(),
      movementKinds: rules.map(movementKind).sort(),
      boundaryBehaviors: boundarySignature(candidate),
      objectPeriods,
      combinedStatePeriod: periodicity.combinedStatePeriod,
      periodMismatch: periodicity.rulePeriodMismatch,
      progressiveRuleCount,
      simultaneousTransformations,
      stateVariableCount,
    },
  };
}

export function figureStructuralSignature(candidate: FigureSequenceCandidate): string {
  return createFingerprint("figure-sequence-structure-v2", figureSequenceStructuralProfile(candidate) as never);
}

/** Exact semantic identity: labels and prose are ignored, but starting state is retained. */
export function fingerprintFigureSequence(candidate: FigureSequenceCandidate): string {
  const initial = candidate.structuredData.visibleFrames[0];
  const orderedSymbols = [...initial.symbols].sort((first, second) => first.id.localeCompare(second.id));
  const idMap = new Map(orderedSymbols.map((symbol, index) => [symbol.id, `symbol-${index}`]));
  const shapeMap = new Map<string, string>();
  const colourMap = new Map<string, string>();
  const normalizeShape = (shape: string): string => {
    if (!shapeMap.has(shape)) shapeMap.set(shape, `shape-${shapeMap.size}`);
    return shapeMap.get(shape)!;
  };
  const normalizeColour = (colour: string): string => {
    if (!colourMap.has(colour)) colourMap.set(colour, `colour-${colourMap.size}`);
    return colourMap.get(colour)!;
  };
  const symbols = orderedSymbols.map((symbol) => ({
    id: idMap.get(symbol.id),
    shape: normalizeShape(symbol.shape),
    color: normalizeColour(symbol.color),
    fill: symbol.fill,
    orientation: symbol.orientation,
    row: symbol.row,
    column: symbol.column,
    motionState: symbol.motionState ?? null,
  }));
  const rules = candidate.structuredData.rules.map((rule) => ({
    ...structuredClone(rule),
    symbolId: idMap.get(rule.symbolId) ?? rule.symbolId,
    ...(rule.colour ? {
      colour: { ...rule.colour, cycle: rule.colour.cycle.map(normalizeColour) },
    } : {}),
  })).sort((first, second) => first.symbolId.localeCompare(second.symbolId));
  return createFingerprint("figure-sequence-v2", {
    grid: candidate.structuredData.grid,
    initialFrame: { index: 0, symbols },
    rules,
  } as never);
}

import { productionEvidenceFor } from "../../evidence";
import {
  FIGURE_PRIMITIVE_EVIDENCE_REGISTRY,
  type FigurePrimitiveCategory,
  type FigurePrimitiveId,
} from "./evidence";
import type { FigureDirection, FigureSymbolRuleSet } from "./types";

export const FIGURE_COMPATIBILITY_STATUSES = [
  "SUPPORTED",
  "CONDITIONALLY_SUPPORTED",
  "UNKNOWN",
  "INVALID",
] as const;

export type FigureCompatibilityStatus = (typeof FIGURE_COMPATIBILITY_STATUSES)[number];

const MOVEMENT_PRIMITIVES = new Set<FigurePrimitiveId>(
  FIGURE_PRIMITIVE_EVIDENCE_REGISTRY
    .filter((definition) => definition.category === "movement")
    .map((definition) => definition.id),
);
const STEP_PRIMITIVES = new Set<FigurePrimitiveId>(
  FIGURE_PRIMITIVE_EVIDENCE_REGISTRY
    .filter((definition) => definition.category === "step")
    .map((definition) => definition.id),
);
const BOUNDARY_PRIMITIVES = new Set<FigurePrimitiveId>(
  FIGURE_PRIMITIVE_EVIDENCE_REGISTRY
    .filter((definition) => definition.category === "boundary")
    .map((definition) => definition.id),
);
function primitiveCategory(id: FigurePrimitiveId): FigurePrimitiveCategory | null {
  return FIGURE_PRIMITIVE_EVIDENCE_REGISTRY.find((definition) => definition.id === id)?.category ?? null;
}

export function enabledFigurePrimitives(
  category: FigurePrimitiveCategory,
): FigurePrimitiveId[] {
  return FIGURE_PRIMITIVE_EVIDENCE_REGISTRY
    .filter((definition) =>
      definition.category === category &&
      productionEvidenceFor(FIGURE_PRIMITIVE_EVIDENCE_REGISTRY, definition.id))
    .map((definition) => definition.id);
}

export function figurePrimitivePairCompatibility(
  first: FigurePrimitiveId,
  second: FigurePrimitiveId,
): FigureCompatibilityStatus {
  if (!productionEvidenceFor(FIGURE_PRIMITIVE_EVIDENCE_REGISTRY, first) ||
      !productionEvidenceFor(FIGURE_PRIMITIVE_EVIDENCE_REGISTRY, second)) {
    return "INVALID";
  }
  if (first === second) return "SUPPORTED";
  const firstCategory = primitiveCategory(first);
  const secondCategory = primitiveCategory(second);
  if (!firstCategory || !secondCategory) return "UNKNOWN";

  if (firstCategory === "movement" && secondCategory === "movement") {
    const pair = new Set([first, second]);
    return pair.size === 2 && pair.has("MOVE_HORIZONTAL") && pair.has("MOVE_VERTICAL")
      ? "CONDITIONALLY_SUPPORTED"
      : "INVALID";
  }
  if (firstCategory === "step" && secondCategory === "step") return "INVALID";
  if (firstCategory === "boundary" && secondCategory === "boundary") return "INVALID";
  if (firstCategory === "rotation" && secondCategory === "rotation") {
    return first === "ROTATE_PROGRESSIVE" || second === "ROTATE_PROGRESSIVE"
      ? "SUPPORTED"
      : "INVALID";
  }
  if (firstCategory === "color" && secondCategory === "color") return "INVALID";

  const movement = MOVEMENT_PRIMITIVES.has(first) ? first : MOVEMENT_PRIMITIVES.has(second) ? second : null;
  const boundary = BOUNDARY_PRIMITIVES.has(first) ? first : BOUNDARY_PRIMITIVES.has(second) ? second : null;
  if (movement && boundary) {
    const linear = movement === "MOVE_HORIZONTAL" || movement === "MOVE_VERTICAL" || movement === "MOVE_DIAGONAL";
    const followsBoundary = movement === "MOVE_BOUNDARY_CLOCKWISE" || movement === "MOVE_BOUNDARY_COUNTERCLOCKWISE";
    if (linear && boundary === "BOUNDARY_BOUNCE") return "SUPPORTED";
    if (followsBoundary && boundary === "BOUNDARY_FOLLOW") return "SUPPORTED";
    return "INVALID";
  }

  if ((STEP_PRIMITIVES.has(first) && BOUNDARY_PRIMITIVES.has(second)) ||
      (STEP_PRIMITIVES.has(second) && BOUNDARY_PRIMITIVES.has(first))) {
    return "CONDITIONALLY_SUPPORTED";
  }

  const distinctCategories = new Set([firstCategory, secondCategory]);
  if (
    distinctCategories.has("movement") ||
    distinctCategories.has("step") ||
    distinctCategories.has("boundary")
  ) {
    if (distinctCategories.has("rotation") || distinctCategories.has("color") ||
        distinctCategories.has("step")) return "SUPPORTED";
  }
  if (distinctCategories.size === 2 && distinctCategories.has("rotation") && distinctCategories.has("color")) {
    return "SUPPORTED";
  }
  return "UNKNOWN";
}

function movementPrimitive(direction: FigureDirection): FigurePrimitiveId {
  if (direction === "left" || direction === "right") return "MOVE_HORIZONTAL";
  if (direction === "up" || direction === "down") return "MOVE_VERTICAL";
  return "MOVE_DIAGONAL";
}

export function figurePrimitivesForRule(rule: FigureSymbolRuleSet): FigurePrimitiveId[] {
  const primitives: FigurePrimitiveId[] = [];
  if (rule.movement?.kind === "linear") {
    primitives.push(movementPrimitive(rule.movement.direction));
    primitives.push(rule.movement.progression === "incrementing" ? "STEP_PROGRESSIVE" : "STEP_CONSTANT");
    if (rule.movement.boundary === "bounce") primitives.push("BOUNDARY_BOUNCE");
  } else if (rule.movement?.kind === "border") {
    primitives.push(rule.movement.direction === "clockwise"
      ? "MOVE_BOUNDARY_CLOCKWISE"
      : "MOVE_BOUNDARY_COUNTERCLOCKWISE");
    primitives.push(rule.movement.progression === "incrementing" ? "STEP_PROGRESSIVE" : "STEP_CONSTANT");
    primitives.push("BOUNDARY_FOLLOW");
  } else if (rule.movement?.kind === "direction_cycle") {
    rule.movement.directions.forEach((direction) => primitives.push(movementPrimitive(direction)));
    primitives.push(rule.movement.progression === "incrementing" ? "STEP_PROGRESSIVE" : "STEP_CONSTANT");
    if (rule.movement.boundary === "bounce") primitives.push("BOUNDARY_BOUNCE");
  }
  if (rule.rotation) {
    primitives.push(rule.rotation.direction === "clockwise"
      ? "ROTATE_CLOCKWISE"
      : "ROTATE_COUNTERCLOCKWISE");
    if (rule.rotation.progression === "incrementing") primitives.push("ROTATE_PROGRESSIVE");
  }
  if (rule.colour) {
    primitives.push(rule.colour.cycle.length === 2 ? "COLOR_ALTERNATE" : "COLOR_CYCLE");
  }
  return [...new Set(primitives)];
}

export type FigureRuleCompatibilityResult = {
  valid: boolean;
  primitives: readonly FigurePrimitiveId[];
  issues: readonly string[];
};

export function validateFigureRuleCompatibility(
  rule: FigureSymbolRuleSet,
): FigureRuleCompatibilityResult {
  const issues: string[] = [];
  const primitives = figurePrimitivesForRule(rule);
  if (!rule.movement) issues.push("Every production Figure object requires an evidence-backed movement rule.");
  if (rule.movement?.kind !== "border" && rule.movement?.boundary !== "bounce") {
    issues.push("Production linear and direction-cycle movement must use official bounce behavior.");
  }
  if (rule.movement?.kind === "direction_cycle") {
    const movementTypes = new Set(rule.movement.directions.map(movementPrimitive));
    if (movementTypes.has("MOVE_DIAGONAL")) {
      issues.push("Direction cycles cannot contain diagonal movement; diagonal motion must retain its type through bounce state.");
    }
    if (rule.movement.directions.length < 2 || new Set(rule.movement.directions).size < 2) {
      issues.push("A direction cycle requires at least two distinct cardinal directions.");
    }
  }
  if (rule.rotation && rule.rotation.quarterTurns !== 1) {
    issues.push("Production rotation uses evidence-backed 90-degree quarter turns.");
  }
  if (rule.colour && (
    rule.colour.cycle.length < 2 ||
    rule.colour.cycle.length > 4 ||
    new Set(rule.colour.cycle).size !== rule.colour.cycle.length
  )) {
    issues.push("Production colour patterns require two to four unique colours.");
  }
  primitives.forEach((primitive) => {
    if (!productionEvidenceFor(FIGURE_PRIMITIVE_EVIDENCE_REGISTRY, primitive)) {
      issues.push(`Primitive ${primitive} lacks valid production evidence.`);
    }
  });
  for (let first = 0; first < primitives.length; first += 1) {
    for (let second = first + 1; second < primitives.length; second += 1) {
      const status = figurePrimitivePairCompatibility(primitives[first], primitives[second]);
      if (status === "INVALID" || status === "UNKNOWN") {
        issues.push(`Primitive pair ${primitives[first]} + ${primitives[second]} is ${status}.`);
      }
    }
  }
  return { valid: issues.length === 0, primitives, issues };
}

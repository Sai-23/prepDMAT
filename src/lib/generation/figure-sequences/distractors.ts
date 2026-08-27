import { SeededRandom } from "../random";
import { evolveFigureFrame } from "./engine";
import { validateFigureFrameStructure } from "./validation";
import {
  canonicalRenderedMatrix,
  canonicalRenderedSymbol,
} from "./render-contract";
import type {
  FigureCandidate,
  FigureFrame,
  FigureGridDefinition,
  FigureSymbolRuleSet,
} from "./types";

export function visibleFrameValue(frame: FigureFrame): string {
  return canonicalRenderedMatrix(frame);
}

function visibleSymbolValue(symbol: FigureFrame["symbols"][number]): string {
  return canonicalRenderedSymbol(symbol);
}

export function figureFrameSimilarity(first: FigureFrame, second: FigureFrame): number {
  if (first.symbols.length === 0 || first.symbols.length !== second.symbols.length) return 0;
  const remaining = second.symbols.map(visibleSymbolValue);
  const unchanged = first.symbols.reduce((count, symbol) => {
    const value = visibleSymbolValue(symbol);
    const index = remaining.indexOf(value);
    if (index < 0) return count;
    remaining.splice(index, 1);
    return count + 1;
  }, 0);
  return unchanged / first.symbols.length;
}

function candidateFrame(frame: FigureFrame, index: number): FigureFrame {
  return { ...structuredClone(frame), index };
}

function mutatedRuleVariants(rule: FigureSymbolRuleSet): FigureSymbolRuleSet[] {
  const variants: FigureSymbolRuleSet[] = [];
  const add = (mutate: (copy: FigureSymbolRuleSet) => void) => {
    const copy = structuredClone(rule);
    mutate(copy);
    variants.push(copy);
  };
  if (rule.movement) {
    add((copy) => { copy.movement!.steps = Math.max(1, copy.movement!.steps - 1); });
    add((copy) => { copy.movement!.steps += 1; });
    if (rule.movement.progression === "incrementing") {
      add((copy) => { copy.movement!.progression = "fixed"; });
    }
    if (rule.movement.kind === "border") {
      add((copy) => {
        if (copy.movement?.kind === "border") {
          copy.movement.direction = copy.movement.direction === "clockwise"
            ? "counter_clockwise"
            : "clockwise";
        }
      });
    }
    if (rule.movement.kind === "direction_cycle") {
      add((copy) => {
        if (copy.movement?.kind === "direction_cycle") {
          copy.movement.directions = [
            ...copy.movement.directions.slice(1),
            copy.movement.directions[0],
          ];
        }
      });
    }
  }
  if (rule.rotation) {
    add((copy) => { delete copy.rotation; });
    add((copy) => {
      if (copy.rotation) {
        copy.rotation.direction = copy.rotation.direction === "clockwise"
          ? "counter_clockwise"
          : "clockwise";
      }
    });
    if (rule.rotation.progression === "incrementing") {
      add((copy) => { if (copy.rotation) copy.rotation.progression = "fixed"; });
    }
  }
  if (rule.colour) {
    add((copy) => { delete copy.colour; });
    add((copy) => {
      if (copy.colour) copy.colour.cycle = [copy.colour.cycle[0], ...copy.colour.cycle.slice(1).reverse()];
    });
    if (rule.colour.progression === "incrementing") {
      add((copy) => { if (copy.colour) copy.colour.progression = "fixed"; });
    }
  }
  return variants;
}

export function createFigureCandidates(
  grid: FigureGridDefinition,
  correctFrame: FigureFrame,
  previousFrame: FigureFrame,
  rules: readonly FigureSymbolRuleSet[],
  transitionIndex: number,
  random: SeededRandom,
  slot: number,
): { candidates: FigureCandidate[]; correctCandidateId: string } {
  const correctValue = visibleFrameValue(correctFrame);
  const variants: FigureFrame[] = [];
  const seen = new Set([correctValue]);
  const add = (frame: FigureFrame) => {
    const normalized = candidateFrame(frame, correctFrame.index);
    const value = visibleFrameValue(normalized);
    if (!seen.has(value) && validateFigureFrameStructure(grid, normalized).valid) {
      seen.add(value);
      variants.push(normalized);
    }
  };

  for (const rule of random.shuffle(rules)) {
    const previousSymbol = previousFrame.symbols.find((symbol) => symbol.id === rule.symbolId);
    if (previousSymbol) {
      const stalled = structuredClone(correctFrame);
      const target = stalled.symbols.find((symbol) => symbol.id === rule.symbolId);
      if (target) Object.assign(target, structuredClone(previousSymbol));
      add(stalled);
    }
    for (const mutated of random.shuffle(mutatedRuleVariants(rule))) {
      const mutatedRules = rules.map((source) =>
        source.symbolId === rule.symbolId ? mutated : structuredClone(source));
      try {
        add(evolveFigureFrame(grid, previousFrame, mutatedRules, transitionIndex));
      } catch {
        // A plausible wrong rule may violate a hard constraint; it is not a usable option.
      }
    }
    if (rule.movement?.kind === "linear") {
      const withoutBounceState = structuredClone(previousFrame);
      const target = withoutBounceState.symbols.find((symbol) => symbol.id === rule.symbolId);
      if (target) target.motionState = undefined;
      try { add(evolveFigureFrame(grid, withoutBounceState, rules, transitionIndex)); }
      catch { /* The naive non-bounce continuation can leave the grid. */ }
    }
  }
  if (variants.length < 2) {
    throw new Error("Unable to construct two distinct replay-based figure distractors.");
  }

  const correctCandidateId = `slot-${slot}-correct`;
  const selectedVariants = random.shuffle(variants).slice(0, 2);
  const raw: FigureCandidate[] = [
    { id: correctCandidateId, label: "", frame: candidateFrame(correctFrame, correctFrame.index) },
    { id: `slot-${slot}-distractor-1`, label: "", frame: selectedVariants[0] },
    { id: `slot-${slot}-distractor-2`, label: "", frame: selectedVariants[1] },
  ];
  const candidates = random.shuffle(raw).map((candidate, index) => ({
    ...candidate,
    label: String.fromCharCode(65 + index),
  }));
  return { candidates, correctCandidateId };
}

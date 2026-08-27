import {
  type FigureFrame,
  type FigureSequencePresentation,
  type FigureSymbolRuleSet,
  type FigureSymbolState,
} from "../generation/figure-sequences";
import type { FigureExplanationTrace } from "./figure-sequence-explanation-trace";

const FIGURE_EXPLANATION_TRACE_VERSION = "figure-sequence-explanation-trace@1";

export type FigureRulePresentation = {
  symbolId: string;
  symbolLabel: string;
  summary: string;
};

export type FigureChange = {
  label: "Position" | "Orientation" | "Colour" | "Count";
  before: string;
  after: string;
};

export type FigureTransitionPresentation = {
  fromFrame: number;
  toFrame: number;
  changes: FigureChange[];
  boundaryBehavior: "bounce" | "follow" | null;
};

export type FigureExplanationStep =
  | {
      id: string;
      type: "track_symbol";
      eyebrow: "TRACK ONE SYMBOL";
      title: string;
      instruction: string;
      activeSymbolId: string;
      symbolLabel: string;
      beforeFrame: FigureFrame;
      afterFrame: FigureFrame;
      changes: FigureChange[];
      transitions: FigureTransitionPresentation[];
      ruleSummary: string;
      rulesFound: FigureRulePresentation[];
      isFinal: false;
    }
  | {
      id: string;
      type: "predict_matrix";
      eyebrow: "APPLY THE RULES";
      title: string;
      instruction: string;
      activeSymbolId: null;
      beforeFrame: FigureFrame;
      afterFrame: FigureFrame;
      missingIndex: 0 | 1;
      rulesFound: FigureRulePresentation[];
      isFinal: false;
    }
  | {
      id: string;
      type: "match_option";
      eyebrow: "MATCH THE RESULT";
      title: string;
      instruction: string;
      activeSymbolId: null;
      beforeFrame: FigureFrame;
      afterFrame: FigureFrame;
      missingIndex: 0 | 1;
      correctOptionLabel: string;
      distractorDifferences: Array<{ optionLabel: string; differences: string[] }>;
      rulesFound: FigureRulePresentation[];
      isFinal: boolean;
    };

export type FigureWalkthrough = {
  valid: boolean;
  steps: FigureExplanationStep[];
  rules: FigureRulePresentation[];
  fallbackMessage: string | null;
  correctLabels: string[];
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function titleCase(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function locationName(symbol: FigureSymbolState): string {
  return `Row ${symbol.row + 1}, column ${symbol.column + 1}`;
}

function symbolLabels(frame: FigureFrame): Map<string, string> {
  const bases = frame.symbols.map((symbol) => `${titleCase(symbol.color)} ${titleCase(symbol.shape)}`);
  const totals = new Map<string, number>();
  bases.forEach((base) => totals.set(base, (totals.get(base) ?? 0) + 1));
  const used = new Map<string, number>();
  return new Map(frame.symbols.map((symbol, index) => {
    const base = bases[index];
    const occurrence = (used.get(base) ?? 0) + 1;
    used.set(base, occurrence);
    return [symbol.id, totals.get(base) === 1 ? base : `${base} ${occurrence}`];
  }));
}

function ruleSummary(rule: FigureSymbolRuleSet, label: string): string {
  const parts: string[] = [];
  if (rule.movement?.kind === "linear") {
    parts.push(`move ${rule.movement.steps} ${rule.movement.steps === 1 ? "cell" : "cells"} ${rule.movement.direction.replaceAll("_", " ")}`);
    if (rule.movement.boundary === "bounce") parts.push("reverse direction when the edge is reached");
  } else if (rule.movement?.kind === "border") {
    parts.push(`move ${rule.movement.steps} ${rule.movement.steps === 1 ? "step" : "steps"} ${rule.movement.direction.replace("_", "-")} around the border`);
  } else if (rule.movement?.kind === "direction_cycle") {
    parts.push(`follow ${rule.movement.directions.map((direction) => direction.replaceAll("_", " ")).join(" → ")}`);
    if (rule.movement.boundary === "bounce") parts.push("reverse any move that reaches an edge");
  }
  if (rule.movement?.progression === "incrementing") parts.push("increase the move by one each frame");
  if (rule.rotation) {
    parts.push(`rotate ${rule.rotation.quarterTurns * 90}° ${rule.rotation.direction.replace("_", "-")}`);
    if (rule.rotation.progression === "incrementing") parts.push("increase the rotation each frame");
  }
  if (rule.colour) {
    parts.push(`cycle colour ${rule.colour.cycle.map(titleCase).join(" → ")}`);
  }
  return `${label}: ${parts.join("; ")}.`;
}

function changesBetween(before: FigureSymbolState, after: FigureSymbolState): FigureChange[] {
  const changes: FigureChange[] = [];
  if (before.row !== after.row || before.column !== after.column) {
    changes.push({ label: "Position", before: locationName(before), after: locationName(after) });
  }
  if (before.orientation !== after.orientation) {
    changes.push({ label: "Orientation", before: `${before.orientation}°`, after: `${after.orientation}°` });
  }
  if (before.color !== after.color) {
    changes.push({ label: "Colour", before: titleCase(before.color), after: titleCase(after.color) });
  }
  return changes;
}

function frameDifferences(expected: FigureFrame, candidate: FigureFrame): string[] {
  const candidateById = new Map(candidate.symbols.map((symbol) => [symbol.id, symbol]));
  const differences = new Set<string>();
  if (expected.symbols.length !== candidate.symbols.length) differences.add("symbol count");
  expected.symbols.forEach((symbol) => {
    const actual = candidateById.get(symbol.id);
    if (!actual) differences.add("missing or extra symbol");
    else {
      if (actual.row !== symbol.row || actual.column !== symbol.column) differences.add("position");
      if (actual.orientation !== symbol.orientation) differences.add("orientation");
      if (actual.color !== symbol.color) differences.add("colour");
      if (actual.fill !== symbol.fill) differences.add("fill");
    }
  });
  return [...differences];
}

function fallback(correctLabels: string[]): FigureWalkthrough {
  return {
    valid: false,
    steps: [],
    rules: [],
    fallbackMessage: correctLabels.length === 2
      ? `Verified answers: Matrix 1 is Option ${correctLabels[0]}, and Matrix 2 is Option ${correctLabels[1]}.`
      : "The verified answer is unavailable.",
    correctLabels,
  };
}

export function buildFigureSequenceWalkthrough(
  sequence: FigureSequencePresentation,
  rawTrace: unknown,
  correctAnswer: unknown,
): FigureWalkthrough {
  const correctIds = Array.isArray(correctAnswer) && correctAnswer.length === 2 &&
    correctAnswer.every((id) => typeof id === "string")
    ? correctAnswer as string[]
    : [];
  const correctCandidates = sequence.missingMatrices.map((matrix, index) =>
    matrix.candidates.find((candidate) => candidate.id === correctIds[index]),
  );
  const correctLabels = correctCandidates.every(Boolean)
    ? correctCandidates.map((candidate) => candidate?.label ?? "")
    : [];
  const traceRecord = record(rawTrace);
  if (
    traceRecord?.version !== FIGURE_EXPLANATION_TRACE_VERSION ||
    !Array.isArray(traceRecord.rules) ||
    !Array.isArray(traceRecord.replayedFrames) ||
    !Array.isArray(traceRecord.boundaryEvents) ||
    !Array.isArray(traceRecord.correctOptionLabels) ||
    !correctCandidates.every(Boolean)
  ) {
    return fallback(correctLabels);
  }
  const trace = rawTrace as FigureExplanationTrace;
  const rules = trace.rules;
  const firstFrame = sequence.visibleFrames[0];
  if (
    !firstFrame ||
    rules.length !== firstFrame.symbols.length ||
    new Set(rules.map((rule) => rule?.symbolId)).size !== rules.length ||
    rules.some((rule) =>
      !rule || typeof rule.symbolId !== "string" ||
      !firstFrame.symbols.some((symbol) => symbol.id === rule.symbolId) ||
      !Boolean(rule.movement || rule.rotation || rule.colour),
    )
  ) return fallback(correctLabels);

  const replayed = trace.replayedFrames;
  const boundaryEvents = trace.boundaryEvents;
  if (
    replayed.length !== 6 ||
    trace.correctOptionLabels.length !== 2 ||
    !trace.correctOptionLabels.every((label, index) => label === correctLabels[index])
  ) return fallback(correctLabels);

  const labels = symbolLabels(firstFrame);
  const rulePresentations: FigureRulePresentation[] = rules.map((rule) => {
    const label = labels.get(rule.symbolId) ?? "Tracked symbol";
    return { symbolId: rule.symbolId, symbolLabel: label, summary: ruleSummary(rule, label) };
  });
  const transitions = rules.map((rule) => ({
    rule,
    beforeSymbol: replayed[0].symbols.find((symbol) => symbol.id === rule.symbolId),
    afterSymbol: replayed[1].symbols.find((symbol) => symbol.id === rule.symbolId),
  }));
  if (transitions.some(({ beforeSymbol, afterSymbol }) => !beforeSymbol || !afterSymbol)) {
    return fallback(correctLabels);
  }
  const steps: FigureExplanationStep[] = transitions.map(({ rule, beforeSymbol, afterSymbol }, index) => {
    const label = labels.get(rule.symbolId) ?? "Tracked symbol";
    return {
      id: `rule:${index}`,
      type: "track_symbol",
      eyebrow: "TRACK ONE SYMBOL",
      title: `Track the ${label.toLowerCase()}`,
      instruction: "Compare Frame 1 and Frame 2.",
      activeSymbolId: rule.symbolId,
      symbolLabel: label,
      beforeFrame: replayed[0],
      afterFrame: replayed[1],
      changes: changesBetween(beforeSymbol!, afterSymbol!),
      transitions: replayed.slice(0, -1).map((frame, transitionIndex) => {
        const next = replayed[transitionIndex + 1];
        const before = frame.symbols.find((symbol) => symbol.id === rule.symbolId)!;
        const after = next.symbols.find((symbol) => symbol.id === rule.symbolId)!;
        const boundary = boundaryEvents.find((event) =>
          event.symbolId === rule.symbolId && event.transitionIndex === transitionIndex
        );
        return {
          fromFrame: frame.index,
          toFrame: next.index,
          changes: changesBetween(before, after),
          boundaryBehavior: boundary?.behavior ?? null,
        };
      }),
      ruleSummary: rulePresentations[index].summary,
      rulesFound: rulePresentations.slice(0, index + 1),
      isFinal: false,
    };
  });
  ([0, 1] as const).forEach((missingIndex) => {
    steps.push({
      id: `prediction:${missingIndex}`,
      type: "predict_matrix",
      eyebrow: "APPLY THE RULES",
      title: `Predict missing matrix ${missingIndex + 1}`,
      instruction: missingIndex === 0
        ? "Apply every discovered rule once to the last visible frame."
        : "Apply the same rules one more time.",
      activeSymbolId: null,
      beforeFrame: replayed[missingIndex + 3],
      afterFrame: replayed[missingIndex + 4],
      missingIndex,
      rulesFound: rulePresentations,
      isFinal: false,
    });
    steps.push({
      id: `match:${missingIndex}`,
      type: "match_option",
      eyebrow: "MATCH THE RESULT",
      title: `Match missing matrix ${missingIndex + 1}`,
      instruction: "Now compare the constructed frame with the answer options.",
      activeSymbolId: null,
      beforeFrame: replayed[missingIndex + 3],
      afterFrame: replayed[missingIndex + 4],
      missingIndex,
      correctOptionLabel: correctLabels[missingIndex],
      distractorDifferences: sequence.missingMatrices[missingIndex].candidates
        .filter((candidate) => candidate.id !== correctIds[missingIndex])
        .map((candidate) => ({
          optionLabel: candidate.label,
          differences: frameDifferences(replayed[missingIndex + 4], candidate.frame),
        })),
      rulesFound: rulePresentations,
      isFinal: missingIndex === 1,
    });
  });
  return { valid: true, steps, rules: rulePresentations, fallbackMessage: null, correctLabels };
}

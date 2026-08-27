import "server-only";

import {
  replayFigureSequenceDetailed,
  visibleFrameValue,
  type FigureBoundaryEvent,
  type FigureFrame,
  type FigureSequencePresentation,
  type FigureSymbolRuleSet,
} from "@/lib/generation/figure-sequences";

export const FIGURE_EXPLANATION_TRACE_VERSION = "figure-sequence-explanation-trace@1" as const;

export type FigureExplanationTrace = {
  version: typeof FIGURE_EXPLANATION_TRACE_VERSION;
  rules: FigureSymbolRuleSet[];
  replayedFrames: FigureFrame[];
  boundaryEvents: FigureBoundaryEvent[];
  correctOptionLabels: [string, string];
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function sameFrame(first: FigureFrame, second: FigureFrame): boolean {
  return visibleFrameValue(first) === visibleFrameValue(second);
}

function rulesFrom(rawTrace: unknown): FigureSymbolRuleSet[] | null {
  const trace = record(rawTrace);
  const rules = trace?.version === FIGURE_EXPLANATION_TRACE_VERSION
    ? trace.rules
    : trace?.rules;
  return Array.isArray(rules) ? structuredClone(rules) as FigureSymbolRuleSet[] : null;
}

export function createVerifiedFigureExplanationTrace(
  sequence: FigureSequencePresentation,
  rawTrace: unknown,
  correctAnswer: unknown,
  storedSolutionFrames?: unknown,
): FigureExplanationTrace | null {
  const correctIds = Array.isArray(correctAnswer) && correctAnswer.length === 2 &&
    correctAnswer.every((id) => typeof id === "string")
    ? correctAnswer as string[]
    : [];
  const correctCandidates = sequence.missingMatrices.map((matrix, index) =>
    matrix.candidates.find((candidate) => candidate.id === correctIds[index]),
  );
  const rules = rulesFrom(rawTrace);
  const firstFrame = sequence.visibleFrames[0];
  if (
    !firstFrame || !rules || !correctCandidates.every(Boolean) ||
    rules.length !== firstFrame.symbols.length ||
    new Set(rules.map((rule) => rule?.symbolId)).size !== rules.length ||
    rules.some((rule) =>
      !rule || typeof rule.symbolId !== "string" ||
      !firstFrame.symbols.some((symbol) => symbol.id === rule.symbolId) ||
      !Boolean(rule.movement || rule.rotation || rule.colour)
    )
  ) return null;

  try {
    const simulation = replayFigureSequenceDetailed(sequence.grid, firstFrame, rules, 5);
    if (
      simulation.frames.length !== 6 ||
      !sequence.visibleFrames.every((frame, index) => sameFrame(frame, simulation.frames[index])) ||
      !correctCandidates.every((candidate, index) =>
        candidate ? sameFrame(candidate.frame, simulation.frames[index + 4]) : false,
      )
    ) return null;
    if (Array.isArray(storedSolutionFrames) && storedSolutionFrames.length === 2) {
      const solutions = storedSolutionFrames as FigureFrame[];
      if (!solutions.every((frame, index) => sameFrame(frame, simulation.frames[index + 4]))) {
        return null;
      }
    }
    return {
      version: FIGURE_EXPLANATION_TRACE_VERSION,
      rules: structuredClone(rules),
      replayedFrames: structuredClone(simulation.frames),
      boundaryEvents: structuredClone(simulation.boundaryEvents),
      correctOptionLabels: [correctCandidates[0]!.label, correctCandidates[1]!.label],
    };
  } catch {
    return null;
  }
}

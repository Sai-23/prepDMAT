import { canonicalize } from "../fingerprint";
import type { GenerationDifficulty } from "../types";
import { figureFrameSimilarity } from "./distractors";
import { replayFigureSequenceDetailed } from "./engine";
import { analyzeFigurePeriodicity } from "./periodicity";
import type {
  FigureDifficultyMetrics,
  FigureFrame,
  FigureSequenceCandidate,
  FigureSymbolRuleSet,
} from "./types";

function normalizedRule(rule: FigureSymbolRuleSet): string {
  const movement = rule.movement?.kind === "linear"
    ? {
        kind: rule.movement.direction.includes("_") ? "diagonal" : "axis",
        steps: rule.movement.steps,
        progression: rule.movement.progression,
        boundary: rule.movement.boundary,
      }
    : rule.movement?.kind === "border"
      ? { kind: "border", steps: rule.movement.steps, progression: rule.movement.progression }
      : rule.movement?.kind === "direction_cycle"
        ? { kind: "cardinal_cycle", length: rule.movement.directions.length, steps: rule.movement.steps, progression: rule.movement.progression }
        : null;
  return canonicalize({
    movement,
    rotation: rule.rotation ? {
      quarterTurns: rule.rotation.quarterTurns,
      progression: rule.rotation.progression,
    } : null,
    colour: rule.colour ? {
      cycleLength: rule.colour.cycle.length,
      steps: rule.colour.steps,
      progression: rule.colour.progression,
    } : null,
  } as never);
}

function isDiagonal(rule: FigureSymbolRuleSet): boolean {
  return rule.movement?.kind === "linear" && rule.movement.direction.includes("_");
}

function collisionAvoidanceComplexity(frames: readonly FigureFrame[]): number {
  let complexity = 0;
  frames.forEach((frame) => {
    for (let first = 0; first < frame.symbols.length; first += 1) {
      for (let second = first + 1; second < frame.symbols.length; second += 1) {
        const rowDistance = Math.abs(frame.symbols[first].row - frame.symbols[second].row);
        const columnDistance = Math.abs(frame.symbols[first].column - frame.symbols[second].column);
        if (Math.max(rowDistance, columnDistance) === 1) complexity += 1;
      }
    }
  });
  for (let frameIndex = 1; frameIndex < frames.length; frameIndex += 1) {
    const previous = frames[frameIndex - 1];
    const current = frames[frameIndex];
    for (let first = 0; first < current.symbols.length; first += 1) {
      for (let second = first + 1; second < current.symbols.length; second += 1) {
        const firstPrevious = previous.symbols.find((symbol) => symbol.id === current.symbols[first].id);
        const secondPrevious = previous.symbols.find((symbol) => symbol.id === current.symbols[second].id);
        if (
          firstPrevious && secondPrevious &&
          firstPrevious.row === current.symbols[second].row &&
          firstPrevious.column === current.symbols[second].column &&
          secondPrevious.row === current.symbols[first].row &&
          secondPrevious.column === current.symbols[first].column
        ) complexity += 2;
      }
    }
  }
  return complexity;
}

export function calculateFigureDifficulty(candidate: FigureSequenceCandidate): {
  difficulty: GenerationDifficulty;
  metrics: FigureDifficultyMetrics;
} {
  const rules = candidate.structuredData.rules;
  const allFrames = [...candidate.structuredData.visibleFrames, ...candidate.solutionFrames];
  const symbolCount = candidate.structuredData.visibleFrames[0]?.symbols.length ?? 0;
  const movementRuleCount = rules.filter((rule) => rule.movement).length;
  const attributeRuleCount = rules.reduce(
    (total, rule) => total + Number(Boolean(rule.rotation)) + Number(Boolean(rule.colour)),
    0,
  );
  const activeRuleCount = movementRuleCount + attributeRuleCount;
  const independentRuleCount = new Set(rules.map(normalizedRule)).size;
  const independentRuleStreams = independentRuleCount;
  const progressiveRuleCount = rules.reduce(
    (total, rule) => total +
      Number(rule.movement?.progression === "incrementing") +
      Number(rule.rotation?.progression === "incrementing") +
      Number(rule.colour?.progression === "incrementing"),
    0,
  );
  const cycleRuleCount = rules.filter(
    (rule) => rule.movement?.kind === "direction_cycle" || Boolean(rule.colour),
  ).length;
  const borderRuleCount = rules.filter((rule) => rule.movement?.kind === "border").length;
  const orientationRuleCount = rules.filter((rule) => rule.rotation).length;
  const diagonalRuleCount = rules.filter(isDiagonal).length;
  const directionCycleCount = rules.filter((rule) => rule.movement?.kind === "direction_cycle").length;
  const pathComplexity = borderRuleCount * 2 + diagonalRuleCount * 2 + directionCycleCount * 3;
  const movementComplexity = rules.reduce((total, rule) => {
    if (rule.movement?.kind === "border") return total + 3;
    if (rule.movement?.kind === "direction_cycle") return total + 3 + Math.max(0, rule.movement.directions.length - 2);
    if (isDiagonal(rule)) return total + 2;
    return total + Number(Boolean(rule.movement));
  }, 0);
  const cycleComplexity = rules.reduce((total, rule) => {
    const directionLength = rule.movement?.kind === "direction_cycle"
      ? rule.movement.directions.length
      : 0;
    const colourLength = rule.colour?.cycle.length ?? 0;
    return total + Math.max(0, directionLength - 2) + Math.max(0, colourLength - 2);
  }, 0);
  const advancedRuleCount = rules.reduce(
    (total, rule) => total +
      Number(rule.movement?.kind === "border") +
      Number(rule.movement?.kind === "direction_cycle") +
      Number(isDiagonal(rule)) +
      Number(rule.movement?.progression === "incrementing") +
      Number(rule.rotation?.progression === "incrementing") +
      Number(Boolean(rule.colour)),
    0,
  );
  const predictionDepth = candidate.solutionFrames.length;
  const similarities = candidate.sequence.missingMatrices.flatMap((matrix, index) =>
    matrix.candidates
      .filter((option) => option.id !== candidate.correctAnswer[index])
      .map((option) => figureFrameSimilarity(candidate.solutionFrames[index], option.frame)),
  );
  const distractorSimilarity = similarities.length
    ? similarities.reduce((total, value) => total + value, 0) / similarities.length
    : 0;
  const simulation = replayFigureSequenceDetailed(
    candidate.structuredData.grid,
    candidate.structuredData.visibleFrames[0],
    rules,
    5,
  );
  const boundaryInteractionCount = simulation.boundaryEvents.reduce(
    (total, event) => total + event.count,
    0,
  );
  const periodicity = analyzeFigurePeriodicity(
    candidate.structuredData.grid,
    candidate.structuredData.visibleFrames[0].symbols,
    rules,
  );
  const simultaneousTransformationCount = Math.max(0, ...rules.map((rule) =>
    Number(Boolean(rule.movement)) + Number(Boolean(rule.rotation)) + Number(Boolean(rule.colour)),
  ));
  const stateVariableCount = rules.reduce((total, rule) => total +
    (rule.movement?.kind === "linear" && isDiagonal(rule) ? 2 : Number(Boolean(rule.movement))) +
    Number(Boolean(rule.rotation)) +
    Number(Boolean(rule.colour)) +
    Number(rule.movement?.progression === "incrementing") +
    Number(rule.rotation?.progression === "incrementing") +
    Number(rule.colour?.progression === "incrementing"), 0);
  const collisionComplexity = collisionAvoidanceComplexity(allFrames);
  const periodLoad = Math.log2(Math.max(2, periodicity.combinedStatePeriod));
  const score = Math.round((
    symbolCount * 2 +
    activeRuleCount * 1.5 +
    independentRuleStreams +
    movementComplexity +
    Math.min(6, boundaryInteractionCount) * 0.5 +
    progressiveRuleCount * 2.5 +
    orientationRuleCount +
    rules.filter((rule) => rule.colour).length +
    periodLoad * 1.5 +
    periodicity.rulePeriodMismatch * 1.5 +
    simultaneousTransformationCount +
    stateVariableCount * 0.5 +
    Math.min(6, collisionComplexity) * 0.5 +
    predictionDepth
  ) * 10) / 10;

  const easyProfile =
    score <= 31 &&
    symbolCount <= 2 &&
    activeRuleCount <= 3 &&
    progressiveRuleCount <= 1 &&
    simultaneousTransformationCount <= 2;
  const mediumProfile =
    score <= 42 &&
    symbolCount <= 3 &&
    activeRuleCount >= 2 &&
    stateVariableCount <= 11;
  const difficulty: GenerationDifficulty = easyProfile
    ? "easy"
    : mediumProfile
      ? "medium"
      : "hard";

  return {
    difficulty,
    metrics: {
      symbolCount,
      movementRuleCount,
      attributeRuleCount,
      independentRuleCount,
      progressiveRuleCount,
      cycleRuleCount,
      borderRuleCount,
      orientationRuleCount,
      pathComplexity,
      cycleComplexity,
      advancedRuleCount,
      predictionDepth,
      distractorSimilarity,
      activeRuleCount,
      independentRuleStreams,
      movementComplexity,
      boundaryInteractionCount,
      combinedStatePeriod: periodicity.combinedStatePeriod,
      rulePeriodMismatch: periodicity.rulePeriodMismatch,
      simultaneousTransformationCount,
      stateVariableCount,
      collisionAvoidanceComplexity: collisionComplexity,
      averageMovementPeriod: periodicity.averageMovementPeriod,
      averageRotationPeriod: periodicity.averageRotationPeriod,
      averageColourPeriod: periodicity.averageColourPeriod,
      trivialCycleCount: periodicity.trivialCycleCount,
      score,
    },
  };
}

import { describe, expect, it } from "vitest";

import { buildCoreProgress, confidenceFor, trendFor, type ProgressObservation } from "./model";
import type { CoreSkillId } from "./skills";

function history(input: {
  count: number;
  skill?: CoreSkillId;
  correct?: (index: number) => boolean;
  difficulty?: ProgressObservation["difficulty"];
  sessionSize?: number;
  seconds?: number;
}): ProgressObservation[] {
  const skill = input.skill ?? "equation_scale";
  const sessionSize = input.sessionSize ?? 5;
  return Array.from({ length: input.count }, (_, index) => ({
    id: `answer-${index}`,
    sessionId: `session-${Math.floor(index / sessionSize)}`,
    module: skill.startsWith("figure_") ? "figure_sequence" : skill.startsWith("latin_") ? "latin_square" : "mathematical_equation",
    difficulty: input.difficulty ?? "medium",
    source: index % 3 === 0 ? "generated_mock" : "practice",
    correct: input.correct?.(index) ?? true,
    responseTimeSeconds: input.seconds ?? 60,
    expectedTimeSeconds: 60,
    answeredAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    skills: [skill],
  }));
}

function skill(rows: ProgressObservation[], id: CoreSkillId) {
  return buildCoreProgress(rows).modules.flatMap((module) => module.skills).find((item) => item.skillId === id)!;
}

describe("Core progress performance model", () => {
  it("uses the documented confidence thresholds", () => {
    expect(confidenceFor(0).label).toBe("insufficient_data");
    expect(confidenceFor(2).label).toBe("insufficient_data");
    expect(confidenceFor(3).label).toBe("early_estimate");
    expect(confidenceFor(5).label).toBe("early_estimate");
    expect(confidenceFor(6).label).toBe("growing_confidence");
    expect(confidenceFor(12).label).toBe("reliable_estimate");
  });

  it("never turns one incorrect answer into a weakness", () => {
    const result = skill(history({ count: 1, correct: () => false }), "equation_scale");
    expect(result.status).toBe("insufficient_data");
  });

  it("treats two correct and one incorrect as an early signal", () => {
    const result = skill(history({ count: 3, correct: (index) => index !== 2 }), "equation_scale");
    expect(result.confidence).toBe("early_estimate");
    expect(result.status).toBe("developing");
  });

  it("finds a repeated supported failure as a meaningful weakness", () => {
    const result = skill(history({ count: 10, correct: () => false }), "equation_scale");
    expect(result.status).toBe("needs_attention");
    expect(result.weaknessScore).toBeGreaterThanOrEqual(50);
  });

  it("does not count a three-skill answer as three independent samples", () => {
    const rows = history({ count: 6, skill: "figure_rotation", correct: () => false }).map((row) => ({
      ...row,
      skills: ["figure_rotation", "figure_colour_patterns", "figure_combined_transformations"] as CoreSkillId[],
    }));
    const result = skill(rows, "figure_rotation");
    expect(result.attemptCount).toBe(6);
    expect(result.effectiveAttemptCount).toBeCloseTo(2);
    expect(result.status).toBe("insufficient_data");
  });

  it("gives transparent difficulty credit without hiding separate bands", () => {
    const easy = skill(history({ count: 10, difficulty: "easy", correct: (index) => index < 8 }), "equation_scale");
    const hard = skill(history({ count: 10, difficulty: "hard", correct: (index) => index < 7 }), "equation_scale");
    expect(easy.accuracy).toBe(80);
    expect(hard.accuracy).toBe(70);
    expect(hard.normalizedAccuracy).toBeGreaterThan(easy.normalizedAccuracy!);
    expect(hard.difficultyMix.hard.attempts).toBe(10);
  });

  it("requires meaningful session windows for trends", () => {
    expect(trendFor(history({ count: 10, sessionSize: 5, correct: (index) => index >= 5 }))).toBe("insufficient_data");
    const improving = history({ count: 20, sessionSize: 5, correct: (index) => index >= 10 });
    expect(trendFor(improving)).toBe("improving");
    expect(trendFor(improving.map((row, index) => ({ ...row, correct: index < 10 })))).toBe("declining");
  });

  it("classifies representative deterministic profiles", () => {
    const beginner = buildCoreProgress(history({ count: 2 }));
    expect(beginner.weakAreas).toHaveLength(0);
    const strongFigure = history({ count: 20, skill: "figure_rotation", correct: (index) => index !== 0 });
    const weakEquations = history({ count: 20, skill: "equation_scale", correct: (index) => index % 4 === 0 });
    const profile = buildCoreProgress([...strongFigure, ...weakEquations.map((row, index) => ({ ...row, id: `weak-${index}` }))]);
    expect(profile.strongAreas.map((item) => item.skillId)).toContain("figure_rotation");
    expect(profile.weakAreas[0]?.skillId).toBe("equation_scale");
    expect(profile.recommendations[0]?.href).toContain("focus=equation_scale");
  });

  it("interprets response speed with correctness", () => {
    expect(skill(history({ count: 10, correct: () => true, seconds: 40 }), "equation_scale").speedState).toBe("accurate_fast");
    expect(skill(history({ count: 10, correct: () => false, seconds: 40 }), "equation_scale").speedState).toBe("fast_inaccurate");
    expect(skill(history({ count: 10, correct: () => true, seconds: 90 }), "equation_scale").speedState).toBe("accurate_slower");
  });
});

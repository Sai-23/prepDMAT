import { describe, expect, it } from "vitest";

import {
  generateValidatedFigureSequence,
  visibleFrameValue,
} from "../generation/figure-sequences";
import { buildFigureSequenceWalkthrough } from "./figure-sequence-explanation";

function fixture(difficulty: "easy" | "medium" | "hard") {
  return generateValidatedFigureSequence({
    seed: `figure-practice-explanation-${difficulty}`,
    difficulty,
    symbolCount: difficulty === "easy" ? 1 : difficulty === "medium" ? 3 : 4,
    maxAttempts: 5_000,
  });
}

describe("Figure Sequence Practice explanation mapping", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "creates a verified visual %s rule walkthrough",
    (difficulty) => {
      const question = fixture(difficulty);
      const walkthrough = buildFigureSequenceWalkthrough(
        question.sequence,
        { rules: question.structuredData.rules },
        question.correctAnswer,
      );
      expect(walkthrough.valid).toBe(true);
      expect(walkthrough.rules).toHaveLength(question.structuredData.rules.length);
      expect(walkthrough.steps).toHaveLength(question.structuredData.rules.length + 2);
      expect(walkthrough.steps.filter((step) => step.type === "track_symbol"))
        .toHaveLength(question.structuredData.rules.length);
      walkthrough.steps.filter((step) => step.type === "track_symbol").forEach((step) => {
        expect(step.transitions).toHaveLength(5);
      });
      const predictions = walkthrough.steps.filter((step) => step.type === "predict_matrix");
      expect(predictions).toHaveLength(2);
      predictions.forEach((step, index) => {
        const correct = question.sequence.missingMatrices[index].candidates.find(
          (candidate) => candidate.id === question.correctAnswer[index],
        );
        expect(correct).toBeDefined();
        if (!correct) {
          throw new Error("Expected the correct candidate to exist");
        }
        expect(visibleFrameValue(step.afterFrame)).toBe(visibleFrameValue(correct.frame));
        expect(step.correctOptionLabel).toBe(correct.label);
      });
    },
  );

  it("describes only transformation dimensions that actually change", () => {
    const question = fixture("hard");
    const walkthrough = buildFigureSequenceWalkthrough(
      question.sequence,
      { rules: question.structuredData.rules },
      question.correctAnswer,
    );
    const tracking = walkthrough.steps.filter((step) => step.type === "track_symbol");
    expect(tracking.every((step) => step.changes.length > 0)).toBe(true);
    expect(tracking.some((step) => step.changes.some((change) => change.label === "Position"))).toBe(true);
    expect(tracking.some((step) => step.changes.some((change) => change.label === "Orientation"))).toBe(true);
    expect(walkthrough.rules.every((rule) => !rule.summary.includes("symbol-"))).toBe(true);
  });

  it("rejects a rule trace that does not replay the visible sequence", () => {
    const question = fixture("medium");
    const badRules = structuredClone(question.structuredData.rules);
    badRules[0].symbolId = "missing-symbol";
    const walkthrough = buildFigureSequenceWalkthrough(
      question.sequence,
      { rules: badRules },
      question.correctAnswer,
    );
    expect(walkthrough.valid).toBe(false);
    expect(walkthrough.steps).toEqual([]);
    expect(walkthrough.fallbackMessage).toContain("Verified answers:");
  });
});

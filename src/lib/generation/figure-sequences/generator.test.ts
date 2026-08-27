import { describe, expect, it } from "vitest";
import { visibleFrameValue } from "./distractors";
import { calculateFigureDifficulty } from "./difficulty";
import { figureFrameSimilarity } from "./distractors";
import { figureStructuralSignature, fingerprintFigureSequence } from "./fingerprint";
import { figureSequenceGenerator } from "./generator";
import { generateValidatedFigureSequence, reproduceValidatedFigureSequence } from "./pipeline";
import { figureSequenceValidator } from "./validator";

describe("figure sequence generation", () => {
  it.each(["easy", "medium", "hard"] as const)("is deterministic for %s", (difficulty) => {
    const configuration = { seed: `determinism-${difficulty}`, difficulty, maxAttempts: 500 };
    const first = generateValidatedFigureSequence(configuration);
    const reproduced = reproduceValidatedFigureSequence(configuration, first.metadata.attemptCount);
    expect(reproduced.structuredData).toEqual(first.structuredData);
    expect(reproduced.sequence).toEqual(first.sequence);
    expect(reproduced.correctAnswer).toEqual(first.correctAnswer);
    expect(reproduced.metadata.fingerprint).toBe(first.metadata.fingerprint);
  });

  it.each(["easy", "medium", "hard"] as const)("builds validated native two-stage choices for %s", (difficulty) => {
    for (let seed = 0; seed < 30; seed += 1) {
      const question = generateValidatedFigureSequence({ seed: `${difficulty}-${seed}`, difficulty, maxAttempts: 500 });
      expect(question.validation.checks.every((check) => check.passed)).toBe(true);
      expect(question.response.kind).toBe("two_stage_single_choice");
      expect(question.sequence.missingMatrices).toHaveLength(2);
      question.sequence.missingMatrices.forEach((matrix, index) => {
        expect(matrix.candidates).toHaveLength(3);
        expect(new Set(matrix.candidates.map((candidate) => visibleFrameValue(candidate.frame))).size).toBe(3);
        expect(matrix.candidates.filter((candidate) => candidate.id === question.correctAnswer[index])).toHaveLength(1);
      });
    }
  }, 20_000);

  it("rejects a changed visible frame", () => {
    const accepted = generateValidatedFigureSequence({ seed: "tamper-visible", difficulty: "easy" });
    const candidate = figureSequenceGenerator.generate({ seed: "tamper-visible", difficulty: "easy" }, accepted.metadata.attemptCount);
    candidate.structuredData.visibleFrames[1].symbols[0].color = "green";
    expect(figureSequenceValidator.validate(candidate, "easy")).toMatchObject({ valid: false });
  });

  it("rejects duplicate distractors and a wrong answer key", () => {
    const candidate = figureSequenceGenerator.generate({ seed: "tamper-options", difficulty: "easy" }, 1);
    candidate.sequence.missingMatrices[0].candidates[1].frame = structuredClone(candidate.sequence.missingMatrices[0].candidates[0].frame);
    candidate.correctAnswer[1] = "not-an-option";
    const result = figureSequenceValidator.validate(candidate, "easy");
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.map((entry) => entry.code)).toContain("DUPLICATE_RENDERED_CANDIDATE");
    }
  });

  it("rejects metadata-distinct candidates that render identically", () => {
    const candidate = figureSequenceGenerator.generate({ seed: "render-duplicate", difficulty: "easy" }, 1);
    const matrix = candidate.sequence.missingMatrices[0];
    matrix.candidates[1].frame = structuredClone(matrix.candidates[0].frame);
    matrix.candidates[1].frame.symbols[0].motionState = { rowDelta: 1, columnDelta: 0 };
    const result = figureSequenceValidator.validate(candidate, "easy");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.map((entry) => entry.code)).toContain("DUPLICATE_RENDERED_CANDIDATE");
    }
  });

  it("rejects an incorrect requested difficulty", () => {
    const question = generateValidatedFigureSequence({ seed: "wrong-difficulty", difficulty: "easy" });
    const candidate = figureSequenceGenerator.generate({ seed: "wrong-difficulty", difficulty: "easy" }, question.metadata.attemptCount);
    expect(figureSequenceValidator.validate(candidate, "hard")).toMatchObject({ valid: false });
  });

  it("fingerprints semantics, not prose or candidate labels", () => {
    const candidate = figureSequenceGenerator.generate({ seed: "fingerprint", difficulty: "easy" }, 1);
    const original = fingerprintFigureSequence(candidate);
    candidate.presentation.prompt = "Different wording";
    candidate.sequence.missingMatrices[0].candidates[0].label = "Z";
    expect(fingerprintFigureSequence(candidate)).toBe(original);
    candidate.structuredData.rules[0].movement!.steps += 1;
    expect(fingerprintFigureSequence(candidate)).not.toBe(original);
  });

  it("skips an already accepted semantic fingerprint", () => {
    const configuration = { seed: "deduplicate", difficulty: "medium" as const, maxAttempts: 500 };
    const first = generateValidatedFigureSequence(configuration);
    const second = generateValidatedFigureSequence(configuration, new Set([first.metadata.fingerprint]));
    expect(second.metadata.attemptCount).toBeGreaterThan(first.metadata.attemptCount);
    expect(second.metadata.fingerprint).not.toBe(first.metadata.fingerprint);
  });

  it.each([
    ["easy", 1],
    ["easy", 2],
    ["medium", 2],
    ["medium", 3],
    ["hard", 3],
    ["hard", 4],
  ] as const)("supports an exact %s %i-symbol development profile", (difficulty, symbolCount) => {
    const question = generateValidatedFigureSequence({
      seed: `exact-${difficulty}-${symbolCount}`,
      difficulty,
      symbolCount,
      maxAttempts: 500,
    });
    const metrics = calculateFigureDifficulty(question);
    expect(metrics.difficulty).toBe(difficulty);
    expect(metrics.metrics.symbolCount).toBe(symbolCount);
    expect(metrics.metrics.independentRuleCount).toBeGreaterThanOrEqual(1);
    expect(metrics.metrics.independentRuleCount).toBeLessThanOrEqual(symbolCount);
    expect(metrics.metrics.activeRuleCount).toBeGreaterThanOrEqual(symbolCount);
  });

  it("uses the full evidence-based object-count ranges without forcing a fixed recipe", () => {
    const counts = { medium: { 1: 0, 2: 0, 3: 0 }, hard: { 2: 0, 3: 0, 4: 0 } };
    for (let seed = 0; seed < 100; seed += 1) {
      for (const difficulty of ["medium", "hard"] as const) {
        const question = generateValidatedFigureSequence({
          seed: `weight-${difficulty}-${seed}`,
          difficulty,
          maxAttempts: 500,
        });
        const count = question.structuredData.visibleFrames[0].symbols.length;
        counts[difficulty][count as keyof (typeof counts)[typeof difficulty]] += 1;
      }
    }
    expect(Object.values(counts.medium).every((count) => count > 0)).toBe(true);
    expect(Object.values(counts.hard).every((count) => count > 0)).toBe(true);
    expect(counts.medium[2] + counts.medium[3]).toBeGreaterThan(counts.medium[1]);
    expect(counts.hard[3] + counts.hard[4]).toBeGreaterThan(counts.hard[2]);
  }, 30_000);

  it.each(["medium", "hard"] as const)("uses independent streams and single-symbol near neighbours for %s", (difficulty) => {
    const question = generateValidatedFigureSequence({ seed: `streams-${difficulty}`, difficulty });
    const count = question.structuredData.visibleFrames[0].symbols.length;
    const metrics = calculateFigureDifficulty(question).metrics;
    expect(metrics.independentRuleCount).toBeGreaterThanOrEqual(1);
    expect(metrics.independentRuleCount).toBeLessThanOrEqual(count);
    expect(metrics.activeRuleCount).toBeGreaterThanOrEqual(count);
    expect(metrics.orientationRuleCount + metrics.cycleRuleCount).toBeGreaterThanOrEqual(1);
    question.sequence.missingMatrices.forEach((matrix, index) => {
      const correct = question.solutionFrames[index];
      matrix.candidates
        .filter((candidate) => candidate.id !== question.correctAnswer[index])
        .forEach((candidate) => {
          expect(figureFrameSimilarity(correct, candidate.frame)).toBe((count - 1) / count);
        });
    });
  });

  it("separates structural diversity from exact semantic fingerprints", () => {
    const candidate = Array.from({ length: 100 }, (_, index) => {
      try { return figureSequenceGenerator.generate({ seed: `structure-${index}`, difficulty: "easy", symbolCount: 1 }, 1); }
      catch { return null; }
    }).find((item) => item?.structuredData.rules[0].movement?.kind === "linear" &&
      !item.structuredData.rules[0].movement.direction.includes("_"))!;
    expect(candidate).toBeTruthy();
    const signature = figureStructuralSignature(candidate);
    const fingerprint = fingerprintFigureSequence(candidate);
    const movement = candidate.structuredData.rules[0].movement!;
    if (movement.kind === "linear" && (movement.direction === "left" || movement.direction === "right")) {
      candidate.structuredData.visibleFrames[0].symbols[0].row =
        (candidate.structuredData.visibleFrames[0].symbols[0].row + 1) % 5;
    } else {
      candidate.structuredData.visibleFrames[0].symbols[0].column =
        (candidate.structuredData.visibleFrames[0].symbols[0].column + 1) % 5;
    }
    expect(figureStructuralSignature(candidate)).toBe(signature);
    expect(fingerprintFigureSequence(candidate)).not.toBe(fingerprint);
    candidate.structuredData.rules[0].movement!.steps += 1;
    expect(figureStructuralSignature(candidate)).not.toBe(signature);
  });

  it("ignores cosmetic shape and colour identities in the rule fingerprint", () => {
    const accepted = generateValidatedFigureSequence({ seed: "cosmetic-structure", difficulty: "hard", symbolCount: 3 });
    const candidate = figureSequenceGenerator.generate({ seed: "cosmetic-structure", difficulty: "hard", symbolCount: 3 }, accepted.metadata.attemptCount);
    const changed = structuredClone(candidate);
    changed.structuredData.visibleFrames[0].symbols[0].shape = "circle";
    const colourRuleSet = changed.structuredData.rules.find((rule) => rule.colour);
    const colourRule = colourRuleSet?.colour;
    if (colourRule && colourRuleSet) {
      const replacements = ["black", "white", "green", "orange"] as const;
      const mapping = new Map(colourRule.cycle.map((colour, index) => [colour, replacements[index]]));
      colourRule.cycle = colourRule.cycle.map((colour) => mapping.get(colour)!);
      changed.structuredData.visibleFrames.forEach((frame) => {
        const symbol = frame.symbols.find((item) => item.id === colourRuleSet.symbolId);
        if (symbol && mapping.has(symbol.color)) symbol.color = mapping.get(symbol.color)!;
      });
    }
    expect(figureStructuralSignature(changed)).toBe(figureStructuralSignature(candidate));
  });

  it("normalizes reflection-equivalent border and rotation directions", () => {
    const candidate = Array.from({ length: 100 }, (_, index) => {
      try { return figureSequenceGenerator.generate({ seed: `reflection-symmetry-${index}`, difficulty: "hard", symbolCount: 2 }, 1); }
      catch { return null; }
    }).find((item) => item?.structuredData.rules.some((rule) => rule.movement?.kind === "border"))!;
    expect(candidate).toBeTruthy();
    const reflected = structuredClone(candidate);
    reflected.structuredData.rules.forEach((rule) => {
      if (rule.movement?.kind === "border") rule.movement.direction = rule.movement.direction === "clockwise" ? "counter_clockwise" : "clockwise";
      if (rule.rotation) rule.rotation.direction = rule.rotation.direction === "clockwise" ? "counter_clockwise" : "clockwise";
    });
    expect(figureStructuralSignature(reflected)).toBe(figureStructuralSignature(candidate));
  });

  it("keeps retry-stable object count and anchor movement family", () => {
    const configuration = { seed: "retry-stable-composition", difficulty: "hard" as const };
    const candidates = [1, 2, 3, 4, 5].flatMap((attempt) => {
      try { return [figureSequenceGenerator.generate(configuration, attempt)]; }
      catch { return []; }
    });
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    const first = candidates[0];
    const anchor = first.structuredData.rules[0].movement?.kind === "linear"
      ? `${first.structuredData.rules[0].movement.kind}:${first.structuredData.rules[0].movement.direction.includes("_") ? "diagonal" : first.structuredData.rules[0].movement.direction === "left" || first.structuredData.rules[0].movement.direction === "right" ? "horizontal" : "vertical"}`
      : first.structuredData.rules[0].movement?.kind;
    candidates.forEach((item) => {
      const rule = item.structuredData.rules[0].movement;
      const family = rule?.kind === "linear"
        ? `${rule.kind}:${rule.direction.includes("_") ? "diagonal" : rule.direction === "left" || rule.direction === "right" ? "horizontal" : "vertical"}`
        : rule?.kind;
      expect(item.structuredData.visibleFrames[0].symbols.length).toBe(first.structuredData.visibleFrames[0].symbols.length);
      expect(family).toBe(anchor);
    });
  });
});

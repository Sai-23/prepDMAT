import { describe, expect, it } from "vitest";

import {
  answerSubmissionSchema,
  practiceConfigSchema,
} from "./schemas";

describe("practice validation", () => {
  it("accepts a valid focused practice configuration", () => {
    expect(
      practiceConfigSchema.safeParse({
        module: "mathematical_equation",
        difficulty: "medium",
        questionCount: 10,
        timingMode: "timed",
      }).success,
    ).toBe(true);
  });

  it("rejects oversized practice sessions", () => {
    expect(
      practiceConfigSchema.safeParse({
        module: "latin_square",
        difficulty: "mixed",
        questionCount: 100,
        timingMode: "untimed",
      }).success,
    ).toBe(false);
  });

  it("rejects malformed answer identifiers", () => {
    expect(
      answerSubmissionSchema.safeParse({
        sessionId: "not-an-id",
        questionId: "not-an-id",
        optionId: "not-an-id",
        timeSpentSeconds: 12,
      }).success,
    ).toBe(false);
  });

  it.each([
    { kind: "single_choice", optionId: "choice-a" },
    { kind: "symbol_assignment", values: { A: 2, B: 7 } },
    { kind: "two_stage_single_choice", optionIds: ["first", "second"] },
  ])("accepts the native $kind response", (answer) => {
    expect(answerSubmissionSchema.safeParse({
      sessionId: "11111111-1111-4111-8111-111111111111",
      questionId: "22222222-2222-4222-8222-222222222222",
      answer,
    }).success).toBe(true);
  });

  it.each(["figure_sequence", "mathematical_equation", "latin_square"])("accepts the %s module", (module) => {
    expect(practiceConfigSchema.safeParse({ module, difficulty: "easy", questionCount: 5, timingMode: "untimed" }).success).toBe(true);
  });

  it.each(["easy", "medium", "hard", "mixed"])("accepts %s difficulty", (difficulty) => {
    expect(practiceConfigSchema.safeParse({ module: "latin_square", difficulty, questionCount: 20, timingMode: "timed" }).success).toBe(true);
  });

  it("allows a one-question session only for an exact published question", () => {
    const base = { module: "figure_sequence", difficulty: "mixed", questionCount: 1, timingMode: "untimed" };
    expect(practiceConfigSchema.safeParse(base).success).toBe(false);
    expect(practiceConfigSchema.safeParse({ ...base, questionId: "33333333-3333-4333-8333-333333333333" }).success).toBe(true);
  });
});

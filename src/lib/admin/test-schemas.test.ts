import { describe, expect, it } from "vitest";

import {
  adminSmartFillRequestSchema,
  adminTestBuilderSchema,
  smartFillTargetCountSchema,
} from "./test-schemas";

const questionId = "11111111-1111-4111-8111-111111111111";

function validInput() {
  return {
    title: "Core Mini Mock",
    description: "A balanced assessment.",
    testType: "mini_mock",
    module: "core",
    instructions: "Answer every question before time expires.",
    isPremium: false,
    randomizeQuestions: true,
    randomizeOptions: true,
    intent: "draft",
    sections: [
      {
        title: "Equations",
        module: "core",
        sectionType: "mathematical_equation",
        durationSeconds: 1800,
        focusDifficulty: "hard",
        questionIds: [questionId],
      },
    ],
  };
}

describe("adminTestBuilderSchema", () => {
  it("accepts a complete test structure", () => {
    expect(adminTestBuilderSchema.safeParse(validInput()).success).toBe(true);
  });

  it("rejects duplicate questions across sections", () => {
    const input = validInput();
    input.sections.push({
      title: "More equations",
      module: "core",
      sectionType: "mathematical_equation",
      durationSeconds: 1200,
      focusDifficulty: "hard",
      questionIds: [questionId],
    });
    expect(adminTestBuilderSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an unsupported test module", () => {
    const input = validInput();
    input.module = "unsupported";
    expect(adminTestBuilderSchema.safeParse(input).success).toBe(false);
  });

  it("requires at least one question in every section", () => {
    const input = validInput();
    input.sections[0].questionIds = [];
    expect(adminTestBuilderSchema.safeParse(input).success).toBe(false);
  });

  it("accepts only a canonical stored focus difficulty", () => {
    const input = validInput();
    input.sections[0].focusDifficulty = "impossible";
    expect(adminTestBuilderSchema.safeParse(input).success).toBe(false);
  });

  it("requires a declared difficulty for a focused sectional mock", () => {
    const input = validInput();
    input.testType = "sectional";
    input.sections[0].focusDifficulty = "";
    const result = adminTestBuilderSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Choose a difficulty for each focused sectional mock.",
      );
    }
  });
});

describe("Smart Fill target validation", () => {
  it.each([5, 12, 20, "5", "12", "20"])(
    "accepts supported whole-number target %j",
    (targetCount) => {
      expect(smartFillTargetCountSchema.safeParse(targetCount).success).toBe(true);
    },
  );

  it.each(["", 0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 101, true])(
    "rejects invalid target %j",
    (targetCount) => {
      expect(smartFillTargetCountSchema.safeParse(targetCount).success).toBe(false);
    },
  );

  it("validates the complete server-side Smart Fill request", () => {
    expect(adminSmartFillRequestSchema.safeParse({
      questionType: "mathematical_equation",
      difficulty: "hard",
      targetCount: 12,
      existingQuestionIds: [questionId],
      otherQuestionIds: [],
      allowPublishedFocusedReuse: false,
      mode: "fill",
      seed: "target-12",
    }).success).toBe(true);
  });

  it("rejects duplicate or cross-section question IDs server-side", () => {
    expect(adminSmartFillRequestSchema.safeParse({
      questionType: "mathematical_equation",
      difficulty: "hard",
      targetCount: 12,
      existingQuestionIds: [questionId],
      otherQuestionIds: [questionId],
      allowPublishedFocusedReuse: false,
      mode: "fill",
      seed: "duplicate-id",
    }).success).toBe(false);
  });
});

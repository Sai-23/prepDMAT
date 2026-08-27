import { describe, expect, it } from "vitest";

import type { PracticeModule } from "@/lib/practice/schemas";
import type { CoreSkillId } from "@/lib/progress/skills";

import { analyzeMockAttempt } from "./mock-analysis";
import type { AttemptResult, ResultQuestion } from "./schemas";

const modules: PracticeModule[] = ["figure_sequence", "mathematical_equation", "latin_square"];
const skills: Record<PracticeModule, CoreSkillId> = {
  figure_sequence: "figure_boundary_movement",
  mathematical_equation: "equation_scale",
  latin_square: "latin_chained",
};

function mockResult(input: {
  correctByModule?: Partial<Record<PracticeModule, number>>;
  unansweredByModule?: Partial<Record<PracticeModule, number>>;
  status?: AttemptResult["status"];
  origin?: AttemptResult["origin"];
  times?: (module: PracticeModule, index: number, correct: boolean) => number;
  skillsAvailable?: boolean;
  immutable?: boolean;
} = {}): AttemptResult {
  const questions: ResultQuestion[] = modules.flatMap((module, moduleIndex) => {
    const correctCount = input.correctByModule?.[module] ?? 14;
    const unansweredCount = input.unansweredByModule?.[module] ?? 0;
    return Array.from({ length: 20 }, (_, index) => {
      const answered = index < 20 - unansweredCount;
      const correct = answered && index < correctCount;
      return {
        id: `${module}-${index}`,
        module: "core",
        questionType: module,
        topic: "Core",
        subtopic: null,
        difficulty: (["easy", "medium", "hard"] as const)[index % 3],
        questionText: `Question ${moduleIndex * 20 + index + 1}`,
        passage: null,
        code: null,
        formula: null,
        structuredData: {},
        options: [],
        sectionTitle: module,
        selectedOptionId: null,
        correctOptionId: "correct",
        explanation: "Explanation",
        responseStatus: answered ? "answered" : "unanswered",
        isCorrect: correct,
        markedForReview: false,
        isBookmarked: false,
        timeSpentSeconds: answered ? input.times?.(module, index, correct) ?? 60 : 0,
        questionNumber: moduleIndex * 20 + index + 1,
        estimatedTimeSeconds: 75,
        skillIds: input.skillsAvailable === false ? [] : [skills[module]],
      } satisfies ResultQuestion;
    });
  });
  const correctCount = questions.filter((question) => question.isCorrect).length;
  const answeredCount = questions.filter((question) => question.responseStatus === "answered").length;
  return {
    id: "10000000-0000-4000-8000-000000000001",
    testTitle: "Core Mock",
    origin: input.origin ?? "generated",
    hasImmutableSnapshots: input.immutable ?? true,
    status: input.status ?? "submitted",
    startedAt: "2026-08-22T00:00:00.000Z",
    submittedAt: "2026-08-22T01:15:00.000Z",
    totalTimeSeconds: 4500,
    score: correctCount,
    accuracy: correctCount / questions.length * 100,
    correctCount,
    incorrectCount: answeredCount - correctCount,
    unansweredCount: questions.length - answeredCount,
    answeredCount,
    topicBreakdown: [],
    difficultyBreakdown: [],
    questions,
    recommendation: { title: "Review", description: "Review" },
  };
}

describe("single-mock deterministic analysis", () => {
  it("produces exact section and overall summaries", () => {
    const analysis = analyzeMockAttempt(mockResult({ correctByModule: { figure_sequence: 16, mathematical_equation: 11, latin_square: 16 } }));
    expect(analysis.overall).toMatchObject({ total: 60, attempted: 60, correct: 43, incorrect: 17, unanswered: 0 });
    expect(analysis.sections.find((section) => section.module === "mathematical_equation")).toMatchObject({ correct: 11, incorrect: 9, total: 20 });
    expect(analysis.weakestSection).toBe("mathematical_equation");
  });

  it("does not declare strongest or weakest sections when effectively tied", () => {
    const analysis = analyzeMockAttempt(mockResult({ correctByModule: { figure_sequence: 15, mathematical_equation: 15, latin_square: 14 } }));
    expect(analysis.strongestSection).toBeNull();
    expect(analysis.weakestSection).toBeNull();
    expect(analysis.insights.some((insight) => insight.includes("lowest-scoring"))).toBe(false);
  });

  it("does not infer a skill weakness from one isolated error", () => {
    const analysis = analyzeMockAttempt(mockResult({ correctByModule: { figure_sequence: 19, mathematical_equation: 20, latin_square: 20 } }));
    expect(analysis.skillLosses).toHaveLength(0);
    expect(analysis.recommendations).toHaveLength(0);
  });

  it("ranks repeated mark losses without multi-skill double counting", () => {
    const result = mockResult({ correctByModule: { figure_sequence: 16, mathematical_equation: 20, latin_square: 20 } });
    result.questions.filter((question) => question.questionType === "figure_sequence" && !question.isCorrect)
      .forEach((question) => { question.skillIds = ["figure_boundary_movement", "figure_rotation"]; });
    const analysis = analyzeMockAttempt(result);
    expect(analysis.skillLosses).toHaveLength(2);
    expect(analysis.skillLosses.reduce((sum, loss) => sum + loss.weightedMarkLoss, 0)).toBe(4);
  });

  it("keeps unanswered separate and explains an auto-submitted timeout", () => {
    const analysis = analyzeMockAttempt(mockResult({ status: "auto_submitted", unansweredByModule: { latin_square: 8 } }));
    expect(analysis.overall.unanswered).toBe(8);
    expect(analysis.sections.find((section) => section.module === "latin_square")?.unanswered).toBe(8);
    expect(analysis.insights).toContain("The mock was submitted automatically with 8 unanswered questions.");
  });

  it("uses correctness-aware timing labels without alleging carelessness", () => {
    const result = mockResult({
      correctByModule: { figure_sequence: 14, mathematical_equation: 20, latin_square: 20 },
      times: (module, index, correct) => module === "figure_sequence" && !correct ? 20 : 60,
    });
    const analysis = analyzeMockAttempt(result);
    expect(analysis.questionAnalysis.filter((question) => question.timing === "fast_incorrect")).toHaveLength(6);
    expect(JSON.stringify(analysis)).not.toMatch(/careless/i);
  });

  it("makes no timing claim when durations are absent", () => {
    const analysis = analyzeMockAttempt(mockResult({ times: () => 0 }));
    expect(analysis.timingAvailable).toBe(false);
    expect(analysis.insights.some((insight) => /faster|longer|tim/i.test(insight))).toBe(false);
  });

  it("does not invent curated skill attribution", () => {
    const analysis = analyzeMockAttempt(mockResult({ origin: "curated", skillsAvailable: false, correctByModule: { figure_sequence: 5 } }));
    expect(analysis.skillLosses).toHaveLength(0);
    expect(analysis.recommendations).toHaveLength(0);
  });

  it("gates advanced analysis for legacy attempts without immutable snapshots", () => {
    const analysis = analyzeMockAttempt(mockResult({ immutable: false }));
    expect(analysis.eligible).toBe(false);
    expect(analysis.sections).toHaveLength(0);
  });

  it("never produces an official score or admission prediction", () => {
    const serialized = JSON.stringify(analyzeMockAttempt(mockResult()));
    expect(serialized).not.toMatch(/scaled score|admission|official dMAT score/i);
  });
});

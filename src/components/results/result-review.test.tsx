import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { MathematicalEquationStructuredData } from "@/lib/generation/mathematical-equations";
import { generateValidatedFigureSequence } from "@/lib/generation/figure-sequences";
import { DEFAULT_LATIN_SYMBOLS, generateValidatedLatinSquare } from "@/lib/generation/latin-squares";
import type { ResultQuestion } from "@/lib/results/schemas";
import { ResultReview } from "./result-review";
import { createVerifiedEquationExplanationTrace } from "@/lib/practice/mathematical-equation-explanation-trace";
import { createVerifiedFigureExplanationTrace } from "@/lib/practice/figure-sequence-explanation-trace";
import { createVerifiedLatinExplanationTrace } from "@/lib/practice/latin-square-explanation-trace";

vi.mock("@/app/learning/actions", () => ({
  toggleBookmarkAction: vi.fn(),
}));

const equation: MathematicalEquationStructuredData = {
  variables: ["A", "B"],
  domain: { minimum: 1, maximum: 20, integersOnly: true },
  dependencyModel: {
    family: "chain",
    solveOrder: ["A", "B"],
    edges: [{ source: "A", target: "B" }],
  },
  equations: [
    {
      left: {
        kind: "operation",
        operator: "subtract",
        left: { kind: "constant", value: 5 },
        right: { kind: "variable", symbol: "A" },
      },
      right: { kind: "constant", value: 2 },
    },
    {
      left: {
        kind: "operation",
        operator: "divide",
        left: { kind: "variable", symbol: "B" },
        right: { kind: "constant", value: 3 },
      },
      right: { kind: "variable", symbol: "A" },
    },
  ],
};

function resultQuestion(answer: { A?: number; B?: number }): ResultQuestion {
  const solutionPath = [
    { equationIndex: 0, targetSymbol: "A", knownSymbols: [] },
    { equationIndex: 1, targetSymbol: "B", knownSymbols: ["A"] },
  ];
  return {
    id: "equation-result",
    module: "core",
    questionType: "mathematical_equation",
    topic: "Mathematical Equations",
    subtopic: "Substitution",
    difficulty: "easy",
    questionText: "Find A and B.",
    passage: null,
    code: null,
    formula: null,
    structuredData: equation,
    response: { kind: "symbol_assignment", symbols: ["A", "B"] },
    options: [],
    sectionTitle: "Core",
    selectedOptionId: null,
    correctOptionId: "",
    explanation: "Dense legacy explanation must not render.",
    responseStatus: "answered",
    isCorrect: answer.A === 3 && answer.B === 9,
    markedForReview: false,
    isBookmarked: false,
    timeSpentSeconds: 42,
    answer: { kind: "symbol_assignment", values: answer },
    correctAnswer: { A: 3, B: 9 },
    explanationTrace: solutionPath,
    mathematicalExplanationTrace: createVerifiedEquationExplanationTrace(
      equation,
      solutionPath,
      { A: 3, B: 9 },
    ) ?? undefined,
  };
}

describe("completed Mathematical Equation result review", () => {
  it("exposes accessible status, timing, and skill review controls", () => {
    const question = resultQuestion({ A: 3, B: 1 });
    question.questionNumber = 21;
    question.skillIds = ["equation_scale"];
    const html = renderToStaticMarkup(<ResultReview
      analysis={[{
        questionId: question.id,
        questionNumber: 21,
        module: "mathematical_equation",
        skillIds: ["equation_scale"],
        timing: "fast_incorrect",
        paceRatio: 0.5,
      }]}
      attemptId="10000000-0000-4000-8000-000000000001"
      questions={[question]}
    />);

    expect(html).toContain('aria-label="Question status and timing filters"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Fast incorrect (1)");
    expect(html).toContain("Question 21");
    expect(html).toContain("Scale relationships");
    expect(html).toContain("Practice this skill");
    expect(html).toContain("42s recorded");
  });

  it("fixes the structured-response footer bug and reuses the step walkthrough", () => {
    const html = renderToStaticMarkup(<ResultReview questions={[resultQuestion({ A: 3, B: 1 })]} />);

    expect(html).toContain('data-answer-review="mathematical-equation"');
    expect(html.match(/data-answer-review="mathematical-equation"/g)).toHaveLength(1);
    expect(html).toContain("1 of 2 values correct");
    expect(html).toContain("Variable A. Your answer 3. Correct answer 3. Correct.");
    expect(html).toContain("Variable B. Your answer 1. Correct answer 9. Incorrect.");
    expect(html).toContain("How to solve it");
    expect(html).toContain("Substitute A = 3");
    expect(html).toContain("Final answer");
    expect(html).not.toContain("Dense legacy explanation must not render.");
    expect(html).not.toContain("Your response:");
    expect(html).not.toContain("No answer");
    expect(html).not.toContain("Correct: Unavailable");
    expect(html).not.toContain('data-response-interface="equation-variable-values"');
  });

  it("shows an unanswered variable without collapsing the structured response", () => {
    const html = renderToStaticMarkup(<ResultReview questions={[resultQuestion({ A: 3 })]} />);
    expect(html).toContain("Variable B. Your answer not answered. Correct answer 9. Not answered.");
    expect(html).toContain('data-variable-result="unanswered"');
    expect(html).not.toContain("Your response: No answer");
  });
});

describe("completed generated Core result review", () => {
  it("reuses the Figure simulator explanation instead of legacy prose", () => {
    const generated = generateValidatedFigureSequence({ seed: "phase7-result-figure", difficulty: "medium", maxAttempts: 5_000 });
    const wrong = generated.sequence.missingMatrices.map((matrix, index) =>
      matrix.candidates.find((candidate) => candidate.id !== generated.correctAnswer[index])!.id,
    ) as [string, string];
    const question: ResultQuestion = {
      ...resultQuestion({ A: 3, B: 9 }),
      id: "figure-result",
      questionType: "figure_sequence",
      topic: "Figure Sequences",
      questionText: "Choose the next two matrices.",
      structuredData: generated.sequence,
      response: { kind: "two_stage_single_choice" },
      answer: { kind: "two_stage_single_choice", optionIds: wrong },
      correctAnswer: generated.correctAnswer,
      explanationTrace: { rules: generated.structuredData.rules },
      figureExplanationTrace: createVerifiedFigureExplanationTrace(generated.sequence, { rules: generated.structuredData.rules }, generated.correctAnswer, generated.solutionFrames) ?? undefined,
      explanation: "Legacy figure prose must not render.",
      isCorrect: false,
    };
    const html = renderToStaticMarkup(<ResultReview questions={[question]} />);
    expect(html).toContain('data-feedback-interface="figure-sequence-guided"');
    expect(html).not.toContain("Verified across every transition");
    expect(html).toContain('data-rule-summary="figure-sequence"');
    expect(html).toContain("Quick explanation");
    expect(html).not.toContain("Legacy figure prose must not render.");
  });

  it("reuses the Latin causal proof and shows the complete verified matrix", () => {
    const generated = generateValidatedLatinSquare({ seed: "phase7-result-latin", difficulty: "hard", maxAttempts: 5_000 });
    const wrong = DEFAULT_LATIN_SYMBOLS.find((symbol) => symbol !== generated.correctAnswer)!;
    const question: ResultQuestion = {
      ...resultQuestion({ A: 3, B: 9 }),
      id: "latin-result",
      questionType: "latin_square",
      topic: "Latin Squares",
      questionText: "Which symbol belongs in the target?",
      structuredData: generated.structuredData,
      response: { kind: "single_choice", options: DEFAULT_LATIN_SYMBOLS.map((symbol) => ({ id: symbol, label: symbol, content: symbol })) },
      options: DEFAULT_LATIN_SYMBOLS.map((symbol) => ({ id: symbol, label: symbol, content: symbol })),
      answer: { kind: "single_choice", optionId: wrong },
      correctAnswer: generated.correctAnswer,
      explanationTrace: generated.deductionTrace,
      latinExplanationTrace: createVerifiedLatinExplanationTrace(generated.structuredData, generated.deductionTrace, generated.correctAnswer, generated.completedGrid) ?? undefined,
      explanation: "Legacy Latin prose must not render.",
      isCorrect: false,
    };
    const html = renderToStaticMarkup(<ResultReview questions={[question]} />);
    expect(html).toContain('data-feedback-interface="latin-square-guided"');
    expect(html).toContain("Complete solved matrix");
    expect(html).toContain("completed value");
    expect(html).not.toContain("Legacy Latin prose must not render.");
  });
});

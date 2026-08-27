import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { generateValidatedMathematicalEquation } from "../../lib/generation/mathematical-equations";
import { MathematicalEquationPracticeFeedback } from "./mathematical-equation-practice-feedback";
import { createVerifiedEquationExplanationTrace } from "../../lib/practice/mathematical-equation-explanation-trace";

function fixture(difficulty: "easy" | "medium" | "hard") {
  return generateValidatedMathematicalEquation({
    seed: `equation-practice-feedback-${difficulty}`,
    difficulty,
  });
}

function renderFeedback({
  difficulty = "medium",
  wrong = false,
  initiallyOpen = true,
  initialView = "step",
  initialStep = 0,
}: {
  difficulty?: "easy" | "medium" | "hard";
  wrong?: boolean;
  initiallyOpen?: boolean;
  initialView?: "step" | "all";
  initialStep?: number;
} = {}) {
  const question = fixture(difficulty);
  const selected = { ...question.correctAnswer };
  if (wrong) {
    const symbol = question.structuredData.variables[0];
    selected[symbol] = selected[symbol] === 20 ? 19 : selected[symbol] + 1;
  }
  return {
    question,
    html: renderToStaticMarkup(
      <MathematicalEquationPracticeFeedback
        correctAnswer={question.correctAnswer}
        data={question.structuredData}
        initialStep={initialStep}
        initialView={initialView}
        initiallyOpen={initiallyOpen}
        isCorrect={!wrong}
        selectedAnswer={selected}
        trace={createVerifiedEquationExplanationTrace(
          question.structuredData,
          question.solutionPath,
          question.correctAnswer,
        )}
      />,
    ),
  };
}

describe("MathematicalEquationPracticeFeedback", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "renders the %s substitution experience",
    (difficulty) => {
      const { html } = renderFeedback({ difficulty });
      expect(html).toContain("Equation system");
      expect(html).toContain("active");
      expect(html).toContain("Solved values");
      expect(html).toContain("Answer review");
      expect(html).toContain("Step 1 of");
      expect(html).toContain("Before");
      expect(html).toContain("After");
      expect(html).toContain("Previous");
      expect(html).toContain("Next");
      expect(html).not.toContain('"kind"');
      expect(html).not.toContain("solutionPath");
    },
  );

  it("shows substituted values and accumulated solved-variable chips", () => {
    const question = fixture("hard");
    const { html } = renderFeedback({ difficulty: "hard", initialView: "all" });
    expect(html).toContain("Use a value we already know");
    expect(html).toContain("Replace");
    expect(html).toContain("data-equation-transformation=\"substitution\"");
    question.structuredData.variables.forEach((symbol) => {
      expect(html).toContain(`${symbol} = ${question.correctAnswer[symbol]}`);
    });
  });

  it("shows one answer review and a non-duplicated final answer without JSON", () => {
    const question = fixture("hard");
    const { html } = renderFeedback({ difficulty: "hard", wrong: true, initialStep: 99 });
    expect(html).toContain("Final answer");
    expect(html).toContain('data-answer-review="mathematical-equation"');
    expect(html.match(/data-answer-review="mathematical-equation"/g)).toHaveLength(1);
    expect(html).toContain('data-final-answer="mathematical-equation"');
    expect(html).toContain("Incorrect");
    expect(html).not.toContain('data-answer-comparison="equation"');
    expect(html).not.toContain("symbol_assignment");
    expect(html).not.toContain(JSON.stringify(question.correctAnswer));
  });

  it("supports Show all and responsive layouts", () => {
    const { html } = renderFeedback({ difficulty: "medium", initialView: "all" });
    expect(html).toContain('data-walkthrough-view="all"');
    expect(html).toContain("Show one step at a time");
    expect(html).toContain("lg:grid-cols-");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).toContain("overflow-x-auto");
  });
});

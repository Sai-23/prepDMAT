import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { generateValidatedLatinSquare } from "../../lib/generation/latin-squares";
import { buildLatinSquareWalkthrough } from "../../lib/practice/latin-square-explanation";
import { createVerifiedLatinExplanationTrace } from "../../lib/practice/latin-square-explanation-trace";
import { LatinSquarePracticeFeedback } from "./latin-square-practice-feedback";

function fixture(difficulty: "easy" | "medium" | "hard") {
  return generateValidatedLatinSquare({
    seed: `latin-practice-feedback-${difficulty}`,
    difficulty,
    maxAttempts: 5_000,
  });
}

function verifiedTrace(question: ReturnType<typeof fixture>) {
  return createVerifiedLatinExplanationTrace(question.structuredData, question.deductionTrace, question.correctAnswer, question.completedGrid);
}

function renderFeedback({
  difficulty = "medium",
  selectedAnswer,
  initiallyOpen = true,
  initialView = "step",
  initialStep = 0,
}: {
  difficulty?: "easy" | "medium" | "hard";
  selectedAnswer?: string;
  initiallyOpen?: boolean;
  initialView?: "step" | "all";
  initialStep?: number;
} = {}) {
  const question = fixture(difficulty);
  const selected = selectedAnswer ?? question.correctAnswer;
  return {
    question,
    html: renderToStaticMarkup(
      <LatinSquarePracticeFeedback
        correctAnswer={question.correctAnswer}
        data={question.structuredData}
        initialStep={initialStep}
        initialView={initialView}
        initiallyOpen={initiallyOpen}
        isCorrect={selected === question.correctAnswer}
        selectedAnswer={selected}
        trace={verifiedTrace(question)}
      />,
    ),
  };
}

describe("LatinSquarePracticeFeedback", () => {
  it("shows a compact result header and guided disclosure", () => {
    const { question, html } = renderFeedback({ initiallyOpen: false });
    expect(html).toContain("Correct!");
    expect(html).toContain("You selected: <strong");
    expect(html).toContain(question.correctAnswer);
    expect(html).toContain("See how it works");
    expect(html).not.toContain("Simple steps to the answer");
  });

  it("shows wrong and correct answers with non-colour indicators", () => {
    const question = fixture("easy");
    const wrong = question.correctAnswer === "A" ? "B" : "A";
    const { html } = renderFeedback({ difficulty: "easy", selectedAnswer: wrong });
    expect(html).toContain("Not quite");
    expect(html).toContain("Your answer");
    expect(html).toContain("Incorrect answer");
    expect(html).toContain("Correct answer");
  });

  it.each(["easy", "medium", "hard"] as const)(
    "renders simple target row, target column, and comparison sets for %s",
    (difficulty) => {
      const { question, html } = renderFeedback({ difficulty, initialView: "all" });
      expect(html).toContain("Puzzle");
      expect(html).toContain(`Look at Row ${question.structuredData.target.row + 1}`);
      expect(html).toContain(`Check Column ${question.structuredData.target.column + 1}`);
      expect(html).toContain("Missing from this row");
      expect(html).toContain("Missing from this column");
      expect(html).toContain("COMPARE THE TWO SETS");
      expect(html).toContain("Common");
      expect(html).not.toContain("Candidate letters");
      expect(html).not.toContain("Why are letters eliminated?");
    },
  );

  it("highlights the target with an accessible label and keeps navigation compact", () => {
    const { question, html } = renderFeedback({ difficulty: "hard" });
    expect(html).toContain(
      `Target cell, Row ${question.structuredData.target.row + 1} Column ${question.structuredData.target.column + 1}`,
    );
    expect(html).toContain("Explanation progress");
    expect(html).toContain("Step 1 of");
    expect(html).toContain("Previous");
    expect(html).toContain("Next");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).toContain("lg:grid-cols-");
  });

  it("renders a solver-derived completed matrix and concise summary", () => {
    const { question, html } = renderFeedback({ difficulty: "hard", initialView: "all" });
    expect(html).toContain("Complete solved matrix");
    expect(html).toContain("Summary");
    expect(html).toContain("given clue");
    expect(html).toContain("reasoning placement");
    expect(html).toContain("completed value");
    expect(html).toContain("final answer");
    expect(html).toContain(`Correct answer: ${question.correctAnswer}`);
    expect(html.match(/data-solved-cell-origin=/g)).toHaveLength(25);
  });

  it("uses View proof cells on the final step without adding an answer control", () => {
    const question = fixture("medium");
    const walkthrough = buildLatinSquareWalkthrough(
      question.structuredData,
      verifiedTrace(question),
      question.correctAnswer,
    );
    const { html } = renderFeedback({
      difficulty: "medium",
      initialStep: walkthrough.steps.length - 1,
    });
    expect(html).toContain("View solved matrix");
    expect(html).not.toContain(">Next<");
    expect(html).not.toContain('name="answer"');
  });

  it("does not expose raw trace JSON or generic duplicate answer UI", () => {
    const { html } = renderFeedback({ difficulty: "medium", initialView: "all" });
    expect(html).not.toContain("single_candidate");
    expect(html).not.toContain("only_position_in_row");
    expect(html).not.toContain('"dependencies"');
    expect(html).not.toContain('data-response-interface="generic-single-choice"');
  });

  it("keeps the complete grid hidden until the final step", () => {
    const { html } = renderFeedback({ difficulty: "hard", initialStep: 0, initialView: "step" });
    expect(html).toContain("Puzzle");
    expect(html).not.toContain("Complete solved matrix");
    expect(html).not.toContain('aria-label="Solution summary"');
  });

  it("shows explicit eliminated candidates in the progressive proof", () => {
    const { html } = renderFeedback({ difficulty: "hard", initialView: "all" });
    expect(html).toContain("Eliminated");
    expect(html).toContain("line-through");
  });

  it.each(["easy", "medium", "hard"] as const)(
    "keeps given, active, target, and inferred states readable for %s",
    (difficulty) => {
      const { html } = renderFeedback({ difficulty, initialView: "all" });
      const { html: finalHtml } = renderFeedback({ difficulty, initialStep: 99, initialView: "step" });
      expect(html).toContain("bg-surface-high text-on-surface");
      expect(html).toContain("ring-2 ring-inset ring-primary");
      expect(html).toContain('data-cell-state="given');
      expect(html).toMatch(/data-cell-state="[^"]*active-(?:row|column)/);
      expect(html).toMatch(/aria-label="Target cell, Row \d Column \d/);
      expect(finalHtml).toContain("inferred value");
      expect(finalHtml).toContain("text-success-container-foreground ring-success");
    },
  );
});

describe("Latin Square 15-sample explanation audit", () => {
  describe.each(["easy", "medium", "hard"] as const)("%s", (difficulty) => {
    it.each([1, 2, 3, 4, 5] as const)("renders verified sample %s", (sample) => {
      const question = generateValidatedLatinSquare({
        difficulty,
        maxAttempts: 5_000,
        seed: `latin-explanation-visual-audit-${difficulty}-${sample}`,
      });
      const walkthrough = buildLatinSquareWalkthrough(
        question.structuredData,
        verifiedTrace(question),
        question.correctAnswer,
      );
      const html = renderToStaticMarkup(
        <LatinSquarePracticeFeedback
          correctAnswer={question.correctAnswer}
          data={question.structuredData}
          initialView="all"
          initiallyOpen
          isCorrect
          selectedAnswer={question.correctAnswer}
          trace={verifiedTrace(question)}
        />,
      );

      expect(walkthrough.valid).toBe(true);
      expect(walkthrough.completedGrid).not.toBeNull();
      walkthrough.completedGrid?.forEach((row, rowIndex) => {
        expect(question.structuredData.grid[rowIndex].every((clue, columnIndex) =>
          clue === null || row[columnIndex] === clue,
        )).toBe(true);
      });
      expect(walkthrough.completedGrid?.flat()).toHaveLength(25);
      expect(html).toContain("Simple steps to the answer");
      expect(html).toContain("Missing from this row");
      expect(html).toContain("Missing from this column");
      expect(html).toContain("COMPARE THE TWO SETS");
      expect(html).toContain("Complete solved matrix");
      expect(html).toContain(`Correct answer: ${question.correctAnswer}`);
      expect(html).not.toContain("Candidate letters");
      expect(html).not.toContain("Why are letters eliminated?");
      expect(html).not.toContain('"dependencies"');
    });
  });
});

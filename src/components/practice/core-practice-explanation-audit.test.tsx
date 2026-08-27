import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { generateValidatedFigureSequence } from "../../lib/generation/figure-sequences";
import { generateValidatedLatinSquare } from "../../lib/generation/latin-squares";
import { generateValidatedMathematicalEquation } from "../../lib/generation/mathematical-equations";
import { FigureSequencePracticeFeedback } from "./figure-sequence-practice-feedback";
import { LatinSquarePracticeFeedback } from "./latin-square-practice-feedback";
import { MathematicalEquationPracticeFeedback } from "./mathematical-equation-practice-feedback";

const difficulties = ["easy", "medium", "hard"] as const;
const samples = [1, 2, 3] as const;

describe("Core Practice explanation 27-sample structural audit", () => {
  describe.each(difficulties)("Mathematical Equations / %s", (difficulty) => {
    it.each(samples)("renders verified sample %s", (sample) => {
      const question = generateValidatedMathematicalEquation({
        difficulty,
        seed: `core-explanation-audit-equation-${difficulty}-${sample}`,
      });
      const html = renderToStaticMarkup(
        <MathematicalEquationPracticeFeedback
          correctAnswer={question.correctAnswer}
          data={question.structuredData}
          initialView="all"
          initiallyOpen
          isCorrect
          selectedAnswer={question.correctAnswer}
          trace={question.solutionPath}
        />,
      );

      expect(html).toContain('data-feedback-interface="mathematical-equation-guided"');
      expect(html).toContain('data-walkthrough-view="all"');
      expect(html).toContain("Equation system");
      expect(html).toContain("Final answer");
      expect(html).toContain('data-answer-review="mathematical-equation"');
      expect(html).not.toContain("solutionPath");
      expect(html).not.toContain('"kind"');
    });
  });

  describe.each(difficulties)("Figure Sequences / %s", (difficulty) => {
    it.each(samples)("renders verified sample %s", (sample) => {
      const question = generateValidatedFigureSequence({
        difficulty,
        maxAttempts: 5_000,
        seed: `core-explanation-audit-figure-${difficulty}-${sample}`,
        symbolCount: difficulty === "easy" ? 1 : difficulty === "medium" ? 3 : 4,
      });
      const html = renderToStaticMarkup(
        <FigureSequencePracticeFeedback
          correctAnswer={question.correctAnswer}
          initialView="all"
          initiallyOpen
          isCorrect
          selectedAnswer={question.correctAnswer}
          sequence={question.sequence}
          trace={{ rules: question.structuredData.rules }}
        />,
      );

      expect(html).toContain('data-feedback-interface="figure-sequence-guided"');
      expect(html).toContain('data-walkthrough-view="all"');
      expect(html).toContain("Rules found");
      expect(html).toContain("Predict missing matrix 2");
      expect(html).toContain('data-answer-comparison="figure-sequence"');
      expect(html).not.toContain("symbol-");
      expect(html).not.toContain("candidate-");
    });
  });

  describe.each(difficulties)("Latin Squares / %s", (difficulty) => {
    it.each(samples)("renders verified sample %s", (sample) => {
      const question = generateValidatedLatinSquare({
        difficulty,
        maxAttempts: 5_000,
        seed: `core-explanation-audit-latin-${difficulty}-${sample}`,
      });
      const html = renderToStaticMarkup(
        <LatinSquarePracticeFeedback
          correctAnswer={question.correctAnswer}
          data={question.structuredData}
          initialView="all"
          initiallyOpen
          isCorrect
          selectedAnswer={question.correctAnswer}
          trace={question.deductionTrace}
        />,
      );

      expect(html).toContain('data-feedback-interface="latin-square-guided"');
      expect(html).toContain('data-walkthrough-view="all"');
      expect(html).toContain("Missing from this row");
      expect(html).toContain("Missing from this column");
      expect(html).toContain("Cells used in this proof");
      expect(html).toContain("not needed for this proof");
      expect(html).toContain(`Correct answer: ${question.correctAnswer}`);
      expect(html).not.toContain("single_candidate");
      expect(html).not.toContain('"dependencies"');
    });
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PracticeQuestion } from "../../lib/practice/schemas";
import { NativePracticeResponse } from "./native-practice-response";

const symbols = ["A", "B", "C", "D", "E"] as const;
const latinQuestion: PracticeQuestion = {
  id: "latin", module: "core", questionType: "latin_square", topic: "Latin Squares",
  subtopic: null, difficulty: "medium", questionText: "Which letter?", passage: null,
  code: null, formula: null, tableData: null, imageUrl: null, estimatedTimeSeconds: 60,
  structuredData: {
    size: 5, symbols: [...symbols], target: { row: 0, column: 0 },
    grid: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => null)),
  },
  response: { kind: "single_choice", options: symbols.map((symbol) => ({ id: symbol, label: symbol, content: symbol })) },
  options: symbols.map((symbol) => ({ id: symbol, label: symbol, content: symbol })),
};

function renderLatin(optionId: string, correctAnswer?: string) {
  return renderToStaticMarkup(
    <NativePracticeResponse
      answer={{ kind: "single_choice", optionId }}
      correctAnswer={correctAnswer}
      disabled={false}
      onChange={() => undefined}
      question={latinQuestion}
    />,
  );
}

describe("native response rendering", () => {
  it("renders exactly one compact Latin-square interface and no generic MCQ list", () => {
    const html = renderLatin("C");
    expect(html.match(/data-response-interface="latin-square"/g)).toHaveLength(1);
    expect(html).not.toContain('data-response-interface="generic-single-choice"');
    expect(html).toContain("Select the target letter");
    expect(html).toContain('aria-label="C, selected"');
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  });

  it("replaces C with D as the sole controlled selection", () => {
    const html = renderLatin("D");
    expect(html).toContain('aria-label="D, selected"');
    expect(html).not.toContain('aria-label="C, selected"');
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
  });

  it("reveals correctness only when practice feedback is supplied", () => {
    expect(renderLatin("C")).not.toContain("correct answer");
    const feedback = renderLatin("C", "D");
    expect(feedback).toContain("C, your answer, incorrect");
    expect(feedback).toContain("D, correct answer");
  });

  it("keeps a normal four-option question on the generic MCQ interface", () => {
    const question: PracticeQuestion = {
      ...latinQuestion, id: "generic", module: "core", questionType: "mathematical_equation",
      structuredData: undefined,
      response: { kind: "single_choice", options: symbols.slice(0, 4).map((symbol) => ({ id: symbol, label: symbol, content: `Option ${symbol}` })) },
      options: symbols.slice(0, 4).map((symbol) => ({ id: symbol, label: symbol, content: `Option ${symbol}` })),
    };
    const html = renderToStaticMarkup(<NativePracticeResponse answer={null} disabled={false} onChange={() => undefined} question={question} />);
    expect(html).toContain('data-response-interface="generic-single-choice"');
    expect(html.match(/Option [A-D]/g)).toHaveLength(4);
  });
});

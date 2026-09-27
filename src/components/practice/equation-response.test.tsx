import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PracticeQuestion } from "../../lib/practice/schemas";
import { NativePracticeResponse, normalizeEquationInput } from "./native-practice-response";
import { PracticeAnswerFeedback } from "./practice-answer-feedback";
import { equationText } from "../questions/equation-renderer";

const question: PracticeQuestion = {
  id: "equation", module: "core", questionType: "mathematical_equation", topic: "Equations",
  subtopic: null, difficulty: "easy", questionText: "Find the values", passage: null,
  code: null, formula: null, tableData: null, imageUrl: null, estimatedTimeSeconds: 55,
  structuredData: {
    variables: ["A", "B"], domain: { minimum: 1, maximum: 20, integersOnly: true },
    equations: [
      { left: { kind: "variable", symbol: "A" }, right: { kind: "operation", operator: "multiply", left: { kind: "constant", value: 2 }, right: { kind: "variable", symbol: "B" } } },
      { left: { kind: "operation", operator: "multiply", left: { kind: "constant", value: 2 }, right: { kind: "variable", symbol: "B" } }, right: { kind: "constant", value: 12 } },
    ],
  },
  response: { kind: "symbol_assignment", symbols: ["A", "B"] }, options: [],
};

describe("mathematical-equation response UX", () => {
  it("starts with empty spinner-free numeric-keyboard fields and no correctness state", () => {
    const html = renderToStaticMarkup(<NativePracticeResponse answer={null} disabled={false} onChange={() => undefined} question={question} />);
    expect(html.match(/value=""/g)).toHaveLength(2);
    expect(html).toContain('type="text"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain("border-success");
    expect(html).not.toContain("border-error");
  });

  it("normalizes leading zeros and safely validates the official 1–20 integer domain", () => {
    expect(normalizeEquationInput("6")).toEqual({ raw: "6", value: 6, valid: true });
    expect(normalizeEquationInput("06")).toEqual({ raw: "6", value: 6, valid: true });
    expect(normalizeEquationInput("12")).toEqual({ raw: "12", value: 12, valid: true });
    expect(normalizeEquationInput("")).toEqual({ raw: "", value: null, valid: true });
    expect(normalizeEquationInput("0").value).toBeNull();
    expect(normalizeEquationInput("21").value).toBeNull();
    expect(normalizeEquationInput("1.5").value).toBeNull();
    expect(normalizeEquationInput("-2").value).toBeNull();
  });

  it("renders human-readable, per-variable feedback without response JSON", () => {
    const html = renderToStaticMarkup(<PracticeAnswerFeedback answer={{ kind: "symbol_assignment", values: { A: 6, B: 6 } }} correctAnswer={{ A: 12, B: 6 }} question={question} />);
    expect(html).toContain("1 of 2 values correct");
    expect(html).toContain("Variable A. Your answer 6. Correct answer 12. Incorrect.");
    expect(html).toContain("Variable B. Your answer 6. Correct answer 6. Correct.");
    expect(html).toContain('data-answer-review="mathematical-equation"');
    expect(html).not.toContain("symbol_assignment");
    expect(html).not.toContain("&quot;values&quot;");
    expect(html).not.toContain("{&quot;");
  });

  it("does not reveal correct values in the active response component", () => {
    const html = renderToStaticMarkup(<NativePracticeResponse answer={{ kind: "symbol_assignment", values: { A: 6 } }} disabled onChange={() => undefined} question={question} />);
    expect(html).not.toContain("A = 12");
    expect(html).not.toContain("Correct value");
    expect(html).not.toContain("border-success");
    expect(html).not.toContain("border-error");
  });

  it("marks every submitted letter independently while preserving entered values", () => {
    const threeLetterQuestion: PracticeQuestion = {
      ...question,
      structuredData: {
        ...(question.structuredData as NonNullable<PracticeQuestion["structuredData"]>),
        variables: ["A", "B", "C"],
      },
      response: { kind: "symbol_assignment", symbols: ["A", "B", "C"] },
    };
    const html = renderToStaticMarkup(
      <NativePracticeResponse
        answer={{ kind: "symbol_assignment", values: { A: 6, B: 6, C: 4 } }}
        correctAnswer={{ A: 6, B: 6, C: 5 }}
        disabled
        onChange={() => undefined}
        question={threeLetterQuestion}
      />,
    );

    expect(html.match(/data-answer-correctness="correct"/g)).toHaveLength(2);
    expect(html.match(/data-answer-correctness="incorrect"/g)).toHaveLength(1);
    expect(html.match(/border-success bg-success-container/g)).toHaveLength(2);
    expect(html.match(/border-error bg-error-container/g)).toHaveLength(1);
    expect(html).toContain("A answer is correct.");
    expect(html).toContain("B answer is correct.");
    expect(html).toContain("C answer is incorrect.");
    expect(html).toContain('aria-label="C value"');
    expect(html).toContain('value="4"');
    expect(html).not.toContain('value="5"');
    expect(html.match(/ disabled=""/g)).toHaveLength(3);
  });

  it("can retain the equation while removing redundant submitted inputs in review", () => {
    const html = renderToStaticMarkup(<NativePracticeResponse answer={{ kind: "symbol_assignment", values: { A: 6 } }} disabled hideAnswerInputs onChange={() => undefined} question={question} />);
    expect(html).toContain('aria-label="Equation system"');
    expect(html).not.toContain('data-response-interface="equation-variable-values"');
    expect(html).not.toContain('aria-label="A value"');
  });

  it("uses readable mathematical symbols and preserves compound precedence", () => {
    expect(equationText({
      left: {
        kind: "operation",
        operator: "subtract",
        left: {
          kind: "operation",
          operator: "add",
          left: { kind: "variable", symbol: "A" },
          right: { kind: "variable", symbol: "B" },
        },
        right: { kind: "variable", symbol: "C" },
      },
      right: { kind: "constant", value: 4 },
    })).toBe("A + B − C = 4");
  });
});

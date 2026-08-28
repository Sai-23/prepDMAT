import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { TestAttemptPayload, TestQuestion } from "@/lib/tests/schemas";

vi.mock("@/app/tests/actions", () => ({
  advanceTestSectionAction: vi.fn(),
  processTestClockAction: vi.fn(),
  saveTestResponseAction: vi.fn(),
  submitTestAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { TestRunner } from "./test-runner";

function mockQuestion(sectionId: string, sectionTitle: string, index: number): TestQuestion {
  return {
    id: `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    sectionId,
    sectionTitle,
    sectionPosition: index,
    module: "core",
    questionType: "latin_square",
    topic: "Latin Squares",
    subtopic: null,
    difficulty: "medium",
    questionText: `Question ${index}`,
    passage: null,
    code: null,
    formula: null,
    tableData: null,
    imageUrl: null,
    estimatedTimeSeconds: 60,
    structuredData: {
      grid: Array.from({ length: 5 }, () => ["A", "B", "C", "D", "E"]),
      target: { row: 0, column: 0 },
      symbols: ["A", "B", "C", "D", "E"],
    },
    response: { kind: "single_choice", options: [] },
    options: [],
  };
}

function attempt(sectionLengths: number[], currentSection = 0, currentQuestion = 0): TestAttemptPayload {
  const sections = sectionLengths.map((_, index) => ({
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    title: `Section ${index + 1}`,
    durationSeconds: 1_500,
    sortOrder: index + 1,
  }));
  const questions = sections.flatMap((section, sectionIndex) =>
    Array.from({ length: sectionLengths[sectionIndex] }, (_, index) =>
      mockQuestion(section.id, section.title, index + 1),
    ),
  );
  const activeQuestions = questions.filter((question) => question.sectionId === sections[currentSection].id);
  return {
    attemptId: "30000000-0000-4000-8000-000000000001",
    title: "Core Mock",
    sectionExpiresAt: "2030-01-01T00:25:00.000Z",
    serverNow: "2030-01-01T00:00:00.000Z",
    currentSectionId: sections[currentSection].id,
    currentQuestionId: activeQuestions[currentQuestion].id,
    sections,
    questions,
    initialResponses: [],
  };
}

describe("active Mock CTA and navigator rendering", () => {
  it("shows Next without Submit Test on a normal question", () => {
    const html = renderToStaticMarkup(<TestRunner attempt={attempt([10], 0, 3)} />);
    expect(html).toMatch(/>Next</);
    expect(html).not.toMatch(/>Submit Test</);
  });

  it("replaces Next with Submit Test on the true final question", () => {
    const html = renderToStaticMarkup(<TestRunner attempt={attempt([10], 0, 9)} />);
    expect(html).toMatch(/>Submit Test</);
    expect(html).not.toMatch(/>Next</);
  });

  it("ends only the current section when later sections remain", () => {
    const html = renderToStaticMarkup(<TestRunner attempt={attempt([10, 10], 0, 9)} />);
    expect(html).toContain("End Section &amp; Continue");
    expect(html).not.toMatch(/>Submit Test</);
  });

  it("renders all 20 navigator controls with explicit statuses", () => {
    const html = renderToStaticMarkup(<TestRunner attempt={attempt([20], 0, 0)} />);
    for (let index = 1; index <= 20; index += 1) {
      expect(html).toContain(`aria-label="Question ${index},`);
    }
    expect(html).toContain('aria-label="Question 1, current, unanswered"');
    expect(html).toContain('aria-label="Question 20, unanswered"');
  });
});

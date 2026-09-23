import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PracticeModulePerformance, PracticeSessionState } from "@/lib/practice/schemas";

import { PracticeExperience } from "./practice-experience";

const performance: PracticeModulePerformance[] = [
  {
    module: "figure_sequence",
    completedSessions: 2,
    accuracy: 60,
    lastPracticedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    module: "mathematical_equation",
    completedSessions: 0,
    accuracy: null,
    lastPracticedAt: null,
  },
  {
    module: "latin_square",
    completedSessions: 0,
    accuracy: null,
    lastPracticedAt: null,
  },
];

const activeSession: PracticeSessionState = {
  sessionId: "10000000-0000-4000-8000-000000000001",
  module: "mathematical_equation",
  difficulty: "medium",
  questionCount: 10,
  timingMode: "untimed",
  expiresAt: null,
  currentPosition: 2,
  correctCount: 1,
  incorrectCount: 0,
  totalTimeSeconds: 45,
  question: {
    id: "20000000-0000-4000-8000-000000000001",
    module: "core",
    questionType: "mathematical_equation",
    topic: "Mathematical Equations",
    subtopic: null,
    difficulty: "medium",
    questionText: "Solve the active equation.",
    passage: null,
    code: null,
    formula: null,
    tableData: null,
    imageUrl: null,
    estimatedTimeSeconds: 90,
    options: ["A", "B", "C", "D"].map((label) => ({ id: label, label, content: `Option ${label}` })),
    response: { kind: "single_choice", options: ["A", "B", "C", "D"].map((label) => ({ id: label, label, content: `Option ${label}` })) },
  },
  answer: null,
  feedback: null,
  targetPaceSeconds: 90,
};

describe("compact Practice configuration", () => {
  it("renders the three module choices without showing configuration prematurely", () => {
    const html = renderToStaticMarkup(
      <PracticeExperience
        initialSession={null}
        libraryIntro={<div>What do you want to practice?<span>Build skills with focused practice sessions.</span><span>Core modules</span></div>}
        performance={performance}
      />,
    );

    expect(html).toContain("What do you want to practice?");
    expect(html).toContain("Core modules");
    expect(html).toContain("Figure Sequences");
    expect(html).toContain("Mathematical Equations");
    expect(html).toContain("Latin Squares");
    expect(html).not.toContain("Configure your session");
  });

  it("renders only the active workspace when resuming a session", () => {
    const html = renderToStaticMarkup(
      <PracticeExperience
        initialSession={activeSession}
        libraryIntro={<div>What do you want to practice?<span>Build skills with focused practice sessions.</span><span>Core modules</span></div>}
        performance={performance}
      />,
    );

    expect(html).not.toContain("What do you want to practice?");
    expect(html).not.toContain("Build skills with focused practice sessions.");
    expect(html).not.toContain("Core modules");
    expect(html).toContain("Question 2 of 10");
    expect(html).toContain("Solve the active equation.");
    expect(html).toContain("data-focused-assessment");
    expect(html).toContain("data-assessment-scroll-region");
    expect(html).toContain("Check answer");
    expect(html).toContain("Exit");
  });

  it("reflects module, difficulty, count, timing, and recent accuracy in live state", () => {
    const html = renderToStaticMarkup(
      <PracticeExperience
        initialConfig={{
          module: "figure_sequence",
          difficulty: "medium",
          questionCount: 10,
          timingMode: "untimed",
        }}
        initialSession={null}
        performance={performance}
      />,
    );

    expect(html).toContain("Configure your session");
    expect(html).toContain("Recent accuracy:");
    expect(html).toContain("60%");
    expect(html).toContain("Figure Sequences · Medium · 10 questions · Untimed learning");
    expect(html).toContain("Start practice");
    expect(html.match(/<fieldset/g)).toHaveLength(3);
    expect(html).toContain("<legend");
    expect(html).toContain("Difficulty");
    expect(html).toContain("Questions");
    expect(html).toContain("Timing");
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(4);
  });

  it("renders the supported hard, twenty-question, timed selection without changing behavior", () => {
    const html = renderToStaticMarkup(
      <PracticeExperience
        initialConfig={{
          module: "mathematical_equation",
          difficulty: "hard",
          questionCount: 20,
          timingMode: "timed",
        }}
        initialSession={null}
        performance={performance}
      />,
    );

    expect(html).toContain("Mathematical Equations · Hard · 20 questions · Exam pace");
    expect(html).toContain("Official 25-minute pace");
  });
});

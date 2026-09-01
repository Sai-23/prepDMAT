import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PracticeModulePerformance } from "@/lib/practice/schemas";

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

describe("compact Practice configuration", () => {
  it("renders the three module choices without showing configuration prematurely", () => {
    const html = renderToStaticMarkup(
      <PracticeExperience initialSession={null} performance={performance} />,
    );

    expect(html).toContain("Figure Sequences");
    expect(html).toContain("Mathematical Equations");
    expect(html).toContain("Latin Squares");
    expect(html).not.toContain("Configure your session");
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

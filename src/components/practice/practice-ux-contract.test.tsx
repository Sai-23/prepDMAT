import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("practice UX contract", () => {
  const experience = source("src/components/practice/practice-experience.tsx");
  const page = source("src/app/practice/page.tsx");

  it("keeps the Practice heading and removes the redundant introductory paragraph", () => {
    expect(page).toContain('title="Practice"');
    expect(page).not.toContain("Choose a Core module and configure a focused learning session");
    expect(page).not.toContain("Practice gives immediate explanations");
  });

  it("presents all three module-first cards and configuration choices", () => {
    ["Figure Sequences", "Mathematical Equations", "Latin Squares"].forEach((label) => expect(experience).toContain(label));
    expect(experience).toContain('["easy", "medium", "hard", "mixed"]');
    expect(experience).toContain('["5", "10", "20"]');
    expect(experience).toContain("PRACTICE_TIMING_MODES");
    expect(experience).toContain("CoreModuleMotif");
    expect(experience).toContain("lg:grid-cols-3");
  });

  it("compresses configuration into responsive horizontal groups without changing selections", () => {
    expect(experience.match(/<fieldset/g)).toHaveLength(2);
    expect(experience).toContain('<legend className="px-1 text-sm font-semibold text-on-surface">Timing</legend>');
    expect(experience).toContain("md:grid-cols-2");
    expect(experience).toContain("md:col-span-2 lg:col-span-1");
    expect(experience).toContain("lg:grid-cols-[1.3fr_0.8fr_1.4fr]");
    expect(experience).toContain('setDifficulty(value as PracticeConfig["difficulty"])');
    expect(experience).toContain("setQuestionCount(Number(value) as 5 | 10 | 20)");
    expect(experience).toContain("setTimingMode(mode.value)");
    expect(experience).toContain("{ module: selectedModule, difficulty, questionCount, timingMode");
    expect(experience).toContain("selectionSummary");
    expect(experience).toContain("Recent accuracy:");
    expect(experience).toContain("Start practice");
  });

  it("keeps every landing choice keyboard-accessible with clear selected state", () => {
    expect(experience).toContain("aria-pressed={selected}");
    expect(experience).toContain("aria-pressed={timingMode === mode.value}");
    expect(experience).toContain("aria-pressed={selected === option}");
    expect(experience).toContain("focus-visible:ring-primary");
    expect(experience).toContain("min-h-11");
  });

  it("requires explicit answer checking and locks native inputs for feedback", () => {
    expect(experience).toContain("Check answer");
    expect(experience).toContain("disabled={Boolean(feedback) || isPending}");
    expect(experience).toContain('event.key !== "Enter"');
  });

  it("supports progress, timing, exit, resume feedback, completion, and review", () => {
    expect(experience).toContain('role="progressbar"');
    expect(experience).toContain("session.expiresAt");
    expect(experience).toContain("abandonPracticeAction");
    expect(experience).toContain("initialSession?.feedback");
    expect(experience).toContain("Finish practice");
    expect(experience).toContain("Review every answer");
  });

  it("provides responsive layouts and non-disruptive error/timer semantics", () => {
    expect(experience).toContain("lg:grid-cols-3");
    expect(experience).toContain("sm:grid-cols-2");
    expect(experience).toContain("ActionError");
    expect(experience).toContain('aria-live="polite"');
    expect(experience).toContain('role="timer"');
    expect(experience).not.toContain('aria-live="polite"\n      className={remaining');
    expect(experience).toContain("AssessmentActionZone");
  });

  it("isolates the one-second timer and defers feedback implementations", () => {
    expect(experience).toContain("const PracticeTimer = memo");
    expect(experience).toContain('data-testid="isolated-practice-timer"');
    expect(experience.indexOf("const [remaining, setRemaining]")).toBeLessThan(
      experience.indexOf("export function PracticeExperience"),
    );
    expect(experience.match(/dynamic\(/g)).toHaveLength(3);
  });
});

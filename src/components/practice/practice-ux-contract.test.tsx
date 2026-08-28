import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("practice UX contract", () => {
  const experience = source("src/components/practice/practice-experience.tsx");

  it("presents all three module-first cards and configuration choices", () => {
    ["Figure Sequences", "Mathematical Equations", "Latin Squares"].forEach((label) => expect(experience).toContain(label));
    expect(experience).toContain('["easy", "medium", "hard", "mixed"]');
    expect(experience).toContain('["5", "10", "20"]');
    expect(experience).toContain("PRACTICE_TIMING_MODES");
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

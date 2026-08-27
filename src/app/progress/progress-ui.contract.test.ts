import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "src/app/progress/page.tsx"), "utf8");

describe("student progress primary-view contract", () => {
  it("keeps the primary view in overall, insight, then next-action order", () => {
    const overall = page.indexOf('id="overall-progress"');
    const strengths = page.indexOf('id="strengths"');
    const nextAction = page.indexOf('id="next-best-practice"');
    expect(overall).toBeGreaterThan(0);
    expect(strengths).toBeGreaterThan(overall);
    expect(nextAction).toBeGreaterThan(strengths);
    expect(page).toContain("Strongest area");
    expect(page).toContain("Needs work");
  });

  it("surfaces one recommendation and puts secondary analytics behind disclosure", () => {
    expect(page).toContain("progress.recommendations[0]");
    expect(page).not.toContain("progress.recommendations.map");
    expect(page).toContain("View detailed breakdown");
    expect(page).toContain("<details");
    expect(page.lastIndexOf("<DetailedBreakdown")).toBeGreaterThan(page.indexOf('id="next-best-practice"'));
  });

  it("avoids empty metric walls for new and low-data students", () => {
    expect(page).toContain("Complete your first few practice sessions to see meaningful progress.");
    expect(page).toContain("module.attemptCount > 0");
    expect(page).toContain("Complete a few more sessions in another module");
    expect(page).not.toContain('"0%"');
  });

  it("keeps internal analytics labels out of student-facing copy", () => {
    ["weighted_elimination", "boundary_cycle", "hidden_single_row", "confidenceScore", "weaknessScore"]
      .forEach((term) => expect(page).not.toContain(term));
  });
});

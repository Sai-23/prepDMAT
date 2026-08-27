import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CoreFormatSamples } from "./core-format-samples";

const examPage = readFileSync(resolve(process.cwd(), "src/app/exam-format/page.tsx"), "utf8");
const practice = readFileSync(resolve(process.cwd(), "src/components/practice/practice-experience.tsx"), "utf8");

describe("Student Experience 2.0 Core format fidelity", () => {
  it("states the official Core counts and timing without a competing stale format", () => {
    expect(examPage).toContain("DMAT_CURRENT_CORE_PROTOCOL");
    expect(examPage).toContain("approximately 90 minutes including instructions");
    expect(examPage).toContain("20 questions each");
    expect(examPage).toContain("25 minutes each");
    expect(examPage).toContain("General Academic Module");
    expect(examPage).not.toContain("Computer Science Module");
  });

  it("reuses all three real Practice response interfaces with static local state", () => {
    const html = renderToStaticMarkup(<CoreFormatSamples />);
    expect(html).toContain("Visible matrix 1");
    expect(html).toContain("Visible matrix 4");
    expect(html).toContain("Candidates for missing matrix 1");
    expect(html).toContain("Candidates for missing matrix 2");
    expect(html).toContain('data-response-interface="equation-variable-values"');
    expect(html).toContain('aria-label="A value"');
    expect(html).toContain('aria-label="B value"');
    expect(html).toContain('data-response-interface="latin-square"');
    expect(html).not.toContain("correct answer");
  });

  it("keeps Practice module-first and reveals setup only after selection", () => {
    expect(practice).toContain("What do you want to practise?");
    expect(practice).toContain("{selectedModule ? <Card>");
    expect(practice).not.toContain("No completed sessions yet");
    expect(practice).not.toContain("Generating validated questions");
  });
});

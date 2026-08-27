import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const studentFiles = [
  "src/app/page.tsx",
  "src/app/exam-format/page.tsx",
  "src/app/practice/page.tsx",
  "src/app/tests/page.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/results/page.tsx",
  "src/app/progress/page.tsx",
  "src/components/practice/practice-experience.tsx",
  "src/components/results/mock-analysis-view.tsx",
  "src/components/onboarding/onboarding-experience.tsx",
].map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");

describe("student-facing language contract", () => {
  it("keeps implementation language out of the primary student journey", () => {
    const forbidden = [
      "SVG-driven", "deterministic", "validated questions", "constraint logic", "permutation logic",
      "structured objects", "canonical trace", "fingerprint", "protocol version", "production enabled",
      "Phase 1", "Phase 8", "immutable submitted-attempt snapshot",
    ];
    forbidden.forEach((term) => expect(studentFiles.toLowerCase()).not.toContain(term.toLowerCase()));
  });
});

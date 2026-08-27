import { describe, expect, it } from "vitest";

import { mathematicalEquationGenerator } from "./generator";
import {
  inspectMathematicalEquationStyle,
  MATHEMATICAL_EQUATION_STYLE_POLICY,
  mathematicalEquationStyleIssues,
} from "./style";

describe("mathematical-equation style policy", () => {
  it("enforces strict production fidelity at the construction boundary", () => {
    expect(MATHEMATICAL_EQUATION_STYLE_POLICY.strictDmatFidelity).toBe(true);
    expect(MATHEMATICAL_EQUATION_STYLE_POLICY.preferredVisibleConstantMax).toBe(20);
    expect(MATHEMATICAL_EQUATION_STYLE_POLICY.hardVisibleConstantLimit).toBe(20);
    const questions = Array.from({ length: 300 }, (_, seed) =>
      mathematicalEquationGenerator.generate({ seed: `style-${seed}`, difficulty: "hard" }, 1),
    );
    expect(questions.every((question) => mathematicalEquationStyleIssues(question).length === 0)).toBe(true);
    expect(questions.every((question) => {
      const metrics = inspectMathematicalEquationStyle(question);
      return metrics.visibleConstants.every((value) => value >= 1 && value <= 20) &&
        metrics.preferredConstantExceedanceCount === 0;
    })).toBe(true);
  }, 30_000);

  it("flags negative displayed constants", () => {
    const candidate = mathematicalEquationGenerator.generate({ seed: "negative-style", difficulty: "easy" }, 1);
    candidate.structuredData.equations[0].right = { kind: "constant", value: -1 };
    expect(mathematicalEquationStyleIssues(candidate).map((item) => item.code)).toContain("VISIBLE_CONSTANT_OUT_OF_RANGE");
  });
});

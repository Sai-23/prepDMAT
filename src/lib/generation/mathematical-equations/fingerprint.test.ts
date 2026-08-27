import { describe, expect, it } from "vitest";

import {
  fingerprintMathematicalEquation,
  mathematicalEquationStructuralProfile,
  mathematicalEquationStructuralSignature,
  MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS,
} from "./fingerprint";
import { calculateStructuralSimilarity } from "../novelty";
import { mathematicalEquationGenerator } from "./generator";
import type { MathematicalExpression } from "./types";

function incrementFirstConstant(expression: MathematicalExpression): boolean {
  if (expression.kind === "constant") { expression.value += 1; return true; }
  if (expression.kind === "variable") return false;
  return incrementFirstConstant(expression.left) || incrementFirstConstant(expression.right);
}

describe("mathematical-equation fingerprints", () => {
  it("ignores equation display order and wording", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "fingerprint", difficulty: "hard" },
      1,
    );
    const reordered = structuredClone(candidate);
    reordered.structuredData.equations.reverse();
    reordered.structuredData.equations.forEach((equation) => {
      [equation.left, equation.right] = [equation.right, equation.left];
    });
    reordered.presentation.prompt = "Different display wording";
    reordered.explanation = "Different explanation wording";
    expect(fingerprintMathematicalEquation(reordered)).toBe(
      fingerprintMathematicalEquation(candidate),
    );
  });

  it("separates genuinely different graph architectures", () => {
    const findFamily = (family: "chain" | "triangle") => {
      for (let seed = 0; seed < 200; seed += 1) {
        const candidate = mathematicalEquationGenerator.generate({ seed: `graph-v2-${seed}`, difficulty: "medium" }, 1);
        if (candidate.structuredData.dependencyModel.family === family) return candidate;
      }
      throw new Error(`Unable to find ${family} sample.`);
    };
    const similarity = calculateStructuralSimilarity(
      mathematicalEquationStructuralProfile(findFamily("chain")),
      mathematicalEquationStructuralProfile(findFamily("triangle")),
      MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS,
    );
    expect(similarity).toBeLessThan(0.8);
  });

  it("changes semantic identity but not reasoning structure when only constants change", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "fingerprint-change", difficulty: "easy" },
      1,
    );
    const changed = structuredClone(candidate);
    const equation = changed.structuredData.equations[0];
    expect(
      incrementFirstConstant(equation.left) || incrementFirstConstant(equation.right),
    ).toBe(true);
    expect(fingerprintMathematicalEquation(changed)).not.toBe(
      fingerprintMathematicalEquation(candidate),
    );
    expect(mathematicalEquationStructuralSignature(changed)).toBe(
      mathematicalEquationStructuralSignature(candidate),
    );
  });

  it("recognizes sum-and-difference systems with different numbers as one structure", () => {
    const first = mathematicalEquationGenerator.generate(
      { seed: "explicit-structural-equivalence", difficulty: "easy" },
      1,
    );
    const second = structuredClone(first);
    const system = (sum: number, difference: number) => [
      {
        left: { kind: "operation" as const, operator: "add" as const, left: { kind: "variable" as const, symbol: "A" }, right: { kind: "variable" as const, symbol: "B" } },
        right: { kind: "constant" as const, value: sum },
      },
      {
        left: { kind: "operation" as const, operator: "subtract" as const, left: { kind: "variable" as const, symbol: "A" }, right: { kind: "variable" as const, symbol: "B" } },
        right: { kind: "constant" as const, value: difference },
      },
    ];
    first.structuredData.equations = system(12, 4);
    second.structuredData.equations = system(14, 6);
    expect(mathematicalEquationStructuralSignature(first)).toBe(
      mathematicalEquationStructuralSignature(second),
    );
    expect(fingerprintMathematicalEquation(first)).not.toBe(fingerprintMathematicalEquation(second));
  });

  it("retains the normalized solve path in the structural signature", () => {
    const candidate = mathematicalEquationGenerator.generate(
      { seed: "fingerprint-path", difficulty: "hard" },
      1,
    );
    const changed = structuredClone(candidate);
    changed.solutionPath[1].reasoning = "combine_equations";
    expect(mathematicalEquationStructuralSignature(changed)).not.toBe(
      mathematicalEquationStructuralSignature(candidate),
    );
  });
});

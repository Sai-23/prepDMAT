import { describe, expect, it } from "vitest";

import { createFingerprint } from "../fingerprint";
import {
  fingerprintMathematicalEquation,
  mathematicalEquationStructuralSignature,
} from "./fingerprint";
import { mathematicalEquationGenerator } from "./generator";

const STRICT_FIDELITY_PROTOCOL_BASELINE = [
  { seed: "protocol-regression-easy", difficulty: "easy", semantic: "mathematical-equation:v1:823c9ed147e551f5", structural: "mathematical-equation-structure-v3:v1:766752d77c24d44b", candidate: "mathematical-equation-regression-candidate:v1:58c4040d30aa42b1" },
  { seed: "protocol-regression-medium", difficulty: "medium", semantic: "mathematical-equation:v1:86582aa5d8dfdd41", structural: "mathematical-equation-structure-v3:v1:a6f37c4c93b53350", candidate: "mathematical-equation-regression-candidate:v1:eaca9c2b0b657e0f" },
  { seed: "protocol-regression-hard", difficulty: "hard", semantic: "mathematical-equation:v1:61b5791f263d45cb", structural: "mathematical-equation-structure-v3:v1:f6edbe0261174b66", candidate: "mathematical-equation-regression-candidate:v1:cf2d764da1f334d9" },
  { seed: "shared-evidence-01", difficulty: "easy", semantic: "mathematical-equation:v1:d072386ee62791ea", structural: "mathematical-equation-structure-v3:v1:1178f6b02b9e71b4", candidate: "mathematical-equation-regression-candidate:v1:3ec6f276ac3909e2" },
  { seed: "shared-evidence-02", difficulty: "medium", semantic: "mathematical-equation:v1:f2b2998d811455f9", structural: "mathematical-equation-structure-v3:v1:a0e9e11fdee2bda3", candidate: "mathematical-equation-regression-candidate:v1:57e81a7b319f307f" },
  { seed: "shared-evidence-03", difficulty: "hard", semantic: "mathematical-equation:v1:2324f6d409065140", structural: "mathematical-equation-structure-v3:v1:13563a250f191d09", candidate: "mathematical-equation-regression-candidate:v1:11e06bb158fcf3cd" },
] as const;

describe("Mathematical Equation protocol-infrastructure regression", () => {
  it("keeps strict-fidelity outputs stable under the shared protocol and fingerprint infrastructure", () => {
    const actual = STRICT_FIDELITY_PROTOCOL_BASELINE.map((baseline) => {
      const candidate = mathematicalEquationGenerator.generate({
        seed: baseline.seed,
        difficulty: baseline.difficulty,
      }, 1);
      return {
        seed: baseline.seed,
        difficulty: baseline.difficulty,
        semantic: fingerprintMathematicalEquation(candidate),
        structural: mathematicalEquationStructuralSignature(candidate),
        candidate: createFingerprint("mathematical-equation-regression-candidate", candidate),
      };
    });
    expect(actual).toEqual(STRICT_FIDELITY_PROTOCOL_BASELINE);
  });
});

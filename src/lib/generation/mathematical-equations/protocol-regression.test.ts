import { describe, expect, it } from "vitest";

import { createFingerprint } from "../fingerprint";
import {
  fingerprintMathematicalEquation,
  mathematicalEquationStructuralSignature,
} from "./fingerprint";
import { mathematicalEquationGenerator } from "./generator";

const STRICT_FIDELITY_PROTOCOL_BASELINE = [
  { seed: "protocol-regression-easy", difficulty: "easy", semantic: "mathematical-equation:v1:9e3c3d5b5235ae5f", structural: "mathematical-equation-structure-v2:v1:58a15e1a0cca3306", candidate: "mathematical-equation-regression-candidate:v1:fd06fabf2b2c5143" },
  { seed: "protocol-regression-medium", difficulty: "medium", semantic: "mathematical-equation:v1:74df16ff76775283", structural: "mathematical-equation-structure-v2:v1:a5268d1494b293c0", candidate: "mathematical-equation-regression-candidate:v1:a8ee21b27a5cd8a6" },
  { seed: "protocol-regression-hard", difficulty: "hard", semantic: "mathematical-equation:v1:ce7c69fe840e81e2", structural: "mathematical-equation-structure-v2:v1:2cc4a7dadc99f0b6", candidate: "mathematical-equation-regression-candidate:v1:c92567db4502933f" },
  { seed: "shared-evidence-01", difficulty: "easy", semantic: "mathematical-equation:v1:dae5667ab92f9a96", structural: "mathematical-equation-structure-v2:v1:269b2fa19e95f1bd", candidate: "mathematical-equation-regression-candidate:v1:e54444e6fefbd33a" },
  { seed: "shared-evidence-02", difficulty: "medium", semantic: "mathematical-equation:v1:0da3e0c25ebb233e", structural: "mathematical-equation-structure-v2:v1:c252714e8ca49632", candidate: "mathematical-equation-regression-candidate:v1:81fe0f0917290dd5" },
  { seed: "shared-evidence-03", difficulty: "hard", semantic: "mathematical-equation:v1:99dcae2af2f6f73e", structural: "mathematical-equation-structure-v2:v1:726b1718021adc34", candidate: "mathematical-equation-regression-candidate:v1:494a0e781d113024" },
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

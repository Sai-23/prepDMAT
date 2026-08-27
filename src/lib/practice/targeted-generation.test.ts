import { describe, expect, it } from "vitest";

import { mapQuestionToSkills, type CoreSkillId } from "@/lib/progress/skills";

import { generatePracticeManifest } from "./generation";

describe("targeted practice orchestration", () => {
  const cases = [
    ["figure_sequence", "figure_rotation"],
    ["mathematical_equation", "equation_chains"],
    ["latin_square", "latin_row_column"],
  ] as const;

  it.each(cases)("keeps %s targeting inside normal validated generation", (module, focus) => {
    const items = generatePracticeManifest({ module, difficulty: "medium", questionCount: 5, masterSeed: `target/${focus}`, focusSkills: [focus] });
    expect(new Set(items.map((item) => item.fingerprint)).size).toBe(5);
    expect(items.every((item) => item.validator_version && item.structural_profile)).toBe(true);
    const coverage = items.filter((item) => {
      const privateSnapshot = item.private_snapshot as { explanationTrace?: unknown };
      return mapQuestionToSkills({
        module,
        structuralProfile: item.structural_profile,
        publicSnapshot: item.public_snapshot,
        explanationTrace: privateSnapshot.explanationTrace,
      }).includes(focus as CoreSkillId);
    }).length;
    expect(coverage).toBeGreaterThanOrEqual(4);
  }, 60_000);

  it("does not replay a fingerprint from recent practice history", () => {
    const first = generatePracticeManifest({ module: "mathematical_equation", difficulty: "medium", questionCount: 5, masterSeed: "repeat-seed" });
    const next = generatePracticeManifest({
      module: "mathematical_equation", difficulty: "medium", questionCount: 5, masterSeed: "repeat-seed",
      blockedFingerprints: first.map((item) => item.fingerprint),
      recentProfiles: first.map((item) => item.structural_profile),
    });
    expect(next.every((item) => !first.some((previous) => previous.fingerprint === item.fingerprint))).toBe(true);
  }, 60_000);
});

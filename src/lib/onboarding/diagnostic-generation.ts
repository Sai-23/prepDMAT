import "server-only";

import type { StructuralProfile } from "@/lib/generation/novelty";
import {
  generatePracticeManifest,
  type PracticeItemManifest,
} from "@/lib/practice/generation";
import type { PracticeModule } from "@/lib/practice/schemas";

export const DIAGNOSTIC_MODULES: readonly PracticeModule[] = [
  "figure_sequence",
  "mathematical_equation",
  "latin_square",
];
export const DIAGNOSTIC_QUESTIONS_PER_MODULE = 5;
export const DIAGNOSTIC_QUESTION_COUNT = 15;

export function generateCoreDiagnosticManifest(input: {
  masterSeed: string;
  blockedFingerprints?: readonly string[];
  recentProfiles?: readonly StructuralProfile[];
  createId?: () => string;
}): PracticeItemManifest[] {
  const fingerprints = [...(input.blockedFingerprints ?? [])];
  const profiles = [...(input.recentProfiles ?? [])];
  const manifest: PracticeItemManifest[] = [];

  DIAGNOSTIC_MODULES.forEach((questionModule) => {
    const generated = generatePracticeManifest({
      module: questionModule,
      difficulty: "mixed",
      questionCount: DIAGNOSTIC_QUESTIONS_PER_MODULE,
      masterSeed: `${input.masterSeed}/${questionModule}`,
      blockedFingerprints: fingerprints,
      recentProfiles: profiles,
      createId: input.createId,
    });
    generated.forEach((item) => {
      fingerprints.push(item.fingerprint);
      profiles.push(item.structural_profile);
      manifest.push({ ...item, position: manifest.length + 1 });
    });
  });

  return manifest;
}

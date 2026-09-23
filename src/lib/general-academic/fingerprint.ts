import { createFingerprint } from "@/lib/generation/fingerprint";

import { normalizeFingerprintText } from "./normalization";
import type { CanonicalGeneralAcademicPack } from "./schemas";

export function createGeneralAcademicContentFingerprint(pack: CanonicalGeneralAcademicPack) {
  return createFingerprint("general-academic-pack", {
    stimulus: normalizeFingerprintText(pack.stimulus.text),
    questions: pack.questions.map((question) => ({
      prompt: normalizeFingerprintText(question.prompt),
      options: question.options.map((option) => normalizeFingerprintText(option.text)),
    })),
  });
}

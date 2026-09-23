"use server";

import { requireRole } from "@/lib/auth/guards";
import { generateGeneralAcademicPack, type GeneralAcademicAIGenerationResult } from "@/lib/general-academic/ai/generation";
import { generalAcademicGenerationConfigSchema } from "@/lib/general-academic/ai/generation-config";
import { getGamGenerationProviderStatus } from "@/lib/general-academic/ai/router";
import { createGeneralAcademicContentFingerprint } from "@/lib/general-academic/fingerprint";
import { findGeneralAcademicPacksByFingerprintForAdmin } from "@/lib/general-academic/persistence";
import {
  enforceSecurityRateLimit,
  RateLimitExceededError,
  SecurityControlUnavailableError,
} from "@/lib/security/rate-limit";

export type GeneralAcademicGenerationActionResult =
  | (Extract<GeneralAcademicAIGenerationResult, { ok: true }> & {
      duplicateTitles: string[];
      duplicateCheckUnavailable: boolean;
    })
  | Extract<GeneralAcademicAIGenerationResult, { ok: false }>;

export async function generateGeneralAcademicWithAIAction(
  input: unknown,
): Promise<GeneralAcademicGenerationActionResult> {
  const { user } = await requireRole(["admin"]);
  const config = generalAcademicGenerationConfigSchema.safeParse(input);
  if (!config.success) {
    return {
      ok: false,
      error: {
        code: "CANONICAL_VALIDATION",
        message: "Check the generation settings and try again.",
        retryable: false,
      },
    };
  }

  if (!getGamGenerationProviderStatus().configured) {
    return {
      ok: false,
      error: {
        code: "AI_NOT_CONFIGURED",
        message: "AI generation is not configured.",
        retryable: false,
      },
    };
  }

  try {
    await enforceSecurityRateLimit("generation:general-academic", { userId: user.id });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return {
        ok: false,
        error: {
          code: "ADMIN_RATE_LIMIT",
          message: `Admin generation limit reached. Try again in about ${Math.ceil(error.retryAfterSeconds / 60)} minute(s), or use JSON Import.`,
          retryable: true,
        },
      };
    }
    if (error instanceof SecurityControlUnavailableError) {
      return {
        ok: false,
        error: {
          code: "SECURITY_CONTROL_UNAVAILABLE",
          message: "Generation is temporarily unavailable because its security control could not be verified.",
          retryable: true,
        },
      };
    }
    return {
      ok: false,
      error: { code: "GATEWAY_UNKNOWN", message: "Generation could not start safely.", retryable: true },
    };
  }

  const generated = await generateGeneralAcademicPack(config.data);
  if (!generated.ok) return generated;

  let duplicateTitles: string[] = [];
  let duplicateCheckUnavailable = false;
  try {
    const fingerprint = createGeneralAcademicContentFingerprint(generated.pack);
    const duplicates = await findGeneralAcademicPacksByFingerprintForAdmin(fingerprint, user.id);
    duplicateTitles = duplicates.map((item) => item.title);
  } catch {
    duplicateCheckUnavailable = true;
  }

  return { ...generated, duplicateTitles, duplicateCheckUnavailable };
}

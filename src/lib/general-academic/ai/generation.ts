import "server-only";

import { parseGeneralAcademicPackJson } from "../importer";
import type { CanonicalGeneralAcademicPack } from "../schemas";
import type { GeneralAcademicValidationFinding } from "../validation";
import { validateGeneralAcademicPack } from "../validation";
import type { GeneralAcademicGenerationConfig } from "./generation-config";
import {
  generateGamPackWithProvider,
} from "./router";
import {
  GamGenerationProviderError,
  type GamGenerationProviderErrorCode,
  type GamGenerationProviderRawResult,
  type GamGenerationUsage,
} from "./types";

export type GeneralAcademicAIGenerationResult =
  | {
      ok: true;
      pack: CanonicalGeneralAcademicPack;
      validation: { structural: "valid"; warnings: GeneralAcademicValidationFinding[] };
      usage: GamGenerationUsage | null;
      generationMeta: { provider: "omniroute"; route: string; generatedAt: string; generationId: string };
    }
  | {
      ok: false;
      error: {
        code: GamGenerationProviderErrorCode | "ADMIN_RATE_LIMIT" | "SECURITY_CONTROL_UNAVAILABLE" | "CANONICAL_VALIDATION";
        message: string;
        retryable: boolean;
      };
    };

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function normalizeGeneratedPackProvenance(raw: unknown, generation: GamGenerationProviderRawResult) {
  return {
    ...record(raw),
    origin: "external_ai",
    sourceMeta: {
      provider: "omniroute",
      model: generation.route,
      generatedAt: generation.generatedAt,
      externalReference: null,
      generationId: generation.generationId,
    },
    review: { status: "draft", notes: null },
  };
}

export function processGeneralAcademicGenerationResult(
  config: GeneralAcademicGenerationConfig,
  generation: GamGenerationProviderRawResult,
): GeneralAcademicAIGenerationResult {
  const imported = parseGeneralAcademicPackJson(normalizeGeneratedPackProvenance(generation.output, generation));
  if (!imported.ok) {
    return { ok: false, error: { code: "CANONICAL_VALIDATION", message: "Generated content did not pass PrepDMAT validation.", retryable: true } };
  }
  const validation = validateGeneralAcademicPack(imported.pack);
  if (!validation.valid
    || imported.pack.domain !== config.domain
    || imported.pack.difficulty !== config.packDifficulty
    || imported.pack.questions.length !== config.questionCount) {
    return { ok: false, error: { code: "CANONICAL_VALIDATION", message: "Generated content did not match the requested canonical configuration.", retryable: true } };
  }
  return {
    ok: true,
    pack: validation.pack,
    validation: { structural: "valid", warnings: imported.warnings },
    usage: generation.usage,
    generationMeta: {
      provider: "omniroute",
      route: generation.route,
      generatedAt: generation.generatedAt,
      generationId: generation.generationId,
    },
  };
}

export async function generateGeneralAcademicPack(
  config: GeneralAcademicGenerationConfig,
): Promise<GeneralAcademicAIGenerationResult> {
  try {
    const generation = await generateGamPackWithProvider(config);
    return processGeneralAcademicGenerationResult(config, generation);
  } catch (error) {
    const safeError = error instanceof GamGenerationProviderError
      ? error
      : new GamGenerationProviderError("GATEWAY_UNKNOWN", "AI generation failed safely. Try again or use JSON Import.", true);
    return { ok: false, error: { code: safeError.code, message: safeError.message, retryable: safeError.retryable } };
  }
}

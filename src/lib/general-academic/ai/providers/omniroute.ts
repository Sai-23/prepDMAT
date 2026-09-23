import "server-only";

import OpenAI from "openai";

import { getEnv } from "@/lib/validators/env";

import type { GeneralAcademicGenerationConfig } from "../generation-config";
import { buildGeneralAcademicGenerationInput, buildGeneralAcademicGenerationInstructions } from "../prompt";
import { getGeneralAcademicStructuredTextFormat } from "../structured-output";
import {
  GamGenerationProviderError,
  type GamGenerationProviderRawResult,
  type GamGenerationProviderStatus,
  type GamGenerationUsage,
} from "../types";

type OmniRouteRequest = {
  model: string;
  instructions: string;
  input: string;
  store: false;
  max_output_tokens: number;
  text: { format: ReturnType<typeof getGeneralAcademicStructuredTextFormat> };
};

type OmniRouteRequestExecutor = (request: OmniRouteRequest) => Promise<unknown>;

type OmniRouteAdapterDependencies = {
  execute?: OmniRouteRequestExecutor;
  now?: () => Date;
  status?: GamGenerationProviderStatus;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function errorCode(error: unknown) {
  if (!(error instanceof OpenAI.APIError)) return null;
  const directCode = typeof error.code === "string" ? error.code : null;
  if (directCode) return directCode.toLowerCase();
  const body = record(error.error);
  return typeof body?.code === "string" ? body.code.toLowerCase() : null;
}

function responseRefusal(response: Record<string, unknown>) {
  if (!Array.isArray(response.output)) return false;
  return response.output.some((output) => {
    const outputRecord = record(output);
    if (!outputRecord || !Array.isArray(outputRecord.content)) return false;
    return outputRecord.content.some((content) => record(content)?.type === "refusal");
  });
}

function responseUsage(value: unknown): GamGenerationUsage | null {
  const usage = record(value);
  if (!usage) return null;
  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const totalTokens = usage.total_tokens;
  return typeof inputTokens === "number" && typeof outputTokens === "number" && typeof totalTokens === "number"
    ? { inputTokens, outputTokens, totalTokens }
    : null;
}

export function getOmniRouteGamGenerationStatus(): GamGenerationProviderStatus {
  const env = getEnv();
  return {
    configured: Boolean(env.OMNIROUTE_BASE_URL && env.OMNIROUTE_API_KEY && env.OMNIROUTE_GAM_MODEL),
    provider: "omniroute",
    route: env.OMNIROUTE_GAM_MODEL ?? null,
    timeoutMs: env.OMNIROUTE_GAM_TIMEOUT_MS,
    dailyLimit: env.OMNIROUTE_GAM_DAILY_LIMIT,
  };
}

export function normalizeOmniRouteGenerationError(error: unknown) {
  if (error instanceof GamGenerationProviderError) return error;

  const code = errorCode(error);
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new GamGenerationProviderError("GATEWAY_TIMEOUT", "The AI gateway timed out. Try again or use JSON Import.", true);
  }
  if (error instanceof OpenAI.AuthenticationError) {
    return new GamGenerationProviderError("GATEWAY_AUTHENTICATION", "The AI gateway authentication configuration is invalid.", false);
  }
  if (error instanceof OpenAI.RateLimitError) {
    const quota = code === "insufficient_quota" || code === "quota_exceeded";
    return new GamGenerationProviderError(
      quota ? "GATEWAY_QUOTA" : "GATEWAY_RATE_LIMIT",
      quota ? "AI gateway capacity is unavailable. You can continue using JSON Import." : "The AI gateway rate limit was reached. Try again or use JSON Import.",
      !quota,
    );
  }
  if (["model_not_found", "route_not_found", "no_route", "route_unavailable"].includes(code ?? "")
    || error instanceof OpenAI.NotFoundError) {
    return new GamGenerationProviderError("GATEWAY_ROUTE_UNAVAILABLE", "The configured AI route is unavailable. Check the server route configuration.", false);
  }
  if (["upstream_exhausted", "all_providers_failed", "no_available_provider", "provider_exhausted"].includes(code ?? "")) {
    return new GamGenerationProviderError("GATEWAY_UPSTREAM_EXHAUSTED", "All configured upstream providers are currently unavailable. Try again later or use JSON Import.", true);
  }
  if (error instanceof OpenAI.APIConnectionError || error instanceof OpenAI.InternalServerError) {
    return new GamGenerationProviderError("GATEWAY_UNAVAILABLE", "The AI gateway is temporarily unavailable. Try again or use JSON Import.", true);
  }
  return new GamGenerationProviderError("GATEWAY_UNKNOWN", "AI generation failed safely. Try again or use JSON Import.", true);
}

export async function requestOmniRouteGamPack(
  config: GeneralAcademicGenerationConfig,
  dependencies: OmniRouteAdapterDependencies = {},
): Promise<GamGenerationProviderRawResult> {
  const status = dependencies.status ?? getOmniRouteGamGenerationStatus();
  if (!status.configured || !status.route) {
    throw new GamGenerationProviderError("AI_NOT_CONFIGURED", "AI generation is not configured.", false);
  }

  const execute = dependencies.execute ?? (async (request) => {
    const env = getEnv();
    if (!env.OMNIROUTE_BASE_URL || !env.OMNIROUTE_API_KEY) {
      throw new GamGenerationProviderError("AI_NOT_CONFIGURED", "AI generation is not configured.", false);
    }
    // The OpenAI SDK is a wire-protocol client only. Its base URL always points
    // at OmniRoute, and this adapter has no direct-provider fallback.
    const client = new OpenAI({
      apiKey: env.OMNIROUTE_API_KEY,
      baseURL: normalizeBaseUrl(env.OMNIROUTE_BASE_URL),
      maxRetries: 1,
      timeout: status.timeoutMs,
    });
    return client.responses.create(request);
  });

  try {
    const responseValue = await execute({
      model: status.route,
      instructions: buildGeneralAcademicGenerationInstructions(),
      input: buildGeneralAcademicGenerationInput(config),
      store: false,
      max_output_tokens: 32_000,
      text: { format: getGeneralAcademicStructuredTextFormat() },
    });
    const response = record(responseValue);
    if (!response) {
      throw new GamGenerationProviderError("GATEWAY_MALFORMED_RESPONSE", "The AI gateway returned an unreadable response.", true);
    }
    if (responseRefusal(response)) {
      throw new GamGenerationProviderError("GATEWAY_REFUSAL", "The AI route declined this generation request. Adjust the topic or use JSON Import.", false);
    }
    const outputText = response.output_text;
    if (typeof outputText !== "string" || !outputText.trim()) {
      throw new GamGenerationProviderError("GATEWAY_STRUCTURED_OUTPUT", "The AI gateway did not return structured content.", true);
    }
    let output: unknown;
    try {
      output = JSON.parse(outputText);
    } catch {
      throw new GamGenerationProviderError("GATEWAY_MALFORMED_RESPONSE", "The AI gateway returned malformed structured content.", true);
    }
    return {
      output,
      generationId: typeof response.id === "string" ? response.id : crypto.randomUUID(),
      route: status.route,
      generatedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
      usage: responseUsage(response.usage),
    };
  } catch (error) {
    throw normalizeOmniRouteGenerationError(error);
  }
}

export const omniRouteGamGenerationProvider = {
  generate: requestOmniRouteGamPack,
};

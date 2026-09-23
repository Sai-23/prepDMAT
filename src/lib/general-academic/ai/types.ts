import type { GeneralAcademicGenerationConfig } from "./generation-config";

export type GamGenerationUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type GamGenerationProviderRawResult = {
  output: unknown;
  generationId: string;
  route: string;
  generatedAt: string;
  usage: GamGenerationUsage | null;
};

export type GamGenerationProviderErrorCode =
  | "AI_NOT_CONFIGURED"
  | "GATEWAY_AUTHENTICATION"
  | "GATEWAY_RATE_LIMIT"
  | "GATEWAY_QUOTA"
  | "GATEWAY_TIMEOUT"
  | "GATEWAY_UNAVAILABLE"
  | "GATEWAY_ROUTE_UNAVAILABLE"
  | "GATEWAY_UPSTREAM_EXHAUSTED"
  | "GATEWAY_REFUSAL"
  | "GATEWAY_MALFORMED_RESPONSE"
  | "GATEWAY_STRUCTURED_OUTPUT"
  | "GATEWAY_UNKNOWN";

export class GamGenerationProviderError extends Error {
  constructor(
    readonly code: GamGenerationProviderErrorCode,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "GamGenerationProviderError";
  }
}

export type GamGenerationProviderStatus = {
  configured: boolean;
  provider: "omniroute";
  route: string | null;
  timeoutMs: number;
  dailyLimit: number;
};

export interface GamGenerationProvider {
  generate(config: GeneralAcademicGenerationConfig): Promise<GamGenerationProviderRawResult>;
}

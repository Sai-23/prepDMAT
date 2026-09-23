import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG } from "../generation-config";
import { GamGenerationProviderError } from "../types";
import {
  normalizeOmniRouteGenerationError,
  requestOmniRouteGamPack,
} from "./omniroute";

const configured = {
  configured: true,
  provider: "omniroute" as const,
  route: "gam-production-route",
  timeoutMs: 55_000,
  dailyLimit: 25,
};
const response = (overrides: Record<string, unknown> = {}) => ({
  id: "resp_123",
  model: "upstream-model-that-must-not-control-provenance",
  output_text: JSON.stringify({ schemaVersion: "general-academic-pack@1" }),
  output: [],
  usage: { input_tokens: 12, output_tokens: 34, total_tokens: 46 },
  ...overrides,
});

describe("OmniRoute General Academic provider adapter", () => {
  it("does not execute a request when gateway configuration is incomplete", async () => {
    const execute = vi.fn();
    await expect(requestOmniRouteGamPack(DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG, {
      execute,
      status: { ...configured, configured: false },
    })).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("does not execute without a server-selected route", async () => {
    const execute = vi.fn();
    await expect(requestOmniRouteGamPack(DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG, {
      execute,
      status: { ...configured, route: null },
    })).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("uses the server-selected route, Responses shape, strict output, no tools and no storage", async () => {
    const execute = vi.fn().mockResolvedValue(response());
    await requestOmniRouteGamPack(DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG, {
      execute,
      status: configured,
      now: () => new Date("2026-09-02T00:00:00.000Z"),
    });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      model: "gam-production-route",
      store: false,
      text: { format: expect.objectContaining({ type: "json_schema", strict: true }) },
    }));
    const request = execute.mock.calls[0][0];
    expect(request).not.toHaveProperty("tools");
    expect(request).not.toHaveProperty("apiKey");
    expect(request).not.toHaveProperty("baseURL");
  });

  it("records the configured OmniRoute route rather than an upstream response model", async () => {
    const result = await requestOmniRouteGamPack(DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG, {
      execute: vi.fn().mockResolvedValue(response()),
      status: configured,
      now: () => new Date("2026-09-02T00:00:00.000Z"),
    });
    expect(result).toMatchObject({
      generationId: "resp_123",
      route: "gam-production-route",
      generatedAt: "2026-09-02T00:00:00.000Z",
      usage: { inputTokens: 12, outputTokens: 34, totalTokens: 46 },
    });
  });

  it("tolerates missing usage metadata", async () => {
    const result = await requestOmniRouteGamPack(DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG, {
      execute: vi.fn().mockResolvedValue(response({ usage: null })),
      status: configured,
    });
    expect(result.usage).toBeNull();
  });

  it("rejects a route refusal without exposing refusal text", async () => {
    const execute = vi.fn().mockResolvedValue(response({
      output: [{ type: "message", content: [{ type: "refusal", refusal: "raw refusal details" }] }],
    }));
    const failure = requestOmniRouteGamPack(DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG, { execute, status: configured });
    await expect(failure).rejects.toMatchObject({ code: "GATEWAY_REFUSAL" });
    await expect(requestOmniRouteGamPack(DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG, { execute, status: configured })).rejects.not.toThrow(/raw refusal details/);
  });

  it.each([
    [new OpenAI.APIConnectionTimeoutError(), "GATEWAY_TIMEOUT", true],
    [new OpenAI.AuthenticationError(401, {}, "secret leaked", new Headers()), "GATEWAY_AUTHENTICATION", false],
    [new OpenAI.RateLimitError(429, {}, "raw provider limit", new Headers()), "GATEWAY_RATE_LIMIT", true],
    [new OpenAI.RateLimitError(429, { code: "insufficient_quota" }, "billing details", new Headers()), "GATEWAY_QUOTA", false],
    [new OpenAI.NotFoundError(404, { code: "route_not_found" }, "internal route", new Headers()), "GATEWAY_ROUTE_UNAVAILABLE", false],
    [new OpenAI.InternalServerError(503, { code: "all_providers_failed" }, "upstream internals", new Headers()), "GATEWAY_UPSTREAM_EXHAUSTED", true],
    [new OpenAI.APIConnectionError({ message: "network internals" }), "GATEWAY_UNAVAILABLE", true],
  ] as const)("normalizes a gateway failure as %s", (error, code, retryable) => {
    const normalized = normalizeOmniRouteGenerationError(error);
    expect(normalized).toMatchObject({ code, retryable });
    expect(normalized.message).not.toMatch(/secret leaked|raw provider|billing details|internal route|upstream internals|network internals/);
  });

  it("sanitizes unknown gateway errors", () => {
    const error = normalizeOmniRouteGenerationError(new Error("Authorization: Bearer gateway-sensitive"));
    expect(error).toMatchObject({ code: "GATEWAY_UNKNOWN", retryable: true });
    expect(error.message).not.toContain("gateway-sensitive");
  });

  it("preserves already-safe provider errors", () => {
    const safe = new GamGenerationProviderError("GATEWAY_STRUCTURED_OUTPUT", "safe", true);
    expect(normalizeOmniRouteGenerationError(safe)).toBe(safe);
  });

  it.each([
    [{ output_text: "not-json" }, "GATEWAY_MALFORMED_RESPONSE"],
    [{ output_text: "" }, "GATEWAY_STRUCTURED_OUTPUT"],
    [null, "GATEWAY_MALFORMED_RESPONSE"],
  ] as const)("rejects an invalid structured response %#", async (overrides, code) => {
    const execute = vi.fn().mockResolvedValue(overrides === null ? null : response(overrides));
    await expect(requestOmniRouteGamPack(DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG, {
      execute,
      status: configured,
    })).rejects.toMatchObject({ code });
  });
});

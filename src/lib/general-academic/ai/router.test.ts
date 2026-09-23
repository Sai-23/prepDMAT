import { describe, expect, it, vi } from "vitest";

import { DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG } from "./generation-config";
import { generateGamPackWithProvider } from "./router";
import type { GamGenerationProvider } from "./types";

describe("GAM generation provider router", () => {
  it("dispatches through the injected provider-neutral interface", async () => {
    const expected = {
      output: { schemaVersion: "general-academic-pack@1" },
      generationId: "gateway_1",
      route: "test-route",
      generatedAt: "2026-09-02T00:00:00.000Z",
      usage: null,
    };
    const provider: GamGenerationProvider = { generate: vi.fn().mockResolvedValue(expected) };

    await expect(generateGamPackWithProvider(DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG, provider)).resolves.toBe(expected);
    expect(provider.generate).toHaveBeenCalledWith(DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG);
  });
});

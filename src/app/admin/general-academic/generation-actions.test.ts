import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  generate: vi.fn(),
  status: vi.fn(),
  enforceRateLimit: vi.fn(),
  findDuplicates: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/general-academic/ai/generation", () => ({ generateGeneralAcademicPack: mocks.generate }));
vi.mock("@/lib/general-academic/ai/router", () => ({ getGamGenerationProviderStatus: mocks.status }));
vi.mock("@/lib/general-academic/persistence", () => ({ findGeneralAcademicPacksByFingerprintForAdmin: mocks.findDuplicates }));
vi.mock("@/lib/security/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security/rate-limit")>("@/lib/security/rate-limit");
  return { ...actual, enforceSecurityRateLimit: mocks.enforceRateLimit };
});

import { RateLimitExceededError, SecurityControlUnavailableError } from "@/lib/security/rate-limit";
import { canonicalGeneralAcademicPackSchema } from "@/lib/general-academic/schemas";
import { generateGeneralAcademicWithAIAction } from "./generation-actions";

const ADMIN_ID = "00000000-0000-4000-8000-000000000010";
const fixture = () => canonicalGeneralAcademicPackSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8")));
const config = () => { const pack = fixture(); return { domain: pack.domain, topic: pack.topic, packDifficulty: pack.difficulty, questionCount: pack.questions.length, skills: [], representations: ["text"] }; };
const success = () => ({ ok: true, pack: fixture(), validation: { structural: "valid", warnings: [] }, usage: null, generationMeta: { provider: "omniroute", route: "gam-production-route", generatedAt: "2026-09-02T00:00:00.000Z", generationId: "resp_1" } });

describe("General Academic gateway generation Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ user: { id: ADMIN_ID }, roles: ["admin"] });
    mocks.status.mockReturnValue({ configured: true, provider: "omniroute", route: "gam-production-route", timeoutMs: 55_000, dailyLimit: 25 });
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.generate.mockResolvedValue(success());
    mocks.findDuplicates.mockResolvedValue([]);
  });

  it.each(["anonymous", "student"])("blocks %s before validation, limiting or gateway generation", async () => {
    mocks.requireRole.mockRejectedValue(new Error("redirected"));
    await expect(generateGeneralAcademicWithAIAction(config())).rejects.toThrow("redirected");
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("rejects invalid config and a client model before the rate limiter or gateway call", async () => {
    const result = await generateGeneralAcademicWithAIAction({ ...config(), domain: "invalid", model: "client-model" });
    expect(result).toMatchObject({ ok: false, error: { code: "CANONICAL_VALIDATION" } });
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("handles missing configuration without calling the gateway", async () => {
    mocks.status.mockReturnValue({ configured: false, provider: "omniroute", route: null, timeoutMs: 55_000, dailyLimit: 25 });
    expect(await generateGeneralAcademicWithAIAction(config())).toMatchObject({ ok: false, error: { code: "AI_NOT_CONFIGURED" } });
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("allows an admin only after server validation and user-scoped rate limiting", async () => {
    const result = await generateGeneralAcademicWithAIAction(config());
    expect(result.ok).toBe(true);
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("generation:general-academic", { userId: ADMIN_ID });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it("stops before the gateway when the generation rate limit is exhausted", async () => {
    mocks.enforceRateLimit.mockRejectedValue(new RateLimitExceededError(90));
    expect(await generateGeneralAcademicWithAIAction(config())).toMatchObject({ ok: false, error: { code: "ADMIN_RATE_LIMIT" } });
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("fails closed when the shared security control is unavailable", async () => {
    mocks.enforceRateLimit.mockRejectedValue(new SecurityControlUnavailableError());
    expect(await generateGeneralAcademicWithAIAction(config())).toMatchObject({ ok: false, error: { code: "SECURITY_CONTROL_UNAVAILABLE" } });
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("performs duplicate lookup after generation without persisting", async () => {
    mocks.findDuplicates.mockResolvedValue([{ id: "existing", title: "Existing source pack" }]);
    const result = await generateGeneralAcademicWithAIAction(config());
    expect(result).toMatchObject({ ok: true, duplicateTitles: ["Existing source pack"] });
    expect(mocks.findDuplicates).toHaveBeenCalledTimes(1);
  });

  it("does not perform duplicate lookup after failed generation", async () => {
    mocks.generate.mockResolvedValue({ ok: false, error: { code: "GATEWAY_TIMEOUT", message: "safe", retryable: true } });
    expect(await generateGeneralAcademicWithAIAction(config())).toMatchObject({ ok: false, error: { code: "GATEWAY_TIMEOUT" } });
    expect(mocks.findDuplicates).not.toHaveBeenCalled();
  });

  it("keeps a valid generation usable when duplicate lookup is unavailable", async () => {
    mocks.findDuplicates.mockRejectedValue(new Error("database internals"));
    expect(await generateGeneralAcademicWithAIAction(config())).toMatchObject({ ok: true, duplicateTitles: [], duplicateCheckUnavailable: true });
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  generate: vi.fn(),
  providerStatus: vi.fn(),
  loadInventory: vi.fn(),
  createDraft: vi.fn(),
  transition: vi.fn(),
  rateLimit: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/general-academic/ai/generation", () => ({ generateGeneralAcademicPack: mocks.generate }));
vi.mock("@/lib/general-academic/ai/router", () => ({ getGamGenerationProviderStatus: mocks.providerStatus }));
vi.mock("@/lib/general-academic/content-intelligence-data", () => ({ loadGeneralAcademicInventoryForAdmin: mocks.loadInventory }));
vi.mock("@/lib/general-academic/persistence", () => ({
  createGeneralAcademicDraft: mocks.createDraft,
  GeneralAcademicPersistenceError: class GeneralAcademicPersistenceError extends Error {},
}));
vi.mock("@/lib/general-academic/lifecycle-persistence", () => ({
  transitionGeneralAcademicPack: mocks.transition,
  GeneralAcademicLifecycleError: class GeneralAcademicLifecycleError extends Error {},
}));
vi.mock("@/lib/security/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security/rate-limit")>("@/lib/security/rate-limit");
  return { ...actual, enforceSecurityRateLimit: mocks.rateLimit };
});

import { RateLimitExceededError } from "@/lib/security/rate-limit";
import { canonicalGeneralAcademicPackSchema } from "@/lib/general-academic/schemas";
import {
  bulkTransitionGeneralAcademicPacksAction,
  generateGeneralAcademicBatchAction,
  previewGeneralAcademicBatchImportAction,
  saveGeneralAcademicBatchImportAction,
} from "./phase8-actions";

const ADMIN_ID = "00000000-0000-4000-8000-000000000010";
const PACK_ID = "00000000-0000-4000-8000-000000000030";
const fixture = () => canonicalGeneralAcademicPackSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8")));
const config = () => { const pack = fixture(); return { domain: pack.domain, topic: pack.topic, packDifficulty: pack.difficulty, questionCount: pack.questions.length, skills: [], representations: ["text"] }; };
const generated = () => ({ ok: true, pack: fixture(), validation: { structural: "valid", warnings: [] }, usage: null, generationMeta: { provider: "omniroute", route: "route", generatedAt: "2026-09-03T00:00:00.000Z", generationId: "generation" } });
const stored = () => ({ id: PACK_ID, pack: fixture(), contentFingerprint: "fingerprint", createdAt: "2026-09-03T00:00:00.000Z", updatedAt: "2026-09-03T00:00:00.000Z", lifecycle: { reviewedBy: null, reviewedAt: null, approvedBy: null, approvedAt: null, publishedBy: null, publishedAt: null } });

describe("Phase 8 batch Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ user: { id: ADMIN_ID }, roles: ["admin"] });
    mocks.providerStatus.mockReturnValue({ configured: true });
    mocks.loadInventory.mockResolvedValue([]);
    mocks.rateLimit.mockResolvedValue(undefined);
    mocks.generate.mockResolvedValue(generated());
    mocks.createDraft.mockResolvedValue(stored());
    mocks.transition.mockResolvedValue({ from: "draft", to: "needs_review", duplicateTitles: [] });
  });

  it.each(["generation", "preview", "save", "bulk"])("requires admin before %s work", async (operation) => {
    mocks.requireRole.mockRejectedValue(new Error("redirected"));
    const call = operation === "generation" ? generateGeneralAcademicBatchAction({ config: config(), packCount: 1 })
      : operation === "preview" ? previewGeneralAcademicBatchImportAction(JSON.stringify([fixture()]))
        : operation === "save" ? saveGeneralAcademicBatchImportAction([fixture()])
          : bulkTransitionGeneralAcademicPacksAction({ packIds: [PACK_ID], target: "needs_review" });
    await expect(call).rejects.toThrow("redirected");
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.transition).not.toHaveBeenCalled();
  });

  it("bounds generation before provider calls", async () => {
    expect(await generateGeneralAcademicBatchAction({ config: config(), packCount: 6 })).toMatchObject({ ok: false, items: [] });
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("generates, validates, rate-limits, and saves each output independently", async () => {
    const result = await generateGeneralAcademicBatchAction({ config: config(), packCount: 2 });
    expect(result.items.map((item) => item.status)).toEqual(["saved", "saved"]);
    expect(mocks.rateLimit).toHaveBeenCalledTimes(2);
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(mocks.createDraft).toHaveBeenCalledTimes(2);
    expect(mocks.generate.mock.calls[1][0]).toMatchObject({ batchVariation: { index: 2, count: 2 } });
  });

  it("isolates provider failure and continues to the next item", async () => {
    mocks.generate.mockResolvedValueOnce({ ok: false, error: { code: "GATEWAY_TIMEOUT", message: "Timed out safely.", retryable: true } }).mockResolvedValueOnce(generated());
    const result = await generateGeneralAcademicBatchAction({ config: config(), packCount: 2 });
    expect(result.items.map((item) => item.status)).toEqual(["failed", "saved"]);
    expect(mocks.createDraft).toHaveBeenCalledTimes(1);
  });

  it("stops safely when the shared generation limit is exhausted", async () => {
    mocks.rateLimit.mockRejectedValue(new RateLimitExceededError(120));
    const result = await generateGeneralAcademicBatchAction({ config: config(), packCount: 3 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].message).toContain("Generation limit reached");
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("previews valid and invalid imports without persistence", async () => {
    const result = await previewGeneralAcademicBatchImportAction(JSON.stringify([fixture(), { title: "invalid" }]));
    expect(result.items.map((item) => item.ok)).toEqual([true, false]);
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });

  it("revalidates and saves selected valid imports only as drafts", async () => {
    const result = await saveGeneralAcademicBatchImportAction([fixture(), { title: "invalid" }]);
    expect(result.items.map((item) => item.status)).toEqual(["saved", "failed"]);
    expect(mocks.createDraft).toHaveBeenCalledTimes(1);
    expect(mocks.createDraft.mock.calls[0][0].review.status).toBe("draft");
  });

  it("allows only safe bulk transitions and reports partial failures", async () => {
    mocks.transition.mockResolvedValueOnce({ from: "draft", to: "needs_review" }).mockRejectedValueOnce(new Error("database detail"));
    const secondId = "00000000-0000-4000-8000-000000000031";
    const result = await bulkTransitionGeneralAcademicPacksAction({ packIds: [PACK_ID, secondId], target: "needs_review" });
    expect(result.items.map((item) => item.ok)).toEqual([true, false]);
    expect(result.message).toContain("1 of 2");
  });

  it("rejects bulk approval and malformed identifiers", async () => {
    expect(await bulkTransitionGeneralAcademicPacksAction({ packIds: [PACK_ID], target: "approved" })).toMatchObject({ ok: false, items: [] });
    expect(await bulkTransitionGeneralAcademicPacksAction({ packIds: ["bad"], target: "published" })).toMatchObject({ ok: false, items: [] });
    expect(mocks.transition).not.toHaveBeenCalled();
  });

  it("revalidates inventory views after successful mutations", async () => {
    await generateGeneralAcademicBatchAction({ config: config(), packCount: 1 });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/general-academic/coverage");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/general-academic/quality");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/general-academic/review");
  });
});

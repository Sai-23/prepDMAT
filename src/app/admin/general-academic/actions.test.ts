import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createDraft: vi.fn(),
  updateDraft: vi.fn(),
  findDuplicates: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/general-academic/persistence", () => ({
  createGeneralAcademicDraft: mocks.createDraft,
  updateGeneralAcademicDraft: mocks.updateDraft,
  findGeneralAcademicPacksByFingerprintForAdmin: mocks.findDuplicates,
  GeneralAcademicPersistenceError: class GeneralAcademicPersistenceError extends Error {},
}));

import { canonicalGeneralAcademicPackSchema } from "@/lib/general-academic/schemas";
import { saveGeneralAcademicDraftAction } from "./actions";

const ADMIN_ID = "00000000-0000-4000-8000-000000000010";
const PACK_ID = "00000000-0000-4000-8000-000000000030";
const fixture = () => canonicalGeneralAcademicPackSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8")));

describe("General Academic draft Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ user: { id: ADMIN_ID }, roles: ["admin"] });
    mocks.findDuplicates.mockResolvedValue([]);
    mocks.createDraft.mockResolvedValue({ id: PACK_ID, contentFingerprint: "fingerprint", pack: fixture(), createdAt: "", updatedAt: "" });
    mocks.updateDraft.mockResolvedValue({ id: PACK_ID, contentFingerprint: "fingerprint", pack: fixture(), createdAt: "", updatedAt: "" });
  });

  it("rejects invalid canonical input without creating database content", async () => {
    const result = await saveGeneralAcademicDraftAction({ title: "invalid" });
    expect(result.ok).toBe(false);
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.updateDraft).not.toHaveBeenCalled();
  });

  it("saves a valid manual pack through Phase 1 create persistence", async () => {
    const result = await saveGeneralAcademicDraftAction(fixture());
    expect(result).toMatchObject({ ok: true, id: PACK_ID });
    expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ review: expect.objectContaining({ status: "draft" }) }), ADMIN_ID);
  });

  it("updates an existing draft through Phase 1 update persistence", async () => {
    const changed = fixture();
    changed.title = "Edited pack";
    await saveGeneralAcademicDraftAction(changed, PACK_ID);
    expect(mocks.updateDraft).toHaveBeenCalledWith(PACK_ID, expect.objectContaining({ title: "Edited pack" }), ADMIN_ID);
  });

  it("forces supplied lifecycle state to draft at the server boundary", async () => {
    const input = fixture();
    input.review.status = "published";
    await saveGeneralAcademicDraftAction(input);
    expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ review: expect.objectContaining({ status: "draft" }) }), ADMIN_ID);
  });

  it("warns about an identical fingerprint without overwriting it", async () => {
    mocks.findDuplicates.mockResolvedValue([{ id: "00000000-0000-4000-8000-000000000099", title: "Existing pack" }]);
    const result = await saveGeneralAcademicDraftAction(fixture());
    expect(result).toMatchObject({ ok: true, duplicateTitles: ["Existing pack"] });
    expect(mocks.createDraft).toHaveBeenCalledTimes(1);
  });

  it("checks authorization before validation or persistence", async () => {
    mocks.requireRole.mockRejectedValue(new Error("redirected"));
    await expect(saveGeneralAcademicDraftAction(fixture())).rejects.toThrow("redirected");
    expect(mocks.findDuplicates).not.toHaveBeenCalled();
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
});

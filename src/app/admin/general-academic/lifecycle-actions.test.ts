import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  transition: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/general-academic/lifecycle-persistence", () => ({
  transitionGeneralAcademicPack: mocks.transition,
  GeneralAcademicLifecycleError: class GeneralAcademicLifecycleError extends Error {
    constructor(message: string, readonly code: string, readonly quality?: unknown) {
      super(message);
    }
  },
}));

import { GeneralAcademicLifecycleError } from "@/lib/general-academic/lifecycle-persistence";

import { transitionGeneralAcademicPackAction } from "./lifecycle-actions";

const ADMIN_ID = "00000000-0000-4000-8000-000000000010";
const PACK_ID = "00000000-0000-4000-8000-000000000030";

describe("General Academic lifecycle Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ user: { id: ADMIN_ID }, roles: ["admin"] });
    mocks.transition.mockResolvedValue({ from: "draft", to: "needs_review", duplicateTitles: [] });
  });

  it("authorizes before accepting a lifecycle request", async () => {
    mocks.requireRole.mockRejectedValue(new Error("redirected"));
    await expect(transitionGeneralAcademicPackAction(PACK_ID, "needs_review", {})).rejects.toThrow("redirected");
    expect(mocks.transition).not.toHaveBeenCalled();
  });

  it("rejects malformed pack IDs, statuses and browser fields", async () => {
    expect(await transitionGeneralAcademicPackAction("not-an-id", "published", { actorId: ADMIN_ID })).toMatchObject({ ok: false, code: "INVALID_REQUEST" });
    expect(mocks.transition).not.toHaveBeenCalled();
  });

  it("passes only validated inputs and the server-authenticated actor", async () => {
    await transitionGeneralAcademicPackAction(PACK_ID, "needs_review", { notes: "Ready for review" });
    expect(mocks.transition).toHaveBeenCalledWith(PACK_ID, "needs_review", { notes: "Ready for review" }, ADMIN_ID);
  });

  it("revalidates the library, review and edit routes after success", async () => {
    await transitionGeneralAcademicPackAction(PACK_ID, "needs_review", {});
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/general-academic");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/general-academic/${PACK_ID}/review`);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/general-academic/${PACK_ID}/edit`);
  });

  it("returns lifecycle quality failures without leaking internal errors", async () => {
    mocks.transition.mockRejectedValue(new GeneralAcademicLifecycleError("Resolve blocking findings.", "QUALITY_BLOCKED"));
    expect(await transitionGeneralAcademicPackAction(PACK_ID, "needs_review", {})).toMatchObject({ ok: false, code: "QUALITY_BLOCKED", message: "Resolve blocking findings." });
    mocks.transition.mockRejectedValue(new Error("database connection details"));
    expect(await transitionGeneralAcademicPackAction(PACK_ID, "needs_review", {})).toEqual({ ok: false, code: "TRANSITION_FAILED", message: "The lifecycle transition could not be completed." });
  });

  it("reports exact published duplicates as warnings without overwriting", async () => {
    mocks.transition.mockResolvedValue({ from: "approved", to: "published", duplicateTitles: ["Existing pack"] });
    expect(await transitionGeneralAcademicPackAction(PACK_ID, "published", {})).toMatchObject({ ok: true, duplicateTitles: ["Existing pack"] });
  });
});

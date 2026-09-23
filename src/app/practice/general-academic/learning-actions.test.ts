import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), toggle: vi.fn(), retry: vi.fn(), retryMock: vi.fn(), revalidatePath: vi.fn(), enabled: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/general-academic/feature-gate", () => ({ isGeneralAcademicEnabled: mocks.enabled, GENERAL_ACADEMIC_UNAVAILABLE: "General Academic is not available yet." }));
vi.mock("@/lib/general-academic/learning-data", () => ({ toggleGeneralAcademicBookmark: mocks.toggle }));
vi.mock("@/lib/general-academic/mock-data", () => ({ retryGeneralAcademicMockSourcePack: mocks.retryMock }));
vi.mock("@/lib/general-academic/practice-data", () => ({
  retryGeneralAcademicPracticePack: mocks.retry,
  GeneralAcademicPracticeError: class GeneralAcademicPracticeError extends Error {},
}));

import { retryGeneralAcademicPracticePackAction, toggleGeneralAcademicBookmarkAction } from "./learning-actions";

const USER = "00000000-0000-4000-8000-000000000011";
const ATTEMPT = "00000000-0000-4000-8000-000000000201";

describe("General Academic learning Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: USER });
    mocks.enabled.mockReturnValue(true);
    mocks.toggle.mockResolvedValue(true);
    mocks.retry.mockResolvedValue({ id: ATTEMPT });
    mocks.retryMock.mockResolvedValue({ id: ATTEMPT });
  });

  it.each([
    ["bookmark", () => toggleGeneralAcademicBookmarkAction({ attemptId: ATTEMPT, questionId: "q1", bookmarked: true })],
    ["retry", () => retryGeneralAcademicPracticePackAction({ attemptId: ATTEMPT })],
  ])("requires authentication before %s", async (_name, invoke) => {
    mocks.requireUser.mockRejectedValue(new Error("redirected"));
    await expect(invoke()).rejects.toThrow("redirected");
  });

  it("uses the authenticated user for bookmark validation and returns minimal state", async () => {
    const input = { attemptId: ATTEMPT, questionId: "q1", bookmarked: true };
    expect(await toggleGeneralAcademicBookmarkAction(input)).toEqual({ ok: true, bookmarked: true });
    expect(mocks.toggle).toHaveBeenCalledWith(USER, input);
  });

  it("blocks bookmark changes and retry creation when disabled", async () => {
    mocks.enabled.mockReturnValue(false);
    expect(await toggleGeneralAcademicBookmarkAction({ attemptId: ATTEMPT })).toMatchObject({ ok: false });
    expect(await retryGeneralAcademicPracticePackAction({ attemptId: ATTEMPT })).toMatchObject({ ok: false });
    expect(mocks.toggle).not.toHaveBeenCalled();
    expect(mocks.retry).not.toHaveBeenCalled();
    expect(mocks.retryMock).not.toHaveBeenCalled();
  });

  it("uses an owned submitted attempt as the retry authority", async () => {
    expect(await retryGeneralAcademicPracticePackAction({ attemptId: ATTEMPT, packId: "forged" })).toEqual({ ok: true, attemptId: ATTEMPT });
    expect(mocks.retry).toHaveBeenCalledWith(USER, ATTEMPT);
  });

  it("uses an owned submitted mock and its verified pack for mock-origin retries", async () => {
    const packId = "00000000-0000-4000-8000-000000000101";
    expect(await retryGeneralAcademicPracticePackAction({ attemptId: ATTEMPT, packId, source: "mock" })).toEqual({ ok: true, attemptId: ATTEMPT });
    expect(mocks.retryMock).toHaveBeenCalledWith(USER, ATTEMPT, packId);
    expect(mocks.retry).not.toHaveBeenCalled();
  });

  it("returns safe failures without database details", async () => {
    mocks.toggle.mockRejectedValue(new Error("private SQL details"));
    expect(await toggleGeneralAcademicBookmarkAction({ attemptId: ATTEMPT, questionId: "q1", bookmarked: true })).toEqual({ ok: false, message: "Unable to update this bookmark. Try again." });
  });
});

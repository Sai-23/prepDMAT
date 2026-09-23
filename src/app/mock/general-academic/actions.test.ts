import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), start: vi.fn(), save: vi.fn(), submit: vi.fn(), revalidatePath: vi.fn(), enabled: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/general-academic/feature-gate", () => ({ isGeneralAcademicEnabled: mocks.enabled, GENERAL_ACADEMIC_UNAVAILABLE: "General Academic is not available yet." }));
vi.mock("@/lib/general-academic/mock-data", () => ({
  startGeneralAcademicMock: mocks.start,
  saveGeneralAcademicMockState: mocks.save,
  submitGeneralAcademicMock: mocks.submit,
  GeneralAcademicMockError: class GeneralAcademicMockError extends Error {
    constructor(message: string, readonly code: string) { super(message); }
  },
}));

import { GeneralAcademicMockError } from "@/lib/general-academic/mock-data";
import { saveGeneralAcademicMockAction, startGeneralAcademicMockAction, submitGeneralAcademicMockAction } from "./actions";

const USER = "00000000-0000-4000-8000-000000000011";
const ATTEMPT = "00000000-0000-4000-8000-000000000201";

describe("General Academic mock Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: USER });
    mocks.enabled.mockReturnValue(true);
    mocks.start.mockResolvedValue({ id: ATTEMPT });
    mocks.save.mockResolvedValue("saved");
    mocks.submit.mockResolvedValue({});
  });

  it.each([
    ["start", () => startGeneralAcademicMockAction()],
    ["save", () => saveGeneralAcademicMockAction({ attemptId: ATTEMPT })],
    ["submit", () => submitGeneralAcademicMockAction({ attemptId: ATTEMPT })],
  ])("requires authentication before %s", async (_name, invoke) => {
    mocks.requireUser.mockRejectedValue(new Error("redirected"));
    await expect(invoke()).rejects.toThrow("redirected");
  });

  it("returns only the attempt identity after start", async () => {
    expect(await startGeneralAcademicMockAction()).toEqual({ ok: true, attemptId: ATTEMPT });
  });

  it("blocks mock start, save and submit when disabled", async () => {
    mocks.enabled.mockReturnValue(false);
    expect(await startGeneralAcademicMockAction()).toMatchObject({ ok: false });
    expect(await saveGeneralAcademicMockAction({ attemptId: ATTEMPT })).toMatchObject({ ok: false });
    expect(await submitGeneralAcademicMockAction({ attemptId: ATTEMPT })).toMatchObject({ ok: false });
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("passes answer state only to an authenticated ownership-scoped DAL", async () => {
    const input = { attemptId: ATTEMPT, packId: "pack", questionId: "q1", selectedOption: "A", isFlagged: true, currentPackIndex: 0, currentQuestionId: "q1", timerExtension: 9999 };
    await saveGeneralAcademicMockAction(input);
    expect(mocks.save).toHaveBeenCalledWith(USER, input);
  });

  it("ignores forged score, correctness, answer-key and timer fields on submit", async () => {
    await submitGeneralAcademicMockAction({ attemptId: ATTEMPT, score: 999, correct: 99, correctOption: "D", expiresAt: "2099-01-01" });
    expect(mocks.submit).toHaveBeenCalledWith(USER, ATTEMPT);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it("returns the server's finalized status after an expiry race", async () => {
    mocks.save.mockResolvedValue("submitted");
    expect(await saveGeneralAcademicMockAction({ attemptId: ATTEMPT })).toEqual({ ok: true, status: "submitted" });
  });

  it("returns safe failures without private database details", async () => {
    mocks.submit.mockRejectedValue(new GeneralAcademicMockError("General Academic mock was not found.", "NOT_FOUND"));
    expect(await submitGeneralAcademicMockAction({ attemptId: ATTEMPT })).toEqual({ ok: false, message: "General Academic mock was not found." });
    mocks.submit.mockRejectedValue(new Error("private database details"));
    expect(await submitGeneralAcademicMockAction({ attemptId: ATTEMPT })).toEqual({ ok: false, message: "Unable to submit the General Academic mock. Try again." });
  });
});

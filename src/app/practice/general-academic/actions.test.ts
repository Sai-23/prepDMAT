import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  start: vi.fn(),
  save: vi.fn(),
  submit: vi.fn(),
  abandon: vi.fn(),
  revalidatePath: vi.fn(),
  enabled: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/general-academic/feature-gate", () => ({ isGeneralAcademicEnabled: mocks.enabled, GENERAL_ACADEMIC_UNAVAILABLE: "General Academic is not available yet." }));
vi.mock("@/lib/general-academic/practice-data", () => ({
  startGeneralAcademicPractice: mocks.start,
  saveGeneralAcademicPracticeState: mocks.save,
  submitGeneralAcademicPractice: mocks.submit,
  abandonGeneralAcademicPractice: mocks.abandon,
  GeneralAcademicPracticeError: class GeneralAcademicPracticeError extends Error {
    constructor(message: string, readonly code: string) { super(message); }
  },
}));

import { GeneralAcademicPracticeError } from "@/lib/general-academic/practice-data";

import { abandonGeneralAcademicPracticeAction, saveGeneralAcademicPracticeAction, startGeneralAcademicPracticeAction, submitGeneralAcademicPracticeAction } from "./actions";

const USER = "00000000-0000-4000-8000-000000000011";
const ATTEMPT = "00000000-0000-4000-8000-000000000201";

describe("General Academic student Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: USER });
    mocks.enabled.mockReturnValue(true);
    mocks.start.mockResolvedValue({ id: ATTEMPT });
    mocks.save.mockResolvedValue(undefined);
    mocks.submit.mockResolvedValue({});
    mocks.abandon.mockResolvedValue(undefined);
  });

  it.each([
    ["start", () => startGeneralAcademicPracticeAction({ mode: "mixed" })],
    ["save", () => saveGeneralAcademicPracticeAction({ attemptId: ATTEMPT })],
    ["submit", () => submitGeneralAcademicPracticeAction({ attemptId: ATTEMPT })],
    ["abandon", () => abandonGeneralAcademicPracticeAction({ attemptId: ATTEMPT })],
  ])("requires authentication before %s", async (_name, invoke) => {
    mocks.requireUser.mockRejectedValue(new Error("redirected"));
    await expect(invoke()).rejects.toThrow("redirected");
  });

  it("returns only an attempt ID after start, not a canonical pack", async () => {
    const result = await startGeneralAcademicPracticeAction({ mode: "mixed" });
    expect(result).toEqual({ ok: true, attemptId: ATTEMPT });
    expect(JSON.stringify(result)).not.toMatch(/correctOption|explanation|sourceMeta/);
  });

  it("blocks start, resume-state saving, submission and abandonment when disabled", async () => {
    mocks.enabled.mockReturnValue(false);
    for (const invoke of [
      () => startGeneralAcademicPracticeAction({ mode: "mixed" }),
      () => saveGeneralAcademicPracticeAction({ attemptId: ATTEMPT }),
      () => submitGeneralAcademicPracticeAction({ attemptId: ATTEMPT }),
      () => abandonGeneralAcademicPracticeAction({ attemptId: ATTEMPT }),
    ]) expect(await invoke()).toMatchObject({ ok: false, code: "FEATURE_DISABLED" });
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.abandon).not.toHaveBeenCalled();
  });

  it("passes the authenticated user to every persistence mutation", async () => {
    const saveInput = { attemptId: ATTEMPT, questionId: "q1", selectedOption: "A", isFlagged: false, currentQuestionIndex: 0 };
    await saveGeneralAcademicPracticeAction(saveInput);
    await submitGeneralAcademicPracticeAction({ attemptId: ATTEMPT, score: 100, correctOption: "A" });
    await abandonGeneralAcademicPracticeAction({ attemptId: ATTEMPT });
    expect(mocks.save).toHaveBeenCalledWith(USER, saveInput);
    expect(mocks.submit).toHaveBeenCalledWith(USER, ATTEMPT);
    expect(mocks.abandon).toHaveBeenCalledWith(USER, ATTEMPT);
  });

  it("ignores client score and answer-key fields during submission", async () => {
    await submitGeneralAcademicPracticeAction({ attemptId: ATTEMPT, score: 999, correctOption: "D" });
    expect(mocks.submit).toHaveBeenCalledWith(USER, ATTEMPT);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it("returns safe known and unknown failures", async () => {
    mocks.save.mockRejectedValue(new GeneralAcademicPracticeError("Submitted practice cannot be changed.", "ATTEMPT_LOCKED"));
    expect(await saveGeneralAcademicPracticeAction({ attemptId: ATTEMPT })).toMatchObject({ ok: false, code: "ATTEMPT_LOCKED" });
    mocks.submit.mockRejectedValue(new Error("private database details"));
    expect(await submitGeneralAcademicPracticeAction({ attemptId: ATTEMPT })).toEqual({ ok: false, code: "PRACTICE_FAILED", message: "General Academic practice could not be submitted." });
  });
});

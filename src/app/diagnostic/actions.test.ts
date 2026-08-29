import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  enforceRateLimit: vi.fn(),
  createPublic: vi.fn(),
  continuePublic: vi.fn(),
  showPublic: vi.fn(),
  startPrivate: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, enforceSecurityRateLimit: mocks.enforceRateLimit };
});
vi.mock("@/lib/onboarding/public-diagnostic", () => ({
  createPublicDiagnostic: mocks.createPublic,
  continuePublicDiagnostic: mocks.continuePublic,
  showPublicDiagnosticQuestion: mocks.showPublic,
}));
vi.mock("@/lib/onboarding/data", () => ({ startInitialDiagnostic: mocks.startPrivate }));

import {
  continuePublicDiagnosticAction,
  showPublicDiagnosticQuestionAction,
  startPublicDiagnosticAction,
} from "./actions";

const sessionId = "00000000-0000-4000-8000-000000000111";
const questionId = "00000000-0000-4000-8000-000000000222";

describe("public diagnostic server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(undefined);
  });

  it("starts an anonymous session under the public generation limiter", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.createPublic.mockResolvedValue({ sessionId });

    await expect(startPublicDiagnosticAction()).resolves.toEqual({
      error: null,
      destination: "/diagnostic/take",
    });
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("generation:public-diagnostic");
    expect(mocks.createPublic).toHaveBeenCalledOnce();
    expect(mocks.startPrivate).not.toHaveBeenCalled();
  });

  it("keeps authenticated diagnostic creation in the existing private architecture", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "student-id" });
    mocks.startPrivate.mockResolvedValue(sessionId);

    await expect(startPublicDiagnosticAction()).resolves.toEqual({
      error: null,
      destination: "/onboarding/diagnostic",
    });
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("generation:diagnostic", {
      userId: "student-id",
    });
    expect(mocks.startPrivate).toHaveBeenCalledWith("student-id");
  });

  it("rejects malformed identifiers before timing or answer persistence", async () => {
    await expect(showPublicDiagnosticQuestionAction({ sessionId: "bad", questionId })).resolves.toEqual({
      error: "The diagnostic question is invalid.",
    });
    const result = await continuePublicDiagnosticAction({ sessionId, questionId: "bad", answer: null });
    expect(result).toMatchObject({ status: "error", answerSaved: false });
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.showPublic).not.toHaveBeenCalled();
    expect(mocks.continuePublic).not.toHaveBeenCalled();
  });

  it("rate-limits a valid answer and returns only the public continuation result", async () => {
    const input = {
      sessionId,
      questionId,
      answer: { kind: "single_choice" as const, optionId: "answer-a" },
    };
    mocks.continuePublic.mockResolvedValue({ status: "completed" });

    await expect(continuePublicDiagnosticAction(input)).resolves.toEqual({
      error: null,
      status: "completed",
    });
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("assessment:public-diagnostic");
    expect(mocks.continuePublic).toHaveBeenCalledWith(input);
  });
});


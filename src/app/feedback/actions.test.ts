import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), create: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/feedback/data", () => ({
  FeedbackAlreadySubmittedError: class FeedbackAlreadySubmittedError extends Error {},
  createStudentFeedback: mocks.create,
}));

import { submitStudentFeedbackAction } from "./actions";
import { FeedbackAlreadySubmittedError } from "@/lib/feedback/data";

describe("student feedback action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "student-a" });
    mocks.create.mockResolvedValue({ id: "feedback", public_consent: true });
  });

  it("requires authentication before accepting feedback", async () => {
    mocks.requireUser.mockRejectedValue(new Error("redirected"));
    await expect(submitStudentFeedbackAction({ rating: 5, likedMost: "", improvements: "", publicConsent: false })).rejects.toThrow("redirected");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("saves only against the verified user ID", async () => {
    await expect(submitStudentFeedbackAction({ rating: 5, likedMost: "Helpful", improvements: "", publicConsent: true }))
      .resolves.toEqual({ ok: true, submission: "created", publicConsent: true });
    expect(mocks.create).toHaveBeenCalledWith("student-a", { rating: 5, likedMost: "Helpful", improvements: null, publicConsent: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/feedback");
  });

  it("allows both text fields to be empty even with public consent", async () => {
    mocks.create.mockResolvedValue({ id: "feedback", public_consent: true });

    await expect(submitStudentFeedbackAction({ rating: 5, likedMost: "", improvements: "", publicConsent: true }))
      .resolves.toEqual({ ok: true, submission: "created", publicConsent: true });
    expect(mocks.create).toHaveBeenCalledWith("student-a", {
      rating: 5,
      likedMost: null,
      improvements: null,
      publicConsent: true,
    });
  });

  it("rejects spoofed identity and moderation fields", async () => {
    const result = await submitStudentFeedbackAction({ rating: 5, likedMost: "Helpful", improvements: "", publicConsent: true, userId: "student-b", status: "approved", isFeatured: true });
    expect(result.ok).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("treats a duplicate race as already submitted without updating", async () => {
    mocks.create.mockRejectedValue(new FeedbackAlreadySubmittedError());

    await expect(submitStudentFeedbackAction({ rating: 4, likedMost: "Clear", improvements: "", publicConsent: false }))
      .resolves.toEqual({ ok: true, submission: "already_submitted", publicConsent: null });
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/feedback");
  });

  it("preserves the genuine first-submission error path", async () => {
    mocks.create.mockRejectedValue(new Error("database unavailable"));

    await expect(submitStudentFeedbackAction({ rating: 4, likedMost: "Clear", improvements: "", publicConsent: false }))
      .resolves.toEqual({ ok: false, error: "We couldn't save your feedback. Your answers are still here—please try again." });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

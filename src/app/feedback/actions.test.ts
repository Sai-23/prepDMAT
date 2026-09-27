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
    await expect(submitStudentFeedbackAction({ rating: 5, likedMost: "Helpful", improvements: "", publicConsent: false })).rejects.toThrow("redirected");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("saves only against the verified user ID", async () => {
    await expect(submitStudentFeedbackAction({ rating: 5, likedMost: "  Helpful  ", improvements: "", publicConsent: true }))
      .resolves.toEqual({ ok: true, submission: "created", publicConsent: true });
    expect(mocks.create).toHaveBeenCalledWith("student-a", { rating: 5, likedMost: "Helpful", improvements: null, publicConsent: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/feedback");
  });

  it.each([false, true])("accepts empty improvements with consent=%s", async (publicConsent) => {
    mocks.create.mockResolvedValue({ id: "feedback", public_consent: publicConsent });

    await expect(submitStudentFeedbackAction({
      rating: 5,
      likedMost: "Mock tests",
      improvements: "",
      publicConsent,
    })).resolves.toEqual({ ok: true, submission: "created", publicConsent });
    expect(mocks.create).toHaveBeenCalledWith("student-a", {
      rating: 5,
      likedMost: "Mock tests",
      improvements: null,
      publicConsent,
    });
  });

  it("accepts short optional improvement feedback", async () => {
    await submitStudentFeedbackAction({
      rating: 4,
      likedMost: "Practice questions",
      improvements: "speed",
      publicConsent: false,
    });

    expect(mocks.create).toHaveBeenCalledWith("student-a", {
      rating: 4,
      likedMost: "Practice questions",
      improvements: "speed",
      publicConsent: false,
    });
  });

  it("requires both rating and positive feedback without treating consent or improvements as required", async () => {
    const missingRating = await submitStudentFeedbackAction({
      rating: 0,
      likedMost: "",
      improvements: "",
      publicConsent: false,
    });

    expect(missingRating).toEqual({
      ok: false,
      error: "Check the required fields and keep each response within 200 characters.",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each(["", "   ", "\n\t"])("rejects whitespace-only positive feedback %j", async (likedMost) => {
    const result = await submitStudentFeedbackAction({
      rating: 5,
      likedMost,
      improvements: "",
      publicConsent: true,
    });

    expect(result.ok).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects over-limit text before persistence without changing optional-field rules", async () => {
    const result = await submitStudentFeedbackAction({
      rating: 5,
      likedMost: "x".repeat(201),
      improvements: "",
      publicConsent: false,
    });

    expect(result.ok).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
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

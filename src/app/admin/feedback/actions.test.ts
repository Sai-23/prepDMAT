import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(), moderate: vi.fn(), revalidatePath: vi.fn(), revalidateTag: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath, revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/feedback/data", () => ({
  TESTIMONIAL_CACHE_TAG: "public-student-testimonials",
  moderateFeedback: mocks.moderate,
}));

import { moderateFeedbackAction } from "./actions";

const id = "10000000-0000-4000-8000-000000000001";

describe("feedback moderation action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ user: { id: "admin" }, roles: ["admin"] });
    mocks.moderate.mockResolvedValue({ id });
  });

  it("requires the admin role", async () => {
    mocks.requireRole.mockRejectedValue(new Error("redirected"));
    await expect(moderateFeedbackAction({ feedbackId: id, action: "approve" })).rejects.toThrow("redirected");
    expect(mocks.moderate).not.toHaveBeenCalled();
  });

  it.each(["approve", "reject", "feature", "unfeature"] as const)("performs %s and expires the public cache", async (action) => {
    await expect(moderateFeedbackAction({ feedbackId: id, action })).resolves.toEqual({ ok: true });
    expect(mocks.moderate).toHaveBeenCalledWith("admin", { feedbackId: id, action });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("public-student-testimonials", { expire: 0 });
  });

  it("validates edited public text independently of the original", async () => {
    await moderateFeedbackAction({ feedbackId: id, action: "edit_testimonial", testimonialPublic: "Lightly edited" });
    expect(mocks.moderate).toHaveBeenCalledWith("admin", { feedbackId: id, action: "edit_testimonial", testimonialPublic: "Lightly edited" });
  });
});

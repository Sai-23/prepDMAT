import { describe, expect, it } from "vitest";

import { canFeatureFeedback, moderationUpdate, publicStudentName, type FeedbackRecord } from "./model";
import { studentFeedbackInputSchema } from "./schemas";
import { toPublicTestimonials } from "./data";

const base: FeedbackRecord = {
  id: "10000000-0000-4000-8000-000000000001",
  user_id: "20000000-0000-4000-8000-000000000001",
  rating: 5,
  liked_most: "The focused practice helped.",
  improvements: "More examples please.",
  public_consent: true,
  status: "pending",
  is_featured: false,
  testimonial_public: null,
  created_at: "2026-09-27T00:00:00.000Z",
  updated_at: "2026-09-27T00:00:00.000Z",
  reviewed_at: null,
  reviewed_by: null,
};

describe("student feedback validation", () => {
  it("trims required positive feedback and normalizes empty optional improvement text", () => {
    expect(studentFeedbackInputSchema.parse({ rating: 4, likedMost: "  Mock tests  ", improvements: "  ", publicConsent: true }))
      .toEqual({ rating: 4, likedMost: "Mock tests", improvements: null, publicConsent: true });
  });

  it.each([undefined, "", " ", "     ", "\n", "\n\n", "\t"])(
    "rejects missing or whitespace-only positive feedback %j",
    (likedMost) => {
      expect(studentFeedbackInputSchema.safeParse({ rating: 4, likedMost, improvements: "", publicConsent: false }).success)
        .toBe(false);
    },
  );

  it("accepts omitted optional improvement text", () => {
    expect(studentFeedbackInputSchema.parse({ rating: 4, likedMost: "Practice", publicConsent: false }))
      .toEqual({ rating: 4, likedMost: "Practice", improvements: null, publicConsent: false });
  });

  it.each([0, 1.5, 6])("rejects invalid rating %s", (rating) => {
    expect(studentFeedbackInputSchema.safeParse({ rating, likedMost: "Good", improvements: "", publicConsent: false }).success).toBe(false);
  });

  it("enforces both text limits and rejects moderation or identity fields", () => {
    expect(studentFeedbackInputSchema.safeParse({ rating: 5, likedMost: "x".repeat(201), improvements: "", publicConsent: false }).success).toBe(false);
    expect(studentFeedbackInputSchema.safeParse({ rating: 5, likedMost: "Good", improvements: "x".repeat(201), publicConsent: false }).success).toBe(false);
    expect(studentFeedbackInputSchema.safeParse({ rating: 5, likedMost: "Good", improvements: "", publicConsent: true, userId: "spoofed", status: "approved", isFeatured: true }).success).toBe(false);
  });
});

describe("feedback moderation", () => {
  it("approves without changing the original and copies eligible positive text", () => {
    const update = moderationUpdate(base, { feedbackId: base.id, action: "approve" }, "admin", "now");
    expect(update).toMatchObject({ status: "approved", testimonial_public: base.liked_most, is_featured: false });
    expect(update).not.toHaveProperty("liked_most");
  });

  it("rejects privately and removes public eligibility", () => {
    expect(moderationUpdate({ ...base, status: "approved", is_featured: true }, { feedbackId: base.id, action: "reject" }, "admin", "now"))
      .toMatchObject({ status: "rejected", is_featured: false, testimonial_public: null });
  });

  it("features only approved, consented feedback with positive text", () => {
    const approved = { ...base, status: "approved" as const };
    expect(canFeatureFeedback(approved)).toBe(true);
    expect(moderationUpdate(approved, { feedbackId: base.id, action: "feature" }, "admin", "now")).toMatchObject({ is_featured: true });
    for (const ineligible of [
      { ...approved, status: "pending" as const },
      { ...approved, public_consent: false },
      { ...approved, liked_most: "" },
      { ...approved, liked_most: null },
    ]) expect(() => moderationUpdate(ineligible, { feedbackId: base.id, action: "feature" }, "admin", "now")).toThrow("FEEDBACK_NOT_ELIGIBLE");
  });
});

describe("public testimonial projection", () => {
  it("returns only approved, consented, featured reviews and strips every private field", () => {
    const eligible = { ...base, status: "approved" as const, is_featured: true, testimonial_public: "Public wording" };
    const result = toPublicTestimonials([
      eligible,
      { ...eligible, id: "2", status: "pending" },
      { ...eligible, id: "3", status: "rejected" },
      { ...eligible, id: "4", public_consent: false },
      { ...eligible, id: "5", is_featured: false },
      { ...eligible, id: "6", testimonial_public: "   " },
    ], [{ id: base.user_id, display_name: "Ananya Sharma", full_name: null }]);
    expect(result).toEqual([{ id: eligible.id, rating: 5, testimonial: "Public wording", displayName: "Ananya", createdAt: eligible.created_at }]);
    expect(JSON.stringify(result)).not.toMatch(/improvements|user_id|reviewed_by|status|public_consent/);
  });

  it("never derives public names from email-like values", () => {
    expect(publicStudentName("student@example.com", null)).toBe("PrepDMAT student");
    expect(publicStudentName(null, "Mira Patel")).toBe("Mira");
  });
});

import type { FeedbackModerationInput, FeedbackStatus } from "@/lib/feedback/schemas";

export type FeedbackRecord = {
  id: string;
  user_id: string;
  rating: number;
  liked_most: string | null;
  improvements: string | null;
  public_consent: boolean;
  status: FeedbackStatus;
  is_featured: boolean;
  testimonial_public: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type PublicTestimonial = {
  id: string;
  rating: number;
  testimonial: string;
  displayName: string;
  createdAt: string;
};

export function publicStudentName(displayName: string | null, fullName: string | null) {
  const candidate = [displayName, fullName]
    .map((value) => value?.trim() ?? "")
    .find((value) => value && !value.includes("@"));
  const firstName = candidate?.split(/\s+/)[0]?.replace(/[^\p{L}'’-]/gu, "").slice(0, 40);
  return firstName || "PrepDMAT student";
}

export function canFeatureFeedback(feedback: Pick<FeedbackRecord, "status" | "public_consent" | "liked_most">) {
  return feedback.status === "approved"
    && feedback.public_consent
    && Boolean(feedback.liked_most?.trim());
}

export function moderationUpdate(
  feedback: FeedbackRecord,
  input: FeedbackModerationInput,
  adminId: string,
  reviewedAt: string,
) {
  const audit = { reviewed_by: adminId, reviewed_at: reviewedAt };
  if (input.action === "approve") {
    const eligibleText = feedback.public_consent ? feedback.liked_most?.trim() || null : null;
    return { ...audit, status: "approved" as const, is_featured: false, testimonial_public: eligibleText };
  }
  if (input.action === "reject") {
    return { ...audit, status: "rejected" as const, is_featured: false, testimonial_public: null };
  }
  if (input.action === "feature") {
    if (!canFeatureFeedback(feedback)) throw new Error("FEEDBACK_NOT_ELIGIBLE");
    return {
      ...audit,
      is_featured: true,
      testimonial_public: feedback.testimonial_public?.trim() || feedback.liked_most!.trim(),
    };
  }
  if (input.action === "unfeature") return { ...audit, is_featured: false };
  if (!canFeatureFeedback(feedback)) throw new Error("FEEDBACK_NOT_ELIGIBLE");
  return {
    ...audit,
    testimonial_public: input.testimonialPublic,
    is_featured: input.testimonialPublic ? feedback.is_featured : false,
  };
}

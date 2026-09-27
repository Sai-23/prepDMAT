"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import { moderateFeedback, TESTIMONIAL_CACHE_TAG } from "@/lib/feedback/data";
import { feedbackModerationInputSchema } from "@/lib/feedback/schemas";

export async function moderateFeedbackAction(input: unknown) {
  const { user } = await requireRole(["admin"]);
  const parsed = feedbackModerationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "The moderation request is invalid." };
  try {
    const feedback = await moderateFeedback(user.id, parsed.data);
    revalidateTag(TESTIMONIAL_CACHE_TAG, { expire: 0 });
    revalidatePath("/");
    revalidatePath("/admin/feedback");
    return { ok: true as const, feedback };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error && error.message === "FEEDBACK_NOT_ELIGIBLE"
        ? "Only approved, consented feedback with positive text can be featured."
        : "The feedback could not be updated.",
    };
  }
}

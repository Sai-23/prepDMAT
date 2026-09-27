"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { createStudentFeedback, FeedbackAlreadySubmittedError } from "@/lib/feedback/data";
import { studentFeedbackInputSchema } from "@/lib/feedback/schemas";

export type SubmitFeedbackResult =
  | { ok: true; submission: "created" | "already_submitted"; publicConsent: boolean | null }
  | { ok: false; error: string };

export async function submitStudentFeedbackAction(input: unknown): Promise<SubmitFeedbackResult> {
  const user = await requireUser();
  const parsed = studentFeedbackInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check your rating and keep each response under 200 characters." };
  try {
    const created = await createStudentFeedback(user.id, parsed.data);
    revalidatePath("/feedback");
    return { ok: true, submission: "created", publicConsent: created.public_consent };
  } catch (error) {
    if (error instanceof FeedbackAlreadySubmittedError) {
      revalidatePath("/feedback");
      return { ok: true, submission: "already_submitted", publicConsent: null };
    }
    return { ok: false, error: "We couldn't save your feedback. Your answers are still here—please try again." };
  }
}

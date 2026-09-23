"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { GENERAL_ACADEMIC_UNAVAILABLE, isGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { toggleGeneralAcademicBookmark } from "@/lib/general-academic/learning-data";
import { retryGeneralAcademicMockSourcePack } from "@/lib/general-academic/mock-data";
import { GeneralAcademicPracticeError, retryGeneralAcademicPracticePack } from "@/lib/general-academic/practice-data";

export async function toggleGeneralAcademicBookmarkAction(input: unknown) {
  const user = await requireUser();
  if (!isGeneralAcademicEnabled()) return { ok: false as const, message: GENERAL_ACADEMIC_UNAVAILABLE };
  try {
    const bookmarked = await toggleGeneralAcademicBookmark(user.id, input);
    revalidatePath("/practice/general-academic/bookmarks");
    revalidatePath("/practice/general-academic/mistakes");
    return { ok: true as const, bookmarked };
  } catch {
    return { ok: false as const, message: "Unable to update this bookmark. Try again." };
  }
}

export async function retryGeneralAcademicPracticePackAction(input: unknown) {
  const user = await requireUser();
  if (!isGeneralAcademicEnabled()) return { ok: false as const, message: GENERAL_ACADEMIC_UNAVAILABLE };
  const attemptId = input !== null && typeof input === "object" && "attemptId" in input ? input.attemptId : null;
  const source = input !== null && typeof input === "object" && "source" in input ? input.source : "practice";
  const packId = input !== null && typeof input === "object" && "packId" in input ? input.packId : null;
  if (typeof attemptId !== "string") return { ok: false as const, message: "The retry request is invalid." };
  try {
    const attempt = source === "mock" && typeof packId === "string"
      ? await retryGeneralAcademicMockSourcePack(user.id, attemptId, packId)
      : await retryGeneralAcademicPracticePack(user.id, attemptId);
    revalidatePath("/practice/general-academic");
    return { ok: true as const, attemptId: attempt.id };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof GeneralAcademicPracticeError ? error.message : "Unable to start this source pack again.",
    };
  }
}

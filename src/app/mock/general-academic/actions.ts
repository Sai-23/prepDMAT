"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { GENERAL_ACADEMIC_UNAVAILABLE, isGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import {
  GeneralAcademicMockError,
  saveGeneralAcademicMockState,
  startGeneralAcademicMock,
  submitGeneralAcademicMock,
} from "@/lib/general-academic/mock-data";

const safeFailure = (error: unknown, fallback: string) => ({
  ok: false as const,
  message: error instanceof GeneralAcademicMockError ? error.message : fallback,
});

export async function startGeneralAcademicMockAction() {
  const user = await requireUser();
  if (!isGeneralAcademicEnabled()) return { ok: false as const, message: GENERAL_ACADEMIC_UNAVAILABLE };
  try {
    const attempt = await startGeneralAcademicMock(user.id);
    revalidatePath("/mock/general-academic");
    revalidatePath("/mock/general-academic/history");
    return { ok: true as const, attemptId: attempt.id };
  } catch (error) {
    return safeFailure(error, "Unable to start the General Academic mock.");
  }
}

export async function saveGeneralAcademicMockAction(input: unknown) {
  const user = await requireUser();
  if (!isGeneralAcademicEnabled()) return { ok: false as const, message: GENERAL_ACADEMIC_UNAVAILABLE };
  try {
    const status = await saveGeneralAcademicMockState(user.id, input);
    return { ok: true as const, status };
  } catch (error) {
    return safeFailure(error, "Unable to save your mock answer. Try again.");
  }
}

export async function submitGeneralAcademicMockAction(input: unknown) {
  const user = await requireUser();
  if (!isGeneralAcademicEnabled()) return { ok: false as const, message: GENERAL_ACADEMIC_UNAVAILABLE };
  const attemptId = input && typeof input === "object" && "attemptId" in input ? input.attemptId : null;
  if (typeof attemptId !== "string") return { ok: false as const, message: "The mock submission is invalid." };
  try {
    await submitGeneralAcademicMock(user.id, attemptId);
    revalidatePath("/mock/general-academic");
    revalidatePath("/mock/general-academic/history");
    revalidatePath("/progress/general-academic");
    revalidatePath("/practice/general-academic/mistakes");
    return { ok: true as const, attemptId };
  } catch (error) {
    return safeFailure(error, "Unable to submit the General Academic mock. Try again.");
  }
}

"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { GENERAL_ACADEMIC_UNAVAILABLE, isGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import {
  abandonGeneralAcademicPractice,
  GeneralAcademicPracticeError,
  saveGeneralAcademicPracticeState,
  startGeneralAcademicPractice,
  submitGeneralAcademicPractice,
} from "@/lib/general-academic/practice-data";

type ActionFailure = { ok: false; code: string; message: string };

function safeFailure(error: unknown, fallback: string): ActionFailure {
  if (error instanceof GeneralAcademicPracticeError) return { ok: false, code: error.code, message: error.message };
  return { ok: false, code: "PRACTICE_FAILED", message: fallback };
}

export async function startGeneralAcademicPracticeAction(input: unknown) {
  const user = await requireUser();
  if (!isGeneralAcademicEnabled()) return { ok: false as const, code: "FEATURE_DISABLED", message: GENERAL_ACADEMIC_UNAVAILABLE };
  try {
    const attempt = await startGeneralAcademicPractice(user.id, input);
    revalidatePath("/practice/general-academic");
    return { ok: true as const, attemptId: attempt.id };
  } catch (error) {
    return safeFailure(error, "General Academic practice could not be started.");
  }
}

export async function saveGeneralAcademicPracticeAction(input: unknown) {
  const user = await requireUser();
  if (!isGeneralAcademicEnabled()) return { ok: false as const, code: "FEATURE_DISABLED", message: GENERAL_ACADEMIC_UNAVAILABLE };
  try {
    await saveGeneralAcademicPracticeState(user.id, input);
    return { ok: true as const };
  } catch (error) {
    return safeFailure(error, "Your practice progress could not be saved. Try again.");
  }
}

export async function submitGeneralAcademicPracticeAction(input: unknown) {
  const user = await requireUser();
  if (!isGeneralAcademicEnabled()) return { ok: false as const, code: "FEATURE_DISABLED", message: GENERAL_ACADEMIC_UNAVAILABLE };
  const attemptId = input !== null && typeof input === "object" && "attemptId" in input
    ? input.attemptId
    : null;
  if (typeof attemptId !== "string") return { ok: false as const, code: "INVALID_REQUEST", message: "The practice submission is invalid." };
  try {
    await submitGeneralAcademicPractice(user.id, attemptId);
    revalidatePath(`/practice/general-academic/${attemptId}`);
    revalidatePath(`/practice/general-academic/${attemptId}/results`);
    revalidatePath("/dashboard");
    return { ok: true as const, attemptId };
  } catch (error) {
    return safeFailure(error, "General Academic practice could not be submitted.");
  }
}

export async function abandonGeneralAcademicPracticeAction(input: unknown) {
  const user = await requireUser();
  if (!isGeneralAcademicEnabled()) return { ok: false as const, code: "FEATURE_DISABLED", message: GENERAL_ACADEMIC_UNAVAILABLE };
  const attemptId = input !== null && typeof input === "object" && "attemptId" in input
    ? input.attemptId
    : null;
  if (typeof attemptId !== "string") return { ok: false as const, code: "INVALID_REQUEST", message: "The practice request is invalid." };
  try {
    await abandonGeneralAcademicPractice(user.id, attemptId);
    revalidatePath("/practice/general-academic");
    return { ok: true as const };
  } catch (error) {
    return safeFailure(error, "General Academic practice could not be closed.");
  }
}

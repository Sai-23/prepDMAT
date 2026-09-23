"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { GeneralAcademicLifecycleError, transitionGeneralAcademicPack } from "@/lib/general-academic/lifecycle-persistence";
import { generalAcademicLifecycleInputSchema } from "@/lib/general-academic/lifecycle";
import { GENERAL_ACADEMIC_REVIEW_STATUSES } from "@/lib/general-academic/registries";
import type { GeneralAcademicQualityResult } from "@/lib/general-academic/quality";

export type GeneralAcademicLifecycleActionResult =
  | { ok: true; status: typeof GENERAL_ACADEMIC_REVIEW_STATUSES[number]; duplicateTitles: string[]; message: string }
  | { ok: false; code: string; message: string; quality?: GeneralAcademicQualityResult };

export async function transitionGeneralAcademicPackAction(
  packId: unknown,
  targetStatus: unknown,
  input: unknown,
): Promise<GeneralAcademicLifecycleActionResult> {
  const { user } = await requireRole(["admin"]);
  const id = z.string().uuid().safeParse(packId);
  const target = z.enum(GENERAL_ACADEMIC_REVIEW_STATUSES).safeParse(targetStatus);
  const details = generalAcademicLifecycleInputSchema.safeParse(input);
  if (!id.success || !target.success || !details.success) return { ok: false, code: "INVALID_REQUEST", message: "Check the lifecycle request and try again." };
  try {
    const result = await transitionGeneralAcademicPack(id.data, target.data, details.data, user.id);
    revalidatePath("/admin/general-academic");
    revalidatePath("/admin/general-academic/coverage");
    revalidatePath("/admin/general-academic/quality");
    revalidatePath("/admin/general-academic/review");
    revalidatePath(`/admin/general-academic/${id.data}/review`);
    revalidatePath(`/admin/general-academic/${id.data}/edit`);
    return {
      ok: true,
      status: result.to,
      duplicateTitles: result.duplicateTitles,
      message: result.duplicateTitles.length
        ? `Status changed to ${result.to.replaceAll("_", " ")}. Identical published content exists.`
        : `Status changed to ${result.to.replaceAll("_", " ")}.`,
    };
  } catch (error) {
    if (error instanceof GeneralAcademicLifecycleError) return { ok: false, code: error.code, message: error.message, quality: error.quality };
    return { ok: false, code: "TRANSITION_FAILED", message: "The lifecycle transition could not be completed." };
  }
}

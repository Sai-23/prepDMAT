"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import { createGeneralAcademicContentFingerprint } from "@/lib/general-academic/fingerprint";
import {
  createGeneralAcademicDraft,
  findGeneralAcademicPacksByFingerprintForAdmin,
  GeneralAcademicPersistenceError,
  updateGeneralAcademicDraft,
} from "@/lib/general-academic/persistence";
import { canonicalGeneralAcademicPackSchema } from "@/lib/general-academic/schemas";
import { findingsFromZodIssues, type GeneralAcademicValidationFinding } from "@/lib/general-academic/validation";

export type GeneralAcademicSaveResult =
  | {
      ok: true;
      id: string;
      contentFingerprint: string;
      duplicateTitles: string[];
      message: string;
    }
  | {
      ok: false;
      message: string;
      errors: GeneralAcademicValidationFinding[];
    };

function draftInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const record = input as Record<string, unknown>;
  const review = record.review && typeof record.review === "object" && !Array.isArray(record.review)
    ? record.review as Record<string, unknown>
    : {};
  return { ...record, review: { ...review, status: "draft" } };
}

export async function saveGeneralAcademicDraftAction(
  input: unknown,
  packId?: string | null,
): Promise<GeneralAcademicSaveResult> {
  const { user } = await requireRole(["admin"]);
  const parsed = canonicalGeneralAcademicPackSchema.safeParse(draftInput(input));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Resolve the validation errors before saving this draft.",
      errors: findingsFromZodIssues(parsed.error.issues),
    };
  }

  try {
    const fingerprint = createGeneralAcademicContentFingerprint(parsed.data);
    const duplicates = await findGeneralAcademicPacksByFingerprintForAdmin(fingerprint, user.id);
    const otherDuplicates = duplicates.filter((item) => item.id !== packId);
    const stored = packId
      ? await updateGeneralAcademicDraft(packId, parsed.data, user.id)
      : await createGeneralAcademicDraft(parsed.data, user.id);
    revalidatePath("/admin/general-academic");
    revalidatePath("/admin/general-academic/coverage");
    revalidatePath("/admin/general-academic/quality");
    revalidatePath("/admin/general-academic/review");
    revalidatePath(`/admin/general-academic/${stored.id}/edit`);
    return {
      ok: true,
      id: stored.id,
      contentFingerprint: stored.contentFingerprint,
      duplicateTitles: otherDuplicates.map((item) => item.title),
      message: otherDuplicates.length
        ? "Draft saved. An identical source pack already exists."
        : "Draft saved.",
    };
  } catch (error) {
    const message = error instanceof GeneralAcademicPersistenceError
      ? error.message
      : "Unable to save the General Academic draft.";
    return { ok: false, message, errors: [] };
  }
}

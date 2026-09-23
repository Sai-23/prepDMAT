import "server-only";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  canTransitionGeneralAcademicPack,
  generalAcademicReviewChecklistSchema,
  type GeneralAcademicReviewStatus,
} from "./lifecycle";
import { fetchGeneralAcademicPackForAdmin, type StoredGeneralAcademicPack } from "./persistence";
import { evaluateGeneralAcademicPackQuality, type GeneralAcademicQualityResult } from "./quality";

export interface GeneralAcademicLifecycleRepository {
  isAdmin(userId: string): Promise<boolean>;
  loadPack(packId: string, actorId: string): Promise<StoredGeneralAcademicPack | null>;
  transition(input: {
    actorId: string;
    packId: string;
    expectedFrom: GeneralAcademicReviewStatus;
    to: GeneralAcademicReviewStatus;
    notes: string | null;
  }): Promise<void>;
  findPublishedDuplicates(fingerprint: string, excludePackId: string): Promise<string[]>;
}

export class GeneralAcademicLifecycleError extends Error {
  constructor(
    message: string,
    readonly code: "ADMIN_REQUIRED" | "PACK_NOT_FOUND" | "INVALID_TRANSITION" | "CHECKLIST_REQUIRED" | "REJECTION_REASON_REQUIRED" | "QUALITY_BLOCKED" | "TRANSITION_FAILED",
    readonly quality?: GeneralAcademicQualityResult,
  ) {
    super(message);
    this.name = "GeneralAcademicLifecycleError";
  }
}

function createLifecycleRepository(): GeneralAcademicLifecycleRepository {
  const admin = createSupabaseAdminClient();
  return {
    async isAdmin(userId) {
      const { data, error } = await admin.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (error) return false;
      return Boolean(data);
    },
    loadPack: fetchGeneralAcademicPackForAdmin,
    async transition({ actorId, packId, expectedFrom, to, notes }) {
      const { error } = await admin.rpc("transition_general_academic_pack", {
        p_actor_id: actorId,
        p_pack_id: packId,
        p_expected_from: expectedFrom,
        p_to_status: to,
        p_notes: notes,
      });
      if (error) throw new GeneralAcademicLifecycleError("The lifecycle transition could not be completed.", "TRANSITION_FAILED");
    },
    async findPublishedDuplicates(fingerprint, excludePackId) {
      const { data, error } = await admin
        .from("general_academic_source_packs")
        .select("id, title")
        .eq("content_fingerprint", fingerprint)
        .eq("review_status", "published")
        .neq("id", excludePackId)
        .is("deleted_at", null)
        .limit(20)
        .overrideTypes<Array<{ id: string; title: string }>, { merge: false }>();
      if (error) return [];
      return (data ?? []).map((item) => item.title);
    },
  };
}

export async function transitionGeneralAcademicPack(
  packId: string,
  to: GeneralAcademicReviewStatus,
  input: { checklist?: unknown; notes?: string },
  adminUserId: string,
  repository: GeneralAcademicLifecycleRepository = createLifecycleRepository(),
) {
  if (!z.string().uuid().safeParse(packId).success
    || !z.string().uuid().safeParse(adminUserId).success
    || !(await repository.isAdmin(adminUserId))) {
    throw new GeneralAcademicLifecycleError("Administrator access is required.", "ADMIN_REQUIRED");
  }
  const stored = await repository.loadPack(packId, adminUserId);
  if (!stored) throw new GeneralAcademicLifecycleError("General Academic pack was not found.", "PACK_NOT_FOUND");
  const from = stored.pack.review.status;
  if (!canTransitionGeneralAcademicPack(from, to)) {
    throw new GeneralAcademicLifecycleError(`Transition from ${from} to ${to} is not allowed.`, "INVALID_TRANSITION");
  }
  if (to === "approved" && !generalAcademicReviewChecklistSchema.safeParse(input.checklist).success) {
    throw new GeneralAcademicLifecycleError("Complete every human review confirmation before approval.", "CHECKLIST_REQUIRED");
  }
  const notes = input.notes?.trim() || null;
  if (to === "rejected" && !notes) {
    throw new GeneralAcademicLifecycleError("A review reason is required when rejecting content.", "REJECTION_REASON_REQUIRED");
  }

  const quality = evaluateGeneralAcademicPackQuality(stored.pack);
  if (quality.blocking.length) {
    throw new GeneralAcademicLifecycleError("Resolve all blocking quality findings before changing lifecycle state.", "QUALITY_BLOCKED", quality);
  }
  const duplicateTitles = to === "approved" || to === "published"
    ? await repository.findPublishedDuplicates(stored.contentFingerprint, stored.id)
    : [];
  await repository.transition({ actorId: adminUserId, packId, expectedFrom: from, to, notes });
  return { from, to, quality, duplicateTitles };
}

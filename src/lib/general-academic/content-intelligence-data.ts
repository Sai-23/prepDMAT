import "server-only";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  getGeneralAcademicInventoryHealth,
  prioritizeGeneralAcademicReviewQueue,
  type GeneralAcademicInventoryPack,
} from "./content-intelligence";
import {
  restoreCanonicalGeneralAcademicPack,
  restoreGeneralAcademicLifecycle,
  type GeneralAcademicQuestionRow,
  type GeneralAcademicSourcePackRow,
} from "./persistence";

type InventoryQuestionRow = GeneralAcademicQuestionRow & { source_pack_id: string };

export interface GeneralAcademicContentIntelligenceRepository {
  isAdmin(userId: string): Promise<boolean>;
  listInventory(): Promise<GeneralAcademicInventoryPack[]>;
}

export class GeneralAcademicContentIntelligenceError extends Error {
  constructor(message: string, readonly code: "ADMIN_REQUIRED" | "LOAD_FAILED") {
    super(message);
    this.name = "GeneralAcademicContentIntelligenceError";
  }
}

const PACK_SELECT = "id, schema_version, title, domain, topic, difficulty, origin, source_meta, stimulus_text, stimulus_json, tags, review_status, review_notes, reviewed_by, reviewed_at, approved_by, approved_at, published_by, published_at, content_fingerprint, created_at, updated_at";
const QUESTION_SELECT = "source_pack_id, local_id, order_index, skill, difficulty, prompt, options_json, correct_option, explanation_json, validation_json";

function chunks<T>(values: readonly T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

export function createGeneralAcademicContentIntelligenceRepository(): GeneralAcademicContentIntelligenceRepository {
  const admin = createSupabaseAdminClient();
  return {
    async isAdmin(userId) {
      const { data, error } = await admin.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (error) return false;
      return Boolean(data);
    },
    async listInventory() {
      const { data: packs, error: packError } = await admin
        .from("general_academic_source_packs")
        .select(PACK_SELECT)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(1_000)
        .overrideTypes<GeneralAcademicSourcePackRow[], { merge: false }>();
      if (packError) throw new GeneralAcademicContentIntelligenceError("Unable to load General Academic inventory.", "LOAD_FAILED");
      if (!packs?.length) return [];

      const questionGroups = await Promise.all(chunks(packs.map((pack) => pack.id), 100).map(async (packIds) => {
        const { data, error } = await admin
          .from("general_academic_questions")
          .select(QUESTION_SELECT)
          .in("source_pack_id", packIds)
          .order("source_pack_id")
          .order("order_index")
          .limit(2_000)
          .overrideTypes<InventoryQuestionRow[], { merge: false }>();
        if (error) throw new GeneralAcademicContentIntelligenceError("Unable to load General Academic questions.", "LOAD_FAILED");
        return data ?? [];
      }));
      const byPack = new Map<string, GeneralAcademicQuestionRow[]>();
      for (const question of questionGroups.flat()) {
        const values = byPack.get(question.source_pack_id) ?? [];
        values.push(question);
        byPack.set(question.source_pack_id, values);
      }
      return packs.map((sourcePack) => ({
        id: sourcePack.id,
        pack: restoreCanonicalGeneralAcademicPack(sourcePack, byPack.get(sourcePack.id) ?? []),
        contentFingerprint: sourcePack.content_fingerprint,
        createdAt: sourcePack.created_at,
        updatedAt: sourcePack.updated_at,
        lifecycle: restoreGeneralAcademicLifecycle(sourcePack),
      }));
    },
  };
}

async function requireAdmin(repository: GeneralAcademicContentIntelligenceRepository, userId: string) {
  if (!z.string().uuid().safeParse(userId).success || !(await repository.isAdmin(userId))) {
    throw new GeneralAcademicContentIntelligenceError("Administrator access is required.", "ADMIN_REQUIRED");
  }
}

export async function loadGeneralAcademicInventoryForAdmin(
  adminUserId: string,
  repository: GeneralAcademicContentIntelligenceRepository = createGeneralAcademicContentIntelligenceRepository(),
) {
  await requireAdmin(repository, adminUserId);
  return repository.listInventory();
}

export async function getGeneralAcademicContentIntelligenceForAdmin(
  adminUserId: string,
  repository: GeneralAcademicContentIntelligenceRepository = createGeneralAcademicContentIntelligenceRepository(),
) {
  const inventory = await loadGeneralAcademicInventoryForAdmin(adminUserId, repository);
  const health = getGeneralAcademicInventoryHealth(inventory);
  return { inventory, health, reviewQueue: prioritizeGeneralAcademicReviewQueue(inventory) };
}

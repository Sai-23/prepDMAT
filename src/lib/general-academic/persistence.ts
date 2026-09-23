import "server-only";

import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { createGeneralAcademicContentFingerprint } from "./fingerprint";
import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";

export type GeneralAcademicSourcePackRow = {
  id: string;
  schema_version: string;
  title: string;
  domain: CanonicalGeneralAcademicPack["domain"];
  topic: string;
  difficulty: CanonicalGeneralAcademicPack["difficulty"];
  origin: CanonicalGeneralAcademicPack["origin"];
  source_meta: CanonicalGeneralAcademicPack["sourceMeta"];
  stimulus_text: string;
  stimulus_json: Omit<CanonicalGeneralAcademicPack["stimulus"], "text">;
  tags: string[];
  review_status: CanonicalGeneralAcademicPack["review"]["status"];
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_by: string | null;
  published_at: string | null;
  content_fingerprint: string;
  created_at: string;
  updated_at: string;
};

export type GeneralAcademicQuestionRow = {
  local_id: string;
  order_index: number;
  skill: CanonicalGeneralAcademicPack["questions"][number]["skill"];
  difficulty: CanonicalGeneralAcademicPack["questions"][number]["difficulty"];
  prompt: string;
  options_json: CanonicalGeneralAcademicPack["questions"][number]["options"];
  correct_option: CanonicalGeneralAcademicPack["questions"][number]["correctOption"];
  explanation_json: CanonicalGeneralAcademicPack["questions"][number]["explanation"];
  validation_json: CanonicalGeneralAcademicPack["questions"][number]["validation"] | null;
};

export type StoredGeneralAcademicPack = {
  id: string;
  pack: CanonicalGeneralAcademicPack;
  contentFingerprint: string;
  createdAt: string;
  updatedAt: string;
  lifecycle: {
    reviewedBy: string | null;
    reviewedAt: string | null;
    approvedBy: string | null;
    approvedAt: string | null;
    publishedBy: string | null;
    publishedAt: string | null;
  };
};

export type GeneralAcademicDraftSummary = {
  id: string;
  title: string;
  domain: CanonicalGeneralAcademicPack["domain"];
  topic: string;
  difficulty: CanonicalGeneralAcademicPack["difficulty"];
  origin: CanonicalGeneralAcademicPack["origin"];
  reviewStatus: CanonicalGeneralAcademicPack["review"]["status"];
  questionCount: number;
  contentFingerprint: string;
  updatedAt: string;
};

type DraftSummaryRow = {
  id: string;
  title: string;
  domain: GeneralAcademicDraftSummary["domain"];
  topic: string;
  difficulty: GeneralAcademicDraftSummary["difficulty"];
  origin: GeneralAcademicDraftSummary["origin"];
  review_status: GeneralAcademicDraftSummary["reviewStatus"];
  content_fingerprint: string;
  updated_at: string;
};

export interface GeneralAcademicCatalogRepository {
  isAdmin(userId: string): Promise<boolean>;
  listDrafts(): Promise<GeneralAcademicDraftSummary[]>;
  findByFingerprint(fingerprint: string): Promise<Array<{ id: string; title: string }>>;
}

export interface GeneralAcademicDraftRepository {
  isAdmin(userId: string): Promise<boolean>;
  createDraft(input: {
    actorId: string;
    pack: CanonicalGeneralAcademicPack;
    contentFingerprint: string;
  }): Promise<string>;
  updateDraft(input: {
    actorId: string;
    packId: string;
    pack: CanonicalGeneralAcademicPack;
    contentFingerprint: string;
  }): Promise<void>;
  fetchPack(packId: string): Promise<{ sourcePack: GeneralAcademicSourcePackRow; questions: GeneralAcademicQuestionRow[] } | null>;
}

export class GeneralAcademicPersistenceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "ADMIN_REQUIRED"
      | "INVALID_PACK"
      | "CREATE_FAILED"
      | "UPDATE_FAILED"
      | "FETCH_FAILED",
  ) {
    super(message);
    this.name = "GeneralAcademicPersistenceError";
  }
}

function createRepository(): GeneralAcademicDraftRepository {
  const admin = createSupabaseAdminClient();
  return {
    async isAdmin(userId) {
      const { data, error } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw new GeneralAcademicPersistenceError("Unable to verify administrator access.", "ADMIN_REQUIRED");
      return Boolean(data);
    },
    async createDraft({ actorId, pack, contentFingerprint }) {
      const { data, error } = await admin.rpc("create_general_academic_draft", {
        p_actor_id: actorId,
        p_pack: pack,
        p_content_fingerprint: contentFingerprint,
      });
      if (error) throw new GeneralAcademicPersistenceError("Unable to create the General Academic draft.", "CREATE_FAILED");
      const id = z.string().uuid().safeParse(data);
      if (!id.success) throw new GeneralAcademicPersistenceError("Unable to create the General Academic draft.", "CREATE_FAILED");
      return id.data;
    },
    async updateDraft({ actorId, packId, pack, contentFingerprint }) {
      const { error } = await admin.rpc("update_general_academic_draft", {
        p_actor_id: actorId,
        p_pack_id: packId,
        p_pack: pack,
        p_content_fingerprint: contentFingerprint,
      });
      if (error) throw new GeneralAcademicPersistenceError("Unable to update the General Academic draft.", "UPDATE_FAILED");
    },
    async fetchPack(packId) {
      const [{ data: sourcePack, error: packError }, { data: questions, error: questionError }] = await Promise.all([
        admin
          .from("general_academic_source_packs")
          .select("id, schema_version, title, domain, topic, difficulty, origin, source_meta, stimulus_text, stimulus_json, tags, review_status, review_notes, reviewed_by, reviewed_at, approved_by, approved_at, published_by, published_at, content_fingerprint, created_at, updated_at")
          .eq("id", packId)
          .is("deleted_at", null)
          .maybeSingle()
          .overrideTypes<GeneralAcademicSourcePackRow | null, { merge: false }>(),
        admin
          .from("general_academic_questions")
          .select("local_id, order_index, skill, difficulty, prompt, options_json, correct_option, explanation_json, validation_json")
          .eq("source_pack_id", packId)
          .order("order_index")
          .overrideTypes<GeneralAcademicQuestionRow[], { merge: false }>(),
      ]);
      if (packError || questionError) throw new GeneralAcademicPersistenceError("Unable to load the General Academic draft.", "FETCH_FAILED");
      return sourcePack ? { sourcePack, questions: questions ?? [] } : null;
    },
  };
}

function createCatalogRepository(): GeneralAcademicCatalogRepository {
  const admin = createSupabaseAdminClient();
  return {
    async isAdmin(userId) {
      const { data, error } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw new GeneralAcademicPersistenceError("Unable to verify administrator access.", "ADMIN_REQUIRED");
      return Boolean(data);
    },
    async listDrafts() {
      const { data: packs, error: packError } = await admin
        .from("general_academic_source_packs")
        .select("id, title, domain, topic, difficulty, origin, review_status, content_fingerprint, updated_at")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(250)
        .overrideTypes<DraftSummaryRow[], { merge: false }>();
      if (packError) throw new GeneralAcademicPersistenceError("Unable to load General Academic drafts.", "FETCH_FAILED");
      if (!packs?.length) return [];
      const { data: questions, error: questionError } = await admin
        .from("general_academic_questions")
        .select("source_pack_id")
        .in("source_pack_id", packs.map((pack) => pack.id))
        .overrideTypes<Array<{ source_pack_id: string }>, { merge: false }>();
      if (questionError) throw new GeneralAcademicPersistenceError("Unable to load General Academic drafts.", "FETCH_FAILED");
      const counts = new Map<string, number>();
      for (const question of questions ?? []) {
        counts.set(question.source_pack_id, (counts.get(question.source_pack_id) ?? 0) + 1);
      }
      return (packs ?? []).map((pack) => ({
        id: pack.id,
        title: pack.title,
        domain: pack.domain,
        topic: pack.topic,
        difficulty: pack.difficulty,
        origin: pack.origin,
        reviewStatus: pack.review_status,
        questionCount: counts.get(pack.id) ?? 0,
        contentFingerprint: pack.content_fingerprint,
        updatedAt: pack.updated_at,
      }));
    },
    async findByFingerprint(fingerprint) {
      const { data, error } = await admin
        .from("general_academic_source_packs")
        .select("id, title")
        .eq("content_fingerprint", fingerprint)
        .is("deleted_at", null)
        .limit(20)
        .overrideTypes<Array<{ id: string; title: string }>, { merge: false }>();
      if (error) throw new GeneralAcademicPersistenceError("Unable to check General Academic duplicates.", "FETCH_FAILED");
      return data ?? [];
    },
  };
}

function forceDraft(pack: CanonicalGeneralAcademicPack) {
  const parsed = canonicalGeneralAcademicPackSchema.safeParse({
    ...pack,
    review: { ...pack.review, status: "draft" },
  });
  if (!parsed.success) {
    throw new GeneralAcademicPersistenceError("The General Academic source pack is invalid.", "INVALID_PACK");
  }
  return parsed.data;
}

async function requireAdmin(repository: Pick<GeneralAcademicDraftRepository, "isAdmin">, userId: string) {
  if (!z.string().uuid().safeParse(userId).success || !(await repository.isAdmin(userId))) {
    throw new GeneralAcademicPersistenceError("Administrator access is required.", "ADMIN_REQUIRED");
  }
}

export function restoreCanonicalGeneralAcademicPack(
  sourcePack: GeneralAcademicSourcePackRow,
  questions: GeneralAcademicQuestionRow[],
): CanonicalGeneralAcademicPack {
  const stimulusParts = sourcePack.stimulus_json;
  const parsed = canonicalGeneralAcademicPackSchema.safeParse({
    schemaVersion: sourcePack.schema_version,
    title: sourcePack.title,
    domain: sourcePack.domain,
    topic: sourcePack.topic,
    difficulty: sourcePack.difficulty,
    origin: sourcePack.origin,
    sourceMeta: sourcePack.source_meta,
    stimulus: {
      text: sourcePack.stimulus_text,
      formulas: stimulusParts.formulas,
      tables: stimulusParts.tables,
      graphs: stimulusParts.graphs,
      figures: stimulusParts.figures,
    },
    questions: questions.map((question) => ({
      id: question.local_id,
      order: question.order_index,
      skill: question.skill,
      difficulty: question.difficulty,
      prompt: question.prompt,
      options: question.options_json,
      correctOption: question.correct_option,
      explanation: question.explanation_json,
      validation: question.validation_json,
    })),
    tags: sourcePack.tags,
    review: { status: sourcePack.review_status, notes: sourcePack.review_notes },
  });
  if (!parsed.success) {
    throw new GeneralAcademicPersistenceError("Stored General Academic content is inconsistent.", "FETCH_FAILED");
  }
  return parsed.data;
}

export function restoreGeneralAcademicLifecycle(
  sourcePack: GeneralAcademicSourcePackRow,
): StoredGeneralAcademicPack["lifecycle"] {
  return {
    reviewedBy: sourcePack.reviewed_by,
    reviewedAt: sourcePack.reviewed_at,
    approvedBy: sourcePack.approved_by,
    approvedAt: sourcePack.approved_at,
    publishedBy: sourcePack.published_by,
    publishedAt: sourcePack.published_at,
  };
}

export async function createGeneralAcademicDraft(
  pack: CanonicalGeneralAcademicPack,
  adminUserId: string,
  repository: GeneralAcademicDraftRepository = createRepository(),
): Promise<StoredGeneralAcademicPack> {
  await requireAdmin(repository, adminUserId);
  const draft = forceDraft(pack);
  const contentFingerprint = createGeneralAcademicContentFingerprint(draft);
  const id = await repository.createDraft({ actorId: adminUserId, pack: draft, contentFingerprint });
  const stored = await repository.fetchPack(id);
  if (!stored) throw new GeneralAcademicPersistenceError("Unable to reload the General Academic draft.", "FETCH_FAILED");
  return {
    id,
    pack: restoreCanonicalGeneralAcademicPack(stored.sourcePack, stored.questions),
    contentFingerprint: stored.sourcePack.content_fingerprint,
    createdAt: stored.sourcePack.created_at,
    updatedAt: stored.sourcePack.updated_at,
    lifecycle: restoreGeneralAcademicLifecycle(stored.sourcePack),
  };
}

export async function updateGeneralAcademicDraft(
  packId: string,
  pack: CanonicalGeneralAcademicPack,
  adminUserId: string,
  repository: GeneralAcademicDraftRepository = createRepository(),
): Promise<StoredGeneralAcademicPack> {
  await requireAdmin(repository, adminUserId);
  if (!z.string().uuid().safeParse(packId).success) {
    throw new GeneralAcademicPersistenceError("The General Academic draft identifier is invalid.", "UPDATE_FAILED");
  }
  const draft = forceDraft(pack);
  const contentFingerprint = createGeneralAcademicContentFingerprint(draft);
  await repository.updateDraft({ actorId: adminUserId, packId, pack: draft, contentFingerprint });
  const stored = await repository.fetchPack(packId);
  if (!stored) throw new GeneralAcademicPersistenceError("Unable to reload the General Academic draft.", "FETCH_FAILED");
  return {
    id: stored.sourcePack.id,
    pack: restoreCanonicalGeneralAcademicPack(stored.sourcePack, stored.questions),
    contentFingerprint: stored.sourcePack.content_fingerprint,
    createdAt: stored.sourcePack.created_at,
    updatedAt: stored.sourcePack.updated_at,
    lifecycle: restoreGeneralAcademicLifecycle(stored.sourcePack),
  };
}

export async function fetchGeneralAcademicPackForAdmin(
  packId: string,
  adminUserId: string,
  repository: GeneralAcademicDraftRepository = createRepository(),
): Promise<StoredGeneralAcademicPack | null> {
  await requireAdmin(repository, adminUserId);
  if (!z.string().uuid().safeParse(packId).success) return null;
  const stored = await repository.fetchPack(packId);
  if (!stored) return null;
  return {
    id: stored.sourcePack.id,
    pack: restoreCanonicalGeneralAcademicPack(stored.sourcePack, stored.questions),
    contentFingerprint: stored.sourcePack.content_fingerprint,
    createdAt: stored.sourcePack.created_at,
    updatedAt: stored.sourcePack.updated_at,
    lifecycle: restoreGeneralAcademicLifecycle(stored.sourcePack),
  };
}

export async function listGeneralAcademicDraftsForAdmin(
  adminUserId: string,
  repository: GeneralAcademicCatalogRepository = createCatalogRepository(),
) {
  await requireAdmin(repository, adminUserId);
  return repository.listDrafts();
}

export async function findGeneralAcademicPacksByFingerprintForAdmin(
  fingerprint: string,
  adminUserId: string,
  repository: GeneralAcademicCatalogRepository = createCatalogRepository(),
) {
  await requireAdmin(repository, adminUserId);
  if (!fingerprint.trim() || fingerprint.length > 128) return [];
  return repository.findByFingerprint(fingerprint);
}

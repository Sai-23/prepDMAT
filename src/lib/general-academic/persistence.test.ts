import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createGeneralAcademicDraft,
  fetchGeneralAcademicPackForAdmin,
  GeneralAcademicPersistenceError,
  type GeneralAcademicDraftRepository,
  updateGeneralAcademicDraft,
} from "./persistence";
import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";

const ADMIN_ID = "00000000-0000-4000-8000-000000000010";
const OTHER_ID = "00000000-0000-4000-8000-000000000020";
const PACK_ID = "00000000-0000-4000-8000-000000000030";
const CREATED_AT = "2026-09-01T12:00:00.000Z";

function fixture(): CanonicalGeneralAcademicPack {
  return canonicalGeneralAcademicPackSchema.parse(JSON.parse(readFileSync(resolve(
    process.cwd(),
    "docs/general-academic/examples/general-academic-pack-v1.json",
  ), "utf8")));
}

function createMemoryRepository() {
  let storedPack: CanonicalGeneralAcademicPack | null = null;
  let fingerprint = "";
  let createCalls = 0;

  const repository: GeneralAcademicDraftRepository = {
    async isAdmin(userId) {
      return userId === ADMIN_ID;
    },
    async createDraft(input) {
      createCalls += 1;
      storedPack = input.pack;
      fingerprint = input.contentFingerprint;
      return PACK_ID;
    },
    async updateDraft(input) {
      storedPack = input.pack;
      fingerprint = input.contentFingerprint;
    },
    async fetchPack(packId) {
      if (packId !== PACK_ID || !storedPack) return null;
      const pack = storedPack;
      const { text, ...stimulusJson } = pack.stimulus;
      return {
        sourcePack: {
          id: PACK_ID,
          schema_version: pack.schemaVersion,
          title: pack.title,
          domain: pack.domain,
          topic: pack.topic,
          difficulty: pack.difficulty,
          origin: pack.origin,
          source_meta: pack.sourceMeta,
          stimulus_text: text,
          stimulus_json: stimulusJson,
          tags: pack.tags,
          review_status: pack.review.status,
          review_notes: pack.review.notes ?? null,
          reviewed_by: null,
          reviewed_at: null,
          approved_by: null,
          approved_at: null,
          published_by: null,
          published_at: null,
          content_fingerprint: fingerprint,
          created_at: CREATED_AT,
          updated_at: CREATED_AT,
        },
        questions: pack.questions.map((question) => ({
          local_id: question.id,
          order_index: question.order,
          skill: question.skill,
          difficulty: question.difficulty,
          prompt: question.prompt,
          options_json: question.options,
          correct_option: question.correctOption,
          explanation_json: question.explanation,
          validation_json: question.validation ?? null,
        })),
      };
    },
  };

  return { repository, createCalls: () => createCalls };
}

describe("General Academic draft persistence", () => {
  let memory: ReturnType<typeof createMemoryRepository>;

  beforeEach(() => {
    memory = createMemoryRepository();
  });

  it("allows a verified administrator to create a draft", async () => {
    const stored = await createGeneralAcademicDraft(fixture(), ADMIN_ID, memory.repository);
    expect(stored.id).toBe(PACK_ID);
    expect(stored.pack.title).toBe(fixture().title);
    expect(memory.createCalls()).toBe(1);
  });

  it("rejects a non-administrator before making a write", async () => {
    await expect(createGeneralAcademicDraft(fixture(), OTHER_ID, memory.repository)).rejects.toMatchObject({
      code: "ADMIN_REQUIRED",
    });
    expect(memory.createCalls()).toBe(0);
  });

  it("rejects malformed actor identifiers before making a write", async () => {
    await expect(createGeneralAcademicDraft(fixture(), "not-a-uuid", memory.repository)).rejects.toBeInstanceOf(
      GeneralAcademicPersistenceError,
    );
    expect(memory.createCalls()).toBe(0);
  });

  it("returns stored rows as the canonical source-pack representation", async () => {
    const created = await createGeneralAcademicDraft(fixture(), ADMIN_ID, memory.repository);
    const fetched = await fetchGeneralAcademicPackForAdmin(PACK_ID, ADMIN_ID, memory.repository);
    expect(fetched).toEqual(created);
    expect(canonicalGeneralAcademicPackSchema.safeParse(fetched?.pack).success).toBe(true);
  });

  it("forces draft status on create regardless of the supplied lifecycle state", async () => {
    const pack = fixture();
    pack.review.status = "approved";
    const stored = await createGeneralAcademicDraft(pack, ADMIN_ID, memory.repository);
    expect(stored.pack.review.status).toBe("draft");
  });

  it("forces draft status and persists canonical updates", async () => {
    await createGeneralAcademicDraft(fixture(), ADMIN_ID, memory.repository);
    const changed = fixture();
    changed.title = "Updated Energy Systems Pack";
    changed.review.status = "published";
    const stored = await updateGeneralAcademicDraft(PACK_ID, changed, ADMIN_ID, memory.repository);
    expect(stored.pack.title).toBe("Updated Energy Systems Pack");
    expect(stored.pack.review.status).toBe("draft");
  });
});

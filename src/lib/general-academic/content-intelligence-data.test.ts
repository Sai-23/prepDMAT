import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createGeneralAcademicContentFingerprint } from "./fingerprint";
import { GeneralAcademicContentIntelligenceError, getGeneralAcademicContentIntelligenceForAdmin, loadGeneralAcademicInventoryForAdmin, type GeneralAcademicContentIntelligenceRepository } from "./content-intelligence-data";
import { canonicalGeneralAcademicPackSchema } from "./schemas";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const pack = canonicalGeneralAcademicPackSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8")));
const inventory = [{ id: "pack", pack, contentFingerprint: createGeneralAcademicContentFingerprint(pack), createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }];

function repository(): GeneralAcademicContentIntelligenceRepository {
  return { isAdmin: async (id) => id === ADMIN_ID, listInventory: async () => structuredClone(inventory) };
}

describe("Phase 8 content-intelligence DAL", () => {
  it("requires a valid administrator", async () => {
    await expect(loadGeneralAcademicInventoryForAdmin(STUDENT_ID, repository())).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
  });

  it("rejects malformed actor IDs", async () => {
    await expect(loadGeneralAcademicInventoryForAdmin("not-a-user", repository())).rejects.toBeInstanceOf(GeneralAcademicContentIntelligenceError);
  });

  it("loads canonical inventory only after authorization", async () => {
    await expect(loadGeneralAcademicInventoryForAdmin(ADMIN_ID, repository())).resolves.toHaveLength(1);
  });

  it("returns deterministic admin intelligence and review priority", async () => {
    const result = await getGeneralAcademicContentIntelligenceForAdmin(ADMIN_ID, repository());
    expect(result.health.audit.coverage.totals.packs).toBe(1);
    expect(result.reviewQueue).toHaveLength(1);
  });
});

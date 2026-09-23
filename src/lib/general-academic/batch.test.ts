import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { addGeneralAcademicBatchSimilarity, GENERAL_ACADEMIC_BATCH_GENERATION_MAX, GENERAL_ACADEMIC_BATCH_IMPORT_MAX, parseGeneralAcademicBatchJson } from "./batch";
import { createGeneralAcademicContentFingerprint } from "./fingerprint";
import { canonicalGeneralAcademicPackSchema } from "./schemas";

const fixture = () => canonicalGeneralAcademicPackSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8")));

describe("Phase 8 batch import", () => {
  it("parses multiple canonical packs independently", () => {
    const items = parseGeneralAcademicBatchJson(JSON.stringify([fixture(), { ...fixture(), title: "Second source pack" }]));
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.ok)).toBe(true);
  });

  it("supports a top-level packs collection", () => {
    expect(parseGeneralAcademicBatchJson(JSON.stringify({ packs: [fixture()] }))[0].ok).toBe(true);
  });

  it("isolates an invalid pack while retaining valid previews", () => {
    const items = parseGeneralAcademicBatchJson(JSON.stringify([fixture(), { title: "Invalid" }, { ...fixture(), title: "Still valid" }]));
    expect(items.map((item) => item.ok)).toEqual([true, false, true]);
  });

  it("forces imported lifecycle to draft", () => {
    const pack = fixture();
    pack.review.status = "published";
    const [item] = parseGeneralAcademicBatchJson(JSON.stringify([pack]));
    expect(item.pack?.review.status).toBe("draft");
    expect(item.warnings.map((warning) => warning.code)).toContain("REVIEW_STATUS_FORCED_DRAFT");
  });

  it("does not persist anything during deterministic parsing", () => {
    const [item] = parseGeneralAcademicBatchJson(JSON.stringify([fixture()]));
    expect(item).not.toHaveProperty("id");
    expect(item.pack?.review.status).toBe("draft");
  });

  it("adds duplicate warnings against existing inventory", () => {
    const pack = fixture();
    const parsed = parseGeneralAcademicBatchJson(JSON.stringify([pack]));
    const compared = addGeneralAcademicBatchSimilarity(parsed, [{ id: "existing", pack, contentFingerprint: createGeneralAcademicContentFingerprint(pack), createdAt: "", updatedAt: "" }]);
    expect(compared[0].similarity[0].kinds).toContain("exact_pack");
  });

  it("adds duplicate warnings between batch items", () => {
    const compared = addGeneralAcademicBatchSimilarity(parseGeneralAcademicBatchJson(JSON.stringify([fixture(), fixture()])), []);
    expect(compared.every((item) => item.similarity.some((alert) => alert.kinds.includes("exact_pack")))).toBe(true);
  });

  it("blocks malformed JSON safely", () => {
    expect(parseGeneralAcademicBatchJson("{")[0]).toMatchObject({ ok: false, title: "Invalid batch" });
  });

  it("blocks an empty batch", () => {
    expect(parseGeneralAcademicBatchJson("[]")[0].ok).toBe(false);
  });

  it("bounds import and generation batch sizes", () => {
    expect(GENERAL_ACADEMIC_BATCH_IMPORT_MAX).toBe(20);
    expect(GENERAL_ACADEMIC_BATCH_GENERATION_MAX).toBe(5);
    expect(parseGeneralAcademicBatchJson(JSON.stringify(Array.from({ length: 21 }, fixture)))[0].ok).toBe(false);
  });
});

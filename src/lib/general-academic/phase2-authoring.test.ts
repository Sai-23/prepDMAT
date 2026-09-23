import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  createGeneralAcademicQuestion,
  createNewGeneralAcademicPack,
  formatGeneralAcademicFindingPath,
  moveGeneralAcademicQuestion,
  validationMetadataForType,
} from "./authoring";
import { exportGeneralAcademicPackJson } from "./export";
import { buildGeneralAcademicExternalPrompt } from "./external-prompt";
import { parsePastedGeneralAcademicJson, parseUploadedGeneralAcademicJson } from "./import-flow";
import { GENERAL_ACADEMIC_LIMITS } from "./limits";
import { GENERAL_ACADEMIC_DOMAINS, GENERAL_ACADEMIC_OPTION_IDS, GENERAL_ACADEMIC_SKILLS } from "./registries";
import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";

const fixtureText = readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8");
const fixture = () => canonicalGeneralAcademicPackSchema.parse(JSON.parse(fixtureText)) as CanonicalGeneralAcademicPack;

describe("General Academic Phase 2 authoring model", () => {
  it("creates a manual draft using canonical registries", () => {
    const pack = createNewGeneralAcademicPack();
    expect(pack.schemaVersion).toBe("general-academic-pack@1");
    expect(pack.origin).toBe("manual");
    expect(pack.review.status).toBe("draft");
    expect(GENERAL_ACADEMIC_DOMAINS).toContain(pack.domain);
  });

  it("always creates fixed A/B/C/D options", () => {
    expect(createGeneralAcademicQuestion(2).options.map((option) => option.id)).toEqual(GENERAL_ACADEMIC_OPTION_IDS);
  });

  it("reorders linked questions and resequences their order values", () => {
    const questions = [createGeneralAcademicQuestion(1), createGeneralAcademicQuestion(2)];
    questions[0].id = "first";
    questions[1].id = "second";
    const moved = moveGeneralAcademicQuestion(questions, 1, -1);
    expect(moved.map((question) => [question.id, question.order])).toEqual([["second", 1], ["first", 2]]);
  });

  it("keeps pack and question difficulty independent", () => {
    const pack = fixture();
    pack.difficulty = "hard";
    pack.questions[0].difficulty = "easy";
    expect(canonicalGeneralAcademicPackSchema.safeParse(pack).success).toBe(true);
  });

  it("constructs only Phase 1 validation metadata types", () => {
    expect(validationMetadataForType("numeric")).toEqual({ answerType: "numeric", expectedValue: 0, tolerance: 0 });
    expect(validationMetadataForType("categorical")).toEqual({ answerType: "categorical", expectedValue: "A" });
    expect(validationMetadataForType("boolean")).toEqual({ answerType: "boolean", expectedValue: true });
    expect(validationMetadataForType("text")).toEqual({ answerType: "text", expectedValue: "" });
    expect(validationMetadataForType("manual")).toEqual({ answerType: "manual" });
    expect(validationMetadataForType("none")).toBeUndefined();
  });

  it("formats validation paths for future admins", () => {
    expect(formatGeneralAcademicFindingPath("questions[2].options[3].text")).toBe("Question 3 → Option D → Text");
    expect(formatGeneralAcademicFindingPath("stimulus.tables[0].rows[3]")).toBe("Table 1 → Row 4");
  });

  it("exports canonical JSON without database-only fields", () => {
    const exported = exportGeneralAcademicPackJson(fixture());
    const parsed = JSON.parse(exported);
    expect(canonicalGeneralAcademicPackSchema.safeParse(parsed).success).toBe(true);
    expect(parsed).not.toHaveProperty("createdAt");
    expect(parsed).not.toHaveProperty("contentFingerprint");
    expect(parsed).not.toHaveProperty("created_by");
  });

  it("round-trips exported JSON through the authoritative importer", () => {
    const result = parsePastedGeneralAcademicJson(exportGeneralAcademicPackJson(fixture()));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pack).toEqual(fixture());
  });
});

describe("General Academic Phase 2 import transports", () => {
  it("parses valid pasted and uploaded JSON identically", () => {
    const pasted = parsePastedGeneralAcademicJson(fixtureText);
    const uploaded = parseUploadedGeneralAcademicJson({ name: "pack.json", size: Buffer.byteLength(fixtureText), text: fixtureText });
    expect(uploaded).toEqual(pasted);
  });

  it("returns readable malformed JSON findings without persistence", () => {
    const result = parsePastedGeneralAcademicJson("{not json}");
    expect(result).toMatchObject({ ok: false, errors: [{ code: "MALFORMED_JSON", path: "$" }] });
  });

  it("rejects non-JSON file names before parsing", () => {
    expect(parseUploadedGeneralAcademicJson({ name: "pack.txt", size: 2, text: "{}" })).toMatchObject({ ok: false, errors: [{ code: "INVALID_FILE_TYPE" }] });
  });

  it("rejects oversized uploads before parsing", () => {
    expect(parseUploadedGeneralAcademicJson({ name: "pack.json", size: GENERAL_ACADEMIC_LIMITS.totalJsonBytes + 1, text: "{}" })).toMatchObject({ ok: false, errors: [{ code: "INPUT_TOO_LARGE" }] });
  });

  it("forces imported published content to draft", () => {
    const raw = JSON.parse(fixtureText);
    raw.review.status = "published";
    const result = parsePastedGeneralAcademicJson(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pack.review.status).toBe("draft");
      expect(result.warnings[0].code).toBe("REVIEW_STATUS_FORCED_DRAFT");
    }
  });
});

describe("provider-neutral external prompt", () => {
  const prompt = buildGeneralAcademicExternalPrompt({ domain: "engineering", topic: "heat recovery", packDifficulty: "hard", questionCount: 6, skills: ["formula_substitution", "novel_scenario_transfer"], representations: ["text", "formula", "table"] });

  it("references the canonical version and requested configuration", () => {
    expect(prompt).toContain('general-academic-pack@1');
    expect(prompt).toContain("Domain: engineering");
    expect(prompt).toContain("Pack difficulty: hard");
    expect(prompt).toContain("Linked question count: 6");
    expect(prompt).toContain("formula_substitution, novel_scenario_transfer");
  });

  it("requires fixed options, draft status, and original content", () => {
    expect(prompt).toContain("exactly four options with IDs A, B, C, D");
    expect(prompt).toContain("Set review.status to draft");
    expect(prompt).toContain("Do not copy, reproduce, closely paraphrase");
  });

  it("uses only registry skills and contains no credential material", () => {
    for (const skill of ["formula_substitution", "novel_scenario_transfer"]) expect(GENERAL_ACADEMIC_SKILLS).toContain(skill);
    expect(prompt).not.toMatch(/(?:api[_-]?key|service[_-]?role|bearer\s+[a-z0-9])/i);
  });
});

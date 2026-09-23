import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { GENERAL_ACADEMIC_LIMITS } from "./limits";
import { exportGeneralAcademicPackJson } from "./export";
import { parseGeneralAcademicPackJson } from "./importer";

const fixtureText = readFileSync(resolve(
  process.cwd(),
  "docs/general-academic/examples/general-academic-pack-v1.json",
), "utf8");

function rawPack(): Record<string, unknown> {
  return JSON.parse(fixtureText) as Record<string, unknown>;
}

function questions(pack: Record<string, unknown>) {
  return pack.questions as Array<Record<string, unknown>>;
}

function options(question: Record<string, unknown>) {
  return question.options as Array<Record<string, unknown>>;
}

describe("General Academic JSON importer", () => {
  it("imports a valid JSON string into the canonical type", () => {
    const result = parseGeneralAcademicPackJson(fixtureText);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pack.questions).toHaveLength(4);
  });

  it("preserves optional math presentation metadata through export and re-import", () => {
    const imported = parseGeneralAcademicPackJson(fixtureText);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const formula = imported.pack.stimulus.formulas[0];
    expect(formula.display?.latex).toContain("\\frac");
    expect(formula.variables[0].displaySymbol).toBe("\\eta");
    const reimported = parseGeneralAcademicPackJson(exportGeneralAcademicPackJson(imported.pack));
    expect(reimported.ok).toBe(true);
    if (reimported.ok) expect(reimported.pack.stimulus.formulas[0]).toEqual(formula);
  });

  it("imports legacy formula JSON without display fields", () => {
    const pack = rawPack();
    const formula = ((pack.stimulus as Record<string, unknown>).formulas as Array<Record<string, unknown>>)[0];
    delete formula.display;
    for (const variable of formula.variables as Array<Record<string, unknown>>) delete variable.displaySymbol;
    expect(parseGeneralAcademicPackJson(pack).ok).toBe(true);
  });

  it("returns a readable malformed-JSON error instead of throwing", () => {
    expect(parseGeneralAcademicPackJson('{"schemaVersion":').ok).toBe(false);
    const result = parseGeneralAcademicPackJson("not json");
    if (!result.ok) expect(result.errors).toEqual([
      expect.objectContaining({ code: "MALFORMED_JSON", path: "$", message: "The input is not valid JSON." }),
    ]);
  });

  it("rejects unsupported schema versions", () => {
    const pack = rawPack();
    pack.schemaVersion = "general-academic-pack@9";
    const result = parseGeneralAcademicPackJson(pack);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ code: "UNSUPPORTED_SCHEMA_VERSION", path: "schemaVersion" });
  });

  it("always forces imported lifecycle state to draft", () => {
    for (const status of ["needs_review", "approved", "published", "rejected", "archived"]) {
      const pack = rawPack();
      pack.review = { status, notes: "Imported note" };
      const result = parseGeneralAcademicPackJson(pack);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.pack.review.status).toBe("draft");
        expect(result.warnings).toContainEqual(expect.objectContaining({ code: "REVIEW_STATUS_FORCED_DRAFT" }));
      }
    }
  });

  it("normalizes inline text, tags, option IDs, option order, and safe question order", () => {
    const pack = rawPack();
    pack.title = "  Energy   systems  ";
    pack.tags = [" Engineering ", "ENERGY", "energy"];
    pack.questions = [...questions(pack)].reverse();
    const firstQuestion = questions(pack).find((question) => question.id === "q1")!;
    firstQuestion.options = [...options(firstQuestion)].reverse().map((option) => ({
      ...option,
      id: String(option.id).toLocaleLowerCase("en"),
      text: `  ${String(option.text).replace("%", "  %")}  `,
    }));
    firstQuestion.correctOption = "b";

    const result = parseGeneralAcademicPackJson(pack);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pack.title).toBe("Energy systems");
      expect(result.pack.tags).toEqual(["engineering", "energy"]);
      expect(result.pack.questions.map((question) => question.order)).toEqual([1, 2, 3, 4]);
      expect(result.pack.questions[0].options.map((option) => option.id)).toEqual(["A", "B", "C", "D"]);
      expect(result.pack.questions[0].correctOption).toBe("B");
    }
  });

  it("uses strict canonical objects and rejects unsupported executable fields", () => {
    const unknownField = rawPack();
    unknownField.renderHtml = "<b>unsafe</b>";
    expect(parseGeneralAcademicPackJson(unknownField).ok).toBe(false);

    const executablePrompt = rawPack();
    questions(executablePrompt)[0].prompt = '<iframe src="https://example.com"></iframe>';
    const result = parseGeneralAcademicPackJson(executablePrompt);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some((finding) => finding.code === "EXECUTABLE_CONTENT")).toBe(true);
  });

  it("rejects ordinary imported HTML because Phase 1 is plain-text only", () => {
    const pack = rawPack();
    questions(pack)[0].prompt = "Which result is <strong>best</strong>?";
    const result = parseGeneralAcademicPackJson(pack);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({ code: "EXECUTABLE_CONTENT" }));
    }
  });

  it("returns exact future-admin paths for nested content errors", () => {
    const pack = rawPack();
    options(questions(pack)[2])[3].text = "";
    const result = parseGeneralAcademicPackJson(pack);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(expect.objectContaining({
        path: "questions[2].options[3].text",
        message: "Option text cannot be empty.",
      }));
    }
  });

  it("enforces field and total import limits", () => {
    const oversizedTitle = rawPack();
    oversizedTitle.title = "x".repeat(GENERAL_ACADEMIC_LIMITS.titleCharacters + 1);
    expect(parseGeneralAcademicPackJson(oversizedTitle).ok).toBe(false);

    const oversizedJson = JSON.stringify({ value: "x".repeat(GENERAL_ACADEMIC_LIMITS.totalJsonBytes) });
    const result = parseGeneralAcademicPackJson(oversizedJson);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].code).toBe("INPUT_TOO_LARGE");
  });
});

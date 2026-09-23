import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";
import { evaluateGeneralAcademicPackQuality } from "./quality";

function fixture(): CanonicalGeneralAcademicPack {
  return canonicalGeneralAcademicPackSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8")));
}

describe("General Academic deterministic quality evaluator", () => {
  it.each([
    ["zero questions", (pack: Record<string, unknown>) => ({ ...pack, questions: [] }), "A source pack must contain at least one question"],
    ["duplicate IDs", (pack: Record<string, unknown>) => ({ ...pack, questions: [...pack.questions as unknown[], { ...(pack.questions as Record<string, unknown>[])[1], id: (pack.questions as Record<string, unknown>[])[0].id }] }), "Question IDs must be unique"],
    ["duplicate order", (pack: Record<string, unknown>) => ({ ...pack, questions: [...pack.questions as unknown[], { ...(pack.questions as Record<string, unknown>[])[1], id: "q_unique", order: 1 }] }), "Question order values must be unique"],
  ])("blocks canonical-invalid %s", (_label, mutate, message) => {
    const result = evaluateGeneralAcademicPackQuality(mutate(fixture() as unknown as Record<string, unknown>));
    expect(result.validStructure).toBe(false);
    expect(result.blocking.some((item) => item.message.includes(message))).toBe(true);
  });

  it("detects duplicate normalized option text as blocking canonical validation", () => {
    const pack = fixture() as unknown as Record<string, unknown>;
    const questions = pack.questions as Array<Record<string, unknown>>;
    const options = questions[0].options as Array<Record<string, unknown>>;
    options[1].text = `  ${(options[0].text as string).toUpperCase()}  `;
    expect(evaluateGeneralAcademicPackQuality(pack).blocking.some((item) => item.code === "DUPLICATE_OPTION_TEXT")).toBe(true);
  });

  it("verifies numeric answers with units, percentages and tolerance", () => {
    const result = evaluateGeneralAcademicPackQuality(fixture());
    expect(result.metrics.answerVerification[0].status).toBe("verified");
  });

  it.each([
    ["25%", 0.25],
    ["80%", 0.8],
    ["100%", 1],
    ["104%", 1.04],
    ["160%", 1.6],
    ["30 credits", 30],
    ["1.25 times", 1.25],
  ])("verifies numeric option %s against expectedValue %s", (optionText, expectedValue) => {
    const pack = fixture();
    const question = pack.questions[0];
    const correctOption = question.options.find((option) => option.id === question.correctOption);
    if (!correctOption) throw new Error("Fixture correct option is missing.");
    correctOption.text = optionText;
    question.validation = { answerType: "numeric", expectedValue, tolerance: 0.0001 };

    const result = evaluateGeneralAcademicPackQuality(pack);

    expect(result.metrics.answerVerification[0].status).toBe("verified");
    expect(result.blocking).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ANSWER_VALIDATION_MISMATCH" }),
    ]));
  });

  it.each([
    ["80%", 80],
    ["104%", 104],
  ])("blocks whole-number percentage metadata for %s / %s", (optionText, expectedValue) => {
    const pack = fixture();
    const question = pack.questions[0];
    const correctOption = question.options.find((option) => option.id === question.correctOption);
    if (!correctOption) throw new Error("Fixture correct option is missing.");
    correctOption.text = optionText;
    question.validation = { answerType: "numeric", expectedValue, tolerance: 0.0001 };

    const result = evaluateGeneralAcademicPackQuality(pack);

    expect(result.metrics.answerVerification[0].status).toBe("mismatch");
    expect(result.blocking).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ANSWER_VALIDATION_MISMATCH", path: "questions[0].validation" }),
    ]));
  });

  it("uses exact normalized categorical comparison and otherwise requires manual review", () => {
    const pack = fixture();
    expect(evaluateGeneralAcademicPackQuality(pack).metrics.answerVerification[1].status).toBe("verified");
    pack.questions[1].validation = { answerType: "categorical", expectedValue: "The second configuration" };
    expect(evaluateGeneralAcademicPackQuality(pack).metrics.answerVerification[1].status).toBe("manual");
  });

  it("treats manual validation as expected manual review", () => {
    const pack = fixture();
    pack.questions[0].validation = { answerType: "manual" };
    expect(evaluateGeneralAcademicPackQuality(pack).metrics.answerVerification[0].status).toBe("manual");
  });

  it("blocks deterministic answer mismatches", () => {
    const pack = fixture();
    pack.questions[0].validation = { answerType: "numeric", expectedValue: 999, tolerance: 0.01 };
    expect(evaluateGeneralAcademicPackQuality(pack).blocking).toEqual(expect.arrayContaining([expect.objectContaining({ code: "ANSWER_VALIDATION_MISMATCH" })]));
  });

  it("reports skill, difficulty, representation and answer-position metrics transparently", () => {
    const metrics = evaluateGeneralAcademicPackQuality(fixture()).metrics;
    expect(metrics.questionCount).toBe(4);
    expect(metrics.skills.formula_substitution).toBe(1);
    expect(metrics.difficulties.hard).toBe(2);
    expect(metrics.representations).toMatchObject({ text: true, formula: 1, table: 1 });
    expect(Object.values(metrics.answerPositions).reduce((sum, count) => sum + count, 0)).toBe(4);
  });

  it("warns rather than blocks for extreme distributions", () => {
    const pack = fixture();
    pack.questions = pack.questions.map((question, index) => ({ ...question, id: `q${index + 1}`, order: index + 1, skill: "source_information", difficulty: "easy", correctOption: "A", validation: null }));
    const result = evaluateGeneralAcademicPackQuality(pack);
    expect(result.warnings.map((item) => item.code)).toEqual(expect.arrayContaining(["SKILL_CONCENTRATION", "EXCESSIVE_SOURCE_INFORMATION", "ANSWER_POSITION_CONCENTRATION"]));
    expect(result.blocking).toHaveLength(0);
  });

  it("warns when pack difficulty is inconsistent with question difficulty", () => {
    const pack = fixture();
    pack.difficulty = "hard";
    pack.questions = pack.questions.map((question) => ({ ...question, difficulty: "easy" }));
    expect(evaluateGeneralAcademicPackQuality(pack).warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "PACK_DIFFICULTY_MISMATCH" }),
    ]));
  });

  it("warns on broken display math while retaining a safe fallback", () => {
    const pack = fixture();
    pack.stimulus.formulas[0].display = { latex: "\\notARealCommand{" };
    const result = evaluateGeneralAcademicPackQuality(pack);
    expect(result.warnings.some((item) => item.code === "BROKEN_DISPLAY_MATH")).toBe(true);
    expect(result.blocking).toHaveLength(0);
  });
});

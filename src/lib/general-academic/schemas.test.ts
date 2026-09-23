import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_SKILLS,
} from "./registries";
import { canonicalGeneralAcademicPackSchema } from "./schemas";
import { validateGeneralAcademicPack } from "./validation";

function rawPack(): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(
    process.cwd(),
    "docs/general-academic/examples/general-academic-pack-v1.json",
  ), "utf8")) as Record<string, unknown>;
}

function questions(pack: Record<string, unknown>) {
  return pack.questions as Array<Record<string, unknown>>;
}

function stimulus(pack: Record<string, unknown>) {
  return pack.stimulus as Record<string, unknown>;
}

function options(question: Record<string, unknown>) {
  return question.options as Array<Record<string, unknown>>;
}

describe("General Academic canonical schema", () => {
  it("parses the original engineering source-pack fixture", () => {
    const parsed = canonicalGeneralAcademicPackSchema.parse(rawPack());
    expect(parsed.schemaVersion).toBe("general-academic-pack@1");
    expect(parsed.questions).toHaveLength(4);
    expect(new Set(parsed.questions.map((question) => question.difficulty)).size).toBeGreaterThan(1);
  });

  it("requires the supported schema version", () => {
    const missing = rawPack();
    delete missing.schemaVersion;
    expect(validateGeneralAcademicPack(missing).valid).toBe(false);

    const unsupported = rawPack();
    unsupported.schemaVersion = "general-academic-pack@2";
    const result = validateGeneralAcademicPack(unsupported);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors[0]).toMatchObject({ code: "UNSUPPORTED_SCHEMA_VERSION", path: "schemaVersion" });
  });

  it("accepts every canonical domain and rejects an unknown domain", () => {
    for (const domain of GENERAL_ACADEMIC_DOMAINS) {
      expect(canonicalGeneralAcademicPackSchema.safeParse({ ...rawPack(), domain }).success).toBe(true);
    }
    expect(canonicalGeneralAcademicPackSchema.safeParse({ ...rawPack(), domain: "medicine" }).success).toBe(false);
  });

  it("accepts every registered skill and rejects raw unknown skill strings", () => {
    for (const skill of GENERAL_ACADEMIC_SKILLS) {
      const pack = rawPack();
      questions(pack)[0].skill = skill;
      expect(canonicalGeneralAcademicPackSchema.safeParse(pack).success).toBe(true);
    }
    const invalid = rawPack();
    questions(invalid)[0].skill = "memorization";
    expect(canonicalGeneralAcademicPackSchema.safeParse(invalid).success).toBe(false);
  });

  it("models pack and question difficulty independently", () => {
    for (const difficulty of GENERAL_ACADEMIC_DIFFICULTIES) {
      const pack = rawPack();
      pack.difficulty = difficulty;
      questions(pack)[0].difficulty = difficulty === "easy" ? "hard" : "easy";
      expect(canonicalGeneralAcademicPackSchema.safeParse(pack).success).toBe(true);
    }
    const invalid = rawPack();
    questions(invalid)[0].difficulty = "expert";
    expect(canonicalGeneralAcademicPackSchema.safeParse(invalid).success).toBe(false);
  });

  it("requires exactly four options", () => {
    const three = rawPack();
    questions(three)[0].options = options(questions(three)[0]).slice(0, 3);
    expect(canonicalGeneralAcademicPackSchema.safeParse(three).success).toBe(false);

    const five = rawPack();
    options(questions(five)[0]).push({ id: "E", text: "80%" });
    expect(canonicalGeneralAcademicPackSchema.safeParse(five).success).toBe(false);
  });

  it("requires unique canonical A/B/C/D IDs and a matching correct option", () => {
    const duplicate = rawPack();
    options(questions(duplicate)[0])[3].id = "A";
    expect(canonicalGeneralAcademicPackSchema.safeParse(duplicate).success).toBe(false);

    const incorrectIds = rawPack();
    options(questions(incorrectIds)[0])[3].id = "E";
    expect(canonicalGeneralAcademicPackSchema.safeParse(incorrectIds).success).toBe(false);

    const invalidCorrect = rawPack();
    questions(invalidCorrect)[0].correctOption = "E";
    const result = validateGeneralAcademicPack(invalidCorrect);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((finding) => finding.code === "INVALID_CORRECT_OPTION")).toBe(true);
  });

  it("rejects option text duplicated after trim, case folding, and whitespace collapse", () => {
    const pack = rawPack();
    options(questions(pack)[0])[1].text = "  40   % ";
    options(questions(pack)[0])[0].text = "40 %";
    const result = validateGeneralAcademicPack(pack);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((finding) => finding.code === "DUPLICATE_OPTION_TEXT")).toBe(true);
  });

  it("validates formula variables and structured tables", () => {
    expect(canonicalGeneralAcademicPackSchema.safeParse(rawPack()).success).toBe(true);
    const malformed = rawPack();
    (stimulus(malformed).tables as Array<Record<string, unknown>>)[0].rows = [["A", 120]];
    const result = validateGeneralAcademicPack(malformed);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((finding) => finding.code === "TABLE_ROW_WIDTH")).toBe(true);
  });

  it("keeps legacy formulas and variables without presentation metadata valid", () => {
    const pack = rawPack();
    const formula = (stimulus(pack).formulas as Array<Record<string, unknown>>)[0];
    delete formula.display;
    for (const variable of formula.variables as Array<Record<string, unknown>>) delete variable.displaySymbol;
    expect(canonicalGeneralAcademicPackSchema.safeParse(pack).success).toBe(true);
  });

  it("accepts optional formula LaTeX and variable display symbols", () => {
    const pack = rawPack();
    const formula = (stimulus(pack).formulas as Array<Record<string, unknown>>)[0];
    formula.display = { latex: "Q_{\\mathrm{rec}} = \\varepsilon \\dot{m} c_p \\Delta T" };
    (formula.variables as Array<Record<string, unknown>>)[0].displaySymbol = "Q_{\\mathrm{rec}}";
    expect(canonicalGeneralAcademicPackSchema.safeParse(pack).success).toBe(true);
  });

  it.each(["line", "bar", "scatter"])("validates a %s graph", (type) => {
    const pack = rawPack();
    stimulus(pack).graphs = [{
      id: "graph_1",
      type,
      title: "Efficiency by temperature",
      xAxis: { label: "Temperature", unit: "°C" },
      yAxis: { label: "Efficiency", unit: "%" },
      series: [{ name: "System A", points: [{ x: 20, y: 72 }, { x: 40, y: 68 }] }],
    }];
    expect(canonicalGeneralAcademicPackSchema.safeParse(pack).success).toBe(true);
  });

  it("rejects non-finite graph points", () => {
    for (const invalidNumber of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const pack = rawPack();
      stimulus(pack).graphs = [{
        id: "graph_1",
        type: "line",
        xAxis: { label: "x", unit: null },
        yAxis: { label: "y", unit: null },
        series: [{ name: "Series", points: [{ x: invalidNumber, y: 1 }] }],
      }];
      expect(canonicalGeneralAcademicPackSchema.safeParse(pack).success).toBe(false);
    }
  });

  it("enforces unique question IDs and orders", () => {
    const duplicateId = rawPack();
    questions(duplicateId)[1].id = questions(duplicateId)[0].id;
    const idResult = validateGeneralAcademicPack(duplicateId);
    expect(idResult.valid).toBe(false);
    if (!idResult.valid) expect(idResult.errors.some((finding) => finding.code === "DUPLICATE_QUESTION_ID")).toBe(true);

    const duplicateOrder = rawPack();
    questions(duplicateOrder)[1].order = questions(duplicateOrder)[0].order;
    const orderResult = validateGeneralAcademicPack(duplicateOrder);
    expect(orderResult.valid).toBe(false);
    if (!orderResult.valid) expect(orderResult.errors.some((finding) => finding.code === "DUPLICATE_QUESTION_ORDER")).toBe(true);
  });

  it("requires stimulus and complete structured explanations", () => {
    const noStimulus = rawPack();
    stimulus(noStimulus).text = "";
    expect(canonicalGeneralAcademicPackSchema.safeParse(noStimulus).success).toBe(false);

    const noExplanation = rawPack();
    questions(noExplanation)[0].explanation = { summary: "", steps: [], takeaway: "" };
    const result = validateGeneralAcademicPack(noExplanation);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.some((finding) => finding.code === "INVALID_EXPLANATION")).toBe(true);
  });

  it("parses every initial validation metadata answer type", () => {
    const values = [
      { answerType: "numeric", expectedValue: 0.6, tolerance: 0.001 },
      { answerType: "categorical", expectedValue: "B" },
      { answerType: "boolean", expectedValue: true },
      { answerType: "text", expectedValue: "higher" },
      { answerType: "manual" },
    ];
    for (const validation of values) {
      const pack = rawPack();
      questions(pack)[0].validation = validation;
      expect(canonicalGeneralAcademicPackSchema.safeParse(pack).success).toBe(true);
    }
  });

  it("rejects executable text and unsafe figure descriptors", () => {
    const prompt = rawPack();
    questions(prompt)[0].prompt = '<script>alert("x")</script>';
    expect(canonicalGeneralAcademicPackSchema.safeParse(prompt).success).toBe(false);

    const figure = rawPack();
    stimulus(figure).figures = [{
      id: "figure_1",
      type: "diagram",
      title: "Unsafe",
      description: "A diagram",
      data: { onclick: "run()" },
    }];
    expect(canonicalGeneralAcademicPackSchema.safeParse(figure).success).toBe(false);
  });
});

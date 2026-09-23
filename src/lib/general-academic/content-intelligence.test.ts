import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  auditGeneralAcademicInventory,
  auditGeneralAcademicPackQuality,
  compareGeneralAcademicPacks,
  createGeneralAcademicComponentFingerprints,
  exportGeneralAcademicContentReportCsv,
  findGeneralAcademicSimilarityAlerts,
  getGeneralAcademicContentRecommendations,
  getGeneralAcademicCoverage,
  getGeneralAcademicDomainSkillAffinity,
  getGeneralAcademicInventoryHealth,
  getGeneralAcademicReadiness,
  prioritizeGeneralAcademicReviewQueue,
  type GeneralAcademicInventoryPack,
} from "./content-intelligence";
import { createGeneralAcademicContentFingerprint } from "./fingerprint";
import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";

const raw = JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8"));
const base = () => canonicalGeneralAcademicPackSchema.parse(structuredClone(raw));

function item(id: string, patch: Partial<CanonicalGeneralAcademicPack> = {}, createdAt = "2026-01-01T00:00:00.000Z"): GeneralAcademicInventoryPack {
  const pack = canonicalGeneralAcademicPackSchema.parse({ ...base(), ...patch });
  return { id, pack, contentFingerprint: createGeneralAcademicContentFingerprint(pack), createdAt, updatedAt: createdAt, lifecycle: { reviewedAt: null, approvedAt: null, publishedAt: pack.review.status === "published" ? createdAt : null } };
}

function published(id: string, domain: CanonicalGeneralAcademicPack["domain"] = "engineering", patch: Partial<CanonicalGeneralAcademicPack> = {}) {
  return item(id, { ...patch, domain, review: { status: "published", notes: null } });
}

describe("Phase 8 General Academic coverage", () => {
  it("counts domain packs, questions, and published inventory", () => {
    const coverage = getGeneralAcademicCoverage([published("one"), item("two")]);
    expect(coverage.domains.engineering).toMatchObject({ packs: 2, questions: 8, publishedPacks: 1, publishedQuestions: 4, draftPacks: 1 });
  });

  it("counts canonical skills and packs containing them", () => {
    const coverage = getGeneralAcademicCoverage([published("one"), published("two")]);
    expect(coverage.skills.formula_substitution).toMatchObject({ questions: 2, publishedQuestions: 2, packs: 2, publishedPacks: 2 });
  });

  it("counts every lifecycle state independently", () => {
    const values = ["draft", "needs_review", "approved", "published", "rejected", "archived"] as const;
    const coverage = getGeneralAcademicCoverage(values.map((status, index) => item(String(index), { review: { status, notes: null } })));
    for (const status of values) expect(coverage.lifecycle[status].packs).toBe(1);
  });

  it("counts PrepDMAT question difficulty", () => {
    const coverage = getGeneralAcademicCoverage([published("one")]);
    expect(Object.values(coverage.difficulties).reduce((sum, value) => sum + value.publishedQuestions, 0)).toBe(4);
  });

  it("counts representation packs and linked questions", () => {
    const pack = base();
    const coverage = getGeneralAcademicCoverage([published("one", "engineering", { stimulus: { ...pack.stimulus, graphs: [{ id: "g1", type: "line", title: "Trend", xAxis: { label: "Time" }, yAxis: { label: "Value" }, series: [{ name: "Value", points: [{ x: 1, y: 2 }] }] }] } })]);
    expect(coverage.representations.graph).toMatchObject({ publishedPacks: 1, publishedQuestions: 4 });
  });

  it("builds all four published cross-coverage matrices", () => {
    const coverage = getGeneralAcademicCoverage([published("one")]);
    expect(coverage.cross.domainSkill.engineering.formula_substitution).toBe(1);
    expect(Object.values(coverage.cross.domainDifficulty.engineering).reduce((sum, value) => sum + value, 0)).toBe(4);
    expect(coverage.cross.skillDifficulty.formula_substitution.medium).toBeGreaterThanOrEqual(0);
    expect(coverage.cross.domainRepresentation.engineering.text).toBe(1);
  });

  it("excludes archived packs from active coverage", () => {
    const archived = item("old", { review: { status: "archived", notes: null } });
    const coverage = getGeneralAcademicCoverage([archived]);
    expect(coverage.totals.packs).toBe(0);
    expect(coverage.lifecycle.archived.packs).toBe(1);
  });

  it("returns a safe zeroed empty inventory", () => {
    const coverage = getGeneralAcademicCoverage([]);
    expect(coverage.totals).toMatchObject({ packs: 0, questions: 0, publishedPacks: 0, averageQuestionsPerPublishedPack: 0 });
    expect(coverage.domains.humanities.state).toBe("missing");
  });

  it("uses the canonical origin pipeline", () => {
    const coverage = getGeneralAcademicCoverage([item("one", { origin: "json_import" }), item("two", { origin: "external_ai" })]);
    expect(coverage.origins.json_import.packs).toBe(1);
    expect(coverage.origins.external_ai.packs).toBe(1);
  });

  it("keeps domain-skill affinity advisory", () => {
    expect(getGeneralAcademicDomainSkillAffinity("mathematics", "formula_rearrangement")).toBe("preferred");
    expect(getGeneralAcademicDomainSkillAffinity("humanities", "formula_rearrangement")).toBe("low_priority");
    expect(getGeneralAcademicDomainSkillAffinity("engineering", "research_design")).toBe("allowed");
  });
});

describe("Phase 8 deterministic fingerprints and similarity", () => {
  it("creates stable component fingerprints without volatile metadata", () => {
    const first = base();
    const second = { ...base(), review: { status: "needs_review" as const, notes: "Reviewer note" }, sourceMeta: { ...base().sourceMeta, generatedAt: "2026-02-01T00:00:00.000Z" } };
    expect(createGeneralAcademicComponentFingerprints(first)).toEqual(createGeneralAcademicComponentFingerprints(second));
  });

  it("normalizes minor source punctuation for exact-source detection", () => {
    const first = published("first");
    const changed = base();
    changed.stimulus.text = changed.stimulus.text.replaceAll(",", " ").replaceAll(".", " ");
    const alert = compareGeneralAcademicPacks(first, published("second", "engineering", { stimulus: changed.stimulus }));
    expect(alert?.kinds).toContain("exact_source");
  });

  it("detects identical packs and questions", () => {
    const alert = compareGeneralAcademicPacks(published("first"), published("second"));
    expect(alert?.kinds).toEqual(expect.arrayContaining(["exact_pack", "exact_source", "exact_question"]));
  });

  it("does not compare a pack with itself", () => {
    const candidate = published("same");
    expect(compareGeneralAcademicPacks(candidate, candidate)).toBeNull();
  });

  it("does not flag unrelated substantive content", () => {
    const changed = base();
    changed.stimulus.text = "A historical archive describes poetry, translation, cultural memory, and competing interpretations across several centuries.";
    changed.questions = changed.questions.map((question, index) => ({ ...question, prompt: `How does interpretation ${index + 1} connect cultural memory with the archive?`, options: question.options.map((option, optionIndex) => ({ ...option, text: `Distinct literary interpretation ${index}-${optionIndex}` })) }));
    expect(compareGeneralAcademicPacks(published("first"), published("second", "humanities", changed))).toBeNull();
  });

  it("flags meaningful high source overlap", () => {
    const changed = base();
    changed.stimulus.text += " One additional sentence changes only a small portion of this academic source.";
    expect(compareGeneralAcademicPacks(published("first"), published("second", "engineering", { stimulus: changed.stimulus }))?.kinds).toContain("high_source_overlap");
  });

  it("detects numeric variants without treating changed numbers as exact text", () => {
    const left = base();
    left.questions[0].prompt = "A machine uses 20 units over 5 hours. Which rate follows from the formula?";
    left.questions = [left.questions[0]];
    const right = structuredClone(left);
    right.questions[0].prompt = "A machine uses 25 units over 6 hours. Which rate follows from the formula?";
    const alert = compareGeneralAcademicPacks(item("left", left), item("right", right));
    expect(alert?.kinds).toContain("numeric_variant");
    expect(alert?.kinds).not.toContain("exact_question");
  });

  it("does not flag common MCQ wording by itself", () => {
    const left = base();
    const right = base();
    left.questions = [left.questions[0]];
    right.questions = [right.questions[0]];
    left.questions[0].prompt = "Which of the following best explains photosynthesis in green leaves?";
    right.questions[0].prompt = "Which of the following best describes a constitutional archive?";
    right.stimulus.text = "Constitutional archives preserve legal debates, amendments, institutions, and historical interpretations for public research.";
    expect(compareGeneralAcademicPacks(item("left", left), item("right", { ...right, domain: "humanities" }))).toBeNull();
  });

  it("returns deterministic, pairwise, self-excluding alerts", () => {
    const inventory = [published("a"), published("b"), published("c", "humanities", { stimulus: { ...base().stimulus, text: "A separate humanities source studies cultural memory through archives and interpretation over time." } })];
    expect(findGeneralAcademicSimilarityAlerts(inventory)).toEqual(findGeneralAcademicSimilarityAlerts(inventory));
    expect(findGeneralAcademicSimilarityAlerts(inventory).every((alert) => alert.packId !== alert.otherPackId)).toBe(true);
  });
});

describe("Phase 8 quality, readiness, and planning", () => {
  it("preserves Phase 4 duplicate-option blockers", () => {
    const pack = base() as unknown as Record<string, unknown>;
    const questions = pack.questions as Array<Record<string, unknown>>;
    const options = questions[0].options as Array<{ id: string; text: string }>;
    options[1].text = options[0].text;
    expect(auditGeneralAcademicPackQuality({ ...item("invalid"), pack: pack as CanonicalGeneralAcademicPack }).blocking.some((finding) => finding.code === "DUPLICATE_OPTION_TEXT")).toBe(true);
  });

  it("preserves empty-option and malformed-explanation blockers", () => {
    const pack = base() as unknown as Record<string, unknown>;
    const questions = pack.questions as Array<Record<string, unknown>>;
    (questions[0].options as Array<{ text: string }>)[0].text = "";
    questions[0].explanation = { summary: "", steps: [], takeaway: "" };
    const result = auditGeneralAcademicPackQuality({ ...item("invalid"), pack: pack as CanonicalGeneralAcademicPack });
    expect(result.validStructure).toBe(false);
    expect(result.blocking.length).toBeGreaterThan(0);
  });

  it("detects placeholder and missing resource references", () => {
    const pack = base();
    pack.stimulus.text = "TODO: replace this unfinished source with complete academic material that supports every included question.";
    pack.questions[0].prompt = "According to the formula, table, graph, and figure, which claim is supported?";
    pack.stimulus.formulas = [];
    pack.stimulus.tables = [];
    pack.stimulus.graphs = [];
    pack.stimulus.figures = [];
    const codes = auditGeneralAcademicPackQuality(item("signals", pack)).warnings.map((finding) => finding.code);
    expect(codes).toEqual(expect.arrayContaining(["PLACEHOLDER_SOURCE", "MISSING_FORMULA_REFERENCE", "MISSING_TABLE_REFERENCE", "MISSING_GRAPH_REFERENCE", "MISSING_FIGURE_REFERENCE"]));
  });

  it("detects undeclared formula variables when mechanically knowable", () => {
    const pack = base();
    pack.stimulus.formulas[0].expression = "eta = unknown_energy / E_input";
    expect(auditGeneralAcademicPackQuality(item("formula", pack)).warnings.map((finding) => finding.code)).toContain("UNDEFINED_FORMULA_VARIABLE");
  });

  it("detects suspicious same-position answer patterns", () => {
    const pack = base();
    pack.questions = pack.questions.map((question) => ({ ...question, correctOption: "A" }));
    expect(auditGeneralAcademicPackQuality(item("pattern", pack)).warnings.map((finding) => finding.code)).toContain("SUSPICIOUS_ANSWER_PATTERN");
  });

  it("warns only for severe inventory answer imbalance", () => {
    const concentrated = Array.from({ length: 3 }, (_, index) => { const pack = base(); pack.questions = pack.questions.map((question) => ({ ...question, correctOption: "A" })); return item(`p${index}`, pack); });
    expect(auditGeneralAcademicInventory(concentrated).answerDistributionWarning).toContain("severely concentrated");
    expect(auditGeneralAcademicInventory([item("normal")]).answerDistributionWarning).toBeNull();
  });

  it("reports not ready for insufficient published inventory", () => {
    expect(getGeneralAcademicReadiness(getGeneralAcademicCoverage([published("one")])).mock.state).toBe("not_ready");
  });

  it("reports limited when minimum inventory is concentrated", () => {
    const readiness = getGeneralAcademicReadiness(getGeneralAcademicCoverage(Array.from({ length: 5 }, (_, index) => published(String(index)))));
    expect(readiness.mock.state).toBe("limited");
  });

  it("reports ready for sufficiently diverse published inventory", () => {
    const domains = ["engineering", "economics", "humanities", "natural_sciences", "social_sciences"] as const;
    const inventory = domains.flatMap((domain, domainIndex) => Array.from({ length: 3 }, (_, index) => { const pack = base(); pack.questions = pack.questions.map((question, questionIndex) => ({ ...question, id: `q${questionIndex + 1}`, skill: (["formula_substitution", "table_interpretation", "parameter_sensitivity", "novel_scenario_transfer", "research_design", "causal_reasoning", "assumption_analysis", "source_information"] as const)[(domainIndex + questionIndex) % 8] })); return published(`${domain}-${index}`, domain, pack); }));
    const readiness = getGeneralAcademicReadiness(getGeneralAcademicCoverage(inventory));
    expect(readiness.mock.state).toBe("ready");
    expect(readiness.mock.repeatResilience).toBe("moderate");
  });

  it("prefers pipeline work over generating another missing-domain pack", () => {
    const recommendations = getGeneralAcademicContentRecommendations([item("draft", { domain: "humanities" })]);
    expect(recommendations.some((value) => value.id === "review-domain-humanities" && value.type === "REVIEW")).toBe(true);
    expect(recommendations.some((value) => value.id === "create-domain-humanities")).toBe(false);
  });

  it("recommends publishing approved content", () => {
    expect(getGeneralAcademicContentRecommendations([item("approved", { review: { status: "approved", notes: null } })])[0].type).toBe("PUBLISH");
  });

  it("creates transparent, deterministic gap recommendations", () => {
    const first = getGeneralAcademicContentRecommendations([]);
    expect(first).toEqual(getGeneralAcademicContentRecommendations([]));
    expect(first.some((value) => value.type === "CREATE" && value.domain === "humanities")).toBe(true);
    expect(JSON.stringify(first).toLowerCase()).not.toContain("official distribution");
  });

  it("prioritizes blocking and high-value review work", () => {
    const review = item("review", { review: { status: "needs_review", notes: null } }, "2025-01-01T00:00:00.000Z");
    expect(prioritizeGeneralAcademicReviewQueue([review])[0]).toMatchObject({ item: { id: "review" } });
  });

  it("summarizes inventory health without an opaque numerical score", () => {
    const health = getGeneralAcademicInventoryHealth([]);
    expect(health.state).toBe("critical");
    expect(health).not.toHaveProperty("score");
  });

  it("exports an admin-only content CSV without student data", () => {
    const csv = exportGeneralAcademicContentReportCsv([published("report")]);
    expect(csv).toContain("pack_id");
    expect(csv).toContain("published");
    expect(csv).not.toContain("user_id");
  });
});

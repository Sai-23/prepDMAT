import { createFingerprint } from "@/lib/generation/fingerprint";

import { GENERAL_ACADEMIC_REPRESENTATIONS } from "./ai/generation-config";
import { evaluateGeneralAcademicPackQuality, type GeneralAcademicQualityFinding } from "./quality";
import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_OPTION_IDS,
  GENERAL_ACADEMIC_ORIGINS,
  GENERAL_ACADEMIC_REVIEW_STATUSES,
  GENERAL_ACADEMIC_SKILLS,
  type GeneralAcademicDomain,
  type GeneralAcademicSkill,
} from "./registries";
import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";

export type GeneralAcademicInventoryPack = {
  id: string;
  pack: CanonicalGeneralAcademicPack;
  contentFingerprint: string;
  createdAt: string;
  updatedAt: string;
  lifecycle?: {
    reviewedAt: string | null;
    approvedAt: string | null;
    publishedAt: string | null;
  };
};

export const GENERAL_ACADEMIC_CONTENT_TARGETS = {
  minimumPublishedPacksPerDomain: 3,
  minimumPublishedQuestionsPerSkill: 8,
  minimumPublishedPacksPerRepresentation: 3,
  minimumPublishedQuestionsPerDifficulty: 12,
  practiceMinimumPacksPerDomain: 2,
  practiceMinimumQuestionsPerSkill: 4,
  mockMinimumPacks: 3,
  mockMinimumQuestions: 18,
  mockHealthyDomains: 3,
  mockHealthySkills: 8,
  mockHealthyRepresentations: 3,
  reviewBacklogAttention: 8,
} as const;

export type GeneralAcademicRepresentation = typeof GENERAL_ACADEMIC_REPRESENTATIONS[number];
export type CoverageState = "good" | "low" | "missing";

type CountPair = { packs: number; questions: number; publishedPacks: number; publishedQuestions: number };

export type GeneralAcademicCoverage = {
  totals: {
    packs: number;
    questions: number;
    publishedPacks: number;
    publishedQuestions: number;
    averageQuestionsPerPublishedPack: number;
  };
  lifecycle: Record<typeof GENERAL_ACADEMIC_REVIEW_STATUSES[number], CountPair>;
  domains: Record<GeneralAcademicDomain, CountPair & { draftPacks: number; needsReviewPacks: number; state: CoverageState }>;
  skills: Record<GeneralAcademicSkill, { questions: number; publishedQuestions: number; packs: number; publishedPacks: number; state: CoverageState }>;
  difficulties: Record<typeof GENERAL_ACADEMIC_DIFFICULTIES[number], CountPair & { state: CoverageState }>;
  representations: Record<GeneralAcademicRepresentation, CountPair & { state: CoverageState }>;
  cross: {
    domainSkill: Record<GeneralAcademicDomain, Record<GeneralAcademicSkill, number>>;
    domainDifficulty: Record<GeneralAcademicDomain, Record<typeof GENERAL_ACADEMIC_DIFFICULTIES[number], number>>;
    skillDifficulty: Record<GeneralAcademicSkill, Record<typeof GENERAL_ACADEMIC_DIFFICULTIES[number], number>>;
    domainRepresentation: Record<GeneralAcademicDomain, Record<GeneralAcademicRepresentation, number>>;
  };
  origins: Record<typeof GENERAL_ACADEMIC_ORIGINS[number], CountPair>;
};

const pair = (): CountPair => ({ packs: 0, questions: 0, publishedPacks: 0, publishedQuestions: 0 });
const keyed = <K extends string, V>(keys: readonly K[], create: () => V) => Object.fromEntries(keys.map((key) => [key, create()])) as Record<K, V>;
const stateFor = (value: number, target: number): CoverageState => value === 0 ? "missing" : value < target ? "low" : "good";

export function getGeneralAcademicPackRepresentations(pack: CanonicalGeneralAcademicPack): GeneralAcademicRepresentation[] {
  const values: GeneralAcademicRepresentation[] = ["text"];
  if (pack.stimulus.formulas.length) values.push("formula");
  if (pack.stimulus.tables.length) values.push("table");
  if (pack.stimulus.graphs.length) values.push("graph");
  if (pack.stimulus.figures.length) values.push("figure");
  return values;
}

export function getGeneralAcademicCoverage(inventory: readonly GeneralAcademicInventoryPack[]): GeneralAcademicCoverage {
  const active = inventory.filter((item) => item.pack.review.status !== "archived");
  const lifecycle = keyed(GENERAL_ACADEMIC_REVIEW_STATUSES, pair);
  const domains = keyed(GENERAL_ACADEMIC_DOMAINS, () => ({ ...pair(), draftPacks: 0, needsReviewPacks: 0, state: "missing" as CoverageState }));
  const skills = keyed(GENERAL_ACADEMIC_SKILLS, () => ({ questions: 0, publishedQuestions: 0, packs: 0, publishedPacks: 0, state: "missing" as CoverageState }));
  const difficulties = keyed(GENERAL_ACADEMIC_DIFFICULTIES, () => ({ ...pair(), state: "missing" as CoverageState }));
  const representations = keyed(GENERAL_ACADEMIC_REPRESENTATIONS, () => ({ ...pair(), state: "missing" as CoverageState }));
  const origins = keyed(GENERAL_ACADEMIC_ORIGINS, pair);
  const cross = {
    domainSkill: keyed(GENERAL_ACADEMIC_DOMAINS, () => keyed(GENERAL_ACADEMIC_SKILLS, () => 0)),
    domainDifficulty: keyed(GENERAL_ACADEMIC_DOMAINS, () => keyed(GENERAL_ACADEMIC_DIFFICULTIES, () => 0)),
    skillDifficulty: keyed(GENERAL_ACADEMIC_SKILLS, () => keyed(GENERAL_ACADEMIC_DIFFICULTIES, () => 0)),
    domainRepresentation: keyed(GENERAL_ACADEMIC_DOMAINS, () => keyed(GENERAL_ACADEMIC_REPRESENTATIONS, () => 0)),
  };

  for (const item of inventory) {
    const { pack } = item;
    const questionCount = pack.questions.length;
    const published = pack.review.status === "published";
    lifecycle[pack.review.status].packs += 1;
    lifecycle[pack.review.status].questions += questionCount;
    if (published) {
      lifecycle[pack.review.status].publishedPacks += 1;
      lifecycle[pack.review.status].publishedQuestions += questionCount;
    }
    if (pack.review.status === "archived") continue;

    const domain = domains[pack.domain];
    domain.packs += 1;
    domain.questions += questionCount;
    if (pack.review.status === "draft") domain.draftPacks += 1;
    if (pack.review.status === "needs_review") domain.needsReviewPacks += 1;
    if (published) {
      domain.publishedPacks += 1;
      domain.publishedQuestions += questionCount;
    }
    const difficulty = difficulties[pack.difficulty];
    difficulty.packs += 1;
    difficulty.questions += questionCount;
    if (published) {
      difficulty.publishedPacks += 1;
      difficulty.publishedQuestions += questionCount;
    }
    const origin = origins[pack.origin];
    origin.packs += 1;
    origin.questions += questionCount;
    if (published) {
      origin.publishedPacks += 1;
      origin.publishedQuestions += questionCount;
    }

    const usedSkills = new Set(pack.questions.map((question) => question.skill));
    for (const skill of usedSkills) {
      skills[skill].packs += 1;
      if (published) skills[skill].publishedPacks += 1;
    }
    for (const question of pack.questions) {
      skills[question.skill].questions += 1;
      if (published) skills[question.skill].publishedQuestions += 1;
      if (published) {
        cross.domainSkill[pack.domain][question.skill] += 1;
        cross.domainDifficulty[pack.domain][question.difficulty] += 1;
        cross.skillDifficulty[question.skill][question.difficulty] += 1;
      }
    }
    for (const representation of getGeneralAcademicPackRepresentations(pack)) {
      const value = representations[representation];
      value.packs += 1;
      value.questions += questionCount;
      if (published) {
        value.publishedPacks += 1;
        value.publishedQuestions += questionCount;
        cross.domainRepresentation[pack.domain][representation] += 1;
      }
    }
  }

  for (const domain of GENERAL_ACADEMIC_DOMAINS) domains[domain].state = stateFor(domains[domain].publishedPacks, GENERAL_ACADEMIC_CONTENT_TARGETS.minimumPublishedPacksPerDomain);
  for (const skill of GENERAL_ACADEMIC_SKILLS) skills[skill].state = stateFor(skills[skill].publishedQuestions, GENERAL_ACADEMIC_CONTENT_TARGETS.minimumPublishedQuestionsPerSkill);
  for (const difficulty of GENERAL_ACADEMIC_DIFFICULTIES) difficulties[difficulty].state = stateFor(difficulties[difficulty].publishedQuestions, GENERAL_ACADEMIC_CONTENT_TARGETS.minimumPublishedQuestionsPerDifficulty);
  for (const representation of GENERAL_ACADEMIC_REPRESENTATIONS) representations[representation].state = stateFor(representations[representation].publishedPacks, GENERAL_ACADEMIC_CONTENT_TARGETS.minimumPublishedPacksPerRepresentation);

  const publishedPacks = lifecycle.published.packs;
  const publishedQuestions = lifecycle.published.questions;
  return {
    totals: {
      packs: active.length,
      questions: active.reduce((sum, item) => sum + item.pack.questions.length, 0),
      publishedPacks,
      publishedQuestions,
      averageQuestionsPerPublishedPack: publishedPacks ? Number((publishedQuestions / publishedPacks).toFixed(1)) : 0,
    },
    lifecycle,
    domains,
    skills,
    difficulties,
    representations,
    cross,
    origins,
  };
}

const PREFERRED_SKILLS: Record<GeneralAcademicDomain, readonly GeneralAcademicSkill[]> = {
  mathematics: ["formula_interpretation", "formula_substitution", "formula_rearrangement", "proportional_reasoning", "parameter_sensitivity"],
  computational_sciences: ["variable_identification", "formula_interpretation", "table_interpretation", "multi_representation", "novel_scenario_transfer"],
  natural_sciences: ["formula_interpretation", "graph_interpretation", "causal_reasoning", "research_design", "novel_scenario_transfer"],
  engineering: ["formula_substitution", "formula_rearrangement", "parameter_sensitivity", "table_interpretation", "novel_scenario_transfer"],
  business_administration: ["source_information", "table_interpretation", "causal_reasoning", "assumption_analysis", "novel_scenario_transfer"],
  economics: ["proportional_reasoning", "parameter_sensitivity", "graph_interpretation", "causal_reasoning", "assumption_analysis"],
  social_sciences: ["source_information", "concept_classification", "causal_reasoning", "assumption_analysis", "research_design"],
  humanities: ["source_information", "concept_classification", "causal_reasoning", "assumption_analysis", "novel_scenario_transfer"],
};

const LOW_PRIORITY_SKILLS: Partial<Record<GeneralAcademicDomain, readonly GeneralAcademicSkill[]>> = {
  mathematics: ["research_design"],
  humanities: ["formula_substitution", "formula_rearrangement", "parameter_sensitivity"],
};

export function getGeneralAcademicDomainSkillAffinity(domain: GeneralAcademicDomain, skill: GeneralAcademicSkill): "preferred" | "allowed" | "low_priority" {
  if (PREFERRED_SKILLS[domain].includes(skill)) return "preferred";
  if (LOW_PRIORITY_SKILLS[domain]?.includes(skill)) return "low_priority";
  return "allowed";
}

export type GeneralAcademicComponentFingerprints = {
  pack: string;
  source: string;
  questionStructure: string;
  optionStructure: string;
  formulaStructure: string;
};

function normalizedStructure(value: string) {
  return normalizedExactText(value)
    .replace(/\b\d+(?:[.,]\d+)?\b/g, "<number>");
}

function normalizedExactText(value: string) {
  return value.toLocaleLowerCase("en")
    .normalize("NFKC")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function createGeneralAcademicComponentFingerprints(pack: CanonicalGeneralAcademicPack): GeneralAcademicComponentFingerprints {
  return {
    pack: createFingerprint("gam-pack-v2", {
      domain: pack.domain,
      difficulty: pack.difficulty,
      source: normalizedExactText(pack.stimulus.text),
      questions: pack.questions.map((question) => ({ prompt: normalizedExactText(question.prompt), options: question.options.map((option) => normalizedExactText(option.text)) })),
      resources: { formulas: pack.stimulus.formulas, tables: pack.stimulus.tables, graphs: pack.stimulus.graphs, figures: pack.stimulus.figures },
    }),
    source: createFingerprint("gam-source-v1", normalizedExactText(pack.stimulus.text)),
    questionStructure: createFingerprint("gam-question-structure-v1", pack.questions.map((question) => normalizedStructure(question.prompt))),
    optionStructure: createFingerprint("gam-option-structure-v1", pack.questions.map((question) => question.options.map((option) => normalizedExactText(option.text)))),
    formulaStructure: createFingerprint("gam-formula-structure-v1", pack.stimulus.formulas.map((formula) => normalizedStructure(formula.expression))),
  };
}

const BOILERPLATE = new Set(["which", "following", "according", "passage", "source", "best", "most", "likely", "statement", "correct"]);

function tokens(value: string, numericStructure = false) {
  const normalized = numericStructure ? normalizedStructure(value) : value.toLocaleLowerCase("en").normalize("NFKC").replace(/[^a-z0-9]+/g, " ");
  return new Set(normalized.split(/\s+/).filter((token) => token.length > 2 && !BOILERPLATE.has(token)));
}

function jaccard(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function averageBestSimilarity(left: readonly string[], right: readonly string[], structured = false) {
  if (!left.length || !right.length) return 0;
  return left.reduce((sum, value) => sum + Math.max(...right.map((candidate) => jaccard(tokens(value, structured), tokens(candidate, structured)))), 0) / left.length;
}

export type GeneralAcademicSimilarityAlert = {
  packId: string;
  otherPackId: string;
  otherTitle: string;
  kinds: Array<"exact_pack" | "exact_source" | "exact_question" | "high_source_overlap" | "high_question_overlap" | "high_option_overlap" | "shared_structure" | "numeric_variant">;
  sourceSimilarity: number;
  questionSimilarity: number;
  optionSimilarity: number;
  structuralSimilarity: number;
};

export function compareGeneralAcademicPacks(left: GeneralAcademicInventoryPack, right: GeneralAcademicInventoryPack): GeneralAcademicSimilarityAlert | null {
  if (left.id === right.id) return null;
  const leftFingerprints = createGeneralAcademicComponentFingerprints(left.pack);
  const rightFingerprints = createGeneralAcademicComponentFingerprints(right.pack);
  const sourceSimilarity = jaccard(tokens(left.pack.stimulus.text), tokens(right.pack.stimulus.text));
  const questionSimilarity = averageBestSimilarity(left.pack.questions.map((question) => question.prompt), right.pack.questions.map((question) => question.prompt));
  const optionSimilarity = averageBestSimilarity(left.pack.questions.flatMap((question) => question.options.map((option) => option.text)), right.pack.questions.flatMap((question) => question.options.map((option) => option.text)));
  const structuralSimilarity = averageBestSimilarity(left.pack.questions.map((question) => question.prompt), right.pack.questions.map((question) => question.prompt), true);
  const leftPrompts = new Set(left.pack.questions.map((question) => normalizedExactText(question.prompt)));
  const exactQuestion = right.pack.questions.some((question) => leftPrompts.has(normalizedExactText(question.prompt)));
  const numericVariant = left.pack.questions.some((leftQuestion) => right.pack.questions.some((rightQuestion) => (
    /\d/.test(leftQuestion.prompt)
      && /\d/.test(rightQuestion.prompt)
      && normalizedExactText(leftQuestion.prompt) !== normalizedExactText(rightQuestion.prompt)
      && normalizedStructure(leftQuestion.prompt) === normalizedStructure(rightQuestion.prompt)
  )));
  const kinds: GeneralAcademicSimilarityAlert["kinds"] = [];
  if (leftFingerprints.pack === rightFingerprints.pack || left.contentFingerprint === right.contentFingerprint) kinds.push("exact_pack");
  if (leftFingerprints.source === rightFingerprints.source) kinds.push("exact_source");
  if (exactQuestion) kinds.push("exact_question");
  if (sourceSimilarity >= 0.72 && tokens(left.pack.stimulus.text).size >= 8) kinds.push("high_source_overlap");
  if (questionSimilarity >= 0.78) kinds.push("high_question_overlap");
  if (optionSimilarity >= 0.86) kinds.push("high_option_overlap");
  if (structuralSimilarity >= 0.82) kinds.push("shared_structure");
  if (numericVariant) kinds.push("numeric_variant");
  if (!kinds.length) return null;
  return {
    packId: left.id,
    otherPackId: right.id,
    otherTitle: right.pack.title,
    kinds: [...new Set(kinds)],
    sourceSimilarity: Number(sourceSimilarity.toFixed(3)),
    questionSimilarity: Number(questionSimilarity.toFixed(3)),
    optionSimilarity: Number(optionSimilarity.toFixed(3)),
    structuralSimilarity: Number(structuralSimilarity.toFixed(3)),
  };
}

export function findGeneralAcademicSimilarityAlerts(inventory: readonly GeneralAcademicInventoryPack[]) {
  if (inventory.length < 2) return [];
  const maximumCandidatePairs = 10_000;
  const maximumAlerts = 2_000;
  const alerts: GeneralAcademicSimilarityAlert[] = [];
  const candidatePairs = new Set<string>();
  const addPairs = (indices: readonly number[]) => {
    const bounded = indices.slice(0, 50);
    for (let left = 0; left < bounded.length && candidatePairs.size < maximumCandidatePairs; left += 1) {
      for (let right = left + 1; right < bounded.length && candidatePairs.size < maximumCandidatePairs; right += 1) {
        const first = Math.min(bounded[left], bounded[right]);
        const second = Math.max(bounded[left], bounded[right]);
        candidatePairs.add(`${first}:${second}`);
      }
    }
  };
  const exactGroups = new Map<string, number[]>();
  const tokenGroups = new Map<string, number[]>();
  inventory.forEach((item, index) => {
    const fingerprints = createGeneralAcademicComponentFingerprints(item.pack);
    const exactFingerprints = [item.contentFingerprint, fingerprints.pack, fingerprints.source, fingerprints.questionStructure, fingerprints.optionStructure];
    if (item.pack.stimulus.formulas.length) exactFingerprints.push(fingerprints.formulaStructure);
    for (const fingerprint of exactFingerprints) {
      const indices = exactGroups.get(fingerprint) ?? [];
      indices.push(index);
      exactGroups.set(fingerprint, indices);
    }
    const meaningfulTokens = new Set([
      ...tokens(item.pack.stimulus.text),
      ...item.pack.questions.flatMap((question) => [...tokens(question.prompt), ...question.options.flatMap((option) => [...tokens(option.text)])]),
    ]);
    for (const token of meaningfulTokens) {
      const indices = tokenGroups.get(token) ?? [];
      indices.push(index);
      tokenGroups.set(token, indices);
    }
  });
  for (const indices of exactGroups.values()) if (indices.length > 1) addPairs(indices);
  const maximumPosting = Math.max(25, Math.ceil(inventory.length * 0.2));
  for (const indices of tokenGroups.values()) if (indices.length > 1 && indices.length <= maximumPosting) addPairs(indices);
  for (const pairKey of [...candidatePairs].sort()) {
    const [leftIndex, rightIndex] = pairKey.split(":").map(Number);
    const alert = compareGeneralAcademicPacks(inventory[leftIndex], inventory[rightIndex]);
    if (alert) alerts.push(alert);
    if (alerts.length >= maximumAlerts) break;
  }
  return alerts.sort((left, right) => left.packId.localeCompare(right.packId) || left.otherPackId.localeCompare(right.otherPackId));
}

function qualityWarning(code: string, path: string, message: string): GeneralAcademicQualityFinding {
  return { code, path, message, severity: "warning" };
}

function hasPlaceholder(value: string) {
  return /\b(?:todo|tbd|placeholder|lorem ipsum|insert (?:text|source|question)|unfinished)\b/i.test(value);
}

export function auditGeneralAcademicPackQuality(item: GeneralAcademicInventoryPack) {
  const base = evaluateGeneralAcademicPackQuality(item.pack);
  const parsed = canonicalGeneralAcademicPackSchema.safeParse(item.pack);
  if (!parsed.success) return base;
  const warnings = [...base.warnings];
  const pack = parsed.data;
  if (pack.stimulus.text.length < 80) warnings.push(qualityWarning("SOURCE_TOO_SHORT", "stimulus.text", "Source text is unusually short; confirm it supports every question."));
  if (pack.stimulus.text.length > 20_000) warnings.push(qualityWarning("SOURCE_VERY_LONG", "stimulus.text", "Source text is unusually long for a focused practice pack."));
  if (hasPlaceholder(pack.stimulus.text)) warnings.push(qualityWarning("PLACEHOLDER_SOURCE", "stimulus.text", "Source text contains placeholder or unfinished wording."));
  const stems = new Map<string, number>();
  pack.questions.forEach((question, index) => {
    const stem = normalizedStructure(question.prompt);
    stems.set(stem, (stems.get(stem) ?? 0) + 1);
    if (hasPlaceholder(question.prompt)) warnings.push(qualityWarning("PLACEHOLDER_QUESTION", `questions[${index}].prompt`, "Question text contains placeholder or unfinished wording."));
    if (/\bformula\b/i.test(question.prompt) && !pack.stimulus.formulas.length) warnings.push(qualityWarning("MISSING_FORMULA_REFERENCE", `questions[${index}].prompt`, "Question references a formula, but the source has no formula resource."));
    if (/\btable\b/i.test(question.prompt) && !pack.stimulus.tables.length) warnings.push(qualityWarning("MISSING_TABLE_REFERENCE", `questions[${index}].prompt`, "Question references a table, but the source has no table resource."));
    if (/\bgraph\b/i.test(question.prompt) && !pack.stimulus.graphs.length) warnings.push(qualityWarning("MISSING_GRAPH_REFERENCE", `questions[${index}].prompt`, "Question references a graph, but the source has no graph resource."));
    if (/\b(?:figure|diagram)\b/i.test(question.prompt) && !pack.stimulus.figures.length) warnings.push(qualityWarning("MISSING_FIGURE_REFERENCE", `questions[${index}].prompt`, "Question references a figure, but the source has no figure resource."));
    const lengths = question.options.map((option) => option.text.trim().length);
    const shortest = Math.max(1, Math.min(...lengths));
    if (Math.max(...lengths) >= 5 * shortest && Math.max(...lengths) - shortest >= 60) warnings.push(qualityWarning("OPTION_LENGTH_IMBALANCE", `questions[${index}].options`, "One option is substantially longer than the others."));
    const promptText = normalizedStructure(question.prompt);
    if (question.options.some((option) => normalizedStructure(option.text).length > 30 && promptText.includes(normalizedStructure(option.text)))) warnings.push(qualityWarning("OPTION_RESTATES_PROMPT", `questions[${index}].options`, "An answer option substantially repeats the prompt."));
    for (let left = 0; left < question.options.length; left += 1) {
      for (let right = left + 1; right < question.options.length; right += 1) {
        const leftText = question.options[left].text;
        const rightText = question.options[right].text;
        if (normalizedExactText(leftText) !== normalizedExactText(rightText)
          && tokens(leftText).size >= 4
          && jaccard(tokens(leftText), tokens(rightText)) >= 0.88) {
          warnings.push(qualityWarning("NEAR_DUPLICATE_OPTIONS", `questions[${index}].options`, "Two answer options are unusually similar."));
        }
      }
    }
  });
  for (const [stem, count] of stems) if (count > 1 && stem) warnings.push(qualityWarning("DUPLICATE_QUESTION_STEM", "questions", "Two or more questions have the same normalized stem."));
  const answers = pack.questions.map((question) => question.correctOption).join("");
  if (answers.length >= 4 && new Set(answers).size === 1) warnings.push(qualityWarning("SUSPICIOUS_ANSWER_PATTERN", "questions", "Every keyed answer uses the same option position."));
  if (answers.length >= 8 && /^(ABCD){2,}$/.test(answers)) warnings.push(qualityWarning("SUSPICIOUS_ANSWER_PATTERN", "questions", "Keyed answers repeat an obvious A-B-C-D pattern."));
  const knownMathNames = new Set(["abs", "cos", "exp", "ln", "log", "max", "min", "pi", "sin", "sqrt", "tan"]);
  pack.stimulus.formulas.forEach((formula, formulaIndex) => {
    const declared = new Set(formula.variables.map((variable) => variable.symbol.toLocaleLowerCase("en")));
    const referenced = formula.expression.match(/[A-Za-z][A-Za-z0-9_]*/g)?.map((value) => value.toLocaleLowerCase("en")) ?? [];
    const missing = [...new Set(referenced.filter((value) => !declared.has(value) && !knownMathNames.has(value)))];
    if (missing.length) warnings.push(qualityWarning("UNDEFINED_FORMULA_VARIABLE", `stimulus.formulas[${formulaIndex}].expression`, `Formula uses undeclared variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`));
  });
  return { ...base, warnings };
}

export type GeneralAcademicPackAudit = {
  item: GeneralAcademicInventoryPack;
  blocking: GeneralAcademicQualityFinding[];
  warnings: GeneralAcademicQualityFinding[];
  similarity: GeneralAcademicSimilarityAlert[];
  coverageContribution: string[];
};

export function auditGeneralAcademicInventory(inventory: readonly GeneralAcademicInventoryPack[]) {
  const coverage = getGeneralAcademicCoverage(inventory);
  const similarities = findGeneralAcademicSimilarityAlerts(inventory);
  const audits = inventory.map((item): GeneralAcademicPackAudit => {
    const quality = auditGeneralAcademicPackQuality(item);
    const contributions: string[] = [];
    if (coverage.domains[item.pack.domain].state !== "good") contributions.push(`${item.pack.domain.replaceAll("_", " ")} domain coverage`);
    for (const skill of new Set(item.pack.questions.map((question) => question.skill))) if (coverage.skills[skill].state !== "good") contributions.push(`${skill.replaceAll("_", " ")} skill coverage`);
    return { item, blocking: quality.blocking, warnings: quality.warnings, similarity: similarities.filter((alert) => alert.packId === item.id || alert.otherPackId === item.id), coverageContribution: contributions };
  });
  const answerCounts = keyed(GENERAL_ACADEMIC_OPTION_IDS, () => 0);
  for (const item of inventory.filter((entry) => entry.pack.review.status !== "archived")) for (const question of item.pack.questions) answerCounts[question.correctOption] += 1;
  const totalAnswers = Object.values(answerCounts).reduce((sum, value) => sum + value, 0);
  const answerDistributionWarning = totalAnswers >= 10 && Math.max(...Object.values(answerCounts)) / totalAnswers >= 0.6
    ? "Correct-option positions are severely concentrated. Review authoring patterns rather than forcing exact equality."
    : null;
  return { coverage, similarities, audits, answerCounts, answerDistributionWarning };
}

export type GeneralAcademicReadiness = {
  mock: { state: "ready" | "limited" | "not_ready"; reasons: string[]; repeatResilience: "strong" | "moderate" | "limited" };
  practice: {
    mixed: "good" | "limited" | "not_ready";
    domains: Record<GeneralAcademicDomain, CoverageState>;
    skills: Record<GeneralAcademicSkill, CoverageState>;
  };
};

export function getGeneralAcademicReadiness(coverage: GeneralAcademicCoverage): GeneralAcademicReadiness {
  const reasons: string[] = [];
  const publishedDomains = GENERAL_ACADEMIC_DOMAINS.filter((domain) => coverage.domains[domain].publishedPacks > 0).length;
  const publishedSkills = GENERAL_ACADEMIC_SKILLS.filter((skill) => coverage.skills[skill].publishedQuestions > 0).length;
  const publishedRepresentations = GENERAL_ACADEMIC_REPRESENTATIONS.filter((representation) => coverage.representations[representation].publishedPacks > 0).length;
  const enough = coverage.totals.publishedPacks >= GENERAL_ACADEMIC_CONTENT_TARGETS.mockMinimumPacks
    && coverage.totals.publishedQuestions >= GENERAL_ACADEMIC_CONTENT_TARGETS.mockMinimumQuestions;
  if (!enough) reasons.push("Published inventory does not yet meet the PrepDMAT minimum of 3 packs and 18 questions.");
  if (publishedDomains < GENERAL_ACADEMIC_CONTENT_TARGETS.mockHealthyDomains) reasons.push("Published content is concentrated across fewer than three domains.");
  if (publishedSkills < GENERAL_ACADEMIC_CONTENT_TARGETS.mockHealthySkills) reasons.push("Published questions cover fewer than eight canonical skills.");
  if (publishedRepresentations < GENERAL_ACADEMIC_CONTENT_TARGETS.mockHealthyRepresentations) reasons.push("Published packs use fewer than three representation types.");
  const state = !enough ? "not_ready" : reasons.length ? "limited" : "ready";
  const mockEquivalent = Math.floor(coverage.totals.publishedQuestions / 24);
  const repeatResilience = mockEquivalent >= 3 ? "strong" : mockEquivalent >= 2 ? "moderate" : "limited";
  const domainStates = keyed(GENERAL_ACADEMIC_DOMAINS, ( ) => "missing" as CoverageState);
  for (const domain of GENERAL_ACADEMIC_DOMAINS) domainStates[domain] = stateFor(coverage.domains[domain].publishedPacks, GENERAL_ACADEMIC_CONTENT_TARGETS.practiceMinimumPacksPerDomain);
  const skillStates = keyed(GENERAL_ACADEMIC_SKILLS, () => "missing" as CoverageState);
  for (const skill of GENERAL_ACADEMIC_SKILLS) skillStates[skill] = stateFor(coverage.skills[skill].publishedQuestions, GENERAL_ACADEMIC_CONTENT_TARGETS.practiceMinimumQuestionsPerSkill);
  return {
    mock: { state, reasons, repeatResilience },
    practice: { mixed: !enough ? "not_ready" : reasons.length ? "limited" : "good", domains: domainStates, skills: skillStates },
  };
}

export type GeneralAcademicContentRecommendation = {
  id: string;
  type: "CREATE" | "GENERATE" | "REVIEW" | "FIX" | "PUBLISH";
  priority: number;
  title: string;
  reason: string;
  domain?: GeneralAcademicDomain;
  skill?: GeneralAcademicSkill;
  difficulty?: typeof GENERAL_ACADEMIC_DIFFICULTIES[number];
  representations?: GeneralAcademicRepresentation[];
};

export function getGeneralAcademicContentRecommendations(inventory: readonly GeneralAcademicInventoryPack[], audit = auditGeneralAcademicInventory(inventory)) {
  const recommendations: GeneralAcademicContentRecommendation[] = [];
  const active = inventory.filter((item) => item.pack.review.status !== "archived");
  const blocking = audit.audits.filter((item) => item.blocking.length);
  if (blocking.length) recommendations.push({ id: "fix-blocking", type: "FIX", priority: 100, title: `Fix ${blocking.length} blocked pack${blocking.length === 1 ? "" : "s"}`, reason: "Deterministic validation or answer verification found blocking issues." });
  const approved = active.filter((item) => item.pack.review.status === "approved");
  if (approved.length) recommendations.push({ id: "publish-approved", type: "PUBLISH", priority: 90, title: `Publish ${approved.length} approved pack${approved.length === 1 ? "" : "s"}`, reason: "Human-approved packs are waiting in the publication pipeline." });
  const needsReview = active.filter((item) => item.pack.review.status === "needs_review");
  if (needsReview.length) recommendations.push({ id: "review-backlog", type: "REVIEW", priority: 85, title: `Review ${needsReview.length} waiting pack${needsReview.length === 1 ? "" : "s"}`, reason: "Existing content should be reviewed before generating unnecessary replacements." });

  for (const domain of GENERAL_ACADEMIC_DOMAINS) {
    const value = audit.coverage.domains[domain];
    const pipeline = value.packs - value.publishedPacks;
    if (value.state === "good") continue;
    if (pipeline > 0) {
      recommendations.push({ id: `review-domain-${domain}`, type: "REVIEW", priority: 70, title: `Advance ${domain.replaceAll("_", " ")} content`, reason: `${value.publishedPacks} published and ${pipeline} unpublished pack${pipeline === 1 ? "" : "s"} are already in the pipeline.`, domain });
    } else {
      const skill = GENERAL_ACADEMIC_SKILLS.find((candidate) => getGeneralAcademicDomainSkillAffinity(domain, candidate) === "preferred" && audit.coverage.skills[candidate].state !== "good");
      recommendations.push({ id: `create-domain-${domain}`, type: "CREATE", priority: 60, title: `Create a ${domain.replaceAll("_", " ")} pack`, reason: `Only ${value.publishedPacks} published pack${value.publishedPacks === 1 ? "" : "s"} currently contribute to this PrepDMAT target.`, domain, skill, difficulty: "medium", representations: ["text"] });
    }
  }

  for (const representation of GENERAL_ACADEMIC_REPRESENTATIONS.filter((value) => value !== "text")) {
    const value = audit.coverage.representations[representation];
    if (value.state === "missing") recommendations.push({ id: `representation-${representation}`, type: "GENERATE", priority: 45, title: `Add ${representation} representation`, reason: `No published pack currently contains a ${representation}.`, representations: ["text", representation], difficulty: "medium" });
  }
  return recommendations.sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id)).slice(0, 12);
}

export function getGeneralAcademicInventoryHealth(inventory: readonly GeneralAcademicInventoryPack[]) {
  const audit = auditGeneralAcademicInventory(inventory);
  const readiness = getGeneralAcademicReadiness(audit.coverage);
  const blockingCount = audit.audits.reduce((sum, item) => sum + item.blocking.length, 0);
  const warningCount = audit.audits.reduce((sum, item) => sum + item.warnings.length, 0);
  const reviewBacklog = audit.coverage.lifecycle.needs_review.packs;
  const missingCoverage = [
    ...GENERAL_ACADEMIC_DOMAINS.map((key) => audit.coverage.domains[key].state),
    ...GENERAL_ACADEMIC_SKILLS.map((key) => audit.coverage.skills[key].state),
  ].filter((state) => state === "missing").length;
  const state = blockingCount > 0 || readiness.mock.state === "not_ready" ? "critical"
    : audit.similarities.length > 0 || reviewBacklog >= GENERAL_ACADEMIC_CONTENT_TARGETS.reviewBacklogAttention || missingCoverage > 0 ? "needs_attention"
      : "healthy";
  return {
    state,
    audit,
    readiness,
    recommendations: getGeneralAcademicContentRecommendations(inventory, audit),
    counts: { blocking: blockingCount, warnings: warningCount, duplicateAlerts: audit.similarities.length, reviewBacklog, missingCoverage },
  } as const;
}

export function prioritizeGeneralAcademicReviewQueue(inventory: readonly GeneralAcademicInventoryPack[]) {
  const health = getGeneralAcademicInventoryHealth(inventory);
  return health.audit.audits
    .filter((audit) => audit.item.pack.review.status === "needs_review" || audit.item.pack.review.status === "draft" || audit.item.pack.review.status === "approved")
    .map((audit) => {
      const ageDays = Math.max(0, Math.floor((Date.now() - Date.parse(audit.item.updatedAt)) / 86_400_000));
      const priority = audit.blocking.length * 100 + audit.coverageContribution.length * 12 + Math.min(ageDays, 30) + audit.similarity.length * 5 + (audit.item.pack.review.status === "needs_review" ? 40 : audit.item.pack.review.status === "approved" ? 30 : 0);
      return { ...audit, priority, ageDays };
    })
    .sort((left, right) => right.priority - left.priority || left.item.createdAt.localeCompare(right.item.createdAt) || left.item.id.localeCompare(right.item.id));
}

export function exportGeneralAcademicContentReportCsv(inventory: readonly GeneralAcademicInventoryPack[]) {
  const audit = auditGeneralAcademicInventory(inventory);
  const byId = new Map(audit.audits.map((item) => [item.item.id, item]));
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [["pack_id", "title", "domain", "difficulty", "origin", "status", "question_count", "skills", "representations", "validation", "warning_count", "similarity_alerts", "created_at", "reviewed_at", "published_at"]];
  for (const item of inventory) {
    const packAudit = byId.get(item.id);
    rows.push([
      item.id,
      item.pack.title,
      item.pack.domain,
      item.pack.difficulty,
      item.pack.origin,
      item.pack.review.status,
      String(item.pack.questions.length),
      [...new Set(item.pack.questions.map((question) => question.skill))].join("|"),
      getGeneralAcademicPackRepresentations(item.pack).join("|"),
      packAudit?.blocking.length ? "blocked" : "pass",
      String(packAudit?.warnings.length ?? 0),
      String(packAudit?.similarity.length ?? 0),
      item.createdAt,
      item.lifecycle?.reviewedAt ?? "",
      item.lifecycle?.publishedAt ?? "",
    ]);
  }
  return rows.map((row) => row.map(escape).join(",")).join("\n");
}

import {
  GENERAL_ACADEMIC_OPTION_IDS,
  GENERAL_ACADEMIC_SCHEMA_VERSION,
} from "./registries";
import type {
  CanonicalGeneralAcademicPack,
  GeneralAcademicQuestion,
  GeneralAcademicValidationMetadata,
} from "./schemas";
import type { GeneralAcademicValidationFinding } from "./validation";

export function createGeneralAcademicQuestion(order: number): GeneralAcademicQuestion {
  return {
    id: `q${order}`,
    order,
    skill: "source_information",
    difficulty: "easy",
    prompt: "",
    options: GENERAL_ACADEMIC_OPTION_IDS.map((id) => ({ id, text: "" })),
    correctOption: "A",
    explanation: { summary: "", steps: [""], takeaway: "" },
  };
}

export function createNewGeneralAcademicPack(): CanonicalGeneralAcademicPack {
  return {
    schemaVersion: GENERAL_ACADEMIC_SCHEMA_VERSION,
    title: "",
    domain: "mathematics",
    topic: "",
    difficulty: "medium",
    origin: "manual",
    sourceMeta: { provider: "manual_import", model: null, generatedAt: null },
    stimulus: { text: "", formulas: [], tables: [], graphs: [], figures: [] },
    questions: [createGeneralAcademicQuestion(1)],
    tags: [],
    review: { status: "draft", notes: null },
  };
}

export function resequenceGeneralAcademicQuestions(
  questions: GeneralAcademicQuestion[],
): GeneralAcademicQuestion[] {
  return questions.map((question, index) => ({ ...question, order: index + 1 }));
}

export function moveGeneralAcademicQuestion(
  questions: GeneralAcademicQuestion[],
  index: number,
  direction: -1 | 1,
) {
  const target = index + direction;
  if (target < 0 || target >= questions.length) return questions;
  const moved = [...questions];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return resequenceGeneralAcademicQuestions(moved);
}

export function validationMetadataForType(
  answerType: GeneralAcademicValidationMetadata["answerType"] | "none",
): GeneralAcademicValidationMetadata | undefined {
  switch (answerType) {
    case "numeric": return { answerType, expectedValue: 0, tolerance: 0 };
    case "categorical": return { answerType, expectedValue: "A" };
    case "boolean": return { answerType, expectedValue: true };
    case "text": return { answerType, expectedValue: "" };
    case "manual": return { answerType };
    default: return undefined;
  }
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatGeneralAcademicFindingPath(path: string) {
  if (path === "$" || !path) return "Source pack";
  const parts: string[] = [];
  const question = path.match(/^questions\[(\d+)\]/);
  if (question) parts.push(`Question ${Number(question[1]) + 1}`);
  const option = path.match(/\.options\[(\d+)\]/);
  if (option) parts.push(`Option ${GENERAL_ACADEMIC_OPTION_IDS[Number(option[1])] ?? Number(option[1]) + 1}`);
  const table = path.match(/^stimulus\.tables\[(\d+)\]/);
  if (table) parts.push(`Table ${Number(table[1]) + 1}`);
  const row = path.match(/\.rows\[(\d+)\]/);
  if (row) parts.push(`Row ${Number(row[1]) + 1}`);
  const formula = path.match(/^stimulus\.formulas\[(\d+)\]/);
  if (formula) parts.push(`Formula ${Number(formula[1]) + 1}`);
  const graph = path.match(/^stimulus\.graphs\[(\d+)\]/);
  if (graph) parts.push(`Graph ${Number(graph[1]) + 1}`);
  const figure = path.match(/^stimulus\.figures\[(\d+)\]/);
  if (figure) parts.push(`Figure ${Number(figure[1]) + 1}`);
  const leaf = path.split(".").at(-1)?.replace(/\[\d+\]/g, "");
  if (leaf && !["questions", "options", "tables", "rows", "formulas", "graphs", "figures"].includes(leaf)) {
    parts.push(titleCase(leaf));
  }
  return parts.length ? parts.join(" → ") : path.split(".").map(titleCase).join(" → ");
}

export function summarizeGeneralAcademicFindings(findings: GeneralAcademicValidationFinding[]) {
  return findings.map((finding) => ({
    ...finding,
    displayPath: formatGeneralAcademicFindingPath(finding.path),
  }));
}


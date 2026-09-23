import type { JsonValue } from "@/lib/generation/types";

import { GENERAL_ACADEMIC_LIMITS } from "./limits";
import {
  normalizeInlineText,
  normalizeJsonStrings,
  normalizeLongText,
} from "./normalization";
import { GENERAL_ACADEMIC_OPTION_IDS } from "./registries";
import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";
import type { GeneralAcademicValidationFinding } from "./validation";
import { findingsFromZodIssues } from "./validation";

export type GeneralAcademicImportResult =
  | {
      ok: true;
      pack: CanonicalGeneralAcademicPack;
      warnings: GeneralAcademicValidationFinding[];
    }
  | {
      ok: false;
      errors: GeneralAcademicValidationFinding[];
      warnings: GeneralAcademicValidationFinding[];
    };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizeString(value: unknown, long = false) {
  return typeof value === "string"
    ? long ? normalizeLongText(value) : normalizeInlineText(value)
    : value;
}

function normalizeNullableString(value: unknown, long = false) {
  if (value === null || value === undefined) return value;
  return normalizeString(value, long);
}

function normalizeSourceMeta(value: unknown) {
  const sourceMeta = record(value);
  if (!sourceMeta) return value;
  return {
    ...sourceMeta,
    provider: normalizeNullableString(sourceMeta.provider),
    model: normalizeNullableString(sourceMeta.model),
    generatedAt: normalizeNullableString(sourceMeta.generatedAt),
    externalReference: normalizeNullableString(sourceMeta.externalReference),
    generationId: normalizeNullableString(sourceMeta.generationId),
  };
}

function normalizeFormula(value: unknown) {
  const formula = record(value);
  if (!formula) return value;
  return {
    ...formula,
    id: normalizeString(formula.id),
    label: normalizeNullableString(formula.label),
    expression: normalizeString(formula.expression),
    display: record(formula.display) ? {
      ...record(formula.display),
      latex: normalizeNullableString(record(formula.display)?.latex),
    } : formula.display,
    variables: Array.isArray(formula.variables) ? formula.variables.map((entry) => {
      const variable = record(entry);
      return variable ? {
        ...variable,
        symbol: normalizeString(variable.symbol),
        displaySymbol: normalizeNullableString(variable.displaySymbol),
        meaning: normalizeString(variable.meaning),
        unit: normalizeNullableString(variable.unit),
      } : entry;
    }) : formula.variables,
  };
}

function normalizeTable(value: unknown) {
  const table = record(value);
  if (!table) return value;
  return {
    ...table,
    id: normalizeString(table.id),
    title: normalizeNullableString(table.title),
    columns: Array.isArray(table.columns) ? table.columns.map((column) => normalizeString(column)) : table.columns,
    rows: Array.isArray(table.rows) ? table.rows.map((row) => Array.isArray(row)
      ? row.map((cell) => typeof cell === "string" ? normalizeInlineText(cell) : cell)
      : row) : table.rows,
  };
}

function normalizeGraph(value: unknown) {
  const graph = record(value);
  if (!graph) return value;
  const normalizeAxis = (axisValue: unknown) => {
    const axis = record(axisValue);
    return axis ? {
      ...axis,
      label: normalizeString(axis.label),
      unit: normalizeNullableString(axis.unit),
    } : axisValue;
  };
  return {
    ...graph,
    id: normalizeString(graph.id),
    title: normalizeNullableString(graph.title),
    xAxis: normalizeAxis(graph.xAxis),
    yAxis: normalizeAxis(graph.yAxis),
    series: Array.isArray(graph.series) ? graph.series.map((entry) => {
      const series = record(entry);
      return series ? { ...series, name: normalizeString(series.name) } : entry;
    }) : graph.series,
  };
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isJsonValue);
  return false;
}

function normalizeFigure(value: unknown) {
  const figure = record(value);
  if (!figure) return value;
  return {
    ...figure,
    id: normalizeString(figure.id),
    title: normalizeNullableString(figure.title),
    description: normalizeString(figure.description, true),
    data: isJsonValue(figure.data) ? normalizeJsonStrings(figure.data) : figure.data,
  };
}

function normalizeStimulus(value: unknown) {
  const stimulus = record(value);
  if (!stimulus) return value;
  return {
    ...stimulus,
    text: normalizeString(stimulus.text, true),
    formulas: Array.isArray(stimulus.formulas) ? stimulus.formulas.map(normalizeFormula) : stimulus.formulas,
    tables: Array.isArray(stimulus.tables) ? stimulus.tables.map(normalizeTable) : stimulus.tables,
    graphs: Array.isArray(stimulus.graphs) ? stimulus.graphs.map(normalizeGraph) : stimulus.graphs,
    figures: Array.isArray(stimulus.figures) ? stimulus.figures.map(normalizeFigure) : stimulus.figures,
  };
}

function normalizeQuestion(value: unknown) {
  const question = record(value);
  if (!question) return value;
  const explanation = record(question.explanation);
  const validation = record(question.validation);
  const normalizedOptions = Array.isArray(question.options) ? question.options.map((entry) => {
    const option = record(entry);
    return option ? {
      ...option,
      id: typeof option.id === "string" ? normalizeInlineText(option.id).toUpperCase() : option.id,
      text: normalizeString(option.text),
    } : entry;
  }) : question.options;
  const canSortOptions = Array.isArray(normalizedOptions)
    && normalizedOptions.length === GENERAL_ACADEMIC_OPTION_IDS.length
    && normalizedOptions.every((entry) => record(entry) && typeof record(entry)?.id === "string")
    && new Set(normalizedOptions.map((entry) => record(entry)?.id)).size === GENERAL_ACADEMIC_OPTION_IDS.length;

  return {
    ...question,
    id: normalizeString(question.id),
    prompt: normalizeString(question.prompt, true),
    options: canSortOptions ? [...normalizedOptions].sort((left, right) => {
      const leftId = String(record(left)?.id);
      const rightId = String(record(right)?.id);
      return GENERAL_ACADEMIC_OPTION_IDS.indexOf(leftId as (typeof GENERAL_ACADEMIC_OPTION_IDS)[number])
        - GENERAL_ACADEMIC_OPTION_IDS.indexOf(rightId as (typeof GENERAL_ACADEMIC_OPTION_IDS)[number]);
    }) : normalizedOptions,
    correctOption: typeof question.correctOption === "string"
      ? normalizeInlineText(question.correctOption).toUpperCase()
      : question.correctOption,
    explanation: explanation ? {
      ...explanation,
      summary: normalizeString(explanation.summary, true),
      steps: Array.isArray(explanation.steps) ? explanation.steps.map((step) => normalizeString(step, true)) : explanation.steps,
      takeaway: normalizeString(explanation.takeaway, true),
    } : question.explanation,
    validation: validation ? {
      ...validation,
      expectedValue: typeof validation.expectedValue === "string"
        ? normalizeInlineText(validation.expectedValue)
        : validation.expectedValue,
    } : question.validation,
  };
}

function normalizePack(input: unknown) {
  const pack = record(input);
  if (!pack) return input;
  const review = record(pack.review);
  const normalizedQuestions = Array.isArray(pack.questions)
    ? pack.questions.map(normalizeQuestion)
    : pack.questions;
  const questionRecords = Array.isArray(normalizedQuestions)
    ? normalizedQuestions.map(record)
    : [];
  const orders = questionRecords.map((question) => question?.order);
  const canSortQuestions = questionRecords.length > 0
    && orders.every((order) => typeof order === "number" && Number.isInteger(order))
    && new Set(orders).size === orders.length;
  const tags = Array.isArray(pack.tags)
    ? [...new Set(pack.tags.map((tag) => typeof tag === "string"
      ? normalizeInlineText(tag).toLocaleLowerCase("en")
      : tag))]
    : pack.tags;

  return {
    ...pack,
    schemaVersion: normalizeString(pack.schemaVersion),
    title: normalizeString(pack.title),
    topic: normalizeString(pack.topic),
    sourceMeta: normalizeSourceMeta(pack.sourceMeta),
    stimulus: normalizeStimulus(pack.stimulus),
    questions: canSortQuestions
      ? [...normalizedQuestions as unknown[]].sort((left, right) => Number(record(left)?.order) - Number(record(right)?.order))
      : normalizedQuestions,
    tags,
    review: review ? {
      ...review,
      status: "draft",
      notes: normalizeNullableString(review.notes, true),
    } : pack.review,
  };
}

function inputBytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export function parseGeneralAcademicPackJson(input: string | unknown): GeneralAcademicImportResult {
  let parsedInput: unknown;
  let serialized: string;
  try {
    if (typeof input === "string") {
      serialized = input;
      if (inputBytes(serialized) > GENERAL_ACADEMIC_LIMITS.totalJsonBytes) {
        return {
          ok: false,
          errors: [{ code: "INPUT_TOO_LARGE", path: "$", message: "General Academic JSON exceeds the 512 KB import limit.", severity: "error" }],
          warnings: [],
        };
      }
      parsedInput = JSON.parse(input);
    } else {
      serialized = JSON.stringify(input);
      if (inputBytes(serialized) > GENERAL_ACADEMIC_LIMITS.totalJsonBytes) {
        return {
          ok: false,
          errors: [{ code: "INPUT_TOO_LARGE", path: "$", message: "General Academic JSON exceeds the 512 KB import limit.", severity: "error" }],
          warnings: [],
        };
      }
      parsedInput = input;
    }
  } catch {
    return {
      ok: false,
      errors: [{ code: "MALFORMED_JSON", path: "$", message: "The input is not valid JSON.", severity: "error" }],
      warnings: [],
    };
  }

  const originalStatus = record(record(parsedInput)?.review)?.status;
  const normalized = normalizePack(parsedInput);
  const result = canonicalGeneralAcademicPackSchema.safeParse(normalized);
  const warnings: GeneralAcademicValidationFinding[] =
    originalStatus !== undefined && originalStatus !== "draft"
      ? [{
          code: "REVIEW_STATUS_FORCED_DRAFT",
          path: "review.status",
          message: "Imported content always starts as draft; the supplied review status was replaced.",
          severity: "warning",
        }]
      : [];

  if (!result.success) {
    return {
      ok: false,
      errors: findingsFromZodIssues(result.error.issues),
      warnings,
    };
  }
  return { ok: true, pack: result.data, warnings };
}

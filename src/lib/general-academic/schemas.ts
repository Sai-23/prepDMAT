import { z } from "zod";

import type { JsonValue } from "@/lib/generation/types";

import { GENERAL_ACADEMIC_LIMITS } from "./limits";
import { normalizeComparableText } from "./normalization";
import {
  GENERAL_ACADEMIC_ANSWER_TYPES,
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_GRAPH_TYPES,
  GENERAL_ACADEMIC_OPTION_IDS,
  GENERAL_ACADEMIC_ORIGINS,
  GENERAL_ACADEMIC_REVIEW_STATUSES,
  GENERAL_ACADEMIC_SCHEMA_VERSION,
  GENERAL_ACADEMIC_SKILLS,
} from "./registries";
import { containsExecutableContent, inspectStructuredData } from "./safety";

const localIdSchema = z
  .string()
  .min(1, "A stable pack-local ID is required.")
  .max(64, "Pack-local IDs cannot exceed 64 characters.")
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/, "Use letters, numbers, underscores, or hyphens in pack-local IDs.");

function safeText(maximum: number, emptyMessage: string) {
  return z
    .string()
    .trim()
    .min(1, emptyMessage)
    .max(maximum, `Text cannot exceed ${maximum} characters.`)
    .refine((value) => !containsExecutableContent(value), {
      message: "Executable HTML, SVG, event handlers, and script URLs are not allowed.",
    });
}

const optionalSafeText = (maximum: number) => safeText(maximum, "Text cannot be empty.").nullable().optional();

const jsonPrimitiveSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);
export const generalAcademicJsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    z.array(generalAcademicJsonValueSchema).max(GENERAL_ACADEMIC_LIMITS.structuredDataNodes),
    z.record(z.string().max(100), generalAcademicJsonValueSchema),
  ]),
);

export const generalAcademicFormulaSchema = z.object({
  id: localIdSchema,
  label: optionalSafeText(GENERAL_ACADEMIC_LIMITS.inlineTextCharacters),
  expression: safeText(2_000, "Formula expression cannot be empty."),
  display: z.object({
    latex: optionalSafeText(2_000),
  }).strict().nullable().optional(),
  variables: z.array(z.object({
    symbol: safeText(80, "Variable symbol cannot be empty."),
    displaySymbol: optionalSafeText(200),
    meaning: safeText(500, "Variable meaning cannot be empty."),
    unit: optionalSafeText(100),
  }).strict()).max(GENERAL_ACADEMIC_LIMITS.variablesPerFormula),
}).strict();

export const generalAcademicTableSchema = z.object({
  id: localIdSchema,
  title: optionalSafeText(GENERAL_ACADEMIC_LIMITS.inlineTextCharacters),
  columns: z.array(safeText(200, "Table column labels cannot be empty."))
    .min(1, "A table must contain at least one column.")
    .max(GENERAL_ACADEMIC_LIMITS.columnsPerTable),
  rows: z.array(z.array(jsonPrimitiveSchema).max(GENERAL_ACADEMIC_LIMITS.columnsPerTable))
    .max(GENERAL_ACADEMIC_LIMITS.rowsPerTable),
}).strict().superRefine((table, context) => {
  table.rows.forEach((row, rowIndex) => {
    if (row.length !== table.columns.length) {
      context.addIssue({
        code: "custom",
        path: ["rows", rowIndex],
        message: `Table row must contain exactly ${table.columns.length} cells to match its columns.`,
      });
    }
  });
});

const axisSchema = z.object({
  label: safeText(200, "Axis label cannot be empty."),
  unit: optionalSafeText(100),
}).strict();

const graphPointSchema = z.object({
  x: z.number().finite("Graph x values must be finite numbers."),
  y: z.number().finite("Graph y values must be finite numbers."),
}).strict();

export const generalAcademicGraphSchema = z.object({
  id: localIdSchema,
  type: z.enum(GENERAL_ACADEMIC_GRAPH_TYPES),
  title: optionalSafeText(GENERAL_ACADEMIC_LIMITS.inlineTextCharacters),
  xAxis: axisSchema,
  yAxis: axisSchema,
  series: z.array(z.object({
    name: safeText(200, "Graph series name cannot be empty."),
    points: z.array(graphPointSchema)
      .min(1, "A graph series must contain at least one point.")
      .max(GENERAL_ACADEMIC_LIMITS.pointsPerSeries),
  }).strict())
    .min(1, "A graph must contain at least one series.")
    .max(GENERAL_ACADEMIC_LIMITS.seriesPerGraph),
}).strict();

export const generalAcademicFigureSchema = z.object({
  id: localIdSchema,
  type: z.literal("diagram"),
  title: optionalSafeText(GENERAL_ACADEMIC_LIMITS.inlineTextCharacters),
  description: safeText(5_000, "Figure description cannot be empty."),
  data: generalAcademicJsonValueSchema,
}).strict().superRefine((figure, context) => {
  const failure = inspectStructuredData(figure.data);
  if (failure) {
    context.addIssue({ code: "custom", path: ["data"], message: failure.message });
  }
});

export const generalAcademicStimulusSchema = z.object({
  text: safeText(GENERAL_ACADEMIC_LIMITS.stimulusCharacters, "Stimulus text cannot be empty."),
  formulas: z.array(generalAcademicFormulaSchema).max(GENERAL_ACADEMIC_LIMITS.formulasPerPack),
  tables: z.array(generalAcademicTableSchema).max(GENERAL_ACADEMIC_LIMITS.tablesPerPack),
  graphs: z.array(generalAcademicGraphSchema).max(GENERAL_ACADEMIC_LIMITS.graphsPerPack),
  figures: z.array(generalAcademicFigureSchema).max(GENERAL_ACADEMIC_LIMITS.figuresPerPack),
}).strict();

export const generalAcademicExplanationSchema = z.object({
  summary: safeText(GENERAL_ACADEMIC_LIMITS.explanationSummaryCharacters, "Explanation summary cannot be empty."),
  steps: z.array(safeText(GENERAL_ACADEMIC_LIMITS.explanationStepCharacters, "Explanation steps cannot be empty."))
    .min(1, "At least one explanation step is required.")
    .max(GENERAL_ACADEMIC_LIMITS.explanationStepsPerQuestion),
  takeaway: safeText(GENERAL_ACADEMIC_LIMITS.explanationTakeawayCharacters, "Explanation takeaway cannot be empty."),
}).strict();

const numericValidationSchema = z.object({
  answerType: z.literal(GENERAL_ACADEMIC_ANSWER_TYPES[0]),
  expectedValue: z.number().finite(),
  tolerance: z.number().finite().nonnegative(),
}).strict();
const categoricalValidationSchema = z.object({
  answerType: z.literal(GENERAL_ACADEMIC_ANSWER_TYPES[1]),
  expectedValue: safeText(500, "Categorical expected value cannot be empty."),
}).strict();
const booleanValidationSchema = z.object({
  answerType: z.literal(GENERAL_ACADEMIC_ANSWER_TYPES[2]),
  expectedValue: z.boolean(),
}).strict();
const textValidationSchema = z.object({
  answerType: z.literal(GENERAL_ACADEMIC_ANSWER_TYPES[3]),
  expectedValue: safeText(2_000, "Text expected value cannot be empty."),
}).strict();
const manualValidationSchema = z.object({
  answerType: z.literal(GENERAL_ACADEMIC_ANSWER_TYPES[4]),
}).strict();

export const generalAcademicValidationMetadataSchema = z.discriminatedUnion("answerType", [
  numericValidationSchema,
  categoricalValidationSchema,
  booleanValidationSchema,
  textValidationSchema,
  manualValidationSchema,
]);

const optionSchema = z.object({
  id: z.enum(GENERAL_ACADEMIC_OPTION_IDS),
  text: safeText(GENERAL_ACADEMIC_LIMITS.optionCharacters, "Option text cannot be empty."),
}).strict();

export const generalAcademicQuestionSchema = z.object({
  id: localIdSchema,
  order: z.number().int().min(1, "Question order must be at least 1."),
  skill: z.enum(GENERAL_ACADEMIC_SKILLS),
  difficulty: z.enum(GENERAL_ACADEMIC_DIFFICULTIES),
  prompt: safeText(GENERAL_ACADEMIC_LIMITS.promptCharacters, "Question prompt cannot be empty."),
  options: z.array(optionSchema).length(4, "Each question must contain exactly four options."),
  correctOption: z.enum(GENERAL_ACADEMIC_OPTION_IDS),
  explanation: generalAcademicExplanationSchema,
  validation: generalAcademicValidationMetadataSchema.nullable().optional(),
}).strict().superRefine((question, context) => {
  const optionIds = question.options.map((option) => option.id);
  if (new Set(optionIds).size !== GENERAL_ACADEMIC_OPTION_IDS.length) {
    context.addIssue({
      code: "custom",
      path: ["options"],
      message: "Option IDs must be unique and contain A, B, C, and D exactly once.",
    });
  }
  for (const optionId of GENERAL_ACADEMIC_OPTION_IDS) {
    if (!optionIds.includes(optionId)) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Option IDs must be unique and contain A, B, C, and D exactly once.",
      });
      break;
    }
  }
  if (!optionIds.includes(question.correctOption)) {
    context.addIssue({
      code: "custom",
      path: ["correctOption"],
      message: "correctOption must reference one of this question's options.",
    });
  }
  const normalizedOptions = question.options.map((option) => normalizeComparableText(option.text));
  if (new Set(normalizedOptions).size !== normalizedOptions.length) {
    context.addIssue({
      code: "custom",
      path: ["options"],
      message: "Option text must be unique after trimming, case folding, and whitespace normalization.",
    });
  }
});

const sourceMetaSchema = z.object({
  provider: optionalSafeText(200),
  model: optionalSafeText(200),
  generatedAt: z.string().datetime({ offset: true }).nullable().optional(),
  externalReference: optionalSafeText(500),
  generationId: optionalSafeText(200),
}).strict();

const reviewSchema = z.object({
  status: z.enum(GENERAL_ACADEMIC_REVIEW_STATUSES),
  notes: optionalSafeText(5_000),
}).strict();

export const canonicalGeneralAcademicPackSchema = z.object({
  schemaVersion: z.literal(GENERAL_ACADEMIC_SCHEMA_VERSION),
  title: safeText(GENERAL_ACADEMIC_LIMITS.titleCharacters, "Pack title cannot be empty."),
  domain: z.enum(GENERAL_ACADEMIC_DOMAINS),
  topic: safeText(GENERAL_ACADEMIC_LIMITS.topicCharacters, "Pack topic cannot be empty."),
  difficulty: z.enum(GENERAL_ACADEMIC_DIFFICULTIES),
  origin: z.enum(GENERAL_ACADEMIC_ORIGINS),
  sourceMeta: sourceMetaSchema,
  stimulus: generalAcademicStimulusSchema,
  questions: z.array(generalAcademicQuestionSchema)
    .min(1, "A source pack must contain at least one question.")
    .max(GENERAL_ACADEMIC_LIMITS.questionsPerPack),
  tags: z.array(safeText(GENERAL_ACADEMIC_LIMITS.tagCharacters, "Tags cannot be empty."))
    .max(GENERAL_ACADEMIC_LIMITS.tagsPerPack),
  review: reviewSchema,
}).strict().superRefine((pack, context) => {
  const questionIds = new Set<string>();
  const orders = new Set<number>();
  pack.questions.forEach((question, index) => {
    if (questionIds.has(question.id)) {
      context.addIssue({ code: "custom", path: ["questions", index, "id"], message: "Question IDs must be unique within a source pack." });
    }
    if (orders.has(question.order)) {
      context.addIssue({ code: "custom", path: ["questions", index, "order"], message: "Question order values must be unique within a source pack." });
    }
    questionIds.add(question.id);
    orders.add(question.order);
  });

  const normalizedTags = pack.tags.map(normalizeComparableText);
  if (new Set(normalizedTags).size !== normalizedTags.length) {
    context.addIssue({ code: "custom", path: ["tags"], message: "Tags must be unique after normalization." });
  }

  const resourceIds = new Set<string>();
  const resources = [
    ...pack.stimulus.formulas.map((item) => ({ id: item.id, path: "formulas" })),
    ...pack.stimulus.tables.map((item) => ({ id: item.id, path: "tables" })),
    ...pack.stimulus.graphs.map((item) => ({ id: item.id, path: "graphs" })),
    ...pack.stimulus.figures.map((item) => ({ id: item.id, path: "figures" })),
  ];
  resources.forEach((resource, index) => {
    if (resourceIds.has(resource.id)) {
      context.addIssue({ code: "custom", path: ["stimulus", resource.path, index, "id"], message: "Stimulus resource IDs must be unique within a source pack." });
    }
    resourceIds.add(resource.id);
  });
});

export type CanonicalGeneralAcademicPack = z.infer<typeof canonicalGeneralAcademicPackSchema>;
export type GeneralAcademicQuestion = z.infer<typeof generalAcademicQuestionSchema>;
export type GeneralAcademicStimulus = z.infer<typeof generalAcademicStimulusSchema>;
export type GeneralAcademicValidationMetadata = z.infer<typeof generalAcademicValidationMetadataSchema>;

import type { z } from "zod";

import { canonicalGeneralAcademicPackSchema, type CanonicalGeneralAcademicPack } from "./schemas";

export type GeneralAcademicValidationFinding = {
  code: string;
  path: string;
  message: string;
  severity: "error" | "warning";
};

export type GeneralAcademicValidationResult =
  | {
      valid: true;
      pack: CanonicalGeneralAcademicPack;
      errors: [];
      warnings: GeneralAcademicValidationFinding[];
    }
  | {
      valid: false;
      errors: GeneralAcademicValidationFinding[];
      warnings: GeneralAcademicValidationFinding[];
    };

export function generalAcademicPath(path: PropertyKey[]) {
  if (!path.length) return "$";
  return path.reduce<string>((result, segment) => {
    if (typeof segment === "number") return `${result}[${segment}]`;
    const label = String(segment);
    return result ? `${result}.${label}` : label;
  }, "");
}

function codeForIssue(issue: z.core.$ZodIssue) {
  const path = generalAcademicPath(issue.path);
  const message = issue.message;
  if (path === "schemaVersion") return "UNSUPPORTED_SCHEMA_VERSION";
  if (path === "domain") return "INVALID_DOMAIN";
  if (path.endsWith(".skill")) return "INVALID_SKILL";
  if (path.endsWith(".difficulty") || path === "difficulty") return "INVALID_DIFFICULTY";
  if (path.endsWith(".correctOption")) return "INVALID_CORRECT_OPTION";
  if (message.includes("exactly four options")) return "OPTION_COUNT";
  if (message.includes("Option IDs must be unique")) return "INVALID_OPTION_IDS";
  if (message.includes("Option text must be unique")) return "DUPLICATE_OPTION_TEXT";
  if (message.includes("Question IDs must be unique")) return "DUPLICATE_QUESTION_ID";
  if (message.includes("Question order values must be unique")) return "DUPLICATE_QUESTION_ORDER";
  if (message.includes("Table row must contain")) return "TABLE_ROW_WIDTH";
  if (message.includes("Stimulus text cannot be empty")) return "EMPTY_STIMULUS";
  if (message.includes("Explanation")) return "INVALID_EXPLANATION";
  if (message.includes("Executable HTML")) return "EXECUTABLE_CONTENT";
  if (message.includes("Structured figure data")) return "UNSAFE_FIGURE_DATA";
  if (message.includes("Tags must be unique")) return "DUPLICATE_TAG";
  if (message.includes("Stimulus resource IDs must be unique")) return "DUPLICATE_RESOURCE_ID";
  if (issue.code === "too_big") return "INPUT_LIMIT_EXCEEDED";
  return "SCHEMA_VALIDATION_ERROR";
}

export function findingsFromZodIssues(issues: z.core.$ZodIssue[]): GeneralAcademicValidationFinding[] {
  return issues.map((issue) => ({
    code: codeForIssue(issue),
    path: generalAcademicPath(issue.path),
    message: issue.message,
    severity: "error",
  }));
}

export function validateGeneralAcademicPack(input: unknown): GeneralAcademicValidationResult {
  const parsed = canonicalGeneralAcademicPackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      errors: findingsFromZodIssues(parsed.error.issues),
      warnings: [],
    };
  }
  return { valid: true, pack: parsed.data, errors: [], warnings: [] };
}

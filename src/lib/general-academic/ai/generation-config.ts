import { z } from "zod";

import { GENERAL_ACADEMIC_LIMITS } from "../limits";
import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_SKILLS,
} from "../registries";

export const GENERAL_ACADEMIC_REPRESENTATIONS = [
  "text",
  "formula",
  "table",
  "graph",
  "figure",
] as const;

const topicSchema = z.string()
  .trim()
  .max(GENERAL_ACADEMIC_LIMITS.topicCharacters, `Topic cannot exceed ${GENERAL_ACADEMIC_LIMITS.topicCharacters} characters.`)
  .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value), "Topic must be plain text without control characters.")
  .optional()
  .transform((value) => value || undefined);

export const generalAcademicGenerationConfigSchema = z.object({
  domain: z.enum(GENERAL_ACADEMIC_DOMAINS),
  topic: topicSchema,
  packDifficulty: z.enum(GENERAL_ACADEMIC_DIFFICULTIES),
  questionCount: z.number().int().min(1).max(GENERAL_ACADEMIC_LIMITS.questionsPerPack),
  skills: z.array(z.enum(GENERAL_ACADEMIC_SKILLS)).max(GENERAL_ACADEMIC_SKILLS.length).default([]),
  representations: z.array(z.enum(GENERAL_ACADEMIC_REPRESENTATIONS)).max(GENERAL_ACADEMIC_REPRESENTATIONS.length).default(["text"]),
  batchVariation: z.object({ index: z.number().int().min(1).max(5), count: z.number().int().min(1).max(5) }).strict().optional(),
}).strict().transform((config) => ({
  ...config,
  skills: [...new Set(config.skills)],
  representations: [
    "text" as const,
    ...new Set(config.representations.filter((representation) => representation !== "text")),
  ],
}));

export type GeneralAcademicGenerationConfig = z.infer<typeof generalAcademicGenerationConfigSchema>;

export const DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG: GeneralAcademicGenerationConfig = {
  domain: "engineering",
  topic: undefined,
  packDifficulty: "medium",
  questionCount: 6,
  skills: [],
  representations: ["text"],
};

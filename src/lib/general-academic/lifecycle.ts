import { z } from "zod";

import { GENERAL_ACADEMIC_REVIEW_STATUSES } from "./registries";

export type GeneralAcademicReviewStatus = typeof GENERAL_ACADEMIC_REVIEW_STATUSES[number];

export const GENERAL_ACADEMIC_REVIEW_CHECKLIST = [
  ["stimulusCoherent", "I checked that the stimulus is academically coherent."],
  ["keyedAnswers", "I checked every keyed answer."],
  ["questionsAnswerable", "I checked that every question is answerable from the supplied source or rules."],
  ["explanations", "I checked the explanations."],
  ["ambiguity", "I checked for ambiguity or multiple plausible answers."],
  ["difficulty", "I checked that the difficulty is reasonable."],
  ["representations", "I checked formulas, tables, graphs and figures where present."],
] as const;

export const generalAcademicReviewChecklistSchema = z.object(Object.fromEntries(
  GENERAL_ACADEMIC_REVIEW_CHECKLIST.map(([key]) => [key, z.literal(true)]),
) as Record<(typeof GENERAL_ACADEMIC_REVIEW_CHECKLIST)[number][0], z.ZodLiteral<true>>).strict();

export const generalAcademicLifecycleInputSchema = z.object({
  checklist: generalAcademicReviewChecklistSchema.optional(),
  notes: z.string().trim().max(5_000).optional(),
}).strict();

const TRANSITIONS: Record<GeneralAcademicReviewStatus, readonly GeneralAcademicReviewStatus[]> = {
  draft: ["needs_review"],
  needs_review: ["draft", "approved", "rejected"],
  approved: ["needs_review", "published"],
  published: ["archived"],
  rejected: ["draft"],
  archived: [],
};

export function canTransitionGeneralAcademicPack(from: GeneralAcademicReviewStatus, to: GeneralAcademicReviewStatus) {
  return TRANSITIONS[from].includes(to);
}

export function allowedGeneralAcademicTransitions(from: GeneralAcademicReviewStatus) {
  return [...TRANSITIONS[from]];
}

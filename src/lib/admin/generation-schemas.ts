import { z } from "zod";

function generatedFingerprintSchema(namespace: string) {
  return z.string().regex(
    new RegExp(`^${namespace}(?:-v[1-9][0-9]*)?:v1:[a-f0-9]{16}$`),
  );
}

export const equationGenerationRequestSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  quantity: z.coerce.number().int().min(1).max(20),
  seed: z.string().trim().max(200).optional().transform((value) => value || null),
});

export const generatedEquationSaveSchema = z.object({
  seed: z.string().trim().min(1).max(250),
  difficulty: z.enum(["easy", "medium", "hard"]),
  attemptCount: z.number().int().min(1).max(100),
  fingerprint: generatedFingerprintSchema("mathematical-equation"),
});

export const latinGenerationRequestSchema = equationGenerationRequestSchema;
export const figureGenerationRequestSchema = equationGenerationRequestSchema;

export const generatedLatinSaveSchema = z.object({
  seed: z.string().trim().min(1).max(250),
  difficulty: z.enum(["easy", "medium", "hard"]),
  attemptCount: z.number().int().min(1).max(5_000),
  fingerprint: generatedFingerprintSchema("latin-square"),
});

export const generatedFigureSaveSchema = z.object({
  seed: z.string().trim().min(1).max(250),
  difficulty: z.enum(["easy", "medium", "hard"]),
  attemptCount: z.number().int().min(1).max(5_000),
  fingerprint: generatedFingerprintSchema("figure-sequence"),
});

export const generatedQuestionPublishItemSchema = z.discriminatedUnion("questionType", [
  generatedEquationSaveSchema.extend({ questionType: z.literal("mathematical_equation") }),
  generatedLatinSaveSchema.extend({ questionType: z.literal("latin_square") }),
  generatedFigureSaveSchema.extend({ questionType: z.literal("figure_sequence") }),
]);

export const generatedQuestionBatchInputSchema = z.array(z.unknown()).min(1).max(20);

export type GeneratedQuestionPublishItem = z.infer<typeof generatedQuestionPublishItemSchema>;

export type EquationGenerationRequest = z.infer<
  typeof equationGenerationRequestSchema
>;

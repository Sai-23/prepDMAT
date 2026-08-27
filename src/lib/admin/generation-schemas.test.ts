import { describe, expect, it } from "vitest";

import {
  generateValidatedFigureSequence,
  generateValidatedLatinSquare,
  generateValidatedMathematicalEquation,
} from "@/lib/generation";

import {
  equationGenerationRequestSchema,
  generatedEquationSaveSchema,
  generatedFigureSaveSchema,
  generatedLatinSaveSchema,
  generatedQuestionBatchInputSchema,
  generatedQuestionPublishItemSchema,
} from "./generation-schemas";

describe("admin equation generation schemas", () => {
  it("normalizes an optional empty seed", () => {
    expect(
      equationGenerationRequestSchema.parse({
        difficulty: "medium",
        quantity: "10",
        seed: " ",
      }),
    ).toEqual({ difficulty: "medium", quantity: 10, seed: null });
  });

  it("enforces the synchronous preview batch limit", () => {
    expect(
      equationGenerationRequestSchema.safeParse({
        difficulty: "easy",
        quantity: 21,
      }).success,
    ).toBe(false);
  });

  it("rejects malformed save provenance", () => {
    expect(
      generatedEquationSaveSchema.safeParse({
        seed: "seed",
        difficulty: "hard",
        attemptCount: 1,
        fingerprint: "untrusted",
      }).success,
    ).toBe(false);
  });

  it("accepts valid Latin-square provenance", () => {
    expect(
      generatedLatinSaveSchema.safeParse({
        seed: "latin-seed",
        difficulty: "hard",
        attemptCount: 42,
        fingerprint: "latin-square:v1:0123456789abcdef",
      }).success,
    ).toBe(true);
  });

  it("accepts valid Figure Sequence provenance", () => {
    expect(
      generatedFigureSaveSchema.safeParse({
        seed: "figure-seed",
        difficulty: "medium",
        attemptCount: 417,
        fingerprint: "figure-sequence:v1:0123456789abcdef",
      }).success,
    ).toBe(true);
  });

  it("rejects a Figure Sequence fingerprint in another namespace", () => {
    expect(
      generatedFigureSaveSchema.safeParse({
        seed: "figure-seed",
        difficulty: "medium",
        attemptCount: 1,
        fingerprint: "latin-square:v1:0123456789abcdef",
      }).success,
    ).toBe(false);
  });

  it("accepts a typed batch item and rejects cross-type provenance", () => {
    expect(generatedQuestionPublishItemSchema.safeParse({
      questionType: "latin_square",
      seed: "latin-seed",
      difficulty: "medium",
      attemptCount: 4,
      fingerprint: "latin-square:v1:0123456789abcdef",
    }).success).toBe(true);
    expect(generatedQuestionPublishItemSchema.safeParse({
      questionType: "mathematical_equation",
      seed: "equation-seed",
      difficulty: "medium",
      attemptCount: 4,
      fingerprint: "latin-square:v1:0123456789abcdef",
    }).success).toBe(false);
  });

  it("bounds batch size without trusting item contents", () => {
    expect(generatedQuestionBatchInputSchema.safeParse(Array.from({ length: 20 }, () => ({}))).success).toBe(true);
    expect(generatedQuestionBatchInputSchema.safeParse(Array.from({ length: 21 }, () => ({}))).success).toBe(false);
  });

  it("accepts provenance emitted by every current Core generator", () => {
    const questions = [
      generateValidatedFigureSequence({ seed: "admin-publish-figure", difficulty: "easy" }),
      generateValidatedMathematicalEquation({ seed: "admin-publish-equation", difficulty: "easy" }),
      generateValidatedLatinSquare({ seed: "admin-publish-latin", difficulty: "easy" }),
    ];

    for (const question of questions) {
      expect(generatedQuestionPublishItemSchema.safeParse({
        questionType: question.questionType,
        seed: question.metadata.seed,
        difficulty: question.metadata.requestedDifficulty,
        attemptCount: question.metadata.attemptCount,
        fingerprint: question.metadata.fingerprint,
      }), `${question.questionType}: ${question.metadata.fingerprint}`).toMatchObject({ success: true });
    }
  });

});

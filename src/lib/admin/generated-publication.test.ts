import { describe, expect, it } from "vitest";

import {
  generateValidatedFigureSequence,
  generateValidatedLatinSquare,
  generateValidatedMathematicalEquation,
  figureSequenceStructuralProfile,
  latinSquareStructuralProfile,
  reproduceValidatedFigureSequence,
  reproduceValidatedLatinSquare,
  reproduceValidatedMathematicalEquation,
  type GeneratedQuestionType,
  type StructuralProfile,
} from "@/lib/generation";
import { runGeneratedQuestionBatch } from "./generated-batch";
import {
  assessGeneratedQuestionEnvelope,
  type PublishableGeneratedQuestion,
} from "./generated-publication";
import { generatedQuestionPublishItemSchema } from "./generation-schemas";
import { evaluatePublication } from "./publishing-policy";

function provenance(question: PublishableGeneratedQuestion) {
  return {
    questionType: question.questionType,
    seed: question.metadata.seed,
    difficulty: question.metadata.requestedDifficulty,
    attemptCount: question.metadata.attemptCount,
    fingerprint: question.metadata.fingerprint,
  };
}

function reproduce(question: PublishableGeneratedQuestion) {
  const input = provenance(question);
  if (input.questionType === "figure_sequence") {
    return reproduceValidatedFigureSequence(input, input.attemptCount);
  }
  if (input.questionType === "latin_square") {
    return reproduceValidatedLatinSquare(input, input.attemptCount);
  }
  return reproduceValidatedMathematicalEquation(input, input.attemptCount);
}

function generatedPolicyDecision(question: PublishableGeneratedQuestion) {
  return evaluatePublication({
    verificationStatus: "approved",
    questionType: question.questionType,
    sourceType: "generated",
    optionCount: 0,
    correctOptionId: null,
    structuredData: { response: question.response },
    metadata: { generation: question.metadata, validation: question.validation },
  });
}

async function publishContractBatch(questions: PublishableGeneratedQuestion[]) {
  return runGeneratedQuestionBatch(
    questions.map((question) => ({ ...provenance(question), question })),
    async (item) => {
      const parsed = generatedQuestionPublishItemSchema.safeParse(item);
      if (!parsed.success) return { id: item.fingerprint, status: "failed", reason: "INVALID_INPUT" };
      const reproduced = reproduce(item.question);
      const assessment = assessGeneratedQuestionEnvelope(
        reproduced,
        item.questionType,
        item.fingerprint,
      );
      if (!assessment.eligible) {
        return { id: item.fingerprint, status: "failed", reason: assessment.reason };
      }
      if (!generatedPolicyDecision(reproduced).allowed) {
        return { id: item.fingerprint, status: "failed", reason: "NOT_ELIGIBLE" };
      }
      return { id: item.fingerprint, status: "published", questionId: `saved-${item.fingerprint}` };
    },
  );
}

function generate(questionType: GeneratedQuestionType, seed: string): PublishableGeneratedQuestion {
  if (questionType === "figure_sequence") {
    return generateValidatedFigureSequence({ seed, difficulty: "easy" });
  }
  if (questionType === "latin_square") {
    return generateValidatedLatinSquare({ seed, difficulty: "easy" });
  }
  return generateValidatedMathematicalEquation({ seed, difficulty: "easy" });
}

function generateAdminBatch(
  questionType: "figure_sequence" | "latin_square",
  baseSeed: string,
  count: number,
) {
  const fingerprints = new Set<string>();
  const recentProfiles: StructuralProfile[] = [];
  const questions: PublishableGeneratedQuestion[] = [];
  for (let index = 0; index < count; index += 1) {
    const configuration = { seed: `${baseSeed}:${index + 1}`, difficulty: "easy" as const };
    if (questionType === "figure_sequence") {
      const question = generateValidatedFigureSequence(configuration, fingerprints, recentProfiles.slice(-3));
      fingerprints.add(question.metadata.fingerprint);
      recentProfiles.push(figureSequenceStructuralProfile(question));
      questions.push(question);
    } else {
      const question = generateValidatedLatinSquare(configuration, fingerprints, recentProfiles.slice(-3));
      fingerprints.add(question.metadata.fingerprint);
      recentProfiles.push(latinSquareStructuralProfile(question));
      questions.push(question);
    }
  }
  return questions;
}

describe("generic generated-question publication boundary", () => {
  it.each([
    "figure_sequence",
    "mathematical_equation",
    "latin_square",
  ] as const)("accepts an individually reproduced and module-validated %s", (questionType) => {
    const preview = generate(questionType, `individual-${questionType}`);
    const reproduced = reproduce(preview);

    expect(generatedQuestionPublishItemSchema.safeParse(provenance(preview)).success).toBe(true);
    expect(assessGeneratedQuestionEnvelope(
      reproduced,
      preview.questionType,
      preview.metadata.fingerprint,
    )).toMatchObject({ eligible: true, envelope: { validated: true, questionType } });
    expect(generatedPolicyDecision(reproduced)).toEqual({ allowed: true });
  });

  it("preserves Figure's two-stage and Latin's compact A–E response models", () => {
    const figure = generate("figure_sequence", "response-model-figure");
    const latin = generate("latin_square", "response-model-latin");

    expect(figure.response).toMatchObject({ kind: "two_stage_single_choice" });
    expect(figure.response.kind === "two_stage_single_choice" && figure.response.stages).toHaveLength(2);
    expect(latin.response.kind).toBe("single_choice");
    expect(latin.response.kind === "single_choice" && latin.response.options.map((option) => option.id))
      .toEqual(["A", "B", "C", "D", "E"]);
  });

  it("publishes a mixed five-item batch through the same contract", async () => {
    const types = [
      "figure_sequence",
      "mathematical_equation",
      "latin_square",
      "figure_sequence",
      "latin_square",
    ] as const;
    const result = await publishContractBatch(
      types.map((questionType, index) => generate(questionType, `mixed-${questionType}-${index}`)),
    );

    expect(result).toMatchObject({ requested: 5, published: 5, failed: 0, skipped: 0 });
  });

  it.each([
    ["figure_sequence", "twenty-figures"],
    ["latin_square", "twenty-latin"],
  ] as const)("publishes 20 valid %s previews with explicit per-item success", async (questionType, seed) => {
    const questions = generateAdminBatch(questionType, seed, 20);
    const result = await publishContractBatch(questions);

    expect(result).toMatchObject({ requested: 20, published: 20, failed: 0, skipped: 0 });
    expect(result.results).toHaveLength(20);
    expect(result.results.every((item) => item.status === "published" && item.questionId)).toBe(true);
  }, 30_000);

  it.each([
    "figure_sequence",
    "mathematical_equation",
    "latin_square",
  ] as const)("rejects a %s fixture whose module validation is not passed", (questionType) => {
    const valid = generate(questionType, `invalid-${questionType}`);
    const invalid = {
      ...valid,
      validation: {
        ...valid.validation,
        valid: false,
        checks: valid.validation.checks.map((check, index) =>
          index === 0 ? { ...check, passed: false } : check),
      },
    };

    expect(assessGeneratedQuestionEnvelope(
      invalid,
      questionType,
      valid.metadata.fingerprint,
    )).toEqual({ eligible: false, reason: "VALIDATION_FAILED" });
    expect(evaluatePublication({
      verificationStatus: "approved",
      questionType,
      sourceType: "generated",
      optionCount: 0,
      correctOptionId: null,
      structuredData: { response: invalid.response },
      metadata: { generation: invalid.metadata, validation: invalid.validation },
    }).allowed).toBe(false);
  });
});

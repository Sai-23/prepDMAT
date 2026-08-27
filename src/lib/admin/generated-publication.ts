import type {
  FigureSequenceQuestion,
  GeneratedQuestionType,
  LatinSquareQuestion,
  MathematicalEquationQuestion,
} from "@/lib/generation";

export type PublishableGeneratedQuestion =
  | FigureSequenceQuestion
  | MathematicalEquationQuestion
  | LatinSquareQuestion;

export type ValidatedQuestionEnvelope = {
  questionType: GeneratedQuestionType;
  fingerprint: string;
  validatorVersion: string;
  validated: true;
};

export type GeneratedQuestionEnvelopeDecision =
  | { eligible: true; envelope: ValidatedQuestionEnvelope }
  | { eligible: false; reason: "REPRODUCTION_MISMATCH" | "VALIDATION_FAILED" };

export function assessGeneratedQuestionEnvelope(
  question: {
    questionType: GeneratedQuestionType;
    metadata: { fingerprint: string; validatorVersion: string };
    validation: { valid: boolean; checks: Array<{ passed: boolean }> };
  },
  expectedQuestionType: GeneratedQuestionType,
  expectedFingerprint: string,
): GeneratedQuestionEnvelopeDecision {
  if (
    question.questionType !== expectedQuestionType ||
    question.metadata.fingerprint !== expectedFingerprint
  ) {
    return { eligible: false, reason: "REPRODUCTION_MISMATCH" };
  }
  if (
    !question.validation.valid ||
    question.validation.checks.length === 0 ||
    !question.validation.checks.every((check) => check.passed)
  ) {
    return { eligible: false, reason: "VALIDATION_FAILED" };
  }
  return {
    eligible: true,
    envelope: {
      questionType: question.questionType,
      fingerprint: question.metadata.fingerprint,
      validatorVersion: question.metadata.validatorVersion,
      validated: true,
    },
  };
}

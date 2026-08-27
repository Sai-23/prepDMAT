import type { ValidationCheck, ValidationIssue } from "../types";
import { assessStructuralNovelty, fingerprintStructuralProfile, type StructuralProfile } from "../novelty";
import { referenceProfilesFor } from "../reference-protection";
import { fingerprintLatinSquare, LATIN_SQUARE_NOVELTY_POLICY, LATIN_SQUARE_SIMILARITY_WEIGHTS, latinSquareStructuralProfile } from "./fingerprint";
import { latinSquareGenerator } from "./generator";
import {
  LATIN_SQUARE_VALIDATOR_VERSION,
  type LatinSquareGenerationConfiguration,
  type LatinSquareQuestion,
} from "./types";
import { latinSquareValidator } from "./validator";

const DEFAULT_MAX_ATTEMPTS = 500;
const MAX_GENERATION_ATTEMPTS = 5_000;

export class LatinSquareGenerationError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly lastIssues: ValidationIssue[],
  ) {
    super(message);
    this.name = "LatinSquareGenerationError";
  }
}

function acceptedQuestion(
  configuration: LatinSquareGenerationConfiguration,
  attempt: number,
): LatinSquareQuestion {
  const candidate = latinSquareGenerator.generate(configuration, attempt);
  const validation = latinSquareValidator.validate(candidate, configuration.difficulty);
  if (!validation.valid) {
    throw new LatinSquareGenerationError(
      `Latin-square attempt ${attempt} failed independent validation.`,
      attempt,
      validation.issues,
    );
  }
  const fingerprint = fingerprintLatinSquare(candidate);
  const structuralProfile = latinSquareStructuralProfile(candidate);
  const timestamp = new Date().toISOString();
  return {
    ...candidate,
    explanation: validation.solution.explanation,
    deductionTrace: validation.solution.deductions,
    metadata: {
      seed: configuration.seed,
      generatorVersion: latinSquareGenerator.version,
      validatorVersion: latinSquareValidator.version,
      requestedDifficulty: configuration.difficulty,
      calculatedDifficulty: validation.solution.calculatedDifficulty,
      generatedAt: timestamp,
      attemptCount: attempt,
      fingerprint,
      ruleFingerprint: fingerprintStructuralProfile(structuralProfile),
      structuralProfile: structuralProfile as never,
    },
    validation: {
      valid: true,
      validatedAt: timestamp,
      checks: validation.checks,
    },
  };
}

export function reproduceValidatedLatinSquare(
  configuration: LatinSquareGenerationConfiguration,
  attempt: number,
): LatinSquareQuestion {
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > MAX_GENERATION_ATTEMPTS) {
    throw new RangeError(`attempt must be an integer from 1 through ${MAX_GENERATION_ATTEMPTS}.`);
  }
  const question = acceptedQuestion(configuration, attempt);
  const novelty = assessStructuralNovelty(latinSquareStructuralProfile(question), { references: referenceProfilesFor("latin_square"), weights: LATIN_SQUARE_SIMILARITY_WEIGHTS, ...LATIN_SQUARE_NOVELTY_POLICY });
  if (!novelty.accepted) throw new LatinSquareGenerationError("The reproduced Latin square matches a protected reference structure.", attempt, [{ stage: "duplicate", code: "reference_near_clone", message: "The reproduced structure exceeds the reference-similarity threshold." }]);
  return {
    ...question,
    metadata: { ...question.metadata, novelty },
    validation: {
      ...question.validation,
      checks: [
        ...question.validation.checks,
        {
          stage: "duplicate",
          passed: true,
          validatorVersion: LATIN_SQUARE_VALIDATOR_VERSION,
          details: { fingerprint: question.metadata.fingerprint },
        },
      ],
    },
  };
}

export function generateValidatedLatinSquare(
  configuration: LatinSquareGenerationConfiguration,
  acceptedFingerprints: ReadonlySet<string> = new Set(),
  recentStructuralProfiles: readonly StructuralProfile[] = [],
): LatinSquareQuestion {
  const maxAttempts = configuration.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_GENERATION_ATTEMPTS) {
    throw new RangeError(`maxAttempts must be an integer from 1 through ${MAX_GENERATION_ATTEMPTS}.`);
  }

  let lastIssues: ValidationIssue[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let question: LatinSquareQuestion;
    try {
      question = acceptedQuestion(configuration, attempt);
    } catch (error) {
      if (error instanceof LatinSquareGenerationError) {
        lastIssues = error.lastIssues;
        continue;
      }
      throw error;
    }
    const fingerprint = question.metadata.fingerprint;
    if (acceptedFingerprints.has(fingerprint)) {
      lastIssues = [{ stage: "duplicate", code: "duplicate_fingerprint", message: "The Latin-square clue structure duplicates accepted content." }];
      continue;
    }
    const novelty = assessStructuralNovelty(latinSquareStructuralProfile(question), {
      references: referenceProfilesFor("latin_square"),
      recent: recentStructuralProfiles,
      weights: LATIN_SQUARE_SIMILARITY_WEIGHTS,
      ...LATIN_SQUARE_NOVELTY_POLICY,
    });
    if (!novelty.accepted) {
      const referenceRejected = novelty.maximumReferenceSimilarity !== null && novelty.maximumReferenceSimilarity >= novelty.referenceThreshold;
      lastIssues = [{ stage: "duplicate", code: referenceRejected ? "reference_near_clone" : "recent_near_clone", message: referenceRejected ? "The Latin-square reasoning structure is too similar to a protected reference." : "The Latin-square deduction structure is too similar to recent content." }];
      continue;
    }
    const duplicateCheck: ValidationCheck = {
      stage: "duplicate",
      passed: true,
      validatorVersion: LATIN_SQUARE_VALIDATOR_VERSION,
      details: { fingerprint, ...novelty },
    };
    return {
      ...question,
      metadata: { ...question.metadata, novelty },
      validation: {
        ...question.validation,
        checks: [...question.validation.checks, duplicateCheck],
      },
    };
  }

  throw new LatinSquareGenerationError(
    `Unable to generate a validated Latin square in ${maxAttempts} attempts.`,
    maxAttempts,
    lastIssues,
  );
}

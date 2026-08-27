import type { ValidationCheck, ValidationIssue } from "../types";
import {
  assessStructuralNovelty,
  fingerprintStructuralProfile,
  type StructuralProfile,
} from "../novelty";
import { referenceProfilesFor } from "../reference-protection";
import {
  fingerprintMathematicalEquation,
  MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS,
  mathematicalEquationStructuralProfile,
  mathematicalEquationStructuralSignature,
} from "./fingerprint";
import { mathematicalEquationGenerator } from "./generator";
import {
  MATHEMATICAL_EQUATION_VALIDATOR_VERSION,
  type MathematicalEquationGenerationConfiguration,
  type MathematicalEquationQuestion,
} from "./types";
import { mathematicalEquationValidator } from "./validator";

const DEFAULT_MAX_ATTEMPTS = 25;
const MAX_GENERATION_ATTEMPTS = 100;

export class MathematicalEquationGenerationError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly lastIssues: ValidationIssue[],
  ) {
    super(message);
    this.name = "MathematicalEquationGenerationError";
  }
}

function acceptedQuestion(
  configuration: MathematicalEquationGenerationConfiguration,
  attempt: number,
): MathematicalEquationQuestion {
  const candidate = mathematicalEquationGenerator.generate(configuration, attempt);
  const validation = mathematicalEquationValidator.validate(
    candidate,
    configuration.difficulty,
  );
  if (!validation.valid) {
    throw new MathematicalEquationGenerationError(
      `Mathematical-equation attempt ${attempt} failed independent validation.`,
      attempt,
      validation.issues,
    );
  }
  const fingerprint = fingerprintMathematicalEquation(candidate);
  const structuralProfile = mathematicalEquationStructuralProfile(candidate);
  const timestamp = new Date().toISOString();
  return {
    ...candidate,
    metadata: {
      seed: configuration.seed,
      generatorVersion: mathematicalEquationGenerator.version,
      validatorVersion: mathematicalEquationValidator.version,
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

export function reproduceValidatedMathematicalEquation(
  configuration: MathematicalEquationGenerationConfiguration,
  attempt: number,
): MathematicalEquationQuestion {
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > MAX_GENERATION_ATTEMPTS) {
    throw new RangeError(`attempt must be an integer from 1 through ${MAX_GENERATION_ATTEMPTS}.`);
  }
  const question = acceptedQuestion(configuration, attempt);
  const novelty = assessStructuralNovelty(mathematicalEquationStructuralProfile(question), {
    references: referenceProfilesFor("mathematical_equation"),
    weights: MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS,
  });
  if (!novelty.accepted) {
    throw new MathematicalEquationGenerationError("The reproduced question matches a protected reference structure.", attempt, [{ stage: "duplicate", code: "reference_near_clone", message: "The reproduced structure exceeds the reference-similarity threshold." }]);
  }
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
          validatorVersion: MATHEMATICAL_EQUATION_VALIDATOR_VERSION,
          details: { fingerprint: question.metadata.fingerprint },
        },
      ],
    },
  };
}

export function generateValidatedMathematicalEquation(
  configuration: MathematicalEquationGenerationConfiguration,
  acceptedFingerprints: ReadonlySet<string> = new Set(),
  acceptedStructuralSignatures: ReadonlySet<string> = new Set(),
  recentStructuralProfiles: readonly StructuralProfile[] = [],
): MathematicalEquationQuestion {
  const maxAttempts = configuration.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_GENERATION_ATTEMPTS) {
    throw new RangeError(`maxAttempts must be an integer from 1 through ${MAX_GENERATION_ATTEMPTS}.`);
  }

  let lastIssues: ValidationIssue[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let question: MathematicalEquationQuestion;
    try {
      question = acceptedQuestion(configuration, attempt);
    } catch (error) {
      if (error instanceof MathematicalEquationGenerationError) {
        lastIssues = error.lastIssues;
        continue;
      }
      throw error;
    }

    const fingerprint = question.metadata.fingerprint;
    const structuralSignature = mathematicalEquationStructuralSignature(question);
    const duplicate = acceptedFingerprints.has(fingerprint) ||
      acceptedStructuralSignatures.has(structuralSignature);
    if (duplicate) {
      lastIssues = [{
        stage: "duplicate",
        code: acceptedFingerprints.has(fingerprint)
          ? "duplicate_fingerprint"
          : "duplicate_structural_signature",
        message: acceptedFingerprints.has(fingerprint)
          ? "The candidate duplicates an accepted equation system."
          : "The candidate is structurally equivalent to an accepted equation system.",
      }];
      continue;
    }
    const profile = mathematicalEquationStructuralProfile(question);
    const novelty = assessStructuralNovelty(profile, {
      references: referenceProfilesFor("mathematical_equation"),
      recent: recentStructuralProfiles,
      weights: MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS,
    });
    if (!novelty.accepted) {
      lastIssues = [{
        stage: "duplicate",
        code: novelty.maximumReferenceSimilarity !== null &&
          novelty.maximumReferenceSimilarity >= novelty.referenceThreshold
          ? "reference_near_clone"
          : "recent_near_clone",
        message: "The candidate is too structurally similar to protected or recently generated reasoning.",
      }];
      continue;
    }
    const duplicateCheck: ValidationCheck = {
      stage: "duplicate",
      passed: true,
      validatorVersion: MATHEMATICAL_EQUATION_VALIDATOR_VERSION,
      details: { fingerprint, structuralSignature, ...novelty },
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

  throw new MathematicalEquationGenerationError(
    `Unable to generate a validated mathematical-equation question in ${maxAttempts} attempts.`,
    maxAttempts,
    lastIssues,
  );
}

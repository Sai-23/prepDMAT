import type { ValidationCheck, ValidationIssue } from "../types";
import { assessStructuralNovelty, fingerprintStructuralProfile, type StructuralProfile } from "../novelty";
import { referenceProfilesFor } from "../reference-protection";
import { FIGURE_SEQUENCE_NOVELTY_POLICY, FIGURE_SEQUENCE_SIMILARITY_WEIGHTS, fingerprintFigureSequence, figureSequenceStructuralProfile } from "./fingerprint";
import { figureSequenceGenerator } from "./generator";
import { FIGURE_SEQUENCE_VALIDATOR_VERSION, type FigureSequenceGenerationConfiguration, type FigureSequenceQuestion } from "./types";
import { figureSequenceValidator } from "./validator";

const DEFAULT_MAX_ATTEMPTS = 500;
const MAX_ATTEMPTS = 5_000;

export class FigureSequenceGenerationError extends Error {
  constructor(message: string, readonly attempts: number, readonly lastIssues: ValidationIssue[]) { super(message); this.name = "FigureSequenceGenerationError"; }
}

function accepted(configuration: FigureSequenceGenerationConfiguration, attempt: number): FigureSequenceQuestion {
  let candidate;
  try { candidate = figureSequenceGenerator.generate(configuration, attempt); }
  catch (error) { throw new FigureSequenceGenerationError(`Figure attempt ${attempt} could not be constructed.`, attempt, [{ stage: "safety", code: "construction_failed", message: error instanceof Error ? error.message : "Unknown construction error." }]); }
  const validation = figureSequenceValidator.validate(candidate, configuration.difficulty);
  if (!validation.valid) throw new FigureSequenceGenerationError(`Figure attempt ${attempt} failed independent validation.`, attempt, validation.issues);
  const timestamp = new Date().toISOString();
  const fingerprint = fingerprintFigureSequence(candidate);
  const structuralProfile = figureSequenceStructuralProfile(candidate);
  return { ...candidate, explanation: validation.solution.explanation, metadata: { seed: configuration.seed, generatorVersion: figureSequenceGenerator.version, validatorVersion: figureSequenceValidator.version, requestedDifficulty: configuration.difficulty, calculatedDifficulty: validation.solution.calculatedDifficulty, generatedAt: timestamp, attemptCount: attempt, fingerprint, ruleFingerprint: fingerprintStructuralProfile(structuralProfile), structuralProfile: structuralProfile as never }, validation: { valid: true, validatedAt: timestamp, checks: validation.checks } };
}

export function generateValidatedFigureSequence(configuration: FigureSequenceGenerationConfiguration, acceptedFingerprints: ReadonlySet<string> = new Set(), recentStructuralProfiles: readonly StructuralProfile[] = []): FigureSequenceQuestion {
  const maxAttempts = configuration.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS) throw new RangeError(`maxAttempts must be an integer from 1 through ${MAX_ATTEMPTS}.`);
  let lastIssues: ValidationIssue[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let question;
    try { question = accepted(configuration, attempt); }
    catch (error) { if (error instanceof FigureSequenceGenerationError) { lastIssues = error.lastIssues; continue; } throw error; }
    if (acceptedFingerprints.has(question.metadata.fingerprint)) { lastIssues = [{ stage: "duplicate", code: "duplicate_fingerprint", message: "The transformation structure duplicates accepted content." }]; continue; }
    const novelty = assessStructuralNovelty(figureSequenceStructuralProfile(question), { references: referenceProfilesFor("figure_sequence"), recent: recentStructuralProfiles, weights: FIGURE_SEQUENCE_SIMILARITY_WEIGHTS, ...FIGURE_SEQUENCE_NOVELTY_POLICY });
    if (!novelty.accepted) {
      const referenceRejected = novelty.maximumReferenceSimilarity !== null && novelty.maximumReferenceSimilarity >= novelty.referenceThreshold;
      lastIssues = [{ stage: "duplicate", code: referenceRejected ? "reference_near_clone" : "recent_near_clone", message: referenceRejected ? "The candidate is too structurally similar to a protected reference profile." : "The candidate is too structurally similar to a recent Figure sequence." }];
      continue;
    }
    const duplicateCheck: ValidationCheck = { stage: "duplicate", passed: true, validatorVersion: FIGURE_SEQUENCE_VALIDATOR_VERSION, details: { fingerprint: question.metadata.fingerprint, ...novelty } };
    return { ...question, metadata: { ...question.metadata, novelty }, validation: { ...question.validation, checks: [...question.validation.checks, duplicateCheck] } };
  }
  throw new FigureSequenceGenerationError(`Unable to generate a validated figure sequence in ${maxAttempts} attempts.`, maxAttempts, lastIssues);
}

export function reproduceValidatedFigureSequence(configuration: FigureSequenceGenerationConfiguration, attempt: number): FigureSequenceQuestion {
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > MAX_ATTEMPTS) throw new RangeError(`attempt must be an integer from 1 through ${MAX_ATTEMPTS}.`);
  const question = accepted(configuration, attempt);
  const novelty = assessStructuralNovelty(figureSequenceStructuralProfile(question), { references: referenceProfilesFor("figure_sequence"), weights: FIGURE_SEQUENCE_SIMILARITY_WEIGHTS, ...FIGURE_SEQUENCE_NOVELTY_POLICY });
  if (!novelty.accepted) throw new FigureSequenceGenerationError("The reproduced figure sequence matches a protected reference structure.", attempt, [{ stage: "duplicate", code: "reference_near_clone", message: "The reproduced structure exceeds the reference-similarity threshold." }]);
  return { ...question, metadata: { ...question.metadata, novelty }, validation: { ...question.validation, checks: [...question.validation.checks, { stage: "duplicate", passed: true, validatorVersion: FIGURE_SEQUENCE_VALIDATOR_VERSION, details: { fingerprint: question.metadata.fingerprint, ...novelty } }] } };
}

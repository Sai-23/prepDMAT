import {
  FIGURE_SEQUENCE_GENERATOR_VERSION,
  FIGURE_SEQUENCE_SIMILARITY_WEIGHTS,
  figureSequenceStructuralProfile,
  generateValidatedFigureSequence,
  type FigureSequenceQuestion,
} from "../generation/figure-sequences";
import {
  LATIN_SQUARE_GENERATOR_VERSION,
  LATIN_SQUARE_SIMILARITY_WEIGHTS,
  generateValidatedLatinSquare,
  latinSquareStructuralProfile,
  type LatinSquareQuestion,
} from "../generation/latin-squares";
import {
  MATHEMATICAL_EQUATION_GENERATOR_VERSION,
  MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS,
  generateValidatedMathematicalEquation,
  inspectMathematicalEquationStyle,
  mathematicalEquationStructuralProfile,
  mathematicalEquationStructuralSignature,
  type MathematicalEquationQuestion,
} from "../generation/mathematical-equations";
import {
  calculateStructuralSimilarity,
  type StructuralProfile,
} from "../generation/novelty";
import { SeededRandom } from "../generation/random";
import type { GenerationDifficulty, JsonValue } from "../generation/types";
import {
  DMAT_CURRENT_CORE_PROTOCOL,
  type DmatCoreSectionType,
} from "../protocol";

export const CORE_MOCK_ASSEMBLER_VERSION = "core-mock-assembler@1.0.0";

export type CoreMockQuestion =
  | FigureSequenceQuestion
  | MathematicalEquationQuestion
  | LatinSquareQuestion;

export type CoreMockDifficultyProfile = Readonly<
  Record<GenerationDifficulty, number>
>;

export const DEVELOPMENT_CORE_MOCK_DIFFICULTY_PROFILE: CoreMockDifficultyProfile = {
  easy: 7,
  medium: 7,
  hard: 6,
};

export type CoreMockPolicy = {
  difficultyProfile: Readonly<
    Record<DmatCoreSectionType, CoreMockDifficultyProfile>
  >;
  maximumDifficultyStreak: number;
  maximumSameFamilyRun: number;
  maximumSlotRetries: number;
  withinMockSimilarityThreshold: Readonly<
    Record<DmatCoreSectionType, number>
  >;
  recentProfilesPerModule: number;
  generatorRecentProfilesPerModule: number;
};

export const DEVELOPMENT_CORE_MOCK_POLICY: CoreMockPolicy = {
  difficultyProfile: {
    figure_sequence: DEVELOPMENT_CORE_MOCK_DIFFICULTY_PROFILE,
    mathematical_equation: DEVELOPMENT_CORE_MOCK_DIFFICULTY_PROFILE,
    latin_square: DEVELOPMENT_CORE_MOCK_DIFFICULTY_PROFILE,
  },
  maximumDifficultyStreak: 3,
  maximumSameFamilyRun: 2,
  maximumSlotRetries: 12,
  withinMockSimilarityThreshold: {
    figure_sequence: 0.94,
    mathematical_equation: 0.94,
    latin_square: 0.94,
  },
  recentProfilesPerModule: 3,
  generatorRecentProfilesPerModule: 3,
};

export type CoreMockAssemblyConfiguration = {
  mockSeed: string;
  policy?: CoreMockPolicy;
  createdAt?: string;
  recentFingerprints?: Partial<Record<DmatCoreSectionType, ReadonlySet<string>>>;
  recentStructuralProfiles?: Partial<Record<DmatCoreSectionType, readonly StructuralProfile[]>>;
};

export type CoreMockQuestionDiagnostics = {
  family: string;
  reasoningClassification: string;
  features: Readonly<Record<string, string | number | boolean | readonly string[]>>;
  difficultyScore: number | null;
  maximumWithinSectionSimilarity: number;
  noveltyScore: number;
  generatorAttempts: number;
  slotGenerationCalls: number;
  mockNoveltyRejections: number;
  generatorFailures: number;
  spacingRelaxed: boolean;
};

export type CoreMockQuestionItem = {
  id: string;
  position: number;
  seed: string;
  difficulty: GenerationDifficulty;
  fingerprint: string;
  structuralFingerprint: string;
  generatorVersion: string;
  validatorVersion: string;
  question: CoreMockQuestion;
  structuralProfile: StructuralProfile;
  diagnostics: CoreMockQuestionDiagnostics;
};

export type CoreMockSection = {
  sectionType: DmatCoreSectionType;
  title: string;
  durationSeconds: number;
  position: number;
  generationDurationMs: number;
  difficultyOrder: GenerationDifficulty[];
  questions: CoreMockQuestionItem[];
};

export type CoreMockQualityComponent = {
  score: number;
  issues: string[];
};

export type CoreMockQualityAssessment = {
  passed: boolean;
  score: number;
  criticalIssues: string[];
  warnings: string[];
  components: {
    protocol: CoreMockQualityComponent;
    validity: CoreMockQualityComponent;
    novelty: CoreMockQualityComponent;
    difficulty: CoreMockQualityComponent;
    pacing: CoreMockQualityComponent;
    familyDiversity: CoreMockQualityComponent;
    generationStability: CoreMockQualityComponent;
    explanations: CoreMockQualityComponent;
  };
  moduleScores: Record<DmatCoreSectionType, number>;
};

export type CoreMock = {
  assemblerVersion: typeof CORE_MOCK_ASSEMBLER_VERSION;
  mockSeed: string;
  protocolVersion: string;
  createdAt: string;
  generatorVersions: Record<DmatCoreSectionType, string>;
  sections: CoreMockSection[];
  fingerprints: Record<DmatCoreSectionType, string[]>;
  totalGenerationDurationMs: number;
  totalGeneratorAttempts: number;
  quality: CoreMockQualityAssessment;
};

export type CoreMockAssemblyFailureReason =
  | "invalid_configuration"
  | "slot_retry_exhausted"
  | "quality_gate_failed";

export class CoreMockAssemblyError extends Error {
  constructor(
    message: string,
    readonly reason: CoreMockAssemblyFailureReason,
    readonly sectionType: DmatCoreSectionType | null = null,
    readonly position: number | null = null,
    readonly attempts = 0,
  ) {
    super(message);
    this.name = "CoreMockAssemblyError";
  }
}

const SIMILARITY_WEIGHTS = {
  figure_sequence: FIGURE_SEQUENCE_SIMILARITY_WEIGHTS,
  mathematical_equation: MATHEMATICAL_EQUATION_SIMILARITY_WEIGHTS,
  latin_square: LATIN_SQUARE_SIMILARITY_WEIGHTS,
} as const;

const GENERATOR_VERSIONS = {
  figure_sequence: FIGURE_SEQUENCE_GENERATOR_VERSION,
  mathematical_equation: MATHEMATICAL_EQUATION_GENERATOR_VERSION,
  latin_square: LATIN_SQUARE_GENERATOR_VERSION,
} as const;

function rounded(value: number, places = 4): number {
  return Number(value.toFixed(places));
}

function validatePolicy(policy: CoreMockPolicy): void {
  if (!Number.isSafeInteger(policy.maximumDifficultyStreak) || policy.maximumDifficultyStreak < 1) {
    throw new CoreMockAssemblyError("The maximum difficulty streak must be a positive integer.", "invalid_configuration");
  }
  if (!Number.isSafeInteger(policy.maximumSameFamilyRun) || policy.maximumSameFamilyRun < 1) {
    throw new CoreMockAssemblyError("The maximum family run must be a positive integer.", "invalid_configuration");
  }
  if (!Number.isSafeInteger(policy.maximumSlotRetries) || policy.maximumSlotRetries < 1 || policy.maximumSlotRetries > 100) {
    throw new CoreMockAssemblyError("The slot retry budget must be an integer from 1 through 100.", "invalid_configuration");
  }
  if (!Number.isSafeInteger(policy.recentProfilesPerModule) || policy.recentProfilesPerModule < 0 || policy.recentProfilesPerModule > 200) {
    throw new CoreMockAssemblyError("The recent profile comparison window must be an integer from 0 through 200.", "invalid_configuration");
  }
  if (!Number.isSafeInteger(policy.generatorRecentProfilesPerModule) || policy.generatorRecentProfilesPerModule < 0 || policy.generatorRecentProfilesPerModule > 20) {
    throw new CoreMockAssemblyError("The generator recent profile window must be an integer from 0 through 20.", "invalid_configuration");
  }
  for (const section of DMAT_CURRENT_CORE_PROTOCOL.core) {
    const profile = policy.difficultyProfile[section.sectionType];
    const total = profile.easy + profile.medium + profile.hard;
    if (total !== section.questionCount || Object.values(profile).some((count) => !Number.isSafeInteger(count) || count < 0)) {
      throw new CoreMockAssemblyError(`${section.title} difficulty counts must be non-negative integers totalling ${section.questionCount}.`, "invalid_configuration", section.sectionType);
    }
    const threshold = policy.withinMockSimilarityThreshold[section.sectionType];
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
      throw new CoreMockAssemblyError(`${section.title} requires a similarity threshold in (0, 1].`, "invalid_configuration", section.sectionType);
    }
  }
}

function difficultyOrder(
  sectionType: DmatCoreSectionType,
  profile: CoreMockDifficultyProfile,
  maximumStreak: number,
  mockSeed: string,
): GenerationDifficulty[] {
  const values: GenerationDifficulty[] = [
    ...Array.from({ length: profile.easy }, () => "easy" as const),
    ...Array.from({ length: profile.medium }, () => "medium" as const),
    ...Array.from({ length: profile.hard }, () => "hard" as const),
  ];
  const random = new SeededRandom(`${mockSeed}\u001f${sectionType}\u001fdifficulty-order`);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = random.shuffle(values);
    if (longestRun(result) <= maximumStreak) return result;
  }
  throw new CoreMockAssemblyError(
    `Unable to produce a paced ${sectionType} difficulty order within 100 deterministic shuffles.`,
    "invalid_configuration",
    sectionType,
  );
}

function profileFor(question: CoreMockQuestion): StructuralProfile {
  if (question.questionType === "figure_sequence") return figureSequenceStructuralProfile(question);
  if (question.questionType === "mathematical_equation") return mathematicalEquationStructuralProfile(question);
  return latinSquareStructuralProfile(question);
}

function profileFamily(sectionType: DmatCoreSectionType, profile: StructuralProfile): string {
  const features = profile.features;
  if (sectionType === "figure_sequence") {
    const movements = features.movementKinds;
    return Array.isArray(movements) ? movements.join("+") : String(movements ?? "unknown");
  }
  if (sectionType === "mathematical_equation") {
    const relationships = features.relationships;
    return `${String(features.graph ?? "unknown")}|${Array.isArray(relationships) ? relationships.join("+") : String(relationships ?? "unknown")}`;
  }
  return `${String(features.targetReasoning ?? "unknown")}|depth-${String(features.targetDepth ?? "unknown")}`;
}

function reasoningClassification(sectionType: DmatCoreSectionType, profile: StructuralProfile): string {
  if (sectionType === "figure_sequence") {
    const movements = profile.features.movementKinds;
    return Array.isArray(movements) ? movements.join(" + ") : String(movements ?? "unknown");
  }
  if (sectionType === "mathematical_equation") return String(profile.features.graph ?? "unknown");
  return String(profile.features.targetReasoning ?? "unknown");
}

function difficultyDetails(question: CoreMockQuestion): Record<string, JsonValue> {
  const details = question.validation.checks.find((check) => check.stage === "difficulty")?.details;
  return details && typeof details === "object" && !Array.isArray(details)
    ? details as Record<string, JsonValue>
    : {};
}

function questionFeatures(question: CoreMockQuestion, profile: StructuralProfile): CoreMockQuestionDiagnostics["features"] {
  const details = difficultyDetails(question);
  if (question.questionType === "figure_sequence") {
    return {
      objectCount: Number(profile.features.objectCount ?? 0),
      movementKinds: Array.isArray(profile.features.movementKinds) ? profile.features.movementKinds : [],
      progressiveRuleCount: Number(profile.features.progressiveRuleCount ?? 0),
      rotationRuleCount: Number(details.orientationRuleCount ?? 0),
      colourRuleCount: Number(details.attributeRuleCount ?? 0),
      boundaryInteractionCount: Number(details.boundaryInteractionCount ?? 0),
      combinedStatePeriod: Number(profile.features.combinedStatePeriod ?? 0),
    };
  }
  if (question.questionType === "mathematical_equation") {
    const style = inspectMathematicalEquationStyle(question);
    return {
      graph: String(profile.features.graph ?? "unknown"),
      relationships: question.structuredData.dependencyModel.relationshipPrimitives ?? [],
      variableCount: question.structuredData.variables.length,
      targetDepth: Number(profile.features.targetDepth ?? 0),
      mentalArithmeticCost: style.mentalArithmeticCost,
      maximumVisibleConstant: style.maximumDisplayedConstant,
      constantsAbove20: style.preferredConstantExceedanceCount,
      hasScaleOrDivision: (question.structuredData.dependencyModel.relationshipPrimitives ?? []).some((relationship) => relationship === "scale" || relationship === "divide_by_constant"),
    };
  }
  return {
    reasoningFamily: String(profile.features.targetReasoning ?? "unknown"),
    targetDepth: Number(profile.features.targetDepth ?? 0),
    intermediateCells: Number(profile.features.intermediateCells ?? 0),
    deductionTypes: [...new Set(question.deductionTrace.map((deduction) => deduction.reason))].sort(),
    redundantClues: Number(profile.features.redundantClues ?? 0),
    fullGridUnique: question.validation.checks.some((check) => check.stage === "uniqueness" && check.passed),
  };
}

function maximumSimilarity(
  sectionType: DmatCoreSectionType,
  profile: StructuralProfile,
  previous: readonly StructuralProfile[],
): number {
  if (!previous.length) return 0;
  return Math.max(...previous.map((item) =>
    calculateStructuralSimilarity(profile, item, SIMILARITY_WEIGHTS[sectionType])));
}

export function calculateCoreMockQuestionSimilarity(
  sectionType: DmatCoreSectionType,
  first: StructuralProfile,
  second: StructuralProfile,
): number {
  return calculateStructuralSimilarity(first, second, SIMILARITY_WEIGHTS[sectionType]);
}

function generatorFailureAttempts(error: unknown): number {
  if (!error || typeof error !== "object" || !("attempts" in error)) return 1;
  const attempts = Number((error as { attempts?: unknown }).attempts);
  return Number.isSafeInteger(attempts) && attempts > 0 ? attempts : 1;
}

function generateQuestion(
  sectionType: DmatCoreSectionType,
  difficulty: GenerationDifficulty,
  seed: string,
  fingerprints: ReadonlySet<string>,
  equationSignatures: ReadonlySet<string>,
  recentProfiles: readonly StructuralProfile[],
): CoreMockQuestion {
  if (sectionType === "figure_sequence") {
    return generateValidatedFigureSequence({ seed, difficulty, maxAttempts: 5_000 }, fingerprints, recentProfiles);
  }
  if (sectionType === "mathematical_equation") {
    return generateValidatedMathematicalEquation({ seed, difficulty, maxAttempts: 100 }, fingerprints, equationSignatures, recentProfiles);
  }
  return generateValidatedLatinSquare({ seed, difficulty, maxAttempts: 5_000 }, fingerprints, recentProfiles);
}

function sameFamilyRun(items: readonly CoreMockQuestionItem[], family: string): number {
  let count = 0;
  for (let index = items.length - 1; index >= 0 && items[index].diagnostics.family === family; index -= 1) count += 1;
  return count;
}

type SlotCandidate = {
  question: CoreMockQuestion;
  profile: StructuralProfile;
  family: string;
  similarity: number;
  seed: string;
  generatorAttempts: number;
  generationCalls: number;
  noveltyRejections: number;
  generatorFailures: number;
};

function assembleSlot(
  configuration: CoreMockAssemblyConfiguration,
  policy: CoreMockPolicy,
  sectionType: DmatCoreSectionType,
  position: number,
  difficulty: GenerationDifficulty,
  acceptedItems: readonly CoreMockQuestionItem[],
  acceptedFingerprints: Set<string>,
  acceptedProfiles: StructuralProfile[],
  acceptedEquationSignatures: Set<string>,
): CoreMockQuestionItem {
  const externalProfiles = (configuration.recentStructuralProfiles?.[sectionType] ?? [])
    .slice(-policy.recentProfilesPerModule);
  const generatorRecent = [...externalProfiles, ...acceptedProfiles]
    .slice(-policy.generatorRecentProfilesPerModule);
  let totalGeneratorAttempts = 0;
  let generationCalls = 0;
  let noveltyRejections = 0;
  let generatorFailures = 0;
  let spacingFallback: SlotCandidate | null = null;

  for (let retry = 1; retry <= policy.maximumSlotRetries; retry += 1) {
    const seed = `${configuration.mockSeed}/${sectionType}/${String(position).padStart(2, "0")}/retry-${retry}`;
    let question: CoreMockQuestion;
    generationCalls += 1;
    try {
      question = generateQuestion(
        sectionType,
        difficulty,
        seed,
        acceptedFingerprints,
        acceptedEquationSignatures,
        generatorRecent,
      );
      totalGeneratorAttempts += question.metadata.attemptCount;
    } catch (error) {
      totalGeneratorAttempts += generatorFailureAttempts(error);
      generatorFailures += 1;
      continue;
    }
    const profile = profileFor(question);
    const similarity = maximumSimilarity(sectionType, profile, [...externalProfiles, ...acceptedProfiles]);
    if (similarity >= policy.withinMockSimilarityThreshold[sectionType]) {
      noveltyRejections += 1;
      continue;
    }
    const family = profileFamily(sectionType, profile);
    const candidate = {
      question,
      profile,
      family,
      similarity,
      seed,
      generatorAttempts: totalGeneratorAttempts,
      generationCalls,
      noveltyRejections,
      generatorFailures,
    };
    if (sameFamilyRun(acceptedItems, family) >= policy.maximumSameFamilyRun) {
      spacingFallback ??= candidate;
      continue;
    }
    return finalizeSlot(candidate, sectionType, position, difficulty, false);
  }

  if (spacingFallback) return finalizeSlot(spacingFallback, sectionType, position, difficulty, true);
  throw new CoreMockAssemblyError(
    `Unable to fill ${sectionType} slot ${position} without violating validity or within-mock novelty.`,
    "slot_retry_exhausted",
    sectionType,
    position,
    totalGeneratorAttempts,
  );
}

function finalizeSlot(
  candidate: SlotCandidate,
  sectionType: DmatCoreSectionType,
  position: number,
  difficulty: GenerationDifficulty,
  spacingRelaxed: boolean,
): CoreMockQuestionItem {
  const details = difficultyDetails(candidate.question);
  return {
    id: `${sectionType}-${String(position).padStart(2, "0")}`,
    position,
    seed: candidate.seed,
    difficulty,
    fingerprint: candidate.question.metadata.fingerprint,
    structuralFingerprint: candidate.question.metadata.ruleFingerprint ?? "missing",
    generatorVersion: candidate.question.metadata.generatorVersion,
    validatorVersion: candidate.question.metadata.validatorVersion,
    question: candidate.question,
    structuralProfile: candidate.profile,
    diagnostics: {
      family: candidate.family,
      reasoningClassification: reasoningClassification(sectionType, candidate.profile),
      features: questionFeatures(candidate.question, candidate.profile),
      difficultyScore: typeof details.score === "number" ? details.score : null,
      maximumWithinSectionSimilarity: rounded(candidate.similarity, 6),
      noveltyScore: rounded(1 - candidate.similarity, 6),
      generatorAttempts: candidate.generatorAttempts,
      slotGenerationCalls: candidate.generationCalls,
      mockNoveltyRejections: candidate.noveltyRejections,
      generatorFailures: candidate.generatorFailures,
      spacingRelaxed,
    },
  };
}

function longestRun<T>(values: readonly T[]): number {
  let maximum = 0;
  let current = 0;
  let previous: T | undefined;
  values.forEach((value) => {
    current = value === previous ? current + 1 : 1;
    previous = value;
    maximum = Math.max(maximum, current);
  });
  return maximum;
}

function component(score: number, issues: string[] = []): CoreMockQualityComponent {
  return { score: rounded(Math.max(0, Math.min(100, score)), 2), issues };
}

export function assessCoreMockQuality(
  mock: Omit<CoreMock, "quality">,
  policy: CoreMockPolicy = DEVELOPMENT_CORE_MOCK_POLICY,
): CoreMockQualityAssessment {
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const expectedSections = DMAT_CURRENT_CORE_PROTOCOL.core;
  const protocolIssues: string[] = [];
  if (mock.protocolVersion !== DMAT_CURRENT_CORE_PROTOCOL.version) protocolIssues.push("Protocol version mismatch.");
  if (mock.sections.length !== expectedSections.length) protocolIssues.push("Incorrect section count.");
  expectedSections.forEach((expected, index) => {
    const actual = mock.sections[index];
    if (!actual || actual.sectionType !== expected.sectionType || actual.durationSeconds !== expected.durationSeconds || actual.questions.length !== expected.questionCount) {
      protocolIssues.push(`${expected.title} does not match the configured protocol.`);
    }
  });
  criticalIssues.push(...protocolIssues);

  const questions = mock.sections.flatMap((section) => section.questions);
  const validityIssues = questions.flatMap((item) => {
    if (!item.question.validation.valid) return [`${item.id} is invalid.`];
    if (item.question.correctAnswer === undefined || item.question.correctAnswer === null) return [`${item.id} has no answer.`];
    return [];
  });
  const duplicateFingerprints = questions.length - new Set(questions.map((item) => item.fingerprint)).size;
  if (duplicateFingerprints) validityIssues.push(`${duplicateFingerprints} exact duplicate fingerprints were accepted.`);
  criticalIssues.push(...validityIssues);

  const noveltyIssues = mock.sections.flatMap((section) => section.questions.flatMap((item) =>
    item.diagnostics.maximumWithinSectionSimilarity >= policy.withinMockSimilarityThreshold[section.sectionType]
      ? [`${item.id} exceeds the within-mock similarity threshold.`]
      : []));
  criticalIssues.push(...noveltyIssues);

  const difficultyIssues = mock.sections.flatMap((section) => {
    const expected = policy.difficultyProfile[section.sectionType];
    const counts = { easy: 0, medium: 0, hard: 0 };
    section.questions.forEach((item) => { counts[item.difficulty] += 1; });
    return (Object.keys(counts) as GenerationDifficulty[]).flatMap((difficulty) =>
      counts[difficulty] === expected[difficulty] ? [] : [`${section.title} has an incorrect ${difficulty} count.`]);
  });
  criticalIssues.push(...difficultyIssues);

  const pacingIssues = mock.sections.flatMap((section) =>
    longestRun(section.difficultyOrder) > policy.maximumDifficultyStreak
      ? [`${section.title} exceeds the configured difficulty streak.`]
      : []);
  criticalIssues.push(...pacingIssues);

  const spacingRelaxations = questions.filter((item) => item.diagnostics.spacingRelaxed).length;
  if (spacingRelaxations) warnings.push(`${spacingRelaxations} slots used the validated family-spacing fallback.`);
  const familyIssues: string[] = [];
  mock.sections.forEach((section) => {
    const counts = new Map<string, number>();
    section.questions.forEach((item) => counts.set(item.diagnostics.family, (counts.get(item.diagnostics.family) ?? 0) + 1));
    const largest = Math.max(0, ...counts.values());
    if (largest > Math.ceil(section.questions.length * 0.5)) familyIssues.push(`${section.title} has a structural family above 50%.`);
  });
  warnings.push(...familyIssues);

  const explanationIssues = questions.flatMap((item) => item.question.explanation.trim() ? [] : [`${item.id} has no explanation.`]);
  criticalIssues.push(...explanationIssues);
  const averageCalls = questions.length
    ? questions.reduce((sum, item) => sum + item.diagnostics.slotGenerationCalls, 0) / questions.length
    : 0;

  const components = {
    protocol: component(protocolIssues.length ? 0 : 100, protocolIssues),
    validity: component(validityIssues.length ? 0 : 100, validityIssues),
    novelty: component(noveltyIssues.length ? 0 : 100 - questions.reduce((sum, item) => sum + item.diagnostics.maximumWithinSectionSimilarity, 0) / Math.max(1, questions.length) * 35, noveltyIssues),
    difficulty: component(difficultyIssues.length ? 0 : 100, difficultyIssues),
    pacing: component(pacingIssues.length ? 0 : 100, pacingIssues),
    familyDiversity: component(100 - familyIssues.length * 15 - spacingRelaxations * 2, familyIssues),
    generationStability: component(100 - Math.max(0, averageCalls - 1) * 10),
    explanations: component(explanationIssues.length ? 0 : 100, explanationIssues),
  };
  const moduleScores = Object.fromEntries(mock.sections.map((section) => {
    const averageSimilarity = section.questions.reduce((sum, item) => sum + item.diagnostics.maximumWithinSectionSimilarity, 0) / Math.max(1, section.questions.length);
    const relaxed = section.questions.filter((item) => item.diagnostics.spacingRelaxed).length;
    return [section.sectionType, rounded(100 - averageSimilarity * 25 - relaxed * 2, 2)];
  })) as Record<DmatCoreSectionType, number>;
  const score = rounded(Object.values(components).reduce((sum, value) => sum + value.score, 0) / Object.keys(components).length, 2);
  return { passed: criticalIssues.length === 0, score, criticalIssues, warnings, components, moduleScores };
}

export function assembleCoreMock(configuration: CoreMockAssemblyConfiguration): CoreMock {
  if (!configuration.mockSeed.trim()) throw new CoreMockAssemblyError("A non-empty mock seed is required.", "invalid_configuration");
  const policy = configuration.policy ?? DEVELOPMENT_CORE_MOCK_POLICY;
  validatePolicy(policy);
  const startedAt = performance.now();
  const sections: CoreMockSection[] = [];

  for (const [sectionIndex, specification] of DMAT_CURRENT_CORE_PROTOCOL.core.entries()) {
    const sectionStartedAt = performance.now();
    const order = difficultyOrder(specification.sectionType, policy.difficultyProfile[specification.sectionType], policy.maximumDifficultyStreak, configuration.mockSeed);
    const fingerprints = new Set(configuration.recentFingerprints?.[specification.sectionType] ?? []);
    const profiles: StructuralProfile[] = [];
    const equationSignatures = new Set<string>();
    const items: CoreMockQuestionItem[] = [];
    order.forEach((difficulty, index) => {
      const item = assembleSlot(configuration, policy, specification.sectionType, index + 1, difficulty, items, fingerprints, profiles, equationSignatures);
      items.push(item);
      fingerprints.add(item.fingerprint);
      profiles.push(item.structuralProfile);
      if (item.question.questionType === "mathematical_equation") equationSignatures.add(mathematicalEquationStructuralSignature(item.question));
    });
    sections.push({
      sectionType: specification.sectionType,
      title: specification.title,
      durationSeconds: specification.durationSeconds,
      position: sectionIndex + 1,
      generationDurationMs: rounded(performance.now() - sectionStartedAt, 3),
      difficultyOrder: order,
      questions: items,
    });
  }

  const base = {
    assemblerVersion: CORE_MOCK_ASSEMBLER_VERSION,
    mockSeed: configuration.mockSeed,
    protocolVersion: DMAT_CURRENT_CORE_PROTOCOL.version,
    createdAt: configuration.createdAt ?? new Date().toISOString(),
    generatorVersions: { ...GENERATOR_VERSIONS },
    sections,
    fingerprints: Object.fromEntries(sections.map((section) => [section.sectionType, section.questions.map((item) => item.fingerprint)])) as Record<DmatCoreSectionType, string[]>,
    totalGenerationDurationMs: rounded(performance.now() - startedAt, 3),
    totalGeneratorAttempts: sections.flatMap((section) => section.questions).reduce((sum, item) => sum + item.diagnostics.generatorAttempts, 0),
  } satisfies Omit<CoreMock, "quality">;
  const quality = assessCoreMockQuality(base, policy);
  if (!quality.passed) {
    throw new CoreMockAssemblyError(`Core mock failed quality gates: ${quality.criticalIssues.join(" ")}`, "quality_gate_failed");
  }
  return { ...base, quality };
}

export function coreMockDeterministicSnapshot(mock: CoreMock): JsonValue {
  return {
    assemblerVersion: mock.assemblerVersion,
    mockSeed: mock.mockSeed,
    protocolVersion: mock.protocolVersion,
    generatorVersions: mock.generatorVersions,
    sections: mock.sections.map((section) => ({
      sectionType: section.sectionType,
      durationSeconds: section.durationSeconds,
      difficultyOrder: section.difficultyOrder,
      questions: section.questions.map((item) => ({
        id: item.id,
        seed: item.seed,
        difficulty: item.difficulty,
        fingerprint: item.fingerprint,
        structuralFingerprint: item.structuralFingerprint,
        generatorVersion: item.generatorVersion,
        validatorVersion: item.validatorVersion,
        answer: item.question.correctAnswer,
        family: item.diagnostics.family,
        features: item.diagnostics.features,
      })),
    })),
  } as JsonValue;
}

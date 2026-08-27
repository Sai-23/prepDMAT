import type { StructuralProfile } from "../generation/novelty";
import type { DmatCoreSectionType } from "../protocol";
import {
  assembleCoreMock,
  DEVELOPMENT_CORE_MOCK_POLICY,
  type CoreMock,
  type CoreMockPolicy,
} from "./core-mock";

export const DEFAULT_GENERATED_MOCK_HISTORY_WINDOW = 3;
export const GENERATED_MOCK_EXACT_FINGERPRINT_WINDOW = 5;

export type CompactCoreMockHistory = {
  fingerprints: Record<DmatCoreSectionType, string[]>;
  structuralProfiles: Record<DmatCoreSectionType, StructuralProfile[]>;
  familySequences: Record<DmatCoreSectionType, string[]>;
  difficultySequences: Record<DmatCoreSectionType, string[]>;
};

export function compactCoreMockHistory(mock: CoreMock): CompactCoreMockHistory {
  return {
    fingerprints: { ...mock.fingerprints },
    structuralProfiles: Object.fromEntries(mock.sections.map((section) => [
      section.sectionType,
      section.questions.map((question) => question.structuralProfile),
    ])) as CompactCoreMockHistory["structuralProfiles"],
    familySequences: Object.fromEntries(mock.sections.map((section) => [
      section.sectionType,
      section.questions.map((question) => question.diagnostics.family),
    ])) as CompactCoreMockHistory["familySequences"],
    difficultySequences: Object.fromEntries(mock.sections.map((section) => [
      section.sectionType,
      section.difficultyOrder,
    ])) as CompactCoreMockHistory["difficultySequences"],
  };
}

export function generatedMockPolicy(historyWindow: number): CoreMockPolicy {
  const boundedWindow = Math.max(1, Math.min(5, Math.trunc(historyWindow)));
  return {
    ...DEVELOPMENT_CORE_MOCK_POLICY,
    difficultyProfile: { ...DEVELOPMENT_CORE_MOCK_POLICY.difficultyProfile },
    withinMockSimilarityThreshold: {
      ...DEVELOPMENT_CORE_MOCK_POLICY.withinMockSimilarityThreshold,
    },
    maximumSlotRetries: 100,
    recentProfilesPerModule: boundedWindow * 20,
    generatorRecentProfilesPerModule: 5,
  };
}

export function assembleCoreMockWithHistory(input: {
  mockSeed: string;
  createdAt?: string;
  history: readonly CompactCoreMockHistory[];
  historyWindow?: number;
}): CoreMock {
  const historyWindow = input.historyWindow ?? DEFAULT_GENERATED_MOCK_HISTORY_WINDOW;
  const exactRecent = input.history.slice(-GENERATED_MOCK_EXACT_FINGERPRINT_WINDOW);
  const structuralRecent = input.history.slice(-historyWindow);
  const sectionTypes: DmatCoreSectionType[] = [
    "figure_sequence",
    "mathematical_equation",
    "latin_square",
  ];
  const recentFingerprints = Object.fromEntries(sectionTypes.map((sectionType) => [
    sectionType,
    new Set(exactRecent.flatMap((entry) => entry.fingerprints[sectionType] ?? [])),
  ])) as Record<DmatCoreSectionType, Set<string>>;
  const recentStructuralProfiles = Object.fromEntries(sectionTypes.map((sectionType) => [
    sectionType,
    structuralRecent.flatMap((entry) => entry.structuralProfiles[sectionType] ?? []),
  ])) as Record<DmatCoreSectionType, StructuralProfile[]>;

  return assembleCoreMock({
    mockSeed: input.mockSeed,
    createdAt: input.createdAt,
    policy: generatedMockPolicy(historyWindow),
    recentFingerprints,
    recentStructuralProfiles,
  });
}

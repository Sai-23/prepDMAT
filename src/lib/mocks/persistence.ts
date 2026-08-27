import { DMAT_CURRENT_CORE_PROTOCOL, type DmatCoreSectionType } from "../protocol";
import type { ExamSectionSnapshot } from "../tests/exam-spec";

export type PersistedMockQuestionProvenance = {
  questionId: string;
  sectionType: DmatCoreSectionType;
  position: number;
  generatorVersion: string | null;
  validatorVersion: string | null;
  seed: string | null;
  fingerprint: string | null;
};

export type CoreAttemptSnapshot = {
  version: 2;
  origin: "curated" | "generated";
  title: string;
  mockSeed: string;
  protocolVersion: string;
  assemblerVersion: string | null;
  createdAt: string;
  generationQuality: {
    score: number;
    criticalGatePassed: boolean;
  } | null;
  sections: ExamSectionSnapshot[];
  generatorVersions: Record<DmatCoreSectionType, string[]>;
  fingerprints: Record<DmatCoreSectionType, string[]>;
  questions: PersistedMockQuestionProvenance[];
};

export function buildCoreAttemptSnapshot(input: {
  title: string;
  mockSeed: string;
  createdAt: string;
  sections: ExamSectionSnapshot[];
  questions: PersistedMockQuestionProvenance[];
  origin?: "curated" | "generated";
  assemblerVersion?: string | null;
  generationQuality?: CoreAttemptSnapshot["generationQuality"];
}): CoreAttemptSnapshot {
  const generatorVersions = Object.fromEntries(DMAT_CURRENT_CORE_PROTOCOL.core.map((section) => {
    const versions = input.questions
      .filter((question) => question.sectionType === section.sectionType)
      .map((question) => question.generatorVersion ?? "manual-or-unversioned");
    return [section.sectionType, [...new Set(versions)].sort()];
  })) as Record<DmatCoreSectionType, string[]>;
  const fingerprints = Object.fromEntries(DMAT_CURRENT_CORE_PROTOCOL.core.map((section) => [
    section.sectionType,
    input.questions
      .filter((question) => question.sectionType === section.sectionType)
      .flatMap((question) => question.fingerprint ? [question.fingerprint] : []),
  ])) as Record<DmatCoreSectionType, string[]>;
  return {
    version: 2,
    origin: input.origin ?? "curated",
    title: input.title,
    mockSeed: input.mockSeed,
    protocolVersion: DMAT_CURRENT_CORE_PROTOCOL.version,
    assemblerVersion: input.assemblerVersion ?? null,
    createdAt: input.createdAt,
    generationQuality: input.generationQuality ?? null,
    sections: input.sections,
    generatorVersions,
    fingerprints,
    questions: input.questions,
  };
}

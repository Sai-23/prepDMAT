import { DMAT_CURRENT_CORE_PROTOCOL } from "../protocol";

/** Backward-compatible name used by the existing mock-test workflow. */
export const DMAT_EXAM_SPEC = DMAT_CURRENT_CORE_PROTOCOL;

export type ExamSectionSnapshot = {
  id: string;
  title: string;
  sectionType: string;
  durationSeconds: number;
  sortOrder: number;
};

export function validateOfficialFullMockSections(
  sections: Array<ExamSectionSnapshot & { questionCount: number }>,
) {
  const expected = [...DMAT_EXAM_SPEC.core];
  if (sections.length !== expected.length) return "A full mock must contain the three Core subtests.";
  for (let index = 0; index < expected.length; index += 1) {
    const actual = sections[index];
    const specification = expected[index];
    if (actual.sectionType !== specification.sectionType || actual.durationSeconds !== specification.durationSeconds) {
      return `${specification.title} must use the official section type and duration.`;
    }
    if (actual.questionCount !== specification.questionCount) {
      return `${specification.title} must contain ${specification.questionCount} questions.`;
    }
  }
  return null;
}

export function activeSectionAt(
  sections: ExamSectionSnapshot[],
  startedAtMs: number,
  nowMs: number,
) {
  let boundary = startedAtMs;
  for (const section of sections) {
    const expiresAt = boundary + section.durationSeconds * 1000;
    if (nowMs < expiresAt) return { section, startedAt: boundary, expiresAt };
    boundary = expiresAt;
  }
  return null;
}

export function activeSectionFromCursor(
  sections: ExamSectionSnapshot[],
  cursor: {
    currentSectionId: string | null;
    sectionStartedAtMs: number | null;
    sectionExpiresAtMs: number | null;
  },
  nowMs: number,
) {
  if (!sections.length) return null;
  let sectionIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === cursor.currentSectionId),
  );
  let startedAt = cursor.sectionStartedAtMs ?? nowMs;
  let expiresAt = cursor.sectionExpiresAtMs ??
    startedAt + sections[sectionIndex].durationSeconds * 1000;

  while (nowMs >= expiresAt) {
    sectionIndex += 1;
    if (sectionIndex >= sections.length) return null;
    startedAt = expiresAt;
    expiresAt = startedAt + sections[sectionIndex].durationSeconds * 1000;
  }

  return { section: sections[sectionIndex], sectionIndex, startedAt, expiresAt };
}

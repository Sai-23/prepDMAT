import { describe, expect, it } from "vitest";
import { activeSectionAt, activeSectionFromCursor, DMAT_EXAM_SPEC, validateOfficialFullMockSections } from "./exam-spec";

describe("official dMAT mock specification", () => {
  const sections = [...DMAT_EXAM_SPEC.core].map((section, index) => ({
    id: String(index), title: section.title, sectionType: section.sectionType,
    durationSeconds: section.durationSeconds, sortOrder: index + 1,
    questionCount: section.questionCount,
  }));

  it("accepts the Core full-mock section structure", () => {
    expect(validateOfficialFullMockSections(sections)).toBeNull();
  });

  it("rejects wrong Core counts or duplicated generic timing", () => {
    expect(validateOfficialFullMockSections(sections.map((section, index) => index === 0 ? { ...section, questionCount: 19 } : section))).toMatch(/20/);
    expect(validateOfficialFullMockSections(sections.slice(0, 2))).not.toBeNull();
  });

  it("enforces independent, contiguous server-authoritative section boundaries", () => {
    expect(activeSectionAt(sections, 0, 1499_999)?.section.sectionType).toBe("figure_sequence");
    expect(activeSectionAt(sections, 0, 1500_000)?.section.sectionType).toBe("mathematical_equation");
    expect(activeSectionAt(sections, 0, 4_499_999)?.section.sectionType).toBe("latin_square");
    expect(activeSectionAt(sections, 0, 4_500_000)).toBeNull();
  });

  it("advances from the persisted section cursor without reopening a locked section", () => {
    const cursor = {
      currentSectionId: sections[1].id,
      sectionStartedAtMs: 1_000,
      sectionExpiresAtMs: 1_501_000,
    };
    expect(activeSectionFromCursor(sections, cursor, 1_500_999)?.section.id).toBe(sections[1].id);
    expect(activeSectionFromCursor(sections, cursor, 1_501_000)?.section.id).toBe(sections[2].id);
    expect(activeSectionFromCursor(sections, cursor, 3_001_000)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { DMAT_CURRENT_CORE_PROTOCOL } from "../protocol";
import { buildCoreAttemptSnapshot } from "./persistence";

describe("Core mock persistence manifest", () => {
  it("captures the master seed, protocol, generator versions, and fingerprints", () => {
    const snapshot = buildCoreAttemptSnapshot({
      title: "Development Core Mock",
      mockSeed: "mock-seed",
      createdAt: "2026-08-22T00:00:00.000Z",
      sections: DMAT_CURRENT_CORE_PROTOCOL.core.map((section, index) => ({
        id: `section-${index + 1}`,
        title: section.title,
        sectionType: section.sectionType,
        durationSeconds: section.durationSeconds,
        sortOrder: index + 1,
      })),
      questions: DMAT_CURRENT_CORE_PROTOCOL.core.flatMap((section, sectionIndex) => [1, 2].map((position) => ({
        questionId: `${section.sectionType}-${position}`,
        sectionType: section.sectionType,
        position: sectionIndex * 2 + position,
        generatorVersion: `${section.sectionType}@1.0.0`,
        validatorVersion: `${section.sectionType}-validator@1.0.0`,
        seed: `mock-seed/${section.sectionType}/${position}`,
        fingerprint: `${section.sectionType}:fingerprint:${position}`,
      }))),
    });

    expect(snapshot.version).toBe(2);
    expect(snapshot.mockSeed).toBe("mock-seed");
    expect(snapshot.protocolVersion).toBe(DMAT_CURRENT_CORE_PROTOCOL.version);
    expect(snapshot.generatorVersions.figure_sequence).toEqual(["figure_sequence@1.0.0"]);
    expect(snapshot.fingerprints.latin_square).toHaveLength(2);
    expect(JSON.stringify(snapshot)).not.toContain("correctAnswer");
  });
});

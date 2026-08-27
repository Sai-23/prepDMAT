import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { DmatCoreSectionType } from "../protocol";
import {
  calculateCoreMockQuestionSimilarity,
  DEVELOPMENT_CORE_MOCK_POLICY,
} from "./core-mock";
import {
  assembleCoreMockWithHistory,
  compactCoreMockHistory,
  type CompactCoreMockHistory,
} from "./history";

const enabled = process.env.RUN_CORE_MOCK_CROSS_SESSION_AUDIT === "1";
const suite = enabled ? describe : describe.skip;
const modules: DmatCoreSectionType[] = [
  "figure_sequence",
  "mathematical_equation",
  "latin_square",
];

function moduleRecord<T>(factory: () => T): Record<DmatCoreSectionType, T> {
  return Object.fromEntries(modules.map((module) => [module, factory()])) as Record<DmatCoreSectionType, T>;
}

suite("Phase 6 cross-session generated Core mock audit", () => {
  it("simulates isolated students requesting five recent-history-aware mocks", async () => {
    const totalStudents = Number(process.env.CORE_MOCK_CROSS_SESSION_STUDENTS ?? "500");
    const shardCount = Number(process.env.CORE_MOCK_CROSS_SESSION_SHARD_COUNT ?? "1");
    const shardIndex = Number(process.env.CORE_MOCK_CROSS_SESSION_SHARD_INDEX ?? "0");
    const studentIndices = Array.from({ length: totalStudents }, (_, index) => index)
      .filter((index) => index % shardCount === shardIndex);
    const aggregate = moduleRecord(() => ({
      comparisons: 0,
      similaritySum: 0,
      exactRepeats: 0,
      nearClones: 0,
      nearClonesWithinActiveWindow: 0,
      nearClonesOutsideActiveWindow: 0,
      repeatedFamilyQuestions: 0,
      repeatedFamilySequences: 0,
      repeatedDifficultyFamilySequences: 0,
      maximumSimilarityByStudent: [] as number[],
      activeWindowMaximumSimilarityByStudent: [] as number[],
      meanSimilarityByStudent: [] as number[],
      largestFamilyCountByStudent: [] as number[],
    }));
    const failures: Array<{ student: number; mock: number; reason: string }> = [];
    const durations: number[] = [];
    let completeMocks = 0;

    for (const studentIndex of studentIndices) {
      const history: CompactCoreMockHistory[] = [];
      const priorProfiles = moduleRecord(() => [] as Array<{
        profile: CompactCoreMockHistory["structuralProfiles"][DmatCoreSectionType][number];
        mockIndex: number;
      }>);
      const priorFingerprints = moduleRecord(() => new Set<string>());
      const priorFamilies = moduleRecord(() => new Set<string>());
      const familySequenceSet = moduleRecord(() => new Set<string>());
      const difficultyFamilySequenceSet = moduleRecord(() => new Set<string>());
      const familyCounts = moduleRecord(() => new Map<string, number>());
      const studentSimilarity = moduleRecord(() => ({ maximum: 0, activeMaximum: 0, sum: 0, count: 0 }));

      for (let mockIndex = 0; mockIndex < 5; mockIndex += 1) {
        const seed = `phase-6/student-${String(studentIndex + 1).padStart(4, "0")}/mock-${mockIndex + 1}`;
        const startedAt = performance.now();
        try {
          const mock = assembleCoreMockWithHistory({
            mockSeed: seed,
            createdAt: `2026-08-22T${String(mockIndex).padStart(2, "0")}:00:00.000Z`,
            history,
            historyWindow: 3,
          });
          durations.push(Number((performance.now() - startedAt).toFixed(3)));
          completeMocks += 1;

          for (const section of mock.sections) {
            const sectionType = section.sectionType;
            const stats = aggregate[sectionType];
            const familySequence = section.questions.map((question) => question.diagnostics.family);
            const difficultyFamilySequence = section.questions.map((question) => `${question.difficulty}:${question.diagnostics.family}`);
            const familyKey = JSON.stringify(familySequence);
            const difficultyFamilyKey = JSON.stringify(difficultyFamilySequence);
            if (familySequenceSet[sectionType].has(familyKey)) stats.repeatedFamilySequences += 1;
            if (difficultyFamilySequenceSet[sectionType].has(difficultyFamilyKey)) stats.repeatedDifficultyFamilySequences += 1;
            familySequenceSet[sectionType].add(familyKey);
            difficultyFamilySequenceSet[sectionType].add(difficultyFamilyKey);

            for (const question of section.questions) {
              if (priorFingerprints[sectionType].has(question.fingerprint)) stats.exactRepeats += 1;
              if (priorFamilies[sectionType].has(question.diagnostics.family)) stats.repeatedFamilyQuestions += 1;
              familyCounts[sectionType].set(
                question.diagnostics.family,
                (familyCounts[sectionType].get(question.diagnostics.family) ?? 0) + 1,
              );
              for (const previous of priorProfiles[sectionType]) {
                const similarity = calculateCoreMockQuestionSimilarity(sectionType, question.structuralProfile, previous.profile);
                stats.comparisons += 1;
                stats.similaritySum += similarity;
                studentSimilarity[sectionType].count += 1;
                studentSimilarity[sectionType].sum += similarity;
                studentSimilarity[sectionType].maximum = Math.max(studentSimilarity[sectionType].maximum, similarity);
                if (similarity >= DEVELOPMENT_CORE_MOCK_POLICY.withinMockSimilarityThreshold[sectionType]) {
                  stats.nearClones += 1;
                  if (previous.mockIndex >= mockIndex - 3) stats.nearClonesWithinActiveWindow += 1;
                  else stats.nearClonesOutsideActiveWindow += 1;
                }
                if (previous.mockIndex >= mockIndex - 3) {
                  studentSimilarity[sectionType].activeMaximum = Math.max(studentSimilarity[sectionType].activeMaximum, similarity);
                }
              }
            }

            section.questions.forEach((question) => {
              priorFingerprints[sectionType].add(question.fingerprint);
              priorProfiles[sectionType].push({ profile: question.structuralProfile, mockIndex });
              priorFamilies[sectionType].add(question.diagnostics.family);
            });
          }
          history.push(compactCoreMockHistory(mock));
        } catch (error) {
          failures.push({
            student: studentIndex + 1,
            mock: mockIndex + 1,
            reason: error instanceof Error ? error.message : "unknown failure",
          });
        }
        await new Promise<void>((resolve) => setImmediate(resolve));
      }

      modules.forEach((module) => {
        const values = studentSimilarity[module];
        aggregate[module].maximumSimilarityByStudent.push(values.maximum);
        aggregate[module].activeWindowMaximumSimilarityByStudent.push(values.activeMaximum);
        aggregate[module].meanSimilarityByStudent.push(values.count ? values.sum / values.count : 0);
        aggregate[module].largestFamilyCountByStudent.push(Math.max(0, ...familyCounts[module].values()));
      });
    }

    const directory = join(process.cwd(), "reports", "core-mocks", "cross-session", "shards");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `shard-${shardIndex}.json`), `${JSON.stringify({
      totalStudents,
      shardCount,
      shardIndex,
      students: studentIndices.length,
      requestedMocks: studentIndices.length * 5,
      completeMocks,
      generatedQuestions: completeMocks * 60,
      aggregate,
      durations,
      failures,
    }, null, 2)}\n`);

    expect(completeMocks + failures.length).toBe(studentIndices.length * 5);
  }, 3_600_000);
});

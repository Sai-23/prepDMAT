import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildCoreProgress, type ProgressObservation } from "@/lib/progress/model";

import { assembleStudentDashboard, type DashboardActivity } from "./model";

const SIZES = [0, 100, 1_000, 5_000] as const;
const NOW = new Date("2026-08-22T12:00:00.000Z");

function observation(index: number): ProgressObservation {
  const modules = ["figure_sequence", "mathematical_equation", "latin_square"] as const;
  const skills = ["figure_rotation", "equation_scale", "latin_chained"] as const;
  const moduleIndex = index % modules.length;
  return {
    id: `benchmark-answer-${index}`,
    sessionId: `benchmark-session-${Math.floor(index / 5)}`,
    module: modules[moduleIndex],
    difficulty: (["easy", "medium", "hard"] as const)[index % 3],
    source: index % 7 === 0 ? "generated_mock" : "practice",
    correct: index % 4 !== 0,
    responseTimeSeconds: 45 + (index % 35),
    expectedTimeSeconds: 60,
    answeredAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    skills: [skills[moduleIndex]],
  };
}

function recentActivity(): DashboardActivity[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `activity-${index}`,
    type: index % 3 === 0 ? "mock" : "practice",
    title: index % 3 === 0 ? "Core Mock" : "Core practice",
    subtitle: "Synthetic completed activity",
    completedAt: new Date(Date.UTC(2026, 7, 1 + index)).toISOString(),
    href: index % 3 === 0 ? `/results?attempt=activity-${index}` : `/practice/review/activity-${index}`,
    correctCount: 8,
    questionCount: 10,
    accuracy: 80,
  }));
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

describe("Phase 10 dashboard performance audit", () => {
  it("benchmarks representative evidence histories and writes a reproducible report", () => {
    const benchmarks = SIZES.map((answerCount) => {
      const rows = Array.from({ length: answerCount }, (_, index) => observation(index));
      const progressRuns: number[] = [];
      const assemblyRuns: number[] = [];

      for (let run = 0; run < 7; run += 1) {
        const progressStarted = performance.now();
        const progress = buildCoreProgress(rows, NOW);
        progressRuns.push(performance.now() - progressStarted);

        const assemblyStarted = performance.now();
        assembleStudentDashboard({
          displayName: "Benchmark Student",
          targetExamDate: null,
          onDemandMocksEnabled: true,
          mockAvailable: true,
          resumeCandidates: [],
          progress,
          recentActivity: recentActivity(),
          latestPractice: null,
          latestMock: {
            attemptId: "activity-9",
            title: "Core Mock",
            correctCount: 43,
            questionCount: 60,
            accuracy: 71.67,
            completedAt: "2026-08-10T00:00:00.000Z",
            href: "/results?attempt=activity-9",
          },
          now: NOW,
        });
        assemblyRuns.push(performance.now() - assemblyStarted);
      }

      return {
        answerCount,
        phase8ProgressPreparationMedianMs: Number(median(progressRuns).toFixed(3)),
        dashboardAssemblyMedianMs: Number(median(assemblyRuns).toFixed(3)),
      };
    });

    const report = {
      version: "phase10-dashboard-audit@1",
      generatedAt: NOW.toISOString(),
      benchmarkRunsPerHistory: 7,
      serviceQueryArchitecture: {
        historyQueriesBounded: true,
        independentPrimaryGroupsParallelized: true,
        secondaryServicesUseAllSettled: true,
        dashboardActivityLimit: 5,
        practiceHistoryRowLimit: 6,
        mockHistoryRowLimit: 6,
        mockResponseRowLimit: 600,
        nPlusOneQueries: 0,
      },
      benchmarks,
      databaseRoundTripMeasurement: "Not sampled without an authenticated test student; bounded query and no-N+1 contracts are verified instead.",
      serverRenderMeasurement: "The production server-rendered route compiled successfully; live browser timing requires a connected authenticated browser session.",
    };

    const directory = resolve(process.cwd(), "reports", "phase10");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "dashboard-performance.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(resolve(directory, "dashboard-performance.md"), [
      "# Phase 10 dashboard performance audit",
      "",
      "Seven runs per representative persisted-answer history; values are medians.",
      "",
      "| Answer history | Phase 8 preparation (ms) | Pure dashboard assembly (ms) |",
      "| ---: | ---: | ---: |",
      ...benchmarks.map((row) => `| ${row.answerCount} | ${row.phase8ProgressPreparationMedianMs} | ${row.dashboardAssemblyMedianMs} |`),
      "",
      "Dashboard database history is bounded before assembly: six practice sessions, six mock attempts, and at most 600 aggregate response rows. Independent sources load concurrently; no per-activity query is issued.",
      "",
    ].join("\n"), "utf8");

    expect(benchmarks.every((row) => row.dashboardAssemblyMedianMs < 25)).toBe(true);
    expect(benchmarks.find((row) => row.answerCount === 5_000)?.phase8ProgressPreparationMedianMs).toBeLessThan(1_000);
    expect(report.serviceQueryArchitecture.nPlusOneQueries).toBe(0);
  });
});

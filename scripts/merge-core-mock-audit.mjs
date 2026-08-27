import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const shardCount = Number(process.env.CORE_MOCK_AUDIT_SHARD_COUNT ?? process.argv[2] ?? "1");
const directory = join(process.cwd(), "reports", "core-mocks");
const shards = Array.from({ length: shardCount }, (_, index) =>
  JSON.parse(readFileSync(join(directory, "shards", `shard-${index}.json`), "utf8")));

const mocks = shards.flatMap((shard) => shard.mocks).sort((first, second) => first.index - second.index);
const failures = shards.flatMap((shard) => shard.failures).sort((first, second) => first.index - second.index);
const developmentSummaries = shards.flatMap((shard) => shard.developmentSummaries).sort((first, second) => first.seed.localeCompare(second.seed));
const modules = ["figure_sequence", "mathematical_equation", "latin_square"];

function rounded(value, places = 4) {
  return Number(value.toFixed(places));
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percentile(values, proportion) {
  if (!values.length) return 0;
  const sorted = [...values].sort((first, second) => first - second);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * proportion) - 1)];
}

function distribution(values) {
  return {
    p50: rounded(percentile(values, 0.5)),
    p90: rounded(percentile(values, 0.9)),
    p95: rounded(percentile(values, 0.95)),
    p99: rounded(percentile(values, 0.99)),
    maximum: rounded(Math.max(0, ...values)),
    mean: rounded(average(values)),
  };
}

function mergeCounts(target, source) {
  Object.entries(source).forEach(([key, value]) => { target[key] = (target[key] ?? 0) + value; });
}

const coverage = {};
modules.forEach((module) => {
  coverage[module] = {};
  shards.forEach((shard) => Object.entries(shard.coverage[module]).forEach(([dimension, counts]) => {
    coverage[module][dimension] ??= {};
    mergeCounts(coverage[module][dimension], counts);
  }));
});

const similarity = Object.fromEntries(modules.map((module) => {
  const results = mocks.map((mock) => mock.sectionResults[module].similarity);
  return [module, {
    maximumPairwiseSimilarity: distribution(results.map((result) => result.maximum)),
    meanPairwiseSimilarity: distribution(results.map((result) => result.mean)),
    pairsAbove090: { total: results.reduce((sum, result) => sum + result.pairsAbove090, 0), perMock: distribution(results.map((result) => result.pairsAbove090)) },
    pairsAbove085: { total: results.reduce((sum, result) => sum + result.pairsAbove085, 0), perMock: distribution(results.map((result) => result.pairsAbove085)) },
    pairsAbove080: { total: results.reduce((sum, result) => sum + result.pairsAbove080, 0), perMock: distribution(results.map((result) => result.pairsAbove080)) },
    largestStructuralFamilyCount: distribution(mocks.map((mock) => mock.sectionResults[module].largestFamilyCount)),
  }];
}));

const difficulty = Object.fromEntries(modules.map((module) => {
  const results = mocks.map((mock) => mock.sectionResults[module]);
  const scoresByPosition = Array.from({ length: 20 }, (_, position) => {
    const scores = results.flatMap((result) => typeof result.difficultyScoresByPosition[position] === "number" ? [result.difficultyScoresByPosition[position]] : []);
    return { position: position + 1, averageScore: rounded(average(scores)), observations: scores.length };
  });
  return [module, {
    aggregateCounts: results.reduce((counts, result) => ({
      easy: counts.easy + result.difficultyCounts.easy,
      medium: counts.medium + result.difficultyCounts.medium,
      hard: counts.hard + result.difficultyCounts.hard,
    }), { easy: 0, medium: 0, hard: 0 }),
    longestEasyStreak: distribution(results.map((result) => result.longestEasyStreak)),
    longestMediumStreak: distribution(results.map((result) => result.longestMediumStreak)),
    longestHardStreak: distribution(results.map((result) => result.longestHardStreak)),
    averageDifficultyScoreByPosition: scoresByPosition,
    uniqueFamiliesPerMock: distribution(results.map((result) => result.uniqueFamilies)),
  }];
}));

const latency = {
  totalMockMs: distribution(mocks.map((mock) => mock.totalGenerationDurationMs)),
  byModuleMs: Object.fromEntries(modules.map((module) => [module, distribution(mocks.map((mock) => mock.sectionResults[module].generationDurationMs))])),
  generatorAttemptsPerAcceptedMock: distribution(mocks.map((mock) => mock.totalGeneratorAttempts)),
  slotGenerationCallsPerAcceptedMock: distribution(mocks.map((mock) => mock.totalSlotGenerationCalls)),
  averageRetriesPerQuestion: rounded(average(mocks.map((mock) => Math.max(0, mock.totalSlotGenerationCalls - 60) / 60)), 6),
};

const determinism = {
  checked: shards.reduce((sum, shard) => sum + shard.determinism.checked, 0),
  mismatches: shards.flatMap((shard) => shard.determinism.mismatches),
};
const protocolFailures = mocks.reduce((sum, mock) => sum + mock.protocolFailures, 0);
const answerFailures = mocks.reduce((sum, mock) => sum + mock.answerFailures, 0);
const strictValidationFailures = mocks.reduce((sum, mock) => sum + (mock.strictValidationFailures ?? 0), 0);
const missingExplanations = mocks.reduce((sum, mock) => sum + mock.missingExplanations, 0);
const spacingRelaxations = mocks.reduce((sum, mock) => sum + mock.spacingRelaxations, 0);
const failureReasons = {};
const failureModules = {};
failures.forEach((failure) => {
  failureReasons[failure.reason] = (failureReasons[failure.reason] ?? 0) + 1;
  failureModules[failure.module ?? "unknown"] = (failureModules[failure.module ?? "unknown"] ?? 0) + 1;
});
const blockers = [];
if (protocolFailures) blockers.push(`${protocolFailures} protocol/quality failures`);
if (answerFailures) blockers.push(`${answerFailures} answer-integrity failures`);
if (strictValidationFailures) blockers.push(`${strictValidationFailures} strict Figure/Equation validation failures`);
if (missingExplanations) blockers.push(`${missingExplanations} missing explanations`);
if (failures.length) blockers.push(`${failures.length} complete-mock generation failures`);
if (determinism.mismatches.length) blockers.push(`${determinism.mismatches.length} deterministic reconstruction failures`);

const report = {
  generatedAt: new Date().toISOString(),
  policyStatus: "DEVELOPMENT BALANCE — not an official item-level dMAT difficulty claim",
  requestedMocks: shards[0]?.totalMocks ?? mocks.length + failures.length,
  completeMocks: mocks.length,
  failedMocks: failures.length,
  generatedQuestions: mocks.length * 60,
  protocol: {
    sectionOrder: ["figure_sequence", "mathematical_equation", "latin_square"],
    questionsPerSection: 20,
    durationSecondsPerSection: 1500,
    criticalFailures: protocolFailures,
    answerIntegrityFailures: answerFailures,
    strictValidationFailures,
    missingExplanations,
  },
  similarity,
  difficulty,
  coverage,
  latency,
  failureRate: {
    completeMocks: mocks.length,
    failedMocks: failures.length,
    rate: rounded(failures.length / Math.max(1, mocks.length + failures.length), 6),
    reasons: failureReasons,
    modules: failureModules,
    slotRetryExhaustions: failures.filter((failure) => failure.reason === "slot_retry_exhausted").length,
  },
  determinism,
  quality: {
    score: distribution(mocks.map((mock) => mock.qualityScore)),
    moduleScores: Object.fromEntries(modules.map((module) => [module, distribution(mocks.map((mock) => mock.moduleQualityScores[module]))])),
    spacingRelaxations,
  },
  developmentSummaries: developmentSummaries.slice(0, 5),
  failures,
  releaseBlockers: blockers,
  releaseVerdict: blockers.length ? "NOT READY" : spacingRelaxations ? "READY WITH MINOR ISSUES" : "READY",
};

const moduleLabel = {
  figure_sequence: "Figure Sequences",
  mathematical_equation: "Mathematical Equations",
  latin_square: "Latin Squares",
};
const lines = [
  "# dMAT Core complete-mock release audit",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  `Policy: **${report.policyStatus}**`,
  "",
  "## Outcome",
  "",
  `- Complete mocks: ${report.completeMocks} / ${report.requestedMocks}`,
  `- Generated questions: ${report.generatedQuestions}`,
  `- Failed mocks: ${report.failedMocks}`,
  `- Release verdict: **${report.releaseVerdict}**`,
  "",
  "## Protocol and integrity",
  "",
  `- Critical protocol failures: ${protocolFailures}`,
  `- Answer-integrity failures: ${answerFailures}`,
  `- Strict Figure/Equation validation failures: ${strictValidationFailures}`,
  `- Missing explanations: ${missingExplanations}`,
  "- Every successful mock uses 20 Figure, 20 Equation, and 20 Latin questions in authoritative order with 1,500 seconds per section.",
  "",
  "## Within-mock similarity",
  "",
  "| Module | Max similarity P50/P90/P95/P99/max | Mean similarity | Pairs >0.90 | >0.85 | >0.80 | Largest family P95/max |",
  "|---|---:|---:|---:|---:|---:|---:|",
  ...modules.map((module) => {
    const value = similarity[module];
    const maximum = value.maximumPairwiseSimilarity;
    const largest = value.largestStructuralFamilyCount;
    return `| ${moduleLabel[module]} | ${maximum.p50}/${maximum.p90}/${maximum.p95}/${maximum.p99}/${maximum.maximum} | ${value.meanPairwiseSimilarity.mean} | ${value.pairsAbove090.total} | ${value.pairsAbove085.total} | ${value.pairsAbove080.total} | ${largest.p95}/${largest.maximum} |`;
  }),
  "",
  "## Difficulty and pacing",
  "",
  "Configured per section: 7 Easy / 7 Medium / 6 Hard, neutrally shuffled with a maximum streak of 3. This is a development policy, not an official distribution claim.",
  "",
  "| Module | Easy/Medium/Hard total | Longest E/M/H max | Unique families P50/P95 |",
  "|---|---:|---:|---:|",
  ...modules.map((module) => {
    const value = difficulty[module];
    return `| ${moduleLabel[module]} | ${value.aggregateCounts.easy}/${value.aggregateCounts.medium}/${value.aggregateCounts.hard} | ${value.longestEasyStreak.maximum}/${value.longestMediumStreak.maximum}/${value.longestHardStreak.maximum} | ${value.uniqueFamiliesPerMock.p50}/${value.uniqueFamiliesPerMock.p95} |`;
  }),
  "",
  "## Latency",
  "",
  `- Total mock P50/P90/P95/P99/max: ${latency.totalMockMs.p50}/${latency.totalMockMs.p90}/${latency.totalMockMs.p95}/${latency.totalMockMs.p99}/${latency.totalMockMs.maximum} ms`,
  ...modules.map((module) => `- ${moduleLabel[module]} P50/P95/P99/max: ${latency.byModuleMs[module].p50}/${latency.byModuleMs[module].p95}/${latency.byModuleMs[module].p99}/${latency.byModuleMs[module].maximum} ms`),
  `- Generator attempts per accepted mock, mean/P95/max: ${latency.generatorAttemptsPerAcceptedMock.mean}/${latency.generatorAttemptsPerAcceptedMock.p95}/${latency.generatorAttemptsPerAcceptedMock.maximum}`,
  `- Average outer slot retries per question: ${latency.averageRetriesPerQuestion}`,
  "",
  "## Failure and determinism",
  "",
  `- Full-mock failure rate: ${report.failureRate.rate}`,
  `- Slot retry exhaustion: ${report.failureRate.slotRetryExhaustions}`,
  `- Determinism: ${determinism.checked} seeds checked twice; ${determinism.mismatches.length} mismatches`,
  "",
  "## Rule coverage",
  "",
  "The JSON companion contains complete global counts for Figure movement/object/progression/rotation/colour/boundary/periodicity, Equation graph/relationship/variable/depth/arithmetic/style/scale-division, and Latin reasoning/depth/intermediate/deduction/redundancy/uniqueness dimensions.",
  "",
  "## Development summaries",
  "",
  ...report.developmentSummaries.flatMap((summary) => [
    `### ${summary.seed}`,
    "",
    "| Module | # | Difficulty | Structural family | Novelty | Reasoning |",
    "|---|---:|---|---|---:|---|",
    ...summary.questions.map((question) => `| ${moduleLabel[question.module]} | ${question.questionNumber} | ${question.difficulty} | ${question.structuralFamily} | ${question.noveltyScore} | ${question.reasoningClassification} |`),
    "",
  ]),
  "## Release blockers",
  "",
  ...(blockers.length ? blockers.map((item) => `- BLOCKER: ${item}`) : ["- None found in the deterministic audit."]),
  "",
  `Final verdict: **${report.releaseVerdict}**`,
  "",
];

mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, "release-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(directory, "release-audit.md"), lines.join("\n"));
console.info(`Core mock audit merged: ${report.completeMocks}/${report.requestedMocks} complete; verdict ${report.releaseVerdict}`);

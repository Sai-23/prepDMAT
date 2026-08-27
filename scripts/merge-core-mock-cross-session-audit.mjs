import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const shardCount = Number(process.argv[2] ?? process.env.CORE_MOCK_CROSS_SESSION_SHARD_COUNT ?? "1");
const directory = join(process.cwd(), "reports", "core-mocks", "cross-session");
const shards = Array.from({ length: shardCount }, (_, index) =>
  JSON.parse(readFileSync(join(directory, "shards", `shard-${index}.json`), "utf8")));
const modules = ["figure_sequence", "mathematical_equation", "latin_square"];

function rounded(value, places = 6) {
  return Number(value.toFixed(places));
}

function percentile(values, proportion) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * proportion) - 1)];
}

function distribution(values) {
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  return {
    p50: rounded(percentile(values, 0.5)),
    p90: rounded(percentile(values, 0.9)),
    p95: rounded(percentile(values, 0.95)),
    p99: rounded(percentile(values, 0.99)),
    maximum: rounded(Math.max(0, ...values)),
    mean: rounded(mean),
  };
}

const similarity = Object.fromEntries(modules.map((module) => {
  const values = shards.map((shard) => shard.aggregate[module]);
  const comparisons = values.reduce((sum, item) => sum + item.comparisons, 0);
  const similaritySum = values.reduce((sum, item) => sum + item.similaritySum, 0);
  return [module, {
    comparisons,
    exactRepeatedQuestions: values.reduce((sum, item) => sum + item.exactRepeats, 0),
    structuralNearClonesAtOrAboveThreshold: values.reduce((sum, item) => sum + item.nearClones, 0),
    activeWindowNearClonesAtOrAboveThreshold: values.reduce((sum, item) => sum + item.nearClonesWithinActiveWindow, 0),
    outsideWindowNearClonesAtOrAboveThreshold: values.reduce((sum, item) => sum + item.nearClonesOutsideActiveWindow, 0),
    maximumCrossMockSimilarity: distribution(values.flatMap((item) => item.maximumSimilarityByStudent)),
    activeWindowMaximumSimilarity: distribution(values.flatMap((item) => item.activeWindowMaximumSimilarityByStudent)),
    meanCrossMockSimilarity: rounded(similaritySum / Math.max(1, comparisons)),
    perStudentMeanSimilarity: distribution(values.flatMap((item) => item.meanSimilarityByStudent)),
    repeatedStructuralFamilyQuestions: values.reduce((sum, item) => sum + item.repeatedFamilyQuestions, 0),
    repeatedFamilySequences: values.reduce((sum, item) => sum + item.repeatedFamilySequences, 0),
    repeatedDifficultyFamilySequences: values.reduce((sum, item) => sum + item.repeatedDifficultyFamilySequences, 0),
    largestFamilyCountAcrossFiveMocks: distribution(values.flatMap((item) => item.largestFamilyCountByStudent)),
  }];
}));
const failures = shards.flatMap((shard) => shard.failures);
const completeMocks = shards.reduce((sum, shard) => sum + shard.completeMocks, 0);
const students = shards.reduce((sum, shard) => sum + shard.students, 0);
const durations = shards.flatMap((shard) => shard.durations);
const blockers = [
  ...(failures.length ? [`${failures.length} mock generation failures`] : []),
  ...modules.flatMap((module) => similarity[module].exactRepeatedQuestions
    ? [`${module}: ${similarity[module].exactRepeatedQuestions} exact repeats`]
    : []),
  ...modules.flatMap((module) => similarity[module].structuralNearClonesAtOrAboveThreshold
    ? [`${module}: ${similarity[module].structuralNearClonesAtOrAboveThreshold} cross-five near-clones at/above threshold (${similarity[module].activeWindowNearClonesAtOrAboveThreshold} inside the active window)`]
    : []),
];
const report = {
  generatedAt: new Date().toISOString(),
  syntheticStudents: students,
  mocksPerStudent: 5,
  requestedMocks: students * 5,
  completeMocks,
  generatedQuestions: completeMocks * 60,
  structuralHistoryWindow: 3,
  exactFingerprintHistoryWindow: 5,
  similarityThreshold: 0.94,
  similarity,
  generationDurationMs: distribution(durations),
  failures,
  releaseBlockers: blockers,
  verdict: blockers.length ? "NOT READY" : "READY FOR CONTROLLED ROLLOUT",
};
const labels = {
  figure_sequence: "Figure Sequences",
  mathematical_equation: "Mathematical Equations",
  latin_square: "Latin Squares",
};
const lines = [
  "# dMAT Core cross-session novelty audit",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  `- Synthetic students: ${students}`,
  `- Complete mocks: ${completeMocks} / ${students * 5}`,
  `- Generated questions: ${report.generatedQuestions}`,
  `- Structural profile window: ${report.structuralHistoryWindow} generated mocks per student`,
  `- Exact fingerprint window: ${report.exactFingerprintHistoryWindow} generated mocks per student`,
  `- Near-clone rejection threshold: ${report.similarityThreshold}`,
  "",
  "| Module | Exact repeats | Near-clones ≥ threshold (active/outside) | Max similarity P50/P95/P99/max | Active-window max | Mean similarity | Repeated-family questions | Repeated family/difficulty-family sequences |",
  "|---|---:|---:|---:|---:|---:|---:|---:|",
  ...modules.map((module) => {
    const value = similarity[module];
    const max = value.maximumCrossMockSimilarity;
    return `| ${labels[module]} | ${value.exactRepeatedQuestions} | ${value.structuralNearClonesAtOrAboveThreshold} (${value.activeWindowNearClonesAtOrAboveThreshold}/${value.outsideWindowNearClonesAtOrAboveThreshold}) | ${max.p50}/${max.p95}/${max.p99}/${max.maximum} | ${value.activeWindowMaximumSimilarity.maximum} | ${value.meanCrossMockSimilarity} | ${value.repeatedStructuralFamilyQuestions} | ${value.repeatedFamilySequences}/${value.repeatedDifficultyFamilySequences} |`;
  }),
  "",
  "Broad structural-family recurrence is expected from finite taxonomies. Exact repeated questions and accepted fingerprint near-clones are not.",
  "",
  `Generation duration P50/P95/P99/max: ${report.generationDurationMs.p50}/${report.generationDurationMs.p95}/${report.generationDurationMs.p99}/${report.generationDurationMs.maximum} ms under sharded audit load.`,
  "",
  "## Release blockers",
  "",
  ...(blockers.length ? blockers.map((blocker) => `- ${blocker}`) : ["- None detected."]),
  "",
  `Final verdict: **${report.verdict}**`,
  "",
];

mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, "release-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(directory, "release-audit.md"), lines.join("\n"));
console.info(`Cross-session audit merged: ${completeMocks}/${students * 5} mocks; ${report.generatedQuestions} questions; verdict ${report.verdict}`);

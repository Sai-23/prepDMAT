import { spawn } from "node:child_process";
import { cpus } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const total = Number(process.env.PHASE9_REAL_AUDIT_TOTAL ?? "100");
const mocksPerShard = Math.max(1, Number(process.env.PHASE9_REAL_AUDIT_BATCH_SIZE ?? "5"));
const shardCount = Math.ceil(total / mocksPerShard);
const concurrency = Math.max(1, Math.min(Number(process.env.PHASE9_REAL_AUDIT_CONCURRENCY ?? "4"), cpus().length, shardCount));
const vitestEntrypoint = "node_modules/vitest/vitest.mjs";

function run(shardIndex) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [vitestEntrypoint, "run", "src/lib/results/phase9-real-mock-audit.test.ts", "--maxWorkers=1", "--minWorkers=1"], {
      cwd: process.cwd(),
      env: { ...process.env, RUN_PHASE9_REAL_AUDIT: "1", PHASE9_REAL_AUDIT_TOTAL: String(total), PHASE9_REAL_AUDIT_SHARD_COUNT: String(shardCount), PHASE9_REAL_AUDIT_SHARD_INDEX: String(shardIndex) },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolveRun() : reject(new Error(`Audit shard ${shardIndex} exited with code ${code}.`)));
  });
}

console.info(`Generating and analyzing ${total} real Core mocks in ${shardCount} bounded shards (${concurrency} concurrent).`);
let nextShard = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (nextShard < shardCount) {
    const shard = nextShard;
    nextShard += 1;
    await run(shard);
  }
}));

const directory = resolve(process.cwd(), "reports", "phase9");
const shards = await Promise.all(Array.from({ length: shardCount }, async (_, index) => JSON.parse(await readFile(resolve(directory, "real-shards", `shard-${index}.json`), "utf8"))));
const sum = (key) => shards.reduce((totalValue, shard) => totalValue + shard[key], 0);
const ratio = (passing, checks) => checks ? passing / checks : 1;
const report = {
  version: "phase9-real-generated-mock-audit@1",
  generatedMocks: sum("generatedMocks"),
  generatedQuestions: sum("generatedQuestions"),
  skillMetadataCoverage: ratio(sum("questionsWithSkillMetadata"), sum("generatedQuestions")),
  sectionSummaryAccuracy: ratio(sum("sectionChecksPassing"), sum("sectionChecks")),
  mistakeRankingAccuracy: ratio(sum("rankingChecksPassing"), sum("rankingChecks")),
  timingClassificationAccuracy: ratio(sum("timingChecksPassing"), sum("timingChecks")),
  falseInsightAvoidance: ratio(sum("falseInsightChecksPassing"), sum("falseInsightChecks")),
  recommendationAccuracy: ratio(sum("recommendationChecksPassing"), sum("recommendationChecks")),
  failures: shards.flatMap((shard) => shard.failures),
};
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, "real-generated-mock-audit-100.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(resolve(directory, "real-generated-mock-audit-100.md"), [
  "# Phase 9 real generated mock audit", "", `Generated and analyzed ${report.generatedMocks} complete Core mocks (${report.generatedQuestions} immutable question snapshots).`, "",
  `- Generated skill-metadata coverage: ${(report.skillMetadataCoverage * 100).toFixed(1)}%`,
  `- Section-summary correctness: ${(report.sectionSummaryAccuracy * 100).toFixed(1)}%`,
  `- Mistake-ranking correctness: ${(report.mistakeRankingAccuracy * 100).toFixed(1)}%`,
  `- Timing-classification correctness: ${(report.timingClassificationAccuracy * 100).toFixed(1)}%`,
  `- False-insight avoidance: ${(report.falseInsightAvoidance * 100).toFixed(1)}%`,
  `- Recommendation correctness: ${(report.recommendationAccuracy * 100).toFixed(1)}%`,
  `- Generation/analysis failures: ${report.failures.length}`, "",
].join("\n"), "utf8");
console.info(JSON.stringify(report, null, 2));

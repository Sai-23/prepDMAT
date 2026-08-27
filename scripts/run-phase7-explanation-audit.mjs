import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const modules = ["figure_sequence", "mathematical_equation", "latin_square"];
const perModule = Number(process.env.PHASE7_AUDIT_PER_MODULE ?? "1000");
const vitestEntrypoint = "node_modules/vitest/vitest.mjs";

function run(module) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [
      vitestEntrypoint,
      "run",
      "src/lib/practice/phase7-explanation-audit.test.ts",
      "--maxWorkers=1",
      "--minWorkers=1",
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        RUN_PHASE7_EXPLANATION_AUDIT: "1",
        PHASE7_AUDIT_MODULE: module,
        PHASE7_AUDIT_PER_MODULE: String(perModule),
      },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolvePromise() : reject(new Error(`${module} audit exited with code ${code}.`)));
  });
}

console.info(`Running ${perModule * modules.length} deterministic Phase 7 explanations (${perModule} per module).`);
await Promise.all(modules.map(run));

const reports = modules.map((module) => JSON.parse(readFileSync(
  resolve(process.cwd(), "reports", "phase7", `${module}-audit.json`),
  "utf8",
)));
const combined = {
  version: "phase7-explanation-audit@1",
  requested: reports.reduce((sum, report) => sum + report.requested, 0),
  accepted: reports.reduce((sum, report) => sum + report.accepted, 0),
  failureCount: reports.reduce((sum, report) => sum + report.failureCount, 0),
  unsupportedClaims: reports.reduce((sum, report) => sum + report.unsupportedClaims, 0),
  missingReasoningData: reports.reduce((sum, report) => sum + report.missingReasoningData, 0),
  fallbackExplanations: reports.reduce((sum, report) => sum + report.fallbackExplanations, 0),
  diagnosis: {
    supported: reports.reduce((sum, report) => sum + report.diagnosis.supported, 0),
    neutralOrUnsupported: reports.reduce((sum, report) => sum + report.diagnosis.neutralOrUnsupported, 0),
  },
  modules: Object.fromEntries(reports.map((report) => [report.module, report])),
};
const reportDirectory = resolve(process.cwd(), "reports", "phase7");
writeFileSync(resolve(reportDirectory, "explanation-audit-3000.json"), `${JSON.stringify(combined, null, 2)}\n`, "utf8");

const moduleLines = reports.map((report) =>
  `| ${report.module} | ${report.requested} | ${report.accepted} | ${report.failureCount} | ${report.unsupportedClaims} | ${report.missingReasoningData} | ${report.fallbackExplanations} | ${report.diagnosis.supported} | ${report.diagnosis.neutralOrUnsupported} | ${report.averageSteps} |`,
);
writeFileSync(resolve(reportDirectory, "explanation-audit-3000.md"), [
  "# Phase 7 deterministic explanation audit",
  "",
  `Audited ${combined.requested} deterministic Core questions: ${perModule} per module, balanced by difficulty.`,
  "",
  "| Module | Requested | Accepted | Failures | Unsupported claims | Missing reasoning | Fallbacks | Supported diagnoses | Neutral diagnoses | Average steps |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...moduleLines,
  "",
  `Combined failures: ${combined.failureCount}. Unsupported claims: ${combined.unsupportedClaims}. Missing reasoning: ${combined.missingReasoningData}. Fallback explanations: ${combined.fallbackExplanations}.`,
  "",
].join("\n"), "utf8");

const sampleSections = reports.flatMap((report) => report.samples.map((sample) => [
  `## ${sample.module} · ${sample.difficulty} · ${sample.seed}`,
  "",
  `- Classification: ${sample.classification}`,
  `- Correct answer: \`${JSON.stringify(sample.correctAnswer)}\``,
  `- Sample student answer: \`${JSON.stringify(sample.sampleStudentAnswer)}\``,
  `- Feedback: ${sample.feedback?.title ?? "None"} — ${sample.feedback?.description ?? "None"}`,
  `- Quick explanation: ${sample.summary}`,
  `- Takeaway: ${sample.takeaway}`,
  "",
  "### Steps",
  "",
  ...sample.steps.map((step, index) => `${index + 1}. **${step.title}:** ${step.description}`),
  "",
  "<details><summary>Internal metadata used</summary>",
  "",
  `\`\`\`json\n${JSON.stringify(sample.internalMetadata, null, 2)}\n\`\`\``,
  "",
  "</details>",
  "",
])).flat();
writeFileSync(resolve(reportDirectory, "development-samples.md"), [
  "# Phase 7 explanation development samples",
  "",
  "Five deterministic samples per difficulty for each Core module (45 total).",
  "",
  ...sampleSections,
].join("\n"), "utf8");

console.info(`Phase 7 audit complete: ${combined.accepted}/${combined.requested} accepted.`);

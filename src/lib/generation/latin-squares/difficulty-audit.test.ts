import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { analyzeLatinDeductions, calculateLatinDifficulty } from "./difficulty";
import {
  fingerprintLatinSquare,
  latinSquareStructuralSignature,
} from "./fingerprint";
import { latinSquareGenerator } from "./generator";
import { generateValidatedLatinSquare } from "./pipeline";
import type {
  LatinDifficultyMetrics,
  LatinSquareQuestion,
  LatinTargetClassification,
} from "./types";
import { latinSquareValidator } from "./validator";

const ENABLED = process.env.DMAT_LATIN_DIFFICULTY_AUDIT === "1";
const SAMPLE_SIZE = 100;
const VISUAL_SAMPLE_SIZE = 10;
type Difficulty = "easy" | "medium" | "hard";

type AuditRow = {
  difficulty: Difficulty;
  accepted: number;
  candidatesAttempted: number;
  clueCount: { minimum: number; maximum: number; average: number; median: number };
  averageUsefulClueCount: number;
  averageTargetInitialCandidateCount: number;
  deductionRoundDistribution: Record<string, number>;
  averageForcedPlacementsBeforeTarget: number;
  classificationDistribution: Record<LatinTargetClassification, number>;
  averageRowDependencyCount: number;
  averageColumnDependencyCount: number;
  averageTargetDepth: number;
  averageWorkingMemoryLoad: number;
  averageScore: number;
  targetRowDistribution: number[];
  targetColumnDistribution: number[];
  solverRejections: number;
  ambiguityRejections: number;
  validationRejections: number;
  semanticDuplicateRejections: number;
  structuralDuplicates: number;
  solverRejectionRate: number;
  ambiguityRejectionRate: number;
  structuralDuplicateRate: number;
  structuralSignatureCount: number;
};

const rounded = (value: number) => Number(value.toFixed(3));
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
function median(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
}

function metricsFor(question: LatinSquareQuestion): LatinDifficultyMetrics {
  const analysis = analyzeLatinDeductions(question);
  const result = calculateLatinDifficulty(question, analysis);
  if (!result) throw new Error("Accepted Latin square has no target deduction.");
  return result.metrics;
}

function auditDifficulty(difficulty: Difficulty): { row: AuditRow; samples: LatinSquareQuestion[] } {
  const questions: LatinSquareQuestion[] = [];
  const acceptedFingerprints = new Set<string>();
  let candidatesAttempted = 0;
  let solverRejections = 0;
  let ambiguityRejections = 0;
  let validationRejections = 0;
  let semanticDuplicateRejections = 0;

  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    const configuration = {
      difficulty,
      seed: `latin-difficulty-audit-${difficulty}-${index}`,
      maxAttempts: 5_000,
    } as const;
    const accepted = generateValidatedLatinSquare(configuration, acceptedFingerprints);
    candidatesAttempted += accepted.metadata.attemptCount;
    for (let attempt = 1; attempt < accepted.metadata.attemptCount; attempt += 1) {
      const candidate = latinSquareGenerator.generate(configuration, attempt);
      const validation = latinSquareValidator.validate(candidate, difficulty);
      if (!validation.valid) {
        const code = validation.issues[0]?.code;
        if (code === "ambiguous_target") ambiguityRejections += 1;
        else if (code === "no_completion" || code === "solver_rejected") solverRejections += 1;
        else validationRejections += 1;
      } else if (acceptedFingerprints.has(fingerprintLatinSquare(candidate))) {
        semanticDuplicateRejections += 1;
      }
    }
    acceptedFingerprints.add(accepted.metadata.fingerprint);
    questions.push(accepted);
  }

  const metrics = questions.map(metricsFor);
  const clueCounts = metrics.map((metric) => metric.visibleClues);
  const roundDistribution: Record<string, number> = {};
  const classificationDistribution: Record<LatinTargetClassification, number> = {
    direct: 0,
    indirect: 0,
    multi_stage: 0,
  };
  const targetRowDistribution = Array.from({ length: 5 }, () => 0);
  const targetColumnDistribution = Array.from({ length: 5 }, () => 0);
  metrics.forEach((metric) => {
    roundDistribution[String(metric.targetRound)] =
      (roundDistribution[String(metric.targetRound)] ?? 0) + 1;
    classificationDistribution[metric.classification] += 1;
  });
  questions.forEach((question) => {
    targetRowDistribution[question.structuredData.target.row] += 1;
    targetColumnDistribution[question.structuredData.target.column] += 1;
  });
  const structuralSignatures = questions.map((question) =>
    latinSquareStructuralSignature(question),
  );
  const structuralSignatureCount = new Set(structuralSignatures).size;
  const structuralDuplicates = questions.length - structuralSignatureCount;

  return {
    row: {
      difficulty,
      accepted: questions.length,
      candidatesAttempted,
      clueCount: {
        minimum: Math.min(...clueCounts),
        maximum: Math.max(...clueCounts),
        average: rounded(average(clueCounts)),
        median: median(clueCounts),
      },
      averageUsefulClueCount: rounded(average(metrics.map((metric) => metric.usefulClueCount))),
      averageTargetInitialCandidateCount: rounded(average(metrics.map((metric) => metric.targetInitialCandidateCount))),
      deductionRoundDistribution: roundDistribution,
      averageForcedPlacementsBeforeTarget: rounded(average(metrics.map((metric) => metric.forcedPlacementsBeforeTarget))),
      classificationDistribution,
      averageRowDependencyCount: rounded(average(metrics.map((metric) => metric.rowDependencyCount))),
      averageColumnDependencyCount: rounded(average(metrics.map((metric) => metric.columnDependencyCount))),
      averageTargetDepth: rounded(average(metrics.map((metric) => metric.targetDepth))),
      averageWorkingMemoryLoad: rounded(average(metrics.map((metric) => metric.workingMemoryLoad))),
      averageScore: rounded(average(metrics.map((metric) => metric.score))),
      targetRowDistribution,
      targetColumnDistribution,
      solverRejections,
      ambiguityRejections,
      validationRejections,
      semanticDuplicateRejections,
      structuralDuplicates,
      solverRejectionRate: rounded(solverRejections / candidatesAttempted),
      ambiguityRejectionRate: rounded(ambiguityRejections / candidatesAttempted),
      structuralDuplicateRate: rounded(structuralDuplicates / questions.length),
      structuralSignatureCount,
    },
    samples: questions.slice(0, VISUAL_SAMPLE_SIZE),
  };
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function sampleSvg(question: LatinSquareQuestion, sampleIndex: number): string {
  const metrics = metricsFor(question);
  const cellSize = 66;
  const originX = 45;
  const originY = 90;
  const cells = question.structuredData.grid.flatMap((row, rowIndex) =>
    row.map((symbol, columnIndex) => {
      const isTarget = rowIndex === question.structuredData.target.row &&
        columnIndex === question.structuredData.target.column;
      const x = originX + columnIndex * cellSize;
      const y = originY + rowIndex * cellSize;
      return `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${isTarget ? "#fee2e2" : "#ffffff"}" stroke="#0f172a"/><text x="${x + cellSize / 2}" y="${y + 42}" text-anchor="middle" font-size="25" font-weight="700" fill="${isTarget ? "#b91c1c" : "#0f172a"}">${isTarget ? "?" : symbol ?? ""}</text>`;
    }),
  ).join("");
  const options = question.structuredData.symbols.map((symbol, index) => {
    const x = 45 + index * 66;
    return `<rect x="${x}" y="445" width="54" height="46" rx="6" fill="#ffffff" stroke="#64748b"/><text x="${x + 27}" y="476" text-anchor="middle" font-size="18" font-weight="700" fill="#0f172a">${symbol}</text>`;
  }).join("");
  const detail = `${metrics.classification.replace("_", " ")} | candidates ${metrics.targetInitialCandidateCount} | round ${metrics.targetRound} | depth ${metrics.targetDepth} | forced ${metrics.forcedPlacementsBeforeTarget}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="525" viewBox="0 0 420 525"><rect width="420" height="525" fill="#f8fafc"/><text x="24" y="30" font-family="system-ui" font-size="19" font-weight="700" fill="#0f172a">${question.metadata.requestedDifficulty.toUpperCase()} sample ${sampleIndex + 1}</text><text x="24" y="56" font-family="system-ui" font-size="12" fill="#475569">${escapeXml(detail)}</text><g font-family="system-ui">${cells}${options}</g></svg>`;
}

function writeArtifacts(rows: AuditRow[], samples: LatinSquareQuestion[]): void {
  const directory = resolve(process.cwd(), "reports", "latin-squares");
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, "difficulty-audit.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    sampleSizePerDifficulty: SAMPLE_SIZE,
    rows,
  }, null, 2)}\n`);
  const markdown = [
    "# Latin Square difficulty audit",
    "",
    `Accepted sample: ${SAMPLE_SIZE} per difficulty (${SAMPLE_SIZE * 3} total).`,
    "",
    "| Difficulty | Clues min/median/avg/max | Initial candidates avg | Target rounds | Forced before target avg | Direct/indirect/multi-stage | Row deps avg | Column deps avg | Depth avg | Working memory avg | Solver reject rate | Ambiguity reject rate | Structural duplicate rate |",
    "| --- | --- | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map((row) => `| ${row.difficulty} | ${row.clueCount.minimum}/${row.clueCount.median}/${row.clueCount.average}/${row.clueCount.maximum} | ${row.averageTargetInitialCandidateCount} | ${Object.entries(row.deductionRoundDistribution).map(([round, count]) => `${round}:${count}`).join(", ")} | ${row.averageForcedPlacementsBeforeTarget} | ${row.classificationDistribution.direct}/${row.classificationDistribution.indirect}/${row.classificationDistribution.multi_stage} | ${row.averageRowDependencyCount} | ${row.averageColumnDependencyCount} | ${row.averageTargetDepth} | ${row.averageWorkingMemoryLoad} | ${row.solverRejectionRate} | ${row.ambiguityRejectionRate} | ${row.structuralDuplicateRate} |`),
    "",
    "Target row and column distributions (positions 1-5):",
    "",
    ...rows.map((row) => `- ${row.difficulty}: rows ${row.targetRowDistribution.join("/")}; columns ${row.targetColumnDistribution.join("/")}`),
    "",
    "Rates are proportions from 0 to 1. Structural signatures ignore A-E relabeling.",
    "",
  ].join("\n");
  writeFileSync(resolve(directory, "difficulty-audit.md"), markdown);
  const cards = samples.map((question, index) => {
    const difficultyIndex = index % VISUAL_SAMPLE_SIZE;
    const svg = sampleSvg(question, difficultyIndex);
    const difficulty = question.metadata.requestedDifficulty;
    writeFileSync(resolve(directory, `visual-${difficulty}-${difficultyIndex + 1}.svg`), svg);
    return `<figure>${svg}<figcaption>${difficulty} sample ${difficultyIndex + 1}</figcaption></figure>`;
  }).join("");
  writeFileSync(resolve(directory, "visual-samples.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Latin Square visual samples</title><style>body{font:14px system-ui;background:#e2e8f0;color:#0f172a;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:18px}figure{background:white;border:1px solid #94a3b8;border-radius:12px;margin:0;padding:12px}svg{display:block;width:100%;height:auto}figcaption{text-align:center;text-transform:capitalize}</style></head><body><h1>Latin Square visual review</h1><main>${cards}</main></body></html>`);
}

describe.skipIf(!ENABLED)("Latin Square 100-per-difficulty audit", () => {
  it("demonstrates progressively deeper target reasoning", () => {
    const audited = (["easy", "medium", "hard"] as const).map(auditDifficulty);
    const rows = audited.map(({ row }) => row);
    writeArtifacts(rows, audited.flatMap(({ samples }) => samples));

    expect(rows.every((row) => row.accepted === SAMPLE_SIZE)).toBe(true);
    expect(rows.every((row) => row.clueCount.minimum >= 10 && row.clueCount.maximum <= 15)).toBe(true);
    expect(rows[0].classificationDistribution.direct).toBe(SAMPLE_SIZE);
    expect(rows[1].classificationDistribution.direct).toBe(0);
    expect(rows[2].classificationDistribution.direct).toBe(0);
    expect(rows[1].averageTargetDepth).toBeGreaterThan(rows[0].averageTargetDepth);
    expect(rows[2].averageTargetDepth).toBeGreaterThan(rows[1].averageTargetDepth);
    expect(rows[2].averageForcedPlacementsBeforeTarget).toBeGreaterThan(rows[1].averageForcedPlacementsBeforeTarget);
    expect(rows.every((row) => row.structuralDuplicateRate <= 0.05)).toBe(true);
    expect(rows.every((row) => row.targetRowDistribution.every((count) => count > 0))).toBe(true);
    expect(rows.every((row) => row.targetColumnDistribution.every((count) => count > 0))).toBe(true);
  }, 120_000);
});

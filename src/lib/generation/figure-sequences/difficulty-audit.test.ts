import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateFigureDifficulty } from "./difficulty";
import { fingerprintFigureSequence, figureStructuralSignature } from "./fingerprint";
import { figureSequenceGenerator } from "./generator";
import { generateValidatedFigureSequence } from "./pipeline";
import type {
  FigureColor,
  FigureFrame,
  FigureSequenceQuestion,
} from "./types";
import { figureSequenceValidator } from "./validator";

const ENABLED = process.env.DMAT_FIGURE_DIFFICULTY_AUDIT === "1";
const SAMPLE_SIZE = 100;
const COLOURS: Record<FigureColor, string> = {
  blue: "#2563eb",
  pink: "#ec4899",
  yellow: "#facc15",
  orange: "#f97316",
  green: "#16a34a",
  black: "#111827",
  white: "#ffffff",
};

type AuditRow = {
  difficulty: "easy" | "medium" | "hard";
  accepted: number;
  candidatesAttempted: number;
  averageSymbolCount: number;
  symbolDistribution: Record<"1" | "2" | "3" | "4", number>;
  averageIndependentRuleCount: number;
  orientationFrequency: number;
  pathRuleFrequency: Record<"linear" | "border" | "directionCycle" | "diagonal", number>;
  averageCandidateSimilarity: number;
  averageComplexityScore: number;
  collisionRejections: number;
  boundaryRejections: number;
  validationRejections: number;
  duplicateRejections: number;
  structuralSignatureCount: number;
  structuralSignatureDiversity: number;
};

function rounded(value: number): number {
  return Number(value.toFixed(3));
}

function auditDifficulty(difficulty: AuditRow["difficulty"]): {
  row: AuditRow;
  samples: FigureSequenceQuestion[];
} {
  const questions: FigureSequenceQuestion[] = [];
  const acceptedFingerprints = new Set<string>();
  let candidatesAttempted = 0;
  let collisionRejections = 0;
  let boundaryRejections = 0;
  let validationRejections = 0;
  let duplicateRejections = 0;

  for (let index = 0; index < SAMPLE_SIZE; index += 1) {
    const configuration = {
      difficulty,
      seed: `cs3.9-difficulty-audit-${difficulty}-${index}`,
      maxAttempts: 5_000,
    } as const;
    const accepted = generateValidatedFigureSequence(configuration, acceptedFingerprints);
    candidatesAttempted += accepted.metadata.attemptCount;
    for (let attempt = 1; attempt < accepted.metadata.attemptCount; attempt += 1) {
      try {
        const candidate = figureSequenceGenerator.generate(configuration, attempt);
        const validation = figureSequenceValidator.validate(candidate, difficulty);
        if (!validation.valid) {
          validationRejections += 1;
        } else if (acceptedFingerprints.has(fingerprintFigureSequence(candidate))) {
          duplicateRejections += 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/overlap/i.test(message)) collisionRejections += 1;
        else if (/outside|outer boundary/i.test(message)) boundaryRejections += 1;
        else validationRejections += 1;
      }
    }
    acceptedFingerprints.add(accepted.metadata.fingerprint);
    questions.push(accepted);
  }

  const metrics = questions.map((question) => calculateFigureDifficulty(question).metrics);
  const signatures = new Set(questions.map(figureStructuralSignature));
  const distribution: AuditRow["symbolDistribution"] = { "1": 0, "2": 0, "3": 0, "4": 0 };
  metrics.forEach((metric) => {
    distribution[String(metric.symbolCount) as keyof typeof distribution] += 1;
  });
  const hasPath = (question: FigureSequenceQuestion, kind: "linear" | "border" | "direction_cycle") =>
    question.structuredData.rules.some((rule) => rule.movement?.kind === kind);
  const hasDiagonal = (question: FigureSequenceQuestion) =>
    question.structuredData.rules.some((rule) => {
      if (rule.movement?.kind === "linear") return rule.movement.direction.includes("_");
      return rule.movement?.kind === "direction_cycle" &&
        rule.movement.directions.some((direction) => direction.includes("_"));
    });
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    row: {
      difficulty,
      accepted: questions.length,
      candidatesAttempted,
      averageSymbolCount: rounded(average(metrics.map((metric) => metric.symbolCount))),
      symbolDistribution: distribution,
      averageIndependentRuleCount: rounded(average(metrics.map((metric) => metric.independentRuleCount))),
      orientationFrequency: rounded(questions.filter((question) =>
        question.structuredData.rules.some((rule) => rule.rotation)).length / questions.length),
      pathRuleFrequency: {
        linear: rounded(questions.filter((question) => hasPath(question, "linear")).length / questions.length),
        border: rounded(questions.filter((question) => hasPath(question, "border")).length / questions.length),
        directionCycle: rounded(questions.filter((question) => hasPath(question, "direction_cycle")).length / questions.length),
        diagonal: rounded(questions.filter(hasDiagonal).length / questions.length),
      },
      averageCandidateSimilarity: rounded(average(metrics.map((metric) => metric.distractorSimilarity))),
      averageComplexityScore: rounded(average(metrics.map((metric) => metric.score))),
      collisionRejections,
      boundaryRejections,
      validationRejections,
      duplicateRejections,
      structuralSignatureCount: signatures.size,
      structuralSignatureDiversity: rounded(signatures.size / questions.length),
    },
    samples: questions.slice(0, 5),
  };
}

function symbolShape(frame: FigureFrame, symbolIndex: number): string {
  const symbol = frame.symbols[symbolIndex];
  const x = symbol.column * 36 + 18;
  const y = symbol.row * 36 + 18;
  const stroke = symbol.color === "white" ? "#334155" : COLOURS[symbol.color];
  const fill = symbol.fill === "solid" ? COLOURS[symbol.color] : "none";
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="2.5"`;
  const shape = symbol.shape === "circle"
    ? `<circle ${common} r="10"/>`
    : symbol.shape === "square"
      ? `<rect ${common} x="-9" y="-9" width="18" height="18" rx="1"/>`
      : symbol.shape === "triangle"
        ? `<polygon ${common} points="0,-12 11,9 -11,9"/>`
        : symbol.shape === "diamond"
          ? `<polygon ${common} points="0,-12 12,0 0,12 -12,0"/>`
          : `<polygon ${common} points="0,-13 11,1 5,1 5,12 -5,12 -5,1 -11,1"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${symbol.orientation})">${shape}</g>`;
}

function matrixMarkup(frame: FigureFrame): string {
  const lines = Array.from({ length: 6 }, (_, index) =>
    `<path d="M ${index * 36} 0 V 180 M 0 ${index * 36} H 180"/>`).join("");
  return `<rect width="180" height="180" fill="white"/><g stroke="#94a3b8" stroke-width="1">${lines}</g>${frame.symbols.map((_, index) => symbolShape(frame, index)).join("")}`;
}

function frameSvg(frame: FigureFrame, label: string): string {
  return `<figure><svg role="img" aria-label="${label}" viewBox="0 0 180 180">${matrixMarkup(frame)}</svg><figcaption>${label}</figcaption></figure>`;
}

function positionedMatrix(frame: FigureFrame, label: string, x: number, y: number): string {
  return `<svg x="${x}" y="${y}" width="150" height="150" viewBox="0 0 180 180">${matrixMarkup(frame)}</svg><text x="${x + 75}" y="${y + 168}" text-anchor="middle" font-size="13">${label}</text>`;
}

function standaloneSampleSvg(question: FigureSequenceQuestion, sampleIndex: number): string {
  const metrics = calculateFigureDifficulty(question).metrics;
  const sequence = [...question.structuredData.visibleFrames, ...question.solutionFrames]
    .map((frame, index) => positionedMatrix(
      frame,
      index < 4 ? `Visible ${index + 1}` : `Correct ${index - 3}`,
      20 + index * 185,
      65,
    )).join("");
  const choices = question.sequence.missingMatrices.flatMap((matrix, slotIndex) =>
    matrix.candidates.map((candidate, candidateIndex) => positionedMatrix(
      candidate.frame,
      `M${slotIndex + 1} ${candidate.label}${candidate.id === question.correctAnswer[slotIndex] ? " ✓" : ""}`,
      150 + slotIndex * 600 + candidateIndex * 185,
      290,
    ))).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1330" height="500" viewBox="0 0 1330 500"><rect width="1330" height="500" fill="#f8fafc"/><text x="20" y="30" font-family="system-ui" font-size="21" font-weight="700" fill="#0f172a">${question.metadata.requestedDifficulty.toUpperCase()} sample ${sampleIndex + 1}</text><text x="20" y="51" font-family="system-ui" font-size="14" fill="#334155">${metrics.symbolCount} symbols · ${metrics.independentRuleCount} independent streams · score ${metrics.score}</text><g font-family="system-ui" fill="#0f172a">${sequence}${choices}</g></svg>`;
}

function sampleHtml(samples: FigureSequenceQuestion[]): string {
  return samples.map((question, sampleIndex) => {
    const metrics = calculateFigureDifficulty(question).metrics;
    const sequence = [...question.structuredData.visibleFrames, ...question.solutionFrames]
      .map((frame, index) => frameSvg(frame, index < 4 ? `Visible ${index + 1}` : `Correct ${index - 3}`))
      .join("");
    const choices = question.sequence.missingMatrices.map((matrix, slotIndex) =>
      `<div class="choice-row"><strong>Matrix ${slotIndex + 1} choices</strong>${matrix.candidates.map((candidate) =>
        frameSvg(candidate.frame, `${candidate.label}${candidate.id === question.correctAnswer[slotIndex] ? " (correct)" : ""}`)).join("")}</div>`).join("");
    return `<section><h2>${question.metadata.requestedDifficulty} sample ${sampleIndex + 1}</h2><p>${metrics.symbolCount} symbols · ${metrics.independentRuleCount} independent streams · score ${metrics.score}</p><div class="sequence">${sequence}</div>${choices}</section>`;
  }).join("");
}

function writeArtifacts(rows: AuditRow[], samples: FigureSequenceQuestion[]) {
  const directory = resolve(process.cwd(), "reports", "figure-sequences");
  mkdirSync(directory, { recursive: true });
  const payload = { generatedAt: new Date().toISOString(), sampleSizePerDifficulty: SAMPLE_SIZE, rows };
  writeFileSync(resolve(directory, "difficulty-audit.json"), `${JSON.stringify(payload, null, 2)}\n`);
  const markdown = [
    "# Figure Sequence difficulty audit",
    "",
    `Accepted sample: ${SAMPLE_SIZE} per difficulty (${SAMPLE_SIZE * 3} total).`,
    "",
    "| Difficulty | Symbols avg | 1/2/3/4 distribution | Independent rules avg | Orientation | Linear | Border | Direction cycle | Diagonal | Candidate similarity | Score avg | Collision rejects | Duplicate rejects | Structural diversity |",
    "| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...rows.map((row) => `| ${row.difficulty} | ${row.averageSymbolCount} | ${row.symbolDistribution["1"]}/${row.symbolDistribution["2"]}/${row.symbolDistribution["3"]}/${row.symbolDistribution["4"]} | ${row.averageIndependentRuleCount} | ${row.orientationFrequency} | ${row.pathRuleFrequency.linear} | ${row.pathRuleFrequency.border} | ${row.pathRuleFrequency.directionCycle} | ${row.pathRuleFrequency.diagonal} | ${row.averageCandidateSimilarity} | ${row.averageComplexityScore} | ${row.collisionRejections} | ${row.duplicateRejections} | ${row.structuralSignatureDiversity} |`),
    "",
    "Frequencies and diversity are proportions from 0 to 1. Candidate similarity is the unchanged-symbol proportion relative to the correct frame.",
    "",
  ].join("\n");
  writeFileSync(resolve(directory, "difficulty-audit.md"), markdown);
  writeFileSync(resolve(directory, "visual-samples.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Figure Sequence visual samples</title><style>body{font:14px system-ui;background:#f8fafc;color:#0f172a;margin:24px}section{background:white;border:1px solid #cbd5e1;border-radius:12px;margin:0 0 28px;padding:18px}h2{text-transform:capitalize}.sequence,.choice-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0}.choice-row{border-top:1px solid #e2e8f0;padding-top:12px}figure{width:150px;margin:0}svg{display:block;width:100%;border:1px solid #64748b}figcaption{text-align:center;font-size:12px;margin-top:4px}strong{width:100%}</style></head><body><h1>Figure Sequence visual review</h1>${sampleHtml(samples)}</body></html>`);
  samples.forEach((question, index) => {
    const difficultyIndex = index % 5;
    writeFileSync(
      resolve(directory, `visual-${question.metadata.requestedDifficulty}-${difficultyIndex + 1}.svg`),
      standaloneSampleSvg(question, difficultyIndex),
    );
  });
}

describe.skipIf(!ENABLED)("Figure Sequence 100-per-difficulty audit", () => {
  it("meets the calibrated distribution and complexity gates", () => {
    const audited = (["easy", "medium", "hard"] as const).map(auditDifficulty);
    const rows = audited.map((entry) => entry.row);
    writeArtifacts(rows, audited.slice(1).flatMap((entry) => entry.samples));

    expect(rows.every((row) => row.accepted === SAMPLE_SIZE)).toBe(true);
    // Difficulty is a composition of independent streams and visible state
    // changes; it must not be reduced to requiring rotation in every item or
    // one exact symbol count that the official format does not prescribe.
    expect(rows[1].averageSymbolCount).toBeGreaterThan(rows[0].averageSymbolCount);
    expect(rows[2].averageSymbolCount).toBeGreaterThan(rows[1].averageSymbolCount);
    expect(rows[1].averageIndependentRuleCount).toBeGreaterThanOrEqual(2);
    expect(rows[2].averageIndependentRuleCount).toBeGreaterThanOrEqual(3);
    expect(rows[1].orientationFrequency).toBeGreaterThanOrEqual(0.65);
    expect(rows[2].orientationFrequency).toBeGreaterThanOrEqual(0.9);
    expect(rows[2].averageComplexityScore).toBeGreaterThan(rows[1].averageComplexityScore);
    expect(rows[1].averageComplexityScore).toBeGreaterThan(rows[0].averageComplexityScore);
    expect(rows[1].structuralSignatureDiversity).toBeGreaterThanOrEqual(0.2);
    expect(rows[2].structuralSignatureDiversity).toBeGreaterThanOrEqual(0.35);
  }, 120_000);
});

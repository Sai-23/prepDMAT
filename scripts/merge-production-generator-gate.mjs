import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const reportDirectory = resolve(process.cwd(), "reports", "generator-production-gate");
const files = [
  "mathematical_equation-10000-audit.json",
  "figure_sequence-10000-audit.json",
];
const results = await Promise.all(files.map(async (file) =>
  JSON.parse(await readFile(resolve(reportDirectory, file), "utf8"))));

await writeFile(
  resolve(reportDirectory, "production-gate-summary.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
);

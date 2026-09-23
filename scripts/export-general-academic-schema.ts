import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { getGeneralAcademicPackJsonSchema } from "../src/lib/general-academic/json-schema";

const outputPath = resolve(
  process.cwd(),
  "docs/general-academic/general-academic-pack-v1.schema.json",
);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `${JSON.stringify(getGeneralAcademicPackJsonSchema(), null, 2)}\n`,
  "utf8",
);

process.stdout.write(`Wrote ${outputPath}\n`);

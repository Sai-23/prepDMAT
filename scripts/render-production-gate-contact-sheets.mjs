import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const reportDirectory = resolve(process.cwd(), "reports", "generator-production-gate");
const outputDirectory = resolve(reportDirectory, "contact-sheets");
await mkdir(outputDirectory, { recursive: true });

const modules = [
  { name: "equation", width: 1000, height: 410 },
  { name: "figure", width: 1280, height: 450 },
];

for (const moduleDefinition of modules) {
  for (const difficulty of ["easy", "medium", "hard"]) {
    for (let sheetIndex = 0; sheetIndex < 5; sheetIndex += 1) {
      const firstSample = sheetIndex * 6 + 1;
      const tiles = await Promise.all(
        Array.from({ length: 6 }, async (_, tileIndex) => {
          const sampleNumber = firstSample + tileIndex;
          return {
            input: await readFile(
              resolve(
                reportDirectory,
                `visual-${moduleDefinition.name}-${difficulty}-${String(sampleNumber).padStart(2, "0")}.svg`,
              ),
            ),
            left: (tileIndex % 2) * moduleDefinition.width,
            top: Math.floor(tileIndex / 2) * moduleDefinition.height,
          };
        }),
      );

      const sheet = await sharp({
        create: {
          width: moduleDefinition.width * 2,
          height: moduleDefinition.height * 3,
          channels: 4,
          background: "#e2e8f0",
        },
      })
        .composite(tiles)
        .png()
        .toBuffer();

      await writeFile(
        resolve(outputDirectory, `${moduleDefinition.name}-${difficulty}-${sheetIndex + 1}.png`),
        sheet,
      );
    }
  }
}

console.log(`Rendered 30 production-gate contact sheets in ${outputDirectory}`);

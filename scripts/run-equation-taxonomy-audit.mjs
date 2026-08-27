import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vitest = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
const result = spawnSync(
  process.execPath,
  [vitest, "run", "src/lib/generation/mathematical-equations/equation-taxonomy-audit.test.ts", "--reporter=verbose"],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, DMAT_EQUATION_TAXONOMY_AUDIT: "1" },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);

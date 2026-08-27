import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vitest = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
const result = spawnSync(process.execPath, [
  vitest,
  "run",
  "src/lib/generation/production-gate-audit.test.ts",
  "src/lib/generation/orchestration-production-audit.test.ts",
  "--maxWorkers=1",
  "--minWorkers=1",
], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: {
    ...process.env,
    DMAT_PRODUCTION_GATE_AUDIT: "1",
    DMAT_ORCHESTRATION_GATE_AUDIT: "1",
  },
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const mergeResult = spawnSync(
  process.execPath,
  [fileURLToPath(new URL("./merge-production-generator-gate.mjs", import.meta.url))],
  { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: "inherit" },
);
if (mergeResult.error) throw mergeResult.error;
process.exit(mergeResult.status ?? 1);

import { spawn } from "node:child_process";
import { cpus } from "node:os";

const students = Number(process.env.CORE_MOCK_CROSS_SESSION_STUDENTS ?? "500");
const requestedShards = Number(process.env.CORE_MOCK_CROSS_SESSION_SHARDS ?? "4");
const shardCount = Math.max(1, Math.min(requestedShards, cpus().length, students));

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}.`)));
  });
}

console.info(`Running ${students} students × 5 mocks across ${shardCount} audit shards.`);
await Promise.all(Array.from({ length: shardCount }, (_, shardIndex) => run(process.execPath, [
  "node_modules/vitest/vitest.mjs",
  "run",
  "src/lib/mocks/cross-session-audit.test.ts",
  "--maxWorkers=1",
  "--minWorkers=1",
], {
  RUN_CORE_MOCK_CROSS_SESSION_AUDIT: "1",
  CORE_MOCK_CROSS_SESSION_STUDENTS: String(students),
  CORE_MOCK_CROSS_SESSION_SHARD_COUNT: String(shardCount),
  CORE_MOCK_CROSS_SESSION_SHARD_INDEX: String(shardIndex),
})));
await run(process.execPath, ["scripts/merge-core-mock-cross-session-audit.mjs", String(shardCount)]);

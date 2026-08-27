import { spawn } from "node:child_process";
import { cpus } from "node:os";

const total = Number(process.env.CORE_MOCK_AUDIT_TOTAL ?? "1000");
const requestedShards = Number(process.env.CORE_MOCK_AUDIT_SHARDS ?? "4");
const shardCount = Math.max(1, Math.min(requestedShards, cpus().length, total));
const vitestEntrypoint = "node_modules/vitest/vitest.mjs";

function run(commandName, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(commandName, args, { cwd: process.cwd(), env: { ...process.env, ...env }, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${commandName} exited with code ${code}.`)));
  });
}

console.info(`Running ${total} deterministic Core mocks across ${shardCount} audit shards.`);
await Promise.all(Array.from({ length: shardCount }, (_, shardIndex) => run(process.execPath, [
  vitestEntrypoint, "run", "src/lib/mocks/core-mock-audit.test.ts", "--maxWorkers=1", "--minWorkers=1",
], {
  RUN_CORE_MOCK_AUDIT: "1",
  CORE_MOCK_AUDIT_TOTAL: String(total),
  CORE_MOCK_AUDIT_SHARD_COUNT: String(shardCount),
  CORE_MOCK_AUDIT_SHARD_INDEX: String(shardIndex),
})));
await run(process.execPath, ["scripts/merge-core-mock-audit.mjs", String(shardCount)], {
  CORE_MOCK_AUDIT_SHARD_COUNT: String(shardCount),
});

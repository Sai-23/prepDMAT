import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Phase 4 performance analysis contract", () => {
  it("keeps the analyzer privacy-safe and splits Mock starts from resumes", () => {
    const analyzer = readFileSync("scripts/analyze-performance-timings.mjs", "utf8");

    expect(analyzer).toContain('event.metrics.resumed === 1');
    expect(analyzer).toContain('return "mock.resume"');
    expect(analyzer).toContain('return "mock.start"');
    expect(analyzer).not.toContain("console.log(line)");
  });

  it("captures the classification metric at the action boundary", () => {
    const actions = readFileSync("src/app/tests/actions.ts", "utf8");

    expect(actions).toContain('trace.metric("resumed", result.resumed ? 1 : 0)');
  });

  it("aggregates percentiles and stages without echoing raw log text", () => {
    const input = [
      '[performance] {"type":"server_timing","operation":"mock.start_or_resume","outcome":"success","totalMs":100,"stages":{"auth":20,"resume_lookup":30,"serialization":1},"metrics":{"resumed":1,"response_bytes":40}}',
      '[performance] {"type":"server_timing","operation":"mock.start_or_resume","outcome":"success","totalMs":300,"stages":{"auth":25,"attempt_creation_rpc":200,"serialization":2},"metrics":{"resumed":0,"response_bytes":50}}',
    ].join("\n");
    const result = spawnSync(process.execPath, ["scripts/analyze-performance-timings.mjs", "--json"], {
      encoding: "utf8",
      input,
    });

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      operations: Array<{ operation: string; p95: number; stages: Record<string, { average: number }> }>;
    };
    expect(report.operations.map(({ operation }) => operation)).toEqual(["mock.start", "mock.resume"]);
    expect(report.operations[0].p95).toBe(300);
    expect(report.operations[0].stages.attempt_creation_rpc.average).toBe(200);
    expect(result.stdout).not.toContain("selected_option_id");
  });
});

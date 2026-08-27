import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const dataSource = readFileSync(resolve(process.cwd(), "src/lib/dashboard/data.ts"), "utf8");
const pageSource = readFileSync(resolve(process.cwd(), "src/app/dashboard/page.tsx"), "utf8");

describe("Phase 10 dashboard data contract", () => {
  it("keeps student-owned activity queries server scoped", () => {
    expect(dataSource).toContain('import "server-only"');
    expect(dataSource.match(/\.eq\("user_id", userId\)/g)?.length).toBeGreaterThanOrEqual(5);
    expect(dataSource).toContain('.eq("id", userId)');
    expect(pageSource).toContain("requireUser()");
    expect(pageSource).toContain("loadStudentDashboardData(user.id)");
  });

  it("uses bounded dashboard history and aggregate-only response projections", () => {
    expect(dataSource).toContain(".limit(6)");
    expect(dataSource).toContain(".limit(4)");
    expect(dataSource).toContain(".limit(600)");
    expect(dataSource).toContain('.select("attempt_id, is_correct")');
    expect(dataSource).not.toContain("private_snapshot");
    expect(dataSource).not.toContain("master_seed");
    expect(dataSource).not.toContain("fingerprint");
    expect(dataSource).not.toContain("diagnostic_trace");
  });

  it("parallelizes independent services and degrades secondary failures", () => {
    expect(dataSource).toContain("Promise.allSettled");
    expect(dataSource).toContain("getCoreProgress(userId)");
    expect(dataSource).toContain("progressUnavailable");
    expect(pageSource).toContain("Core progress is temporarily unavailable");
  });

  it("does not cache mutable student state across requests", () => {
    expect(dataSource).not.toContain("unstable_cache");
    expect(dataSource).not.toContain("cacheTag");
    expect(pageSource).toContain("requireUser()");
  });

  it("does not recreate detailed analytics in the page", () => {
    expect(pageSource).not.toContain("weaknessScore");
    expect(pageSource).not.toContain("difficultyMix");
    expect(pageSource).not.toContain("marksLost");
    expect(pageSource).not.toContain("skillId");
  });
});

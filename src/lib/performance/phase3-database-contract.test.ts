import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Phase 3 database hot paths", () => {
  const migration = source("supabase/migrations/202609270038_phase3_performance_hot_paths.sql");
  const practiceData = source("src/lib/practice/data.ts");

  it("classifies Practice sessions inside the creation transaction", () => {
    expect(migration).toContain("before insert on public.practice_sessions");
    expect(migration).toContain("when new.source_mode = 'exact_review' then 'exact_review'");
    expect(migration).toContain("then 'targeted_practice'");
    expect(migration).toContain("new.session_type = 'diagnostic'");
    expect(practiceData).not.toContain('update({ session_type: sessionType })');
    expect(practiceData).not.toContain('"session_classification_update"');
  });

  it("indexes the exact completed-mock history ordering used by Dashboard and Results", () => {
    expect(migration).toContain("idx_test_attempts_completed_history");
    expect(migration).toContain("on public.test_attempts(user_id, submitted_at desc)");
    expect(migration).toContain("where status in ('submitted', 'auto_submitted')");
  });
});

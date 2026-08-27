import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Core mock release-readiness invariants", () => {
  it("cannot bypass the authoritative full-mock protocol through Save and Publish", () => {
    const adminData = source("src/lib/admin/test-data.ts");
    expect(adminData).toContain("validatePublishedFullMock(input)");
    expect(adminData.indexOf("validatePublishedFullMock(input)")).toBeLessThan(
      adminData.indexOf("await validateQuestionAssignments(input)"),
    );
  });

  it("starts attempts with one atomic snapshot transaction", () => {
    const testData = source("src/lib/tests/data.ts");
    const migration = source("supabase/migrations/202608220017_on_demand_core_mocks.sql");
    expect(testData).toContain('rpc("create_core_mock_attempt"');
    expect(testData).not.toContain('status: "assembling"');
    expect(migration).toContain("create or replace function public.create_core_mock_attempt");
    expect(migration).toContain("p_attempt_id, p_test_id, null, 'curated'");
    expect(migration).toContain("insert into public.practice_attempt_items");
    expect(migration).toContain("insert into public.user_responses");
  });

  it("uses the shared protocol version and records private reconstruction metadata", () => {
    const testData = source("src/lib/tests/data.ts");
    const persistence = source("src/lib/mocks/persistence.ts");
    expect(testData).not.toContain('examSpecVersion: "dmat-core-');
    expect(persistence).toContain("DMAT_CURRENT_CORE_PROTOCOL.version");
    expect(persistence).toContain("generatorVersions");
    expect(persistence).toContain("fingerprints");
    expect(persistence).not.toContain("correctAnswer");
  });

  it("keeps the server clock and immutable snapshots authoritative", () => {
    const testData = source("src/lib/tests/data.ts");
    expect(testData).toContain("activeSectionAt(sections");
    expect(testData).toContain("Only the current timed section can be changed.");
    expect(testData).toContain("gradePracticeAnswer(response.response_payload");
    expect(testData).toContain("private_snapshot");
  });
});

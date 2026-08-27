import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { assembleCoreMockWithHistory } from "./history";
import {
  generateOnDemandCoreMock,
  type OnDemandCoreMockRepository,
} from "./on-demand";

function ids(start = 1) {
  let value = start;
  return () => `00000000-0000-4000-8000-${String(value++).padStart(12, "0")}`;
}

function repository(reservation?: Partial<Awaited<ReturnType<OnDemandCoreMockRepository["reserve"]>>>) {
  const persisted: Array<Record<string, unknown>> = [];
  const failures: Array<Record<string, unknown>> = [];
  const resolvedReservation: Awaited<ReturnType<OnDemandCoreMockRepository["reserve"]>> = {
    mockId: "10000000-0000-4000-8000-000000000001",
    status: "generating",
    attemptId: null,
    reserved: true,
    ...reservation,
  };
  const implementation: OnDemandCoreMockRepository = {
    reserve: vi.fn(async () => resolvedReservation),
    loadHistory: vi.fn(async () => []),
    persist: vi.fn(async (input) => { persisted.push(input); }),
    fail: vi.fn(async (input) => { failures.push(input); }),
  };
  return { implementation, persisted, failures };
}

let fixture: ReturnType<typeof assembleCoreMockWithHistory>;

beforeAll(() => {
  fixture = assembleCoreMockWithHistory({
    mockSeed: "phase-6-service-fixture",
    createdAt: "2026-08-22T00:00:00.000Z",
    history: [],
  });
}, 120_000);

describe("on-demand Core mock orchestration", () => {
  it("persists one complete generated attempt and returns only safe route identifiers", async () => {
    const repo = repository();
    const now = vi.fn()
      .mockReturnValueOnce(new Date("2026-08-22T01:00:00.000Z"))
      .mockReturnValueOnce(new Date("2026-08-22T01:00:05.000Z"));
    const result = await generateOnDemandCoreMock({
      userId: "20000000-0000-4000-8000-000000000001",
      requestId: "30000000-0000-4000-8000-000000000001",
      historyWindow: 5,
      cooldownSeconds: 30,
      repository: repo.implementation,
      assemble: () => fixture,
      now,
      createId: ids(),
    });

    expect(result).toEqual({
      state: "ready",
      mockId: "10000000-0000-4000-8000-000000000001",
      attemptId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(repo.persisted).toHaveLength(1);
    expect(repo.persisted[0].p_items).toHaveLength(60);
    expect(repo.persisted[0].p_critical_gate_passed).toBe(true);
    expect(repo.persisted[0].p_started_at).toBe("2026-08-22T01:00:05.000Z");
    expect((repo.persisted[0].p_test_snapshot as { origin?: string }).origin).toBe("generated");
    expect(JSON.stringify(result)).not.toContain("mockSeed");
    expect(JSON.stringify(result)).not.toContain("fingerprint");
    expect(repo.failures).toHaveLength(0);
  }, 30_000);

  it("returns the existing ready attempt for an idempotent retry", async () => {
    const repo = repository({
      status: "ready",
      attemptId: "40000000-0000-4000-8000-000000000001",
      reserved: false,
    });
    const assemble = vi.fn(() => fixture);
    const result = await generateOnDemandCoreMock({
      userId: "20000000-0000-4000-8000-000000000001",
      requestId: "30000000-0000-4000-8000-000000000001",
      historyWindow: 5,
      cooldownSeconds: 30,
      repository: repo.implementation,
      assemble,
    });
    expect(result).toEqual({
      state: "ready",
      mockId: "10000000-0000-4000-8000-000000000001",
      attemptId: "40000000-0000-4000-8000-000000000001",
    });
    expect(assemble).not.toHaveBeenCalled();
    expect(repo.persisted).toHaveLength(0);
  });

  it("does not start a second assembly while the same request is generating", async () => {
    const repo = repository({ reserved: false, status: "generating" });
    const assemble = vi.fn(() => fixture);
    const result = await generateOnDemandCoreMock({
      userId: "20000000-0000-4000-8000-000000000001",
      requestId: "30000000-0000-4000-8000-000000000001",
      historyWindow: 5,
      cooldownSeconds: 30,
      repository: repo.implementation,
      assemble,
    });
    expect(result.state).toBe("generating");
    expect(assemble).not.toHaveBeenCalled();
  });

  it("marks generation failed and creates no attempt when assembly throws", async () => {
    const repo = repository();
    const result = await generateOnDemandCoreMock({
      userId: "20000000-0000-4000-8000-000000000001",
      requestId: "30000000-0000-4000-8000-000000000001",
      historyWindow: 5,
      cooldownSeconds: 30,
      repository: repo.implementation,
      assemble: () => { throw new Error("simulated generator exception"); },
      createId: ids(),
    });
    expect(result.state).toBe("failed");
    expect(repo.persisted).toHaveLength(0);
    expect(repo.failures).toEqual([expect.objectContaining({ reasonCode: "generation_exception" })]);
  });

  it("records a transactional persistence failure without returning a partial attempt", async () => {
    const repo = repository();
    repo.implementation.persist = vi.fn(async () => { throw new Error("database timeout"); });
    const result = await generateOnDemandCoreMock({
      userId: "20000000-0000-4000-8000-000000000001",
      requestId: "30000000-0000-4000-8000-000000000001",
      historyWindow: 5,
      cooldownSeconds: 30,
      repository: repo.implementation,
      assemble: () => fixture,
      createId: ids(),
    });
    expect(result.state).toBe("failed");
    expect(repo.failures).toEqual([expect.objectContaining({ reasonCode: "transaction_error" })]);
  });

  it("allows only one of two simultaneous requests for the same user to assemble", async () => {
    const active = new Set<string>();
    const persisted: unknown[] = [];
    const shared: OnDemandCoreMockRepository = {
      reserve: vi.fn(async ({ userId, requestId }: Parameters<OnDemandCoreMockRepository["reserve"]>[0]): ReturnType<OnDemandCoreMockRepository["reserve"]> => {
        if (active.has(userId)) throw new Error("generation_in_progress");
        active.add(userId);
        return { mockId: requestId, status: "generating", attemptId: null, reserved: true };
      }),
      loadHistory: vi.fn(async () => []),
      persist: vi.fn(async (input) => { persisted.push(input); }),
      fail: vi.fn(async () => undefined),
    };
    const common = {
      userId: "20000000-0000-4000-8000-000000000001",
      historyWindow: 5,
      cooldownSeconds: 30,
      repository: shared,
      assemble: () => fixture,
    };
    const results = await Promise.all([
      generateOnDemandCoreMock({ ...common, requestId: "30000000-0000-4000-8000-000000000001", createId: ids(1) }),
      generateOnDemandCoreMock({ ...common, requestId: "30000000-0000-4000-8000-000000000002", createId: ids(1000) }),
    ]);
    expect(results.filter((result) => result.state === "ready")).toHaveLength(1);
    expect(results.filter((result) => result.state === "failed")).toHaveLength(1);
    expect(persisted).toHaveLength(1);
  });

  it("allows different students to generate concurrently without sharing ownership state", async () => {
    const active = new Set<string>();
    const persisted: unknown[] = [];
    const shared: OnDemandCoreMockRepository = {
      reserve: vi.fn(async ({ userId, requestId }: Parameters<OnDemandCoreMockRepository["reserve"]>[0]): ReturnType<OnDemandCoreMockRepository["reserve"]> => {
        if (active.has(userId)) throw new Error("generation_in_progress");
        active.add(userId);
        return { mockId: requestId, status: "generating", attemptId: null, reserved: true };
      }),
      loadHistory: vi.fn(async () => []),
      persist: vi.fn(async (input) => { persisted.push(input); }),
      fail: vi.fn(async () => undefined),
    };
    const results = await Promise.all([
      generateOnDemandCoreMock({
        userId: "20000000-0000-4000-8000-000000000001",
        requestId: "30000000-0000-4000-8000-000000000001",
        historyWindow: 5,
        cooldownSeconds: 30,
        repository: shared,
        assemble: () => fixture,
        createId: ids(1),
      }),
      generateOnDemandCoreMock({
        userId: "20000000-0000-4000-8000-000000000002",
        requestId: "30000000-0000-4000-8000-000000000002",
        historyWindow: 5,
        cooldownSeconds: 30,
        repository: shared,
        assemble: () => fixture,
        createId: ids(1000),
      }),
    ]);
    expect(results.every((result) => result.state === "ready")).toBe(true);
    expect(persisted).toHaveLength(2);
  });
});

describe("generated-mock security and database invariants", () => {
  const actionSource = readFileSync("src/app/tests/actions.ts", "utf8");
  const dataSource = readFileSync("src/lib/tests/data.ts", "utf8");
  const migration = readFileSync("supabase/migrations/202608220017_on_demand_core_mocks.sql", "utf8");

  it("derives the student identity from authenticated server state", () => {
    expect(actionSource).toContain("const user = await requireUser()");
    expect(actionSource).not.toMatch(/generateCoreMockForCurrentUser\([^)]*userId/);
    expect(actionSource).toContain("ENABLE_ON_DEMAND_CORE_MOCKS");
  });

  it("keeps generated history and admin diagnostics behind server-derived ownership and role gates", () => {
    const adminPage = readFileSync("src/app/admin/page.tsx", "utf8");
    const service = readFileSync("src/lib/mocks/on-demand.ts", "utf8");
    expect(adminPage).toContain('requireRole(["reviewer", "admin"])');
    expect(adminPage).toContain("isAdmin ? getRecentGeneratedCoreMocksForAdmin(10)");
    expect(service).toContain('.eq("user_id", userId)');
    expect(service).not.toMatch(/loadHistory\([^)]*targetUser/);
  });

  it("checks attempt ownership and never returns private snapshots to the runner", () => {
    expect(dataSource).toContain("attempt.user_id !== userId");
    expect(dataSource).toContain('select("question_key, section_key, section_position, public_snapshot, position")');
    expect(dataSource).not.toContain('section_position, public_snapshot, private_snapshot, position");');
  });

  it("database-enforces one active request, idempotency, atomic persistence, and private telemetry", () => {
    expect(migration).toContain("unique (user_id, generation_request_id)");
    expect(migration).toContain("idx_generated_core_mocks_one_active_per_user");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("persist_generated_core_mock_attempt");
    expect(migration).toContain("item_count <> 60");
    expect(migration).toContain("distinct_question_count <> 60");
    expect(migration).toContain("module_counts.module_count <> 20");
    expect(migration).toContain("invalid_section_counts <> 0");
    expect(migration).toContain("fill_practice_attempt_item_keys");
    expect(migration).toContain("fill_user_response_question_key");
    expect(migration).toContain("revoke all on public.generated_core_mocks from anon, authenticated");
    expect(migration).toContain("revoke all on public.core_mock_generation_events from anon, authenticated");
    expect(migration).toContain("revoke all on public.test_attempts from anon, authenticated");
    expect(migration).toContain("revoke all on public.user_responses from anon, authenticated");
    expect(migration).toContain("display_title");
    const studentAttemptGrant = migration.match(
      /grant select \(([\s\S]*?)\) on public\.test_attempts to authenticated/,
    )?.[1] ?? "";
    expect(studentAttemptGrant).not.toContain("test_snapshot");
    expect(studentAttemptGrant).not.toContain("mock_seed");
    expect(studentAttemptGrant).not.toContain("generator_versions");
    expect(studentAttemptGrant).not.toContain("question_fingerprints");
  });
});

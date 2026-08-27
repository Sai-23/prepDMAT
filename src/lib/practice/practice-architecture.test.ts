import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("practice persistence architecture", () => {
  const migration = source("supabase/migrations/202608220018_practice_sessions.sql");

  it("keeps practice sessions separate, resumable, and answer-locking", () => {
    expect(migration).toContain("create table if not exists public.practice_sessions");
    expect(migration).toContain("create table if not exists public.practice_session_items");
    expect(migration).toContain("idx_practice_sessions_one_active_user");
    expect(migration).toContain("practice_answer_locked");
    expect(migration).toContain("practice_session_incomplete");
  });

  it("captures the required compact analytics events", () => {
    ["practice_started", "question_answered", "practice_completed", "practice_abandoned", "explanation_opened"].forEach((event) => expect(migration).toContain(`'${event}'`));
  });

  it("keeps snapshots service-only and never sends private data in start actions", () => {
    expect(migration).toContain("revoke all on public.practice_session_items from anon, authenticated");
    const actions = source("src/app/practice/actions.ts");
    expect(actions).not.toContain("private_snapshot");
    expect(actions).not.toContain("correctAnswer:");
  });

  it("supports immutable review and generated-question reports", () => {
    expect(migration).toContain("practice_session_item_id uuid");
    expect(source("src/lib/practice/data.ts")).toContain('.eq("status", "completed")');
  });
});

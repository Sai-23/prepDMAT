import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("practice request efficiency", () => {
  it("does not issue a separate shown request for each rendered question", () => {
    const experience = source("src/components/practice/practice-experience.tsx");
    const actions = source("src/app/practice/actions.ts");

    expect(experience).not.toContain("showPracticeQuestionAction");
    expect(actions).not.toContain("showPracticeQuestionAction");
  });

  it("keeps timing persistence in session creation and the atomic advance RPC", () => {
    const data = source("src/lib/practice/data.ts");
    const migration = source("supabase/migrations/202608220018_practice_sessions.sql");

    expect(data).toContain("shown_at: startedAt.toISOString()");
    expect(data).toContain('admin.rpc("advance_practice_question"');
    expect(migration).toMatch(/update public\.practice_session_items set shown_at = timezone\('utc', now\(\)\)/);
  });

  it("projects only required columns and indexes completed Practice history", () => {
    const data = source("src/lib/practice/data.ts");
    const migration = source("supabase/migrations/202609240036_practice_history_performance.sql");

    expect(data).not.toContain('.from("practice_sessions").select("*")');
    expect(data).not.toContain('.from("practice_session_items").select("*")');
    expect(migration).toContain("on public.practice_sessions(user_id, completed_at desc)");
    expect(migration).toContain("where status = 'completed'");
    expect(migration).toContain("with (security_invoker = true)");
    expect(migration).toContain("public.user_header_state");
  });
});

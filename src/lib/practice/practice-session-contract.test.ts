import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("practice session service contract", () => {
  const data = source("src/lib/practice/data.ts");
  const actions = source("src/app/practice/actions.ts");
  const migration = source("supabase/migrations/202608220018_practice_sessions.sql");

  it("authenticates every mutating action and scopes service queries to the user", () => {
    expect(actions.match(/await requireUser\(\)/g)?.length).toBeGreaterThanOrEqual(8);
    expect(data).toContain('.eq("user_id", userId)');
    expect(migration).toContain("user_id = p_user_id");
  });

  it("restores the server-owned current position and submitted feedback", () => {
    expect(data).toContain("current_position");
    expect(data).toContain('item.response_status === "answered" ? item.response_payload');
    expect(data).toContain("privateSnapshot.correctAnswer");
    expect(data).toContain('item.response_status !== "answered"');
    expect(migration).toContain("advance_practice_question");
    expect(migration).toContain("practice_feedback_required");
  });

  it("enforces shown, expiry, current-question, and immutable-answer checks", () => {
    expect(data).toContain("Time has expired for this practice session.");
    expect(migration).toContain("position = session_row.current_position");
    expect(migration).toContain("practice_question_not_shown");
    expect(migration).toContain("practice_answer_locked");
    expect(data).toContain("answerMatchesQuestion");
    expect(data).toContain("does not match this question's response format");
  });

  it("completes only fully answered sessions and reads review only after completion", () => {
    expect(migration).toContain("practice_session_incomplete");
    expect(data).toContain('eq("status", "completed")');
    expect(data).toContain("response_payload as PracticeAnswer");
  });

  it("exposes actionable safe errors while keeping provenance out of them", () => {
    expect(data).toContain("Apply the latest database migration and try again.");
    expect(actions).not.toMatch(/seed|fingerprint|private_snapshot/);
  });
});

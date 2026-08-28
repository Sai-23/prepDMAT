import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("mistake notebook remediation contract", () => {
  const data = source("src/lib/learning/data.ts");
  const page = source("src/app/mistakes/page.tsx");
  const notebook = source("src/components/learning/mistake-notebook.tsx");
  const migration = source("supabase/migrations/202608280025_mistake_notebook_sources.sql");

  it("derives mistakes from Practice, Diagnostic, and immutable Mock snapshots", () => {
    expect(data).toContain('.from("practice_session_items")');
    expect(data).toContain('session.session_type === "diagnostic"');
    expect(data).toContain('.from("practice_attempt_items")');
    expect(data).toContain('.from("user_responses")');
    expect(data).toContain('.eq("is_correct", false)');
  });

  it("keeps diagnostic answers hidden until the diagnostic is completed", () => {
    expect(data).toContain('.eq("status", "completed")');
    expect(data).toContain('session_type, completed_at');
  });

  it("defaults to needs review and supports all reliable combined filters", () => {
    expect(page).toContain('"needs_review"');
    for (const filter of ["status", "module", "difficulty", "source"]) {
      expect(page).toContain(`name="${filter}"`);
    }
    expect(data).toContain("mistake.question.questionType === filters.module");
    expect(data).toContain("mistake.question.difficulty === filters.difficulty");
    expect(data).toContain("mistake.source === filters.source");
  });

  it("bounds source history and paginates before sending cards to the client", () => {
    expect(data).toContain(".limit(500)");
    expect(data).toContain("const pageSize = 20");
    expect(data).toContain("filtered.slice((page - 1) * pageSize");
  });

  it("uses progressive review and local-first understood updates with rollback and retry", () => {
    expect(notebook).toContain("<details");
    expect(notebook).toContain("Mark understood");
    expect(notebook).toContain("previous.isUnderstood");
    expect(notebook).toContain("setFailedMutation");
    expect(notebook).toContain(">Retry</Button>");
    expect(notebook).not.toContain("router.refresh");
  });

  it("adds only source references and preserves the existing user-owned RLS policy", () => {
    expect(migration).toContain("practice_session_item_id");
    expect(migration).toContain("practice_attempt_item_id");
    expect(migration).toContain("num_nonnulls");
    expect(migration).not.toMatch(/disable row level security/i);
    expect(data).not.toContain('.from("user_responses").update');
    expect(data).not.toContain('.from("practice_session_items").update');
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("public diagnostic security and acquisition contract", () => {
  const data = source("src/lib/onboarding/public-diagnostic.ts");
  const actions = source("src/app/diagnostic/actions.ts");
  const take = source("src/app/diagnostic/take/page.tsx");
  const result = source("src/app/diagnostic/result/page.tsx");
  const experience = source("src/components/onboarding/diagnostic-experience.tsx");
  const migration = source("supabase/migrations/202608290028_public_diagnostic_and_mock_summaries.sql");

  it("keeps the 15-question, 5+5+5 Core diagnostic contract", () => {
    expect(migration).toContain("question_count = 15");
    expect(migration).toContain("item_count <> 15");
    expect(migration).toContain("<> 5");
    for (const questionType of ["figure_sequence", "mathematical_equation", "latin_square"]) {
      expect(migration).toContain(`('${questionType}')`);
    }
    for (const difficulty of ["easy", "medium", "hard"]) {
      expect(migration).toContain(`item.difficulty = '${difficulty}'`);
    }
  });

  it("uses an opaque HttpOnly expiring cookie and hashes the bearer token at rest", () => {
    expect(data).toContain('randomBytes(32).toString("base64url")');
    expect(data).toContain('createHash("sha256")');
    expect(data).toContain("httpOnly: true");
    expect(data).toContain('sameSite: "lax"');
    expect(data).toContain("PUBLIC_DIAGNOSTIC_TTL_SECONDS = 2 * 60 * 60");
    expect(migration).toContain("token_hash text not null unique");
  });

  it("does not grant anonymous or authenticated clients table or RPC access", () => {
    expect(migration).toContain("alter table public.public_diagnostic_sessions enable row level security");
    expect(migration).toContain("alter table public.public_diagnostic_items enable row level security");
    expect(migration).toContain("revoke all on public.public_diagnostic_sessions from public, anon, authenticated");
    expect(migration).toContain("revoke all on public.public_diagnostic_items from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.create_public_core_diagnostic");
    expect(migration).toContain("grant execute on function public.record_public_diagnostic_answer");
    expect(migration).toContain("grant execute on function public.claim_public_core_diagnostic");
    expect(migration).not.toMatch(/grant (select|insert|update|delete).*public_diagnostic.*\b(anon|authenticated)\b/i);
  });

  it("locks the current question, saves before advancing, and supports idempotent one-user claim", () => {
    expect(migration).toContain("where token_hash = p_token_hash for update");
    expect(migration).toContain("position = session_row.current_position");
    expect(migration).toContain("response_status = 'unanswered'");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("public_session.claimed_by = p_user_id");
    expect(migration).toContain("public_diagnostic_already_claimed");
    expect(data.indexOf('admin.rpc("record_public_diagnostic_answer"')).toBeLessThan(
      data.indexOf('result?.result_status === "completed"'),
    );
  });

  it("keeps correctness hidden during the attempt and shows only aggregate result before auth", () => {
    expect(take).toContain("<DiagnosticExperience initialSession={session} publicSession />");
    expect(experience).toContain("Results shown after completion");
    expect(experience).not.toContain("correctAnswer");
    expect(result).toContain("profile.totalCorrect");
    expect(result).toContain("profile.modules.map");
    expect(result).not.toContain("reviewItems");
  });

  it("rate-limits creation, answers, and claim independently without requiring auth to take it", () => {
    expect(actions).toContain('enforceSecurityRateLimit("generation:public-diagnostic")');
    expect(actions).toContain('enforceSecurityRateLimit("assessment:public-diagnostic")');
    expect(data).toContain('enforceSecurityRateLimit("assessment:public-diagnostic-claim", { userId })');
    expect(take).not.toContain("requireUser");
  });

  it("claims into the existing immutable private diagnostic model and routes registration choices", () => {
    expect(migration).toContain("insert into public.practice_sessions");
    expect(migration).toContain("insert into public.practice_session_items");
    expect(migration).toContain("diagnostic_status = 'completed'");
    expect(result).toContain('href="/register"');
    expect(result).toContain('href="/login"');
  });
});

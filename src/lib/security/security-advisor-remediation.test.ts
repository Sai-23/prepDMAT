import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609230035_harden_security_advisor_findings.sql"),
  "utf8",
);
const dbTests = readFileSync(
  resolve(process.cwd(), "supabase/tests/rls_security_remediation.test.sql"),
  "utf8",
);
const supabaseConfig = readFileSync(resolve(process.cwd(), "supabase/config.toml"), "utf8");

describe("2026-09-23 Supabase Security Advisor remediation", () => {
  it("pins set_updated_at to an empty search path without replacing its trigger body", () => {
    expect(migration).toContain("alter function public.set_updated_at() set search_path = ''");
    expect(migration).not.toMatch(/drop function\s+public\.set_updated_at/i);
    expect(dbTests).toContain("set_updated_at trigger still advances timestamps");
  });

  it("moves both RLS helpers out of the exposed public schema and preserves policy dependencies by OID", () => {
    expect(migration).toContain("alter function public.current_user_has_role(public.app_role) set schema private");
    expect(migration).toContain("alter function public.current_user_has_any_role(public.app_role[]) set schema private");
    expect(migration).toMatch(/private\.current_user_has_role[\s\S]*security definer[\s\S]*set search_path = ''/i);
    expect(migration).toMatch(/private\.current_user_has_any_role[\s\S]*security definer[\s\S]*set search_path = ''/i);
    expect(supabaseConfig).toContain('schemas = ["public", "storage", "graphql_public"]');
    expect(supabaseConfig).not.toMatch(/schemas\s*=.*"private"/);
  });

  it("keeps browser roles denied on every intentional no-policy relation", () => {
    for (const table of [
      "core_mock_generation_events", "generated_core_mocks", "practice_events",
      "practice_session_items", "practice_sessions", "public_diagnostic_items",
      "public_diagnostic_sessions", "security_rate_limits", "general_academic_bookmarks",
      "general_academic_mistakes", "general_academic_mock_answers",
      "general_academic_mock_attempts", "general_academic_practice_answers",
      "general_academic_practice_attempts",
    ]) {
      expect(migration).toContain(`public.${table}`);
      expect(dbTests).toContain(`('${table}')`);
    }
    expect(migration).toMatch(/revoke all on table[\s\S]*from public, anon, authenticated/i);
  });

  it("retains least-privilege defaults for future public-schema objects", () => {
    expect(migration).toMatch(/alter default privileges in schema public revoke all privileges on tables from public, anon, authenticated/i);
    expect(migration).toMatch(/alter default privileges in schema public revoke execute on functions from public, anon, authenticated/i);
  });
});

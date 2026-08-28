import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { hardenedSupabaseCookieOptions } from "./cookies";
import { createContentSecurityPolicy } from "./csp";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = source("supabase/migrations/202608270022_security_remediation.sql");
const limiterFixMigration = source(
  "supabase/migrations/202608270023_fix_security_rate_limit_timestamp.sql",
);
const limiterBatchMigration = source(
  "supabase/migrations/202608270024_batch_security_rate_limits.sql",
);
const mockStateMigration = source(
  "supabase/migrations/202608280026_mock_state_security.sql",
);
const scrapingMigration = source(
  "supabase/migrations/202608280027_close_question_bank_scraping.sql",
);

describe("database security remediation contract", () => {
  it("removes legacy broad grants and makes browser privileges explicit", () => {
    expect(migration).toContain(
      "revoke all privileges on all tables in schema public from anon, authenticated",
    );
    expect(migration).toContain("alter default privileges in schema public");
    expect(migration).toContain("revoke create on schema public from public, anon, authenticated");
    expect(migration).not.toMatch(/grant all privileges on all tables/i);
  });

  it("denies student subscription mutations and closes later direct browser writes", () => {
    expect(migration).toContain("drop policy if exists subscriptions_access");
    expect(migration).toMatch(/create policy subscriptions_insert[\s\S]*current_user_has_role\('admin'\)/);
    expect(migration).toMatch(/create policy subscriptions_update[\s\S]*current_user_has_role\('admin'\)/);
    expect(migration).toMatch(/create policy subscriptions_delete[\s\S]*current_user_has_role\('admin'\)/);
    expect(migration).toContain("grant select, insert, update, delete on public.subscriptions to authenticated");
    expect(scrapingMigration).toContain(
      "revoke insert, update, delete on public.subscriptions from authenticated",
    );
  });

  it("makes profile workflow fields server-owned", () => {
    expect(migration).toContain("drop policy if exists profiles_insert");
    expect(migration).toContain("drop policy if exists profiles_update");
    expect(migration).not.toMatch(/grant update[^;]*public\.profiles/i);

    const actions = source("src/app/auth/actions.ts");
    expect(actions.match(/createSupabaseAdminClient\(\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(actions).toContain("theme_preference: preference");
    expect(actions).toContain("marketing_consent_version");
  });

  it("enforces report encounter, size, provenance, and duplicate invariants", () => {
    expect(migration).toContain("char_length(details) <= 2000");
    expect(migration).toContain("question_report_encounter_mismatch");
    expect(migration).toContain("question_report_question_mismatch");
    expect(migration).toContain("question_report_duplicate");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("drop policy if exists question_reports_insert");
  });

  it("binds review attribution and makes reviewer decisions immutable", () => {
    expect(migration).toMatch(/create policy question_reviews_insert[\s\S]*reviewer_id = auth\.uid\(\)/);
    expect(migration).not.toMatch(/create policy question_reviews_update/);
    expect(migration).toMatch(/create policy question_reviews_delete[\s\S]*current_user_has_role\('admin'\)/);
    expect(migration).not.toMatch(/grant[^;]*update[^;]*question_reviews/i);
  });

  it("keeps privileged RPCs service-only and uses a shared atomic limiter", () => {
    expect(migration).toContain("create table if not exists public.security_rate_limits");
    expect(migration).toContain("create or replace function public.consume_security_rate_limit");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public");
    expect(migration).toContain("revoke execute on all functions in schema public from public, anon, authenticated");
    expect(migration).toContain("grant execute on all functions in schema public to service_role");
    expect(limiterFixMigration).toContain("v_now timestamptz := now()");
    expect(limiterFixMigration).not.toMatch(/\bcurrent_time\s+timestamptz/);
    expect(limiterFixMigration).toContain(
      "revoke all on function public.consume_security_rate_limit",
    );
    expect(limiterBatchMigration).toContain(
      "create or replace function public.consume_security_rate_limits",
    );
    expect(limiterBatchMigration).toContain(
      "from public.consume_security_rate_limit(",
    );
    expect(limiterBatchMigration).toContain("check_count > 4");
    expect(limiterBatchMigration).toContain(
      "grant execute on function public.consume_security_rate_limits(jsonb)",
    );
    expect(limiterBatchMigration).toContain("to service_role");
    expect(limiterBatchMigration).toContain(
      "from public, anon, authenticated",
    );

    const limiter = source("src/lib/security/rate-limit.ts");
    expect(limiter).toContain('admin.rpc("consume_security_rate_limits"');
    expect(limiter).not.toContain('admin.rpc("consume_security_rate_limit"');
  });

  it("serializes Mock start, response persistence, and final grading", () => {
    expect(mockStateMigration).toContain(
      "create trigger enforce_one_active_curated_mock",
    );
    expect(mockStateMigration).toContain("pg_advisory_xact_lock");
    expect(mockStateMigration).toContain(
      "create or replace function public.save_test_response_secure",
    );
    expect(mockStateMigration).toContain(
      "create or replace function public.finalize_test_attempt_secure",
    );
    expect(mockStateMigration).toContain(
      "response.response_payload is distinct from grade.response_payload",
    );
    expect(mockStateMigration).toContain("for update");
    expect(mockStateMigration).toMatch(
      /revoke all on function public\.save_test_response_secure[\s\S]*from public, anon, authenticated/,
    );
    expect(mockStateMigration).toMatch(
      /revoke all on function public\.finalize_test_attempt_secure[\s\S]*from public, anon, authenticated/,
    );

    const testData = source("src/lib/tests/data.ts");
    expect(testData).toContain('admin.rpc("save_test_response_secure"');
    expect(testData).toContain('"finalize_test_attempt_secure"');
    expect(testData).not.toContain('from("user_responses")\n        .update({');
  });

  it("withholds future timed-section questions until the server advances the attempt", () => {
    const testData = source("src/lib/tests/data.ts");
    expect(testData).toMatch(
      /async function loadActiveSectionPayload[\s\S]*\.eq\("section_key", section\.id\)/,
    );
    expect(testData).toMatch(
      /export async function getTestAttempt[\s\S]*loadActiveSectionPayload\([\s\S]*active\.section[\s\S]*questions: sectionPayload\.questions/,
    );
    expect(testData).toContain(
      'if (cursorError) throw new Error("Unable to restore the active timed section.")',
    );
    expect(testData).toMatch(
      /export async function advanceTestSection[\s\S]*loadActiveSectionPayload\([\s\S]*nextSection[\s\S]*\.\.\.sectionPayload/,
    );
    expect(testData).toMatch(
      /export async function processTestClock[\s\S]*loadActiveSectionPayload\([\s\S]*active\.section[\s\S]*\.\.\.sectionPayload/,
    );

    const runner = source("src/components/tests/test-runner.tsx");
    expect(runner).toContain(
      "const [availableQuestions, setAvailableQuestions] = useState(attempt.questions)",
    );
    expect(runner).toContain("setAvailableQuestions((current) => [");
    expect(runner).toContain("applySectionTransition(response)");
  });

  it("removes direct browser access to the published question bank", () => {
    for (const table of [
      "public.question_options",
      "public.tests",
      "public.test_sections",
      "public.test_questions",
    ]) {
      expect(scrapingMigration).toContain(
        `revoke select on ${table} from anon, authenticated`,
      );
    }
    expect(scrapingMigration).toMatch(
      /revoke select \([\s\S]*question_text[\s\S]*\) on public\.questions from anon, authenticated/,
    );
    expect(scrapingMigration).toContain(
      "revoke insert, update, delete on public.question_reviews from authenticated",
    );
    expect(scrapingMigration).toContain(
      "revoke insert, update, delete on public.subscriptions from authenticated",
    );

    const clientUsages = [
      "src/components/auth/auth-form.tsx",
      "src/components/layout/site-header-account.tsx",
    ].map(source).join("\n");
    expect(clientUsages).not.toMatch(/\.from\(["'](?:questions|question_options|tests|test_sections|test_questions)["']\)/);
  });
});

describe("application security boundary", () => {
  it("uses a strict nonce-based script policy and exact Supabase connection origin", () => {
    const policy = createContentSecurityPolicy("fixed-nonce", {
      development: false,
      supabaseUrl: "https://project.supabase.co",
    });

    expect(policy).toContain("script-src 'self' 'nonce-fixed-nonce' 'strict-dynamic'");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(policy).not.toMatch(/script-src[^;]* \*/);
    expect(policy).toContain("connect-src 'self' https://project.supabase.co wss://project.supabase.co");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("forces Secure production cookies without breaking Supabase browser refresh", () => {
    expect(hardenedSupabaseCookieOptions(undefined, true)).toMatchObject({
      path: "/",
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    });
    expect(hardenedSupabaseCookieOptions({ secure: false }, false).secure).toBe(false);
  });

  it("rate-limits every public auth and expensive generation entry point", () => {
    const auth = source("src/app/auth/actions.ts");
    const google = source("src/app/auth/google/route.ts");
    const practice = source("src/app/practice/actions.ts");
    const onboarding = source("src/app/onboarding/actions.ts");
    const tests = source("src/app/tests/actions.ts");
    const learning = source("src/app/learning/actions.ts");
    const combined = [auth, google, practice, onboarding, tests, learning].join("\n");

    for (const operation of [
      "auth:login",
      "auth:signup",
      "auth:resend",
      "auth:password-reset",
      "auth:phone-request",
      "auth:phone-verify",
      "auth:google",
      "generation:practice",
      "generation:diagnostic",
      "generation:mock",
      "assessment:answer",
      "assessment:mock-start",
      "assessment:mock-write",
      "learning:mutation",
      "learning:report",
    ]) {
      expect(combined).toContain(`enforceSecurityRateLimit(\"${operation}\"`);
    }
    expect(tests.indexOf("ENABLE_ON_DEMAND_CORE_MOCKS")).toBeLessThan(
      tests.indexOf('enforceSecurityRateLimit("generation:mock"'),
    );
  });

  it("bounds framework request buffering and Server Action payloads", () => {
    const config = source("next.config.ts");
    expect(config).toContain('proxyClientMaxBodySize: "1mb"');
    expect(config).toContain('bodySizeLimit: "256kb"');
  });

  it("does not forward arbitrary action exception messages", () => {
    const actions = [
      "src/app/admin/actions.ts",
      "src/app/learning/actions.ts",
      "src/app/onboarding/actions.ts",
      "src/app/practice/actions.ts",
      "src/app/tests/actions.ts",
    ].map(source).join("\n");

    expect(actions).not.toMatch(/error instanceof Error\s*\?\s*error\.message/);
    expect(actions).not.toMatch(/return[^;]*error\.message/);
    expect(actions).toContain("safeActionFailure");
  });

  it("does not render arbitrary server exception messages in page error states", () => {
    const pages = [
      "src/app/admin/page.tsx",
      "src/app/admin/questions/[questionId]/edit/page.tsx",
      "src/app/admin/review/page.tsx",
      "src/app/admin/tests/[testId]/edit/page.tsx",
      "src/app/admin/tests/new/page.tsx",
      "src/app/admin/tests/page.tsx",
      "src/app/bookmarks/page.tsx",
      "src/app/mistakes/page.tsx",
      "src/app/practice/page.tsx",
      "src/app/results/page.tsx",
      "src/app/tests/[testId]/page.tsx",
      "src/app/tests/[testId]/take/page.tsx",
      "src/app/tests/page.tsx",
    ].map(source).join("\n");

    expect(pages).not.toMatch(/error instanceof Error[\s\S]{0,80}error\.message/);
  });

  it("uses an explicit free-launch entitlement path without fake subscriptions", () => {
    const data = source("src/lib/tests/data.ts");
    expect(data).toContain("FREE_LAUNCH_ACCESS_ENABLED");
    expect(data).toMatch(/if \(getEnv\(\)\.FREE_LAUNCH_ACCESS_ENABLED\) return true/);
    expect(data).not.toMatch(/insert\([^)]*subscriptions/);
  });

  it("ships executable denial tests for every adversarial role", () => {
    const sql = source("supabase/tests/rls_security_remediation.test.sql");
    for (const actor of ["Student A", "Student B", "Reviewer A", "Reviewer B", "Admin", "anonymous attacker"]) {
      expect(sql.toLowerCase()).toContain(actor.toLowerCase());
    }
    expect(sql.match(/^select (?:throws_ok|results_eq|ok)\(/gm)?.length).toBeGreaterThanOrEqual(25);
    expect(sql).toContain("rollback;");
  });
});

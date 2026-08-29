import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("authentication contracts", () => {
  it("exchanges callback codes into cookie-backed sessions and uses only centralized routes", () => {
    const callback = source("src/app/auth/callback/route.ts");
    expect(callback).toContain("exchangeCodeForSession(code)");
    expect(callback).toContain("verifyOtp({");
    expect(callback).toContain("getPostAuthRoute(userId)");
    expect(callback).not.toContain('searchParams.get("next")');
    expect(callback).not.toContain("provider_token");
  });

  it("uses server-verified registration OTP without polling or auth listeners", () => {
    const actions = source("src/app/auth/actions.ts");
    const form = source("src/components/auth/auth-form.tsx");
    expect(actions).toContain('getAuthCallbackUrl("email_verification")');
    expect(actions).toContain('type: "signup"');
    expect(actions).toContain('enforceSecurityRateLimit("auth:email-verify"');
    expect(form).toContain("maskEmailAddress(email)");
    expect(form).toContain('autoComplete="one-time-code"');
    expect(form).toContain('inputMode="numeric"');
    expect(form).toContain("pending || !complete");
    expect(form).not.toMatch(/createSupabaseBrowserClient|onAuthStateChange|setInterval\([^)]*8_000/);
  });

  it("shares one server auth interpretation and reconciles header session changes", () => {
    const guards = source("src/lib/auth/guards.ts");
    const layout = source("src/app/layout.tsx");
    const header = source("src/components/layout/site-header-account.tsx");
    const actions = source("src/app/auth/actions.ts");

    expect(guards).toContain("getCurrentUser = cache(async () =>");
    expect(layout).toContain("resolveRootAuthState()");
    expect(layout).toContain("initialAccount={authState.account}");
    expect(header).toContain('event !== "SIGNED_IN"');
    expect(header).toContain('event !== "SIGNED_OUT"');
    expect(header).toContain('event !== "TOKEN_REFRESHED"');
    expect(header).toContain('event === "SIGNED_OUT" ? null : session?.user ?? null');
    expect(header).toContain("reconcileHeaderAccount(current, user)");
    expect(actions).toContain('revalidatePath("/", "layout")');
  });

  it("keeps provider entry points disabled unless explicitly configured", () => {
    const env = source("src/lib/validators/env-schema.ts");
    const pages = [source("src/app/login/page.tsx"), source("src/app/register/page.tsx")].join("\n");
    expect(env).toContain("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED");
    expect(env).toContain("NEXT_PUBLIC_PHONE_AUTH_ENABLED");
    expect(env.match(/\.default\("false"\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(pages.match(/availability=\{availability\}/g)?.length).toBe(2);
  });

  it("uses Supabase provider APIs without custom token storage or token telemetry", () => {
    const google = source("src/app/auth/google/route.ts");
    const actions = source("src/app/auth/actions.ts");
    expect(google).toContain("signInWithOAuth");
    expect(actions).toContain("signInWithOtp");
    expect(actions).toContain("verifyOtp");
    expect(`${google}\n${actions}`).not.toMatch(/localStorage|provider_token|access_token|refresh_token/);
  });

  it("keeps Google outcomes specific and retryable", () => {
    const callback = source("src/app/auth/callback/route.ts");
    const login = source("src/app/login/page.tsx");
    expect(callback).toContain('"google_expired"');
    expect(callback).toContain('"google_unavailable"');
    expect(login).toContain("Your Google sign-in attempt expired. Please try again.");
    expect(login).toContain("Google sign-in is temporarily unavailable. Please try again.");
    expect(login).not.toContain("Automatic sign-in is temporarily unavailable");
  });

  it("keeps every protected learning route behind the existing proxy", () => {
    const proxy = source("src/proxy.ts");
    for (const route of ["/dashboard", "/practice", "/tests", "/progress", "/results", "/onboarding"]) {
      expect(proxy).toContain(`"${route}"`);
    }
  });

  it("keeps compact auth forms and their primary action in normal document flow", () => {
    const form = source("src/components/auth/auth-form.tsx");
    const pages = [source("src/app/login/page.tsx"), source("src/app/register/page.tsx")].join("\n");

    expect(form).toContain('compact ? "space-y-3" : "space-y-4"');
    expect(form).toContain('className="min-h-11 w-full"');
    expect(form).toContain('role="alert"');
    expect(`${form}\n${pages}`).not.toMatch(/\bfixed\b|\bsticky\b/);
  });
});

describe("marketing consent migration", () => {
  const migration = source("supabase/migrations/202608250020_auth_consent.sql");

  it("defaults email and SMS consent to false", () => {
    expect(migration).toMatch(/marketing_email_opt_in boolean not null default false/);
    expect(migration).toMatch(/marketing_sms_opt_in boolean not null default false/);
  });

  it("creates timestamps only after affirmative consent", () => {
    expect(migration).toContain("case when email_marketing_consent then timezone('utc', now()) else null end");
    expect(migration).toContain("case when sms_marketing_consent then timezone('utc', now()) else null end");
    expect(migration).toContain("marketing_email_opt_in or marketing_email_opt_in_at is null");
    expect(migration).toContain("marketing_sms_opt_in or marketing_sms_opt_in_at is null");
  });

  it("keeps one canonical profile and does not overwrite it on later provider logins", () => {
    expect(migration).toContain("new.id");
    expect(migration).toContain("on conflict (id) do nothing");
    expect(migration).toContain("values (new.id, 'student')");
  });
});

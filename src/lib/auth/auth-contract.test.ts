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

  it("uses a dedicated verification callback and bounded pending-tab detection", () => {
    const actions = source("src/app/auth/actions.ts");
    const form = source("src/components/auth/auth-form.tsx");
    const monitor = source("src/lib/auth/verification-monitor.ts");
    expect(actions).toContain('getAuthCallbackUrl("email_verification")');
    expect(actions).toContain("Confirm your email to finish creating your account.");
    expect(form).toContain("maskEmailAddress(email)");
    expect(form).toContain("Resend available in ${cooldown}s");
    expect(form).toContain("Already confirmed on another device?");
    expect(form).toContain('onTimeout: () => setVerificationState("timed_out")');
    expect(form).toContain('router.replace("/dashboard")');
    expect(form).not.toContain("useMemo(() => createSupabaseBrowserClient()");
    expect(form).not.toContain("router.refresh()");
    expect(monitor).toContain('addEventListener("focus"');
    expect(monitor).toContain('addEventListener("visibilitychange"');
    expect(monitor).toContain("VERIFICATION_POLL_INTERVAL_MS = 8_000");
    expect(monitor).toContain("VERIFICATION_MAX_POLLS = 15");
    expect(monitor).toContain("onTimeout()");
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
    expect(pages).toContain("availability.google || availability.phone");
  });

  it("uses Supabase provider APIs without custom token storage or token telemetry", () => {
    const google = source("src/app/auth/google/route.ts");
    const actions = source("src/app/auth/actions.ts");
    expect(google).toContain("signInWithOAuth");
    expect(actions).toContain("signInWithOtp");
    expect(actions).toContain("verifyOtp");
    expect(`${google}\n${actions}`).not.toMatch(/localStorage|provider_token|access_token|refresh_token/);
  });

  it("keeps every protected learning route behind the existing proxy", () => {
    const proxy = source("src/proxy.ts");
    for (const route of ["/dashboard", "/practice", "/tests", "/progress", "/results", "/onboarding"]) {
      expect(proxy).toContain(`"${route}"`);
    }
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

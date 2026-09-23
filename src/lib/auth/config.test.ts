import { afterEach, describe, expect, it, vi } from "vitest";

describe("authentication URL configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("pins production callbacks and application destinations to the canonical domain", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://prep-dmat.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");

    const { getAuthCallbackUrl, getApplicationUrl } = await import("./config");
    const callback = new URL(getAuthCallbackUrl("email_verification"));

    expect(callback.origin).toBe("https://prepdmat.in");
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("flow")).toBe("email_verification");
    expect(callback.toString()).not.toContain("localhost");
    expect(getApplicationUrl("/login").toString()).toBe("https://prepdmat.in/login");
    expect(getApplicationUrl("/dashboard").toString()).toBe("https://prepdmat.in/dashboard");
  });

  it("keeps the configured localhost callback in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");

    const { getAuthCallbackUrl, getApplicationUrl } = await import("./config");
    expect(getAuthCallbackUrl("email_verification")).toBe("http://localhost:3000/auth/callback?flow=email_verification");
    expect(getApplicationUrl("/dashboard").toString()).toBe("http://localhost:3000/dashboard");
  });

  it("uses an explicitly configured trusted preview origin only in preview deployments", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://preview.prepdmat.in");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");

    const { getAuthCallbackUrl } = await import("./config");
    expect(getAuthCallbackUrl()).toBe("https://preview.prepdmat.in/auth/callback?flow=authentication");
  });
});

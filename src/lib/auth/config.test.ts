import { afterEach, describe, expect, it, vi } from "vitest";

describe("authentication URL configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("builds production verification callbacks from the application URL, never localhost", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://prep-dmat.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");

    const { getAuthCallbackUrl } = await import("./config");
    const callback = new URL(getAuthCallbackUrl("email_verification"));

    expect(callback.origin).toBe("https://prep-dmat.vercel.app");
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("flow")).toBe("email_verification");
    expect(callback.toString()).not.toContain("localhost");
  });
});


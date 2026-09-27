import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  availability: { google: true, phone: false },
  createServerClient: vi.fn(),
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  getApplicationUrl: (path: string) => new URL(path, "https://prepdmat.in"),
  getAuthCallbackUrl: (flow = "authentication", next?: string | null) => {
    const url = new URL("/auth/callback", "https://prepdmat.in");
    url.searchParams.set("flow", flow);
    if (next) url.searchParams.set("next", next);
    return url.toString();
  },
  getAuthProviderAvailability: () => mocks.availability,
}));
vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, enforceSecurityRateLimit: mocks.enforceRateLimit };
});
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServerClient,
}));

import { GET } from "./route";

function destination(response: Response) {
  return new URL(response.headers.get("location") ?? "https://invalid.test");
}

function request(query = "") {
  return new NextRequest(`https://prepdmat.in/auth/google${query}`);
}

describe("Google OAuth entry route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.availability.google = true;
    mocks.enforceRateLimit.mockResolvedValue(undefined);
  });

  it("uses Supabase OAuth with only the fixed application callback", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/auth?state=provider-owned" },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue({ auth: { signInWithOAuth } });

    const response = await GET(request());

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("auth:google");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://prepdmat.in/auth/callback?flow=authentication",
      },
    });
    expect(destination(response).origin).toBe("https://accounts.google.com");
  });

  it("does not start OAuth when the feature is disabled", async () => {
    mocks.availability.google = false;

    const response = await GET(request());

    expect(destination(response).pathname).toBe("/login");
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("maps provider startup failures to a safe internal error", async () => {
    mocks.createServerClient.mockResolvedValue({
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: null },
          error: { message: "provider internals" },
        }),
      },
    });

    const response = await GET(request());
    const url = destination(response);

    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("error")).toBe("google_start");
    expect(url.toString()).not.toContain("provider internals");
  });

  it("contains provider or network exceptions", async () => {
    mocks.createServerClient.mockRejectedValue(new Error("provider internals"));

    const response = await GET(request());
    const url = destination(response);

    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("error")).toBe("google_unavailable");
    expect(url.toString()).not.toContain("provider internals");
  });

  it("carries a validated local return destination through the OAuth callback", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/auth?state=provider-owned" },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue({ auth: { signInWithOAuth } });

    await GET(request("?next=%2Ffeedback%3Fsource%3Demail"));

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://prepdmat.in/auth/callback?flow=authentication&next=%2Ffeedback%3Fsource%3Demail",
      },
    });
  });

  it("drops an external return destination before starting OAuth", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { url: "https://accounts.google.com/o/oauth2/auth?state=provider-owned" },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue({ auth: { signInWithOAuth } });

    await GET(request("?next=https%3A%2F%2Fevil.example"));

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://prepdmat.in/auth/callback?flow=authentication" },
    });
  });
});

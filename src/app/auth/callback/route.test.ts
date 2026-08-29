import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getPostAuthRoute: vi.fn(),
  claimPublicDiagnostic: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  getApplicationUrl: (path: string) => new URL(path, "https://prep-dmat.vercel.app"),
}));
vi.mock("@/lib/auth/post-auth", () => ({ getPostAuthRoute: mocks.getPostAuthRoute }));
vi.mock("@/lib/onboarding/public-diagnostic", () => ({
  claimPublicDiagnosticForUser: mocks.claimPublicDiagnostic,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServerClient,
}));

import { GET } from "./route";

function client() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      exchangeCodeForSession: vi.fn(),
      verifyOtp: vi.fn(),
    },
  };
}

function request(query = "") {
  return new NextRequest(`https://prep-dmat.vercel.app/auth/callback${query}`);
}

function destination(response: Response) {
  return new URL(response.headers.get("location") ?? "https://invalid.test");
}

describe("email verification callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPostAuthRoute.mockResolvedValue("/dashboard");
    mocks.claimPublicDiagnostic.mockResolvedValue(false);
  });

  it("exchanges a valid email-verification PKCE code exactly once and reaches dashboard", async () => {
    const supabase = client();
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "verified-user" }, session: { access_token: "not-exposed" } },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(request("?flow=email_verification&code=one-time-code"));

    expect(destination(response).pathname).toBe("/dashboard");
    expect(mocks.claimPublicDiagnostic).toHaveBeenCalledWith("verified-user");
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("verifies a supported token hash exactly once and establishes the dashboard session", async () => {
    const supabase = client();
    supabase.auth.verifyOtp.mockResolvedValue({
      data: { user: { id: "verified-user" }, session: { access_token: "not-exposed" } },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(
      request("?flow=email_verification&type=email&token_hash=one-time-token-hash"),
    );

    expect(destination(response).pathname).toBe("/dashboard");
    expect(supabase.auth.verifyOtp).toHaveBeenCalledOnce();
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      type: "email",
      token_hash: "one-time-token-hash",
    });
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("does not consume an already-used link when a valid session already exists", async () => {
    const supabase = client();
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "already-signed-in" } },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(
      request("?flow=email_verification&type=email&token_hash=already-used"),
    );

    expect(destination(response).pathname).toBe("/dashboard");
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("shows recovery only when a token hash genuinely cannot establish a session", async () => {
    const supabase = client();
    supabase.auth.verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "otp_expired", message: "raw provider detail" },
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(
      request("?flow=email_verification&type=email&token_hash=expired"),
    );
    const url = destination(response);

    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("verification")).toBe("expired");
    expect(url.toString()).not.toContain("raw provider detail");
  });

  it("handles a parameterless unauthenticated callback without exchanging anything", async () => {
    const supabase = client();
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(request());

    expect(destination(response).searchParams.get("verification")).toBe("expired");
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("maps an OAuth consent cancellation to a concise safe login outcome", async () => {
    const supabase = client();
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(request("?error=access_denied&error_description=raw-provider-detail"));
    const url = destination(response);

    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("error")).toBe("oauth_cancelled");
    expect(url.toString()).not.toContain("raw-provider-detail");
  });

  it("routes a successful Google exchange through provider-neutral post-auth routing", async () => {
    const supabase = client();
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "new-google-user" }, session: { access_token: "not-exposed" } },
      error: null,
    });
    mocks.getPostAuthRoute.mockResolvedValue("/onboarding");
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(request("?flow=authentication&code=valid-google-code"));

    expect(destination(response).pathname).toBe("/onboarding");
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(mocks.getPostAuthRoute).toHaveBeenCalledWith("new-google-user");
  });

  it("maps temporary OAuth provider failures without exposing provider details", async () => {
    const supabase = client();
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(request("?error=server_error&error_description=raw-provider-detail"));
    const url = destination(response);

    expect(url.searchParams.get("error")).toBe("google_unavailable");
    expect(url.toString()).not.toContain("raw-provider-detail");
  });

  it("rejects oversized callback credentials before creating a provider client", async () => {
    const response = await GET(request(`?code=${"x".repeat(4097)}`));

    expect(destination(response).searchParams.get("verification")).toBe("expired");
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("rejects external redirect input and always uses a centralized internal destination", async () => {
    const supabase = client();
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: "verified-user" }, session: {} },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(
      request("?flow=email_verification&code=valid&next=https://evil.example/steal"),
    );

    expect(destination(response).toString()).toBe("https://prep-dmat.vercel.app/dashboard");
  });

  it("distinguishes confirmed email with unavailable PKCE session from an expired link", async () => {
    const supabase = client();
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "flow_state_not_found", message: "PKCE verifier missing" },
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(request("?flow=email_verification&code=confirmed-code"));
    const url = destination(response);

    expect(url.searchParams.get("verification")).toBe("session_required");
    expect(url.searchParams.get("verification")).not.toBe("expired");
    expect(url.toString()).not.toContain("PKCE");
  });

  it("does not claim verification succeeded for an arbitrary invalid code", async () => {
    const supabase = client();
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "validation_failed", status: 400, message: "invalid code" },
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(request("?flow=email_verification&code=forged-or-invalid"));

    expect(destination(response).searchParams.get("verification")).toBe("expired");
  });

  it("turns a stale Google PKCE verifier into an explicit retry outcome", async () => {
    const supabase = client();
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: "flow_state_not_found", message: "PKCE verifier missing" },
    });
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(request("?flow=authentication&code=stale-google-code"));
    const url = destination(response);

    expect(url.searchParams.get("error")).toBe("google_expired");
    expect(url.toString()).not.toContain("PKCE");
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledOnce();
  });

  it("routes a refreshed successful Google callback from its existing session", async () => {
    const supabase = client();
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "returning-google-user" } },
      error: null,
    });
    mocks.getPostAuthRoute.mockResolvedValue("/dashboard");
    mocks.createServerClient.mockResolvedValue(supabase);

    const response = await GET(request("?flow=authentication&code=already-consumed"));

    expect(destination(response).pathname).toBe("/dashboard");
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.getPostAuthRoute).toHaveBeenCalledWith("returning-google-user");
  });
});

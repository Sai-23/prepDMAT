import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getPostAuthRoute: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  getApplicationUrl: (path: string) => new URL(path, "https://prep-dmat.vercel.app"),
}));
vi.mock("@/lib/auth/post-auth", () => ({ getPostAuthRoute: mocks.getPostAuthRoute }));
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
});

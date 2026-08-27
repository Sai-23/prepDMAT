import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  createServerClient: vi.fn(),
  getPostAuthRoute: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/post-auth", () => ({ getPostAuthRoute: mocks.getPostAuthRoute }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));
vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, enforceSecurityRateLimit: mocks.enforceRateLimit };
});

import { loginAction, type AuthActionState } from "./actions";
import {
  RateLimitExceededError,
  SecurityControlUnavailableError,
} from "@/lib/security/rate-limit";

const idle: AuthActionState = { status: "idle" };

function credentials() {
  const formData = new FormData();
  formData.set("email", "student@example.test");
  formData.set("password", "correct-password");
  return formData;
}

function authClient(response: unknown) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue(response),
    },
  };
}

describe("loginAction security regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.getPostAuthRoute.mockResolvedValue("/dashboard");
  });

  it("rate-limits before authenticating, then redirects a successful login", async () => {
    const client = authClient({
      data: { user: { id: "student-id" }, session: { access_token: "not-exposed" } },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue(client);

    await loginAction(idle, credentials());

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("auth:login", {
      account: "student@example.test",
    });
    expect(mocks.enforceRateLimit.mock.invocationCallOrder[0]).toBeLessThan(
      client.auth.signInWithPassword.mock.invocationCallOrder[0],
    );
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "student@example.test",
      password: "correct-password",
    });
    expect(mocks.getPostAuthRoute).toHaveBeenCalledWith("student-id");
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it.each([
    ["wrong password", "invalid_credentials"],
    ["unknown account", "user_not_found"],
  ])("maps %s to the same safe invalid-credentials response", async (_case, code) => {
    mocks.createServerClient.mockResolvedValue(authClient({
      data: { user: null, session: null },
      error: { status: 400, code, message: "raw provider detail" },
    }));

    const result = await loginAction(idle, credentials());

    expect(result).toEqual({
      status: "error",
      code: "INVALID_CREDENTIALS",
      message: "Email or password is incorrect.",
    });
    expect(JSON.stringify(result)).not.toContain("raw provider detail");
  });

  it("maps an unverified account without exposing provider details", async () => {
    mocks.createServerClient.mockResolvedValue(authClient({
      data: { user: null, session: null },
      error: { status: 400, code: "email_not_confirmed", message: "internal detail" },
    }));

    const result = await loginAction(idle, credentials());

    expect(result).toEqual({
      status: "error",
      code: "EMAIL_NOT_VERIFIED",
      message: "Confirm your email before signing in.",
    });
    expect(JSON.stringify(result)).not.toContain("internal detail");
  });

  it("returns RATE_LIMITED without calling Supabase Auth", async () => {
    mocks.enforceRateLimit.mockRejectedValue(new RateLimitExceededError(47));

    const result = await loginAction(idle, credentials());

    expect(result).toEqual({
      status: "error",
      code: "RATE_LIMITED",
      message: "Too many attempts. Wait before trying again.",
      retryAfterSeconds: 47,
    });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("fails closed when the limiter database contract is unavailable", async () => {
    mocks.enforceRateLimit.mockRejectedValue(new SecurityControlUnavailableError());

    const result = await loginAction(idle, credentials());

    expect(result).toEqual({
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "This action is temporarily unavailable. Try again shortly.",
    });
    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/postgres|rpc|sql|security_rate_limits/i);
  });

  it("maps a Supabase service failure to a safe temporary response", async () => {
    mocks.createServerClient.mockResolvedValue(authClient({
      data: { user: null, session: null },
      error: { status: 503, code: "unexpected_failure", message: "upstream internals" },
    }));

    const result = await loginAction(idle, credentials());

    expect(result).toEqual({
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "The authentication service is temporarily unavailable. Try again shortly.",
    });
    expect(JSON.stringify(result)).not.toContain("upstream internals");
  });

  it("contains a thrown provider/network failure and logs only a sanitized stage", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const client = authClient(null);
    client.auth.signInWithPassword.mockRejectedValue(new Error("socket and credential detail"));
    mocks.createServerClient.mockResolvedValue(client);

    const result = await loginAction(idle, credentials());

    expect(result).toEqual({
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "This action is temporarily unavailable. Try again shortly.",
    });
    expect(errorSpy).toHaveBeenCalledWith("[auth.login] failed", {
      stage: "provider",
      reason: "provider_request_failed",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("socket and credential detail");
    errorSpy.mockRestore();
  });
});


import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
  getPostAuthRoute: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  getAuthCallbackUrl: vi.fn(),
  providerAvailability: { google: false, phone: false },
  claimPublicDiagnostic: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/post-auth", () => ({ getPostAuthRoute: mocks.getPostAuthRoute }));
vi.mock("@/lib/auth/config", () => ({
  getAuthCallbackUrl: mocks.getAuthCallbackUrl,
  getAuthProviderAvailability: () => mocks.providerAvailability,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/onboarding/public-diagnostic", () => ({
  claimPublicDiagnosticForUser: mocks.claimPublicDiagnostic,
}));
vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return { ...actual, enforceSecurityRateLimit: mocks.enforceRateLimit };
});

import {
  loginAction,
  googleSignInAction,
  registerAction,
  requestPhoneOtpAction,
  resendVerificationAction,
  saveMarketingPreferencesAction,
  verifyRegistrationEmailOtpAction,
  verifyPhoneOtpAction,
  type AuthActionState,
} from "./actions";
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
    mocks.providerAvailability.google = false;
    mocks.providerAvailability.phone = false;
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.getPostAuthRoute.mockResolvedValue("/dashboard");
    mocks.claimPublicDiagnostic.mockResolvedValue(false);
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
    expect(mocks.claimPublicDiagnostic).toHaveBeenCalledWith("student-id");
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
      view: "verify_email",
      email: "student@example.test",
      message: "Your email still needs verification.",
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

describe("email signup verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.providerAvailability.google = false;
    mocks.providerAvailability.phone = false;
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.getAuthCallbackUrl.mockImplementation(
      (flow: string) => `https://prep-dmat.vercel.app/auth/callback?flow=${flow}`,
    );
    mocks.getPostAuthRoute.mockResolvedValue("/dashboard");
    mocks.claimPublicDiagnostic.mockResolvedValue(false);
  });

  it("creates a pending signup with the dedicated production verification callback", async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: "pending-user" }, session: null },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue({ auth: { signUp } });
    const formData = new FormData();
    formData.set("email", "student@example.test");
    formData.set("password", "password1");
    formData.set("confirmPassword", "password1");

    const result = await registerAction(idle, formData);

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("auth:signup", {
      account: "student@example.test",
    });
    expect(mocks.getAuthCallbackUrl).toHaveBeenCalledWith("email_verification");
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: {
          marketing_email_opt_in: false,
        },
        emailRedirectTo:
          "https://prep-dmat.vercel.app/auth/callback?flow=email_verification",
      }),
    }));
    expect(result).toEqual(expect.objectContaining({
      status: "success",
      view: "verify_email",
      email: "student@example.test",
    }));
  });

  it("forwards marketing consent only when the student opts in", async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: "pending-user" }, session: null },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue({ auth: { signUp } });
    const formData = new FormData();
    formData.set("email", "student@example.test");
    formData.set("password", "password1");
    formData.set("confirmPassword", "password1");
    formData.set("marketingEmailOptIn", "on");

    await registerAction(idle, formData);

    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        data: { marketing_email_opt_in: true },
      }),
    }));
  });

  it("routes a confirmed existing account only after valid credentials prove ownership", async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: "ambiguous-user" }, session: null },
      error: null,
    });
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: "existing-user" }, session: { access_token: "not-exposed" } },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue({ auth: { signUp, signInWithPassword } });
    const formData = new FormData();
    formData.set("email", "student@example.test");
    formData.set("password", "password1");
    formData.set("confirmPassword", "password1");

    await registerAction(idle, formData);

    expect(mocks.enforceRateLimit).toHaveBeenNthCalledWith(1, "auth:signup", {
      account: "student@example.test",
    });
    expect(mocks.enforceRateLimit).toHaveBeenNthCalledWith(2, "auth:login", {
      account: "student@example.test",
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "student@example.test",
      password: "password1",
    });
    expect(mocks.claimPublicDiagnostic).toHaveBeenCalledWith("existing-user");
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps invalid and unconfirmed duplicate signups on the same generic OTP view", async () => {
    for (const code of ["invalid_credentials", "email_not_confirmed"]) {
      vi.clearAllMocks();
      mocks.enforceRateLimit.mockResolvedValue(undefined);
      const signUp = vi.fn().mockResolvedValue({
        data: { user: { id: "ambiguous-user" }, session: null },
        error: null,
      });
      const signInWithPassword = vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { status: 400, code, message: "provider detail" },
      });
      mocks.createServerClient.mockResolvedValue({ auth: { signUp, signInWithPassword } });
      const formData = new FormData();
      formData.set("email", "student@example.test");
      formData.set("password", "password1");
      formData.set("confirmPassword", "password1");

      const result = await registerAction(idle, formData);

      expect(result).toEqual(expect.objectContaining({
        status: "success",
        view: "verify_email",
        email: "student@example.test",
      }));
      expect(JSON.stringify(result)).not.toContain(code);
      expect(mocks.redirect).not.toHaveBeenCalled();
    }
  });

  it("resends through the same callback and returns a 60-second client cooldown", async () => {
    const resend = vi.fn().mockResolvedValue({ data: {}, error: null });
    mocks.createServerClient.mockResolvedValue({ auth: { resend } });
    const formData = new FormData();
    formData.set("email", "student@example.test");

    const result = await resendVerificationAction(idle, formData);

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("auth:resend", {
      account: "student@example.test",
    });
    expect(resend).toHaveBeenCalledWith(expect.objectContaining({
      type: "signup",
      options: {
        emailRedirectTo:
          "https://prep-dmat.vercel.app/auth/callback?flow=email_verification",
      },
    }));
    expect(result).toEqual({
      status: "success",
      retryAfterSeconds: 60,
      message: "If this address has a pending account, a verification code is on its way.",
    });
  });

  it("does not reveal whether a resend address has a pending account", async () => {
    const resend = vi.fn().mockResolvedValue({
      data: {},
      error: { status: 400, code: "user_not_found", message: "raw provider detail" },
    });
    mocks.createServerClient.mockResolvedValue({ auth: { resend } });
    const formData = new FormData();
    formData.set("email", "unknown@example.test");

    const result = await resendVerificationAction(idle, formData);

    expect(result).toEqual({
      status: "success",
      retryAfterSeconds: 60,
      message: "If this address has a pending account, a verification code is on its way.",
    });
    expect(JSON.stringify(result)).not.toMatch(/user.not.found|raw provider/i);
  });

  it("verifies the signup OTP through Supabase, requires a session, and routes the student", async () => {
    mocks.getPostAuthRoute.mockResolvedValue("/onboarding");
    mocks.claimPublicDiagnostic.mockResolvedValue(false);
    const verifyOtp = vi.fn().mockResolvedValue({
      data: { user: { id: "verified-user" }, session: { access_token: "not-exposed" } },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue({ auth: { verifyOtp } });
    const formData = new FormData();
    formData.set("email", "student@example.test");
    formData.set("token", "123456");

    await verifyRegistrationEmailOtpAction(idle, formData);

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("auth:email-verify", {
      account: "student@example.test",
    });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "student@example.test",
      token: "123456",
      type: "signup",
    });
    expect(mocks.getPostAuthRoute).toHaveBeenCalledWith("verified-user");
    expect(mocks.redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("rejects invalid or expired signup OTPs without exposing provider details", async () => {
    mocks.createServerClient.mockResolvedValue({
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { status: 400, code: "otp_expired", message: "raw provider detail" },
        }),
      },
    });
    const formData = new FormData();
    formData.set("email", "student@example.test");
    formData.set("token", "123456");

    const result = await verifyRegistrationEmailOtpAction(idle, formData);

    expect(result).toEqual({
      status: "error",
      message: "The code is invalid or expired. Request a new code and try again.",
    });
    expect(JSON.stringify(result)).not.toContain("raw provider detail");
  });

  it("does not authenticate when OTP verification returns no authoritative session", async () => {
    mocks.createServerClient.mockResolvedValue({
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: { id: "unverified-user" }, session: null },
          error: null,
        }),
      },
    });
    const formData = new FormData();
    formData.set("email", "student@example.test");
    formData.set("token", "123456");

    const result = await verifyRegistrationEmailOtpAction(idle, formData);

    expect(result.status).toBe("error");
    expect(mocks.getPostAuthRoute).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects malformed or oversized OTPs before the limiter and provider", async () => {
    for (const token of ["12345", "1234567", "12345x"]) {
      vi.clearAllMocks();
      const formData = new FormData();
      formData.set("email", "student@example.test");
      formData.set("token", token);

      const result = await verifyRegistrationEmailOtpAction(idle, formData);

      expect(result.status).toBe("error");
      expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
      expect(mocks.createServerClient).not.toHaveBeenCalled();
    }
  });
});

describe("optional auth providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.providerAvailability.google = false;
    mocks.providerAvailability.phone = false;
    mocks.enforceRateLimit.mockResolvedValue(undefined);
    mocks.getPostAuthRoute.mockResolvedValue("/onboarding");
  });

  it("uses the fixed Google entry route when the feature is enabled", async () => {
    mocks.providerAvailability.google = true;

    await googleSignInAction(idle, new FormData());

    expect(mocks.redirect).toHaveBeenCalledWith("/auth/google");
  });

  it("normalizes phone input on the server before rate limiting and sending", async () => {
    mocks.providerAvailability.phone = true;
    const signInWithOtp = vi.fn().mockResolvedValue({ data: {}, error: null });
    mocks.createServerClient.mockResolvedValue({ auth: { signInWithOtp } });
    const formData = new FormData();
    formData.set("countryCode", "+91");
    formData.set("phone", "98765 43210");

    const result = await requestPhoneOtpAction(idle, formData);

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("auth:phone-request", {
      account: "+919876543210",
    });
    expect(signInWithOtp).toHaveBeenCalledWith({
      phone: "+919876543210",
      options: {
        shouldCreateUser: true,
        data: {
          marketing_email_opt_in: false,
          marketing_sms_opt_in: false,
        },
      },
    });
    expect(result).toEqual(expect.objectContaining({
      status: "success",
      view: "phone_code",
      phone: "+919876543210",
      retryAfterSeconds: 60,
    }));
  });

  it("rejects malformed phone input before the limiter or provider", async () => {
    mocks.providerAvailability.phone = true;
    const formData = new FormData();
    formData.set("countryCode", "+91");
    formData.set("phone", "123");

    const result = await requestPhoneOtpAction(idle, formData);

    expect(result.status).toBe("error");
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("verifies a bounded OTP through Supabase and uses shared onboarding routing", async () => {
    mocks.providerAvailability.phone = true;
    const verifyOtp = vi.fn().mockResolvedValue({
      data: { user: { id: "phone-user" }, session: { access_token: "not-exposed" } },
      error: null,
    });
    mocks.createServerClient.mockResolvedValue({ auth: { verifyOtp } });
    const formData = new FormData();
    formData.set("phone", "+919876543210");
    formData.set("token", "123456");

    await verifyPhoneOtpAction(idle, formData);

    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("auth:phone-verify", {
      account: "+919876543210",
    });
    expect(verifyOtp).toHaveBeenCalledWith({
      phone: "+919876543210",
      token: "123456",
      type: "sms",
    });
    expect(mocks.getPostAuthRoute).toHaveBeenCalledWith("phone-user");
    expect(mocks.redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("returns one safe response for invalid or expired provider OTP failures", async () => {
    mocks.providerAvailability.phone = true;
    mocks.createServerClient.mockResolvedValue({
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { status: 400, code: "otp_expired", message: "provider internals" },
        }),
      },
    });
    const formData = new FormData();
    formData.set("phone", "+919876543210");
    formData.set("token", "123456");

    const result = await verifyPhoneOtpAction(idle, formData);

    expect(result).toEqual({
      status: "error",
      message: "The code is invalid or expired. Request a new code and try again.",
    });
    expect(JSON.stringify(result)).not.toContain("provider internals");
  });
});

describe("marketing preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates email consent without overwriting dormant SMS consent fields", async () => {
    mocks.createServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "student-id" } } }),
      },
    });
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ update }),
    });
    const formData = new FormData();
    formData.set("marketingEmailOptIn", "on");
    formData.set("marketingSmsOptIn", "on");

    const result = await saveMarketingPreferencesAction(idle, formData);

    expect(update).toHaveBeenCalledWith({
      marketing_email_opt_in: true,
      marketing_email_opt_in_at: expect.any(String),
      marketing_consent_version: "auth-consent-v1",
    });
    expect(eq).toHaveBeenCalledWith("id", "student-id");
    expect(result).toEqual({
      status: "success",
      message: "Marketing preferences updated.",
    });
  });
});

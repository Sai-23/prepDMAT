"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthCallbackUrl, getAuthProviderAvailability } from "@/lib/auth/config";
import { getPostAuthRoute } from "@/lib/auth/post-auth";
import {
  forgotPasswordSchema,
  emailVerificationOtpSchema,
  loginSchema,
  normalizePhoneNumber,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} from "@/lib/auth/schemas";
import {
  enforceSecurityRateLimit,
  rateLimitActionState,
} from "@/lib/security/rate-limit";
import type { PublicActionErrorCode } from "@/lib/security/public-errors";
import { claimPublicDiagnosticForUser } from "@/lib/onboarding/public-diagnostic";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isThemePreference, type ThemePreference } from "@/lib/theme";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[] | undefined>;
  view?: "verify_email" | "phone_code";
  email?: string;
  phone?: string;
  retryAfterSeconds?: number;
  code?: PublicActionErrorCode;
};

function validationError(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): AuthActionState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    errors: error.flatten().fieldErrors,
  };
}

function providerErrorMessage(error: { status?: number; code?: string } | null, fallback: string) {
  if (error?.status === 429 || error?.code === "over_request_rate_limit") {
    return "Too many attempts. Wait a little before trying again.";
  }
  if (error?.status && error.status >= 500) {
    return "The authentication service is temporarily unavailable. Try again shortly.";
  }
  return fallback;
}

function loginProviderErrorState(
  error: { status?: number; code?: string } | null,
  email: string,
): AuthActionState {
  if (error?.code === "email_not_confirmed") {
    return {
      status: "error",
      code: "EMAIL_NOT_VERIFIED",
      view: "verify_email",
      email,
      message: "Your email still needs verification.",
    };
  }
  if (error?.status === 429 || error?.code === "over_request_rate_limit") {
    return {
      status: "error",
      code: "RATE_LIMITED",
      message: "Too many attempts. Wait a little before trying again.",
    };
  }
  if (error?.status && error.status >= 500) {
    return {
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "The authentication service is temporarily unavailable. Try again shortly.",
    };
  }
  return {
    status: "error",
    code: "INVALID_CREDENTIALS",
    message: "Email or password is incorrect.",
  };
}

function loginUnavailable(stage: "client" | "provider" | "post_auth_route", reason: string) {
  console.error("[auth.login] failed", { stage, reason });
  return {
    status: "error" as const,
    code: "TEMPORARILY_UNAVAILABLE" as const,
    message: "This action is temporarily unavailable. Try again shortly.",
  };
}

async function claimPublicDiagnosticIfPresent(userId: string) {
  try {
    await claimPublicDiagnosticForUser(userId);
  } catch {
    // Authentication remains usable if the optional acquisition-session claim
    // is temporarily unavailable. The HttpOnly cookie is retained for retry.
    console.error("[auth.public_diagnostic_claim] failed", { stage: "post_auth" });
  }
}

export async function loginAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!result.success) return validationError(result.error);

  try {
    await enforceSecurityRateLimit("auth:login", { account: result.data.email });
  } catch (error) {
    return rateLimitActionState(error);
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return loginUnavailable("client", "server_client_unavailable");
  }

  let authenticatedUserId: string;
  try {
    const { data, error } = await supabase.auth.signInWithPassword(result.data);
    if (error) return loginProviderErrorState(error, result.data.email);
    if (!data.user) return loginUnavailable("provider", "invalid_provider_response");
    authenticatedUserId = data.user.id;
  } catch {
    return loginUnavailable("provider", "provider_request_failed");
  }

  let destination: Awaited<ReturnType<typeof getPostAuthRoute>>;
  try {
    await claimPublicDiagnosticIfPresent(authenticatedUserId);
    destination = await getPostAuthRoute(authenticatedUserId);
  } catch {
    return loginUnavailable("post_auth_route", "profile_route_unavailable");
  }
  revalidatePath("/", "layout");
  redirect(destination);
}

export async function registerAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    marketingEmailOptIn: formData.get("marketingEmailOptIn") === "on",
  });
  if (!result.success) return validationError(result.error);

  try {
    await enforceSecurityRateLimit("auth:signup", { account: result.data.email });
  } catch (error) {
    return rateLimitActionState(error);
  }

  let data: { user: { id: string } | null; session: unknown | null };
  let error: { status?: number; code?: string } | null;
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
    const signupResult = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          marketing_email_opt_in: result.data.marketingEmailOptIn,
        },
        emailRedirectTo: getAuthCallbackUrl("email_verification"),
      },
    });
    data = signupResult.data;
    error = signupResult.error;
  } catch {
    return {
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "The authentication service is temporarily unavailable. Try again shortly.",
    };
  }

  if (error) {
    return {
      status: "error",
      message: providerErrorMessage(
        error,
        "We could not create the account. Check the details or try signing in.",
      ),
    };
  }

  if (data.session && data.user) {
    await claimPublicDiagnosticIfPresent(data.user.id);
    revalidatePath("/", "layout");
    redirect(await getPostAuthRoute(data.user.id));
  }

  // Supabase deliberately makes duplicate signups ambiguous. A password sign-in
  // under the normal login limiter safely distinguishes only a caller who has
  // proved valid credentials; all other outcomes keep the same verification UI.
  let existingUserId: string | null = null;
  try {
    await enforceSecurityRateLimit("auth:login", { account: result.data.email });
    const existing = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });
    if (!existing.error && existing.data.user && existing.data.session) {
      existingUserId = existing.data.user.id;
    }
  } catch {
    // Rate-limit, unconfirmed-account, invalid-credential, and provider failures
    // remain deliberately indistinguishable at the registration boundary.
  }
  if (existingUserId) {
    await claimPublicDiagnosticIfPresent(existingUserId);
    revalidatePath("/", "layout");
    redirect(await getPostAuthRoute(existingUserId));
  }

  return {
    status: "success",
    view: "verify_email",
    email: result.data.email,
    message: "Enter the 6-digit code sent to your email.",
  };
}

export async function verifyRegistrationEmailOtpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = emailVerificationOtpSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });
  if (!result.success) return validationError(result.error);

  try {
    await enforceSecurityRateLimit("auth:email-verify", { account: result.data.email });
  } catch (error) {
    return rateLimitActionState(error);
  }

  let authenticatedUserId: string;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: result.data.email,
      token: result.data.token,
      type: "signup",
    });

    if (error || !data.user || !data.session) {
      return {
        status: "error",
        message: providerErrorMessage(
          error,
          "The code is invalid or expired. Request a new code and try again.",
        ),
      };
    }
    authenticatedUserId = data.user.id;
  } catch {
    return {
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "The authentication service is temporarily unavailable. Try again shortly.",
    };
  }

  await claimPublicDiagnosticIfPresent(authenticatedUserId);
  revalidatePath("/", "layout");
  redirect(await getPostAuthRoute(authenticatedUserId));
}

export async function resendVerificationAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = resendVerificationSchema.safeParse({ email: formData.get("email") });
  if (!result.success) return validationError(result.error);

  try {
    await enforceSecurityRateLimit("auth:resend", { account: result.data.email });
  } catch (error) {
    return rateLimitActionState(error);
  }

  let error: { status?: number; code?: string } | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const resendResult = await supabase.auth.resend({
      type: "signup",
      email: result.data.email,
      options: { emailRedirectTo: getAuthCallbackUrl("email_verification") },
    });
    error = resendResult.error;
  } catch {
    return {
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "The authentication service is temporarily unavailable. Try again shortly.",
    };
  }

  if (error?.status === 429 || error?.code === "over_request_rate_limit") {
    return {
      status: "error",
      code: "RATE_LIMITED",
      message: "Too many attempts. Wait a little before trying again.",
    };
  }
  if (error?.status && error.status >= 500) {
    return {
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "The authentication service is temporarily unavailable. Try again shortly.",
    };
  }

  // Account-specific 4xx responses are deliberately indistinguishable from a
  // successful provider request so this endpoint cannot enumerate signups.
  return {
    status: "success",
    retryAfterSeconds: 60,
    message: "If this address has a pending account, a verification code is on its way.",
  };
}

export async function googleSignInAction(
  _state: AuthActionState,
  _formData: FormData,
): Promise<AuthActionState> {
  void _state;
  void _formData;
  if (!getAuthProviderAvailability().google) {
    return { status: "error", message: "Google sign-in is not available right now." };
  }
  redirect("/auth/google");
}

export async function requestPhoneOtpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!getAuthProviderAvailability().phone) {
    return { status: "error", message: "Phone sign-in is not available right now." };
  }

  const result = phoneOtpRequestSchema.safeParse({
    countryCode: formData.get("countryCode"),
    phone: formData.get("phone"),
  });
  if (!result.success) return validationError(result.error);

  const phone = normalizePhoneNumber(result.data.countryCode, result.data.phone);
  if (!phone) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: { phone: ["Enter a valid international phone number."] },
    };
  }

  try {
    await enforceSecurityRateLimit("auth:phone-request", { account: phone });
  } catch (error) {
    return rateLimitActionState(error);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
        data: {
          marketing_email_opt_in: false,
          marketing_sms_opt_in: false,
        },
      },
    });

    if (error) {
      return {
        status: "error",
        message: providerErrorMessage(
          error,
          "We could not send a code. Check the number or try again shortly.",
        ),
      };
    }
  } catch {
    return {
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "The authentication service is temporarily unavailable. Try again shortly.",
    };
  }

  return {
    status: "success",
    view: "phone_code",
    phone,
    retryAfterSeconds: 60,
    message: "Enter the 6-digit code sent to your phone.",
  };
}

export async function verifyPhoneOtpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!getAuthProviderAvailability().phone) {
    return { status: "error", message: "Phone sign-in is not available right now." };
  }

  const result = phoneOtpVerifySchema.safeParse({
    phone: formData.get("phone"),
    token: formData.get("token"),
  });
  if (!result.success) return validationError(result.error);

  try {
    await enforceSecurityRateLimit("auth:phone-verify", { account: result.data.phone });
  } catch (error) {
    return rateLimitActionState(error);
  }

  let authenticatedUserId: string;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: result.data.phone,
      token: result.data.token,
      type: "sms",
    });

    if (error || !data.user || !data.session) {
      return {
        status: "error",
        message: providerErrorMessage(
          error,
          "The code is invalid or expired. Request a new code and try again.",
        ),
      };
    }
    authenticatedUserId = data.user.id;
  } catch {
    return {
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "The authentication service is temporarily unavailable. Try again shortly.",
    };
  }

  await claimPublicDiagnosticIfPresent(authenticatedUserId);
  revalidatePath("/", "layout");
  redirect(await getPostAuthRoute(authenticatedUserId));
}

export async function forgotPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!result.success) return validationError(result.error);

  try {
    await enforceSecurityRateLimit("auth:password-reset", { account: result.data.email });
  } catch (error) {
    return rateLimitActionState(error);
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: getAuthCallbackUrl("recovery"),
  });

  return {
    status: "success",
    message: "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function resetPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!result.success) return validationError(result.error);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: result.data.password });
  if (error) {
    return {
      status: "error",
      message: providerErrorMessage(error, "Unable to update the password. Try again."),
    };
  }

  redirect(await getPostAuthRoute(user.id));
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function saveThemePreferenceAction(
  preference: ThemePreference,
): Promise<{ saved: boolean; error: string | null }> {
  if (!isThemePreference(preference)) {
    return { saved: false, error: "Invalid theme preference." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { saved: false, error: null };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ theme_preference: preference })
    .eq("id", user.id);

  return error
    ? { saved: false, error: "Unable to save the profile theme." }
    : { saved: true, error: null };
}

export async function saveMarketingPreferencesAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to update preferences." };

  const emailOptIn = formData.get("marketingEmailOptIn") === "on";
  const smsOptIn = formData.get("marketingSmsOptIn") === "on";
  const now = new Date().toISOString();
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      marketing_email_opt_in: emailOptIn,
      marketing_email_opt_in_at: emailOptIn ? now : null,
      marketing_sms_opt_in: smsOptIn,
      marketing_sms_opt_in_at: smsOptIn ? now : null,
      marketing_consent_version: emailOptIn || smsOptIn ? "auth-consent-v1" : null,
    })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "Unable to update marketing preferences." };
  }

  revalidatePath("/profile");
  return { status: "success", message: "Marketing preferences updated." };
}

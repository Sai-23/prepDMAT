import { type NextRequest, NextResponse } from "next/server";

import {
  getApplicationUrl,
  type AuthCallbackFlow,
} from "@/lib/auth/config";
import { parseEmailVerificationOtpType } from "@/lib/auth/email-verification";
import { getPostAuthRoute } from "@/lib/auth/post-auth";
import { claimPublicDiagnosticForUser } from "@/lib/onboarding/public-diagnostic";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CallbackClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function parseCallbackFlow(value: string | null): AuthCallbackFlow {
  if (value === "recovery" || value === "email_verification") return value;
  return "authentication";
}

function loginOutcomeUrl(outcome: "expired" | "session_required" | "unavailable") {
  const url = getApplicationUrl("/login");
  if (outcome === "unavailable") {
    url.searchParams.set("error", "auth_unavailable");
  } else {
    url.searchParams.set("verification", outcome);
  }
  return url;
}

function googleFailureUrl(outcome: "expired" | "failed" | "unavailable") {
  const url = getApplicationUrl("/login");
  url.searchParams.set(
    "error",
    outcome === "expired"
      ? "google_expired"
      : outcome === "unavailable"
        ? "google_unavailable"
        : "oauth_failed",
  );
  return url;
}

function oauthFailureUrl(providerError: string, providerErrorCode: string | null) {
  const url = getApplicationUrl("/login");
  const cancelled = providerError === "access_denied" || providerErrorCode === "access_denied";
  const unavailable = providerError === "server_error"
    || providerError === "temporarily_unavailable"
    || providerErrorCode === "server_error"
    || providerErrorCode === "temporarily_unavailable";
  url.searchParams.set(
    "error",
    cancelled ? "oauth_cancelled" : unavailable ? "google_unavailable" : "oauth_failed",
  );
  return url;
}

function codeExchangeFailureOutcome(
  flow: AuthCallbackFlow,
  error: { code?: string; status?: number } | null,
) {
  if (flow !== "email_verification") return "unavailable" as const;
  if (
    error?.code === "pkce_code_verifier_not_found"
    || error?.code === "bad_code_verifier"
    || error?.code === "flow_state_not_found"
    || error?.code === "flow_state_expired"
  ) {
    return "session_required" as const;
  }
  if (error?.status && error.status >= 500) return "unavailable" as const;
  return "expired" as const;
}

function authenticationCodeExchangeFailure(
  error: { code?: string; status?: number } | null,
) {
  if (
    error?.code === "pkce_code_verifier_not_found"
    || error?.code === "bad_code_verifier"
    || error?.code === "flow_state_not_found"
    || error?.code === "flow_state_expired"
  ) {
    return googleFailureUrl("expired");
  }
  if (error?.status && error.status >= 500) return googleFailureUrl("unavailable");
  return googleFailureUrl("failed");
}

async function currentUserId(supabase: CallbackClient) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function authenticatedDestination(flow: AuthCallbackFlow, userId: string) {
  if (flow === "recovery") return getApplicationUrl("/reset-password");
  try {
    await claimPublicDiagnosticForUser(userId);
  } catch {
    // Keep the authenticated session usable and retain the public cookie so a
    // later sign-in can retry the idempotent claim.
    console.error("[auth.public_diagnostic_claim] failed", { stage: "callback" });
  }
  if (flow === "email_verification") return getApplicationUrl("/dashboard");

  try {
    return getApplicationUrl(await getPostAuthRoute(userId));
  } catch {
    // The session is valid even if the profile route lookup is temporarily unavailable.
    return getApplicationUrl("/dashboard");
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = parseEmailVerificationOtpType(searchParams.get("type"));
  const flow = parseCallbackFlow(searchParams.get("flow"));
  const providerError = searchParams.get("error");
  const providerErrorCode = searchParams.get("error_code");

  if ((code && code.length > 4096) || (tokenHash && tokenHash.length > 4096)) {
    return NextResponse.redirect(loginOutcomeUrl("expired"));
  }

  let supabase: CallbackClient;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return NextResponse.redirect(
      flow === "authentication" ? googleFailureUrl("unavailable") : loginOutcomeUrl("unavailable"),
    );
  }

  // An already authenticated callback is complete. Do not consume a one-time
  // code or token again; recovery is the sole flow that must replace a session.
  if (flow !== "recovery") {
    const existingUserId = await currentUserId(supabase);
    if (existingUserId) {
      return NextResponse.redirect(await authenticatedDestination(flow, existingUserId));
    }
  }

  if (providerError) {
    return NextResponse.redirect(oauthFailureUrl(providerError, providerErrorCode));
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      return NextResponse.redirect(await authenticatedDestination(flow, data.user.id));
    }

    const existingUserId = await currentUserId(supabase);
    if (existingUserId) {
      return NextResponse.redirect(await authenticatedDestination(flow, existingUserId));
    }

    // Supabase can confirm the email before a new browser context discovers
    // that it does not have the original PKCE verifier needed for a session.
    return NextResponse.redirect(flow === "authentication"
      ? authenticationCodeExchangeFailure(error)
      : loginOutcomeUrl(codeExchangeFailureOutcome(flow, error)));
  }

  if (tokenHash && otpType) {
    const effectiveFlow = otpType === "recovery"
      ? "recovery"
      : otpType === "email" || otpType === "signup"
        ? "email_verification"
        : flow;
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (!error && data.user) {
      return NextResponse.redirect(await authenticatedDestination(effectiveFlow, data.user.id));
    }

    const existingUserId = await currentUserId(supabase);
    if (existingUserId) {
      return NextResponse.redirect(await authenticatedDestination(effectiveFlow, existingUserId));
    }
  }

  return NextResponse.redirect(loginOutcomeUrl("expired"));
}

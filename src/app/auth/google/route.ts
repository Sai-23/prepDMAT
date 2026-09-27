import { type NextRequest, NextResponse } from "next/server";

import { getApplicationUrl, getAuthCallbackUrl, getAuthProviderAvailability } from "@/lib/auth/config";
import { getSafeReturnPath } from "@/lib/auth/return-path";
import {
  enforceSecurityRateLimit,
  RateLimitExceededError,
} from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function loginUrl(returnPath: string | null, error?: string) {
  const url = getApplicationUrl("/login");
  if (error) url.searchParams.set("error", error);
  if (returnPath) url.searchParams.set("next", returnPath);
  return url;
}

export async function GET(request: NextRequest) {
  const returnPath = getSafeReturnPath(request.nextUrl.searchParams.get("next"));
  if (!getAuthProviderAvailability().google) {
    return NextResponse.redirect(loginUrl(returnPath));
  }

  try {
    await enforceSecurityRateLimit("auth:google");
  } catch (error) {
    return NextResponse.redirect(loginUrl(
      returnPath,
      error instanceof RateLimitExceededError ? "rate_limited" : "google_unavailable",
    ));
  }

  let data: { url: string | null };
  let error: { message?: string } | null;
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAuthCallbackUrl("authentication", returnPath) },
    });
    data = result.data;
    error = result.error;
  } catch {
    return NextResponse.redirect(loginUrl(returnPath, "google_unavailable"));
  }

  if (error || !data.url) {
    return NextResponse.redirect(loginUrl(returnPath, "google_start"));
  }

  return NextResponse.redirect(new URL(data.url));
}

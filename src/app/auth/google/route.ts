import { NextResponse } from "next/server";

import { getApplicationUrl, getAuthCallbackUrl, getAuthProviderAvailability } from "@/lib/auth/config";
import {
  enforceSecurityRateLimit,
  RateLimitExceededError,
} from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  if (!getAuthProviderAvailability().google) {
    return NextResponse.redirect(getApplicationUrl("/login"));
  }

  try {
    await enforceSecurityRateLimit("auth:google");
  } catch (error) {
    const errorUrl = getApplicationUrl("/login");
    errorUrl.searchParams.set(
      "error",
      error instanceof RateLimitExceededError ? "rate_limited" : "google_unavailable",
    );
    return NextResponse.redirect(errorUrl);
  }

  let data: { url: string | null };
  let error: { message?: string } | null;
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAuthCallbackUrl() },
    });
    data = result.data;
    error = result.error;
  } catch {
    const errorUrl = getApplicationUrl("/login");
    errorUrl.searchParams.set("error", "google_unavailable");
    return NextResponse.redirect(errorUrl);
  }

  if (error || !data.url) {
    const errorUrl = getApplicationUrl("/login");
    errorUrl.searchParams.set("error", "google_start");
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(new URL(data.url));
}

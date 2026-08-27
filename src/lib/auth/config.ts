import "server-only";

import { getEnv } from "@/lib/validators/env";

export type AuthProviderAvailability = {
  google: boolean;
  phone: boolean;
};

export function getAuthProviderAvailability(): AuthProviderAvailability {
  const env = getEnv();
  return {
    google: env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED,
    phone: env.NEXT_PUBLIC_PHONE_AUTH_ENABLED,
  };
}

export type AuthCallbackFlow = "authentication" | "email_verification" | "recovery";

export function getAuthCallbackUrl(flow: AuthCallbackFlow = "authentication") {
  const callbackUrl = new URL("/auth/callback", getEnv().NEXT_PUBLIC_APP_URL);
  callbackUrl.searchParams.set("flow", flow);
  return callbackUrl.toString();
}

export function getApplicationUrl(path: "/dashboard" | "/login" | "/onboarding" | "/onboarding/diagnostic" | "/reset-password") {
  return new URL(path, getEnv().NEXT_PUBLIC_APP_URL);
}

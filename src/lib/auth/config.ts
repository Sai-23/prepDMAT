import "server-only";

import { getEnv } from "@/lib/validators/env";
import { siteConfig } from "@/lib/site-config";

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

export function getTrustedSiteUrl() {
  // Never let a Vercel deployment URL or an untrusted request Host become the
  // production authentication origin. Explicit preview and local deployments
  // retain their separately configured URL for PKCE callback consistency.
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview") {
    return getEnv().NEXT_PUBLIC_APP_URL;
  }
  return siteConfig.url;
}

export function getAuthCallbackUrl(flow: AuthCallbackFlow = "authentication") {
  const callbackUrl = new URL("/auth/callback", getTrustedSiteUrl());
  callbackUrl.searchParams.set("flow", flow);
  return callbackUrl.toString();
}

export function getApplicationUrl(path: "/dashboard" | "/login" | "/onboarding" | "/onboarding/diagnostic" | "/reset-password") {
  return new URL(path, getTrustedSiteUrl());
}
